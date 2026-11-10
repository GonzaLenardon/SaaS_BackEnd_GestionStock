'use strict';

// Migracion: numeracion propia por tenant.
//
// Se ejecuta con `npm run db:migrate` (sequelize-cli). El control de
// archivos aplicados queda en la tabla SequelizeMeta.
//
// Objetivo: que cada tienda con la configuracion
// 'numeracion_por_correlativo' = 'true' muestre su propio correlativo
// (1, 2, 3...) en lugar del id interno, y que sus codigos de barras usen ese
// correlativo como prefijo.
//
// Pasos (idempotentes):
//   1. Inserta la clave de configuracion 'numeracion_por_correlativo' para
//      todos los clientes:
//        - 'false' para los que hoy muestran el id (comportamiento actual).
//        - 'true'  para los que ya tienen TODA su numeracion por correlativo
//          (ventas y productos con correlativo 1..N sin huecos).
//      Los clientes nuevos nacen con 'true' (controllers/clientes.js).
//   2. Renumera las tablas de los tenants con 'true' para que el correlativo
//      sea 1..N sin huecos ni repetidos, ordenado por id. Los tenants con
//      'false' no se tocan: sus numeros quedan como estan.
//   3. Ajusta correlativos.last_number al correlativo maximo real de cada
//      tenant y entidad, para que el proximo numero siga la secuencia.
//   4. Backfill de detallecambios.id_cliente desde el cambio padre (las lineas
//      de los cambios creados por el superadmin quedaron sin tenant).
//   5. Cambia la FK stock_sucursal.id_detalle_compra de SET NULL a RESTRICT:
//      con SET NULL, borrar un lote dejaba filas de stock huerfanas que no se
//      veian en ningun reporte pero ensuciaban la base.
//
// Respaldo previo obligatorio: dump de la base antes de aplicar.

const CLAVE_CONFIG = 'numeracion_por_correlativo';

// Tablas de documento (tienen un numero que ve el usuario), con su clave
// primaria. Las tablas de detalle (detalleventas, detallecompras,
// stock_sucursal, etc.) NO se renumeran: su correlativo es un contador de
// lineas, no un numero de documento.
//
// OJO con el nombre: en Linux (lower_case_table_names = 0) MariaDB distingue
// mayusculas de minusculas, asi que 'tipoGastos' y 'tipogastos' son tablas
// distintas. Por eso el nombre real se resuelve contra information_schema en
// tiempo de ejecucion (ver resolverTabla) en lugar de confiar en el literal.
const TABLAS = [
  { tabla: 'ventas', pk: 'id_venta', entidad: 'ventas' },
  { tabla: 'productos', pk: 'id_producto', entidad: 'productos' },
  { tabla: 'compras', pk: 'id_compra', entidad: 'compra' },
  { tabla: 'cambios', pk: 'id_cambio', entidad: 'cambio' },
  { tabla: 'gastos', pk: 'id_gasto', entidad: 'gastos' },
  { tabla: 'ajuste_stock', pk: 'id_ajuste', entidad: 'ajuste_stock' },
  { tabla: 'transferencias', pk: 'id', entidad: 'transferencia' },
  { tabla: 'sucursales', pk: 'id_sucursal', entidad: 'sucursal' },
  { tabla: 'usuarios', pk: 'id_usuario', entidad: 'usuarios' },
  { tabla: 'proveedores', pk: 'id_proveedor', entidad: 'proveedores' },
  { tabla: 'tipoventa', pk: 'id_tipo', entidad: 'tipoventa' },
  { tabla: 'tipoGastos', pk: 'id_tipogasto', entidad: 'tipoGastos' },
];

/**
 * Resuelve el nombre real de una tabla en la base, sin distinguir
 * mayusculas de minusculas. Devuelve null si la tabla no existe.
 *
 * En Windows (lower_case_table_names = 1) MariaDB no distingue y devuelve
 * la primera coincidencia. En Linux devuelve el nombre tal como fue creado,
 * que es el que hay que usar en las consultas.
 */
const resolverTabla = async (q, nombre) => {
  const [filas] = await q(`
    SELECT TABLE_NAME AS nombre
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND LOWER(TABLE_NAME) = LOWER('${nombre}')
    LIMIT 1
  `);
  return filas && filas.length > 0 ? filas[0].nombre : null;
};

module.exports = {
  up: async (queryInterface) => {
    const sequelize = queryInterface.sequelize;
    const q = (sql) => sequelize.query(sql);

    // ---------------------------------------------------------------
    // 1. Configuracion de numeracion por tenant
    // ---------------------------------------------------------------
    // Por defecto 'false': el tenant sigue mostrando el id interno.
    await q(`
      INSERT INTO cliente_config (id_cliente, \`key\`, value, description)
      SELECT c.id_cliente,
             '${CLAVE_CONFIG}',
             'false',
             'Mostrar el correlativo propio de la tienda en lugar del id interno'
      FROM clientes c
      LEFT JOIN cliente_config cc
        ON cc.id_cliente = c.id_cliente AND cc.\`key\` = '${CLAVE_CONFIG}'
      WHERE cc.id_config IS NULL
    `);

    // 'true' para los tenants que ya usan correlativo de punta a punta: todas
    // sus ventas y todos sus productos tienen correlativo y van de 1 a N sin
    // huecos. Los tenants con datos historicos mezclados quedan en 'false'.
    await q(`
      UPDATE cliente_config cc
      SET cc.value = 'true'
      WHERE cc.\`key\` = '${CLAVE_CONFIG}'
        AND cc.value <> 'true'
        AND EXISTS (
          SELECT 1 FROM (
            SELECT id_cliente,
                   COUNT(*) AS total,
                   SUM(correlativo IS NOT NULL) AS con_numero,
                   MAX(correlativo) AS maximo
            FROM ventas
            GROUP BY id_cliente
          ) v
          WHERE v.id_cliente = cc.id_cliente
            AND v.total > 0
            AND v.con_numero = v.total
            AND v.maximo = v.total
        )
        AND EXISTS (
          SELECT 1 FROM (
            SELECT id_cliente,
                   COUNT(*) AS total,
                   SUM(correlativo IS NOT NULL) AS con_numero,
                   MAX(correlativo) AS maximo
            FROM productos
            GROUP BY id_cliente
          ) p
          WHERE p.id_cliente = cc.id_cliente
            AND p.total > 0
            AND p.con_numero = p.total
            AND p.maximo = p.total
        )
    `);

    // ---------------------------------------------------------------
    // 2. Renumeracion contigua 1..N para los tenants con 'true'
    // ---------------------------------------------------------------
    // correlativo = posicion por id. Solo para tenants marcados en el paso 1.
    // El nombre real de cada tabla se resuelve contra information_schema:
    // en Linux las mayusculas importan y no todas las instalaciones usan
    // el mismo nombre.
    const tablasReales = [];
    for (const def of TABLAS) {
      const real = await resolverTabla(q, def.tabla);
      if (!real) {
        console.log(
          `  [017] La tabla ${def.tabla} no existe en esta base: se omite.`,
        );
        continue;
      }
      tablasReales.push({ ...def, tabla: real });
    }

    for (const { tabla, pk } of tablasReales) {
      await q(`
        UPDATE \`${tabla}\` t
        JOIN (
          SELECT \`${pk}\` AS pk_id,
                 ROW_NUMBER() OVER (ORDER BY \`${pk}\`) AS nuevo
          FROM \`${tabla}\`
          WHERE id_cliente IN (
            SELECT id_cliente FROM cliente_config
            WHERE \`key\` = '${CLAVE_CONFIG}' AND value = 'true'
          )
        ) r ON r.pk_id = t.\`${pk}\`
        SET t.correlativo = r.nuevo
      `);
    }

    // ---------------------------------------------------------------
    // 3. correlativos.last_number al maximo real
    // ---------------------------------------------------------------
    for (const { tabla, entidad } of tablasReales) {
      await q(`
        UPDATE correlativos co
        JOIN (
          SELECT id_cliente, MAX(correlativo) AS maximo
          FROM \`${tabla}\`
          GROUP BY id_cliente
        ) x ON x.id_cliente = co.id_cliente AND co.entity_type = '${entidad}'
        SET co.last_number = x.maximo
        WHERE co.id_cliente IN (
          SELECT id_cliente FROM cliente_config
          WHERE \`key\` = '${CLAVE_CONFIG}' AND value = 'true'
        )
          AND x.maximo IS NOT NULL
      `);
    }

    // Se crean las filas de correlativos que falten para los tenants con
    // numeracion propia (last_number 0: el motor los inicializa solo).
    // MariaDB no admite un SELECT de literales con UNION como tabla
    // derivada, asi que se usa una tabla temporal.
    await q(`DROP TEMPORARY TABLE IF EXISTS tmp_entidades_numeracion`);
    await q(`
      CREATE TEMPORARY TABLE tmp_entidades_numeracion (
        entity_type VARCHAR(40) NOT NULL PRIMARY KEY
      ) ENGINE = MEMORY
    `);

    for (const { entidad } of tablasReales) {
      await q(
        `INSERT INTO tmp_entidades_numeracion (entity_type) VALUES ('${entidad}')`,
      );
    }
    await q(
      `INSERT INTO tmp_entidades_numeracion (entity_type) VALUES ('detalle_cambio')`,
    );

    await q(`
      INSERT INTO correlativos (id_cliente, entity_type, last_number, createdAt, updatedAt)
      SELECT cc.id_cliente, e.entity_type, 0, NOW(), NOW()
      FROM cliente_config cc
      JOIN tmp_entidades_numeracion e ON 1 = 1
      LEFT JOIN correlativos co
        ON co.id_cliente = cc.id_cliente AND co.entity_type = e.entity_type
      WHERE cc.\`key\` = '${CLAVE_CONFIG}' AND cc.value = 'true'
        AND co.id_correlativo IS NULL
    `);

    await q(`DROP TEMPORARY TABLE IF EXISTS tmp_entidades_numeracion`);

    // ---------------------------------------------------------------
    // 4. Backfill de detallecambios.id_cliente
    // ---------------------------------------------------------------
    const tablaDetalleCambios = await resolverTabla(q, 'detallecambios');
    const tablaCambios = await resolverTabla(q, 'cambios');

    if (tablaDetalleCambios && tablaCambios) {
      await q(`
        UPDATE \`${tablaDetalleCambios}\` dc
        JOIN \`${tablaCambios}\` c ON c.id_cambio = dc.id_cambio
        SET dc.id_cliente = c.id_cliente
        WHERE dc.id_cliente IS NULL
          AND c.id_cliente IS NOT NULL
      `);
    } else {
      console.log(
        '  [017] No se encuentran detallecambios/cambios: se omite el backfill.',
      );
    }

    // ---------------------------------------------------------------
    // 5. FK de stock_sucursal: SET NULL -> RESTRICT
    // ---------------------------------------------------------------
    const tablaStock = await resolverTabla(q, 'stock_sucursal');
    const tablaDetalleCompras = await resolverTabla(q, 'detallecompras');

    if (!tablaStock || !tablaDetalleCompras) {
      console.log(
        '  [017] No se encuentran stock_sucursal/detallecompras: se omite el cambio de FK.',
      );
      return;
    }

    const [fks] = await q(`
      SELECT k.CONSTRAINT_NAME AS nombre
      FROM information_schema.KEY_COLUMN_USAGE k
      JOIN information_schema.REFERENTIAL_CONSTRAINTS r
        ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA
       AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
      WHERE k.TABLE_SCHEMA = DATABASE()
        AND k.TABLE_NAME = '${tablaStock}'
        AND k.COLUMN_NAME = 'id_detalle_compra'
        AND k.REFERENCED_TABLE_NAME IS NOT NULL
      LIMIT 1
    `);

    if (fks && fks.length > 0) {
      const nombre = fks[0].nombre;
      // DROP y ADD van en sentencias separadas: en un solo ALTER, MariaDB
      // reconstruye la tabla y el indice unico choca al copiar los datos.
      await q(`ALTER TABLE \`${tablaStock}\` DROP FOREIGN KEY \`${nombre}\``);
      await q(`
        ALTER TABLE \`${tablaStock}\`
        ADD CONSTRAINT \`${nombre}\`
          FOREIGN KEY (id_detalle_compra)
          REFERENCES \`${tablaDetalleCompras}\` (id_detalle)
          ON DELETE RESTRICT
          ON UPDATE CASCADE
      `);
    }
  },

  down: async () => {
    // No reversible sin respaldo: la renumeracion de correlativos no se puede
    // deshacer y la FK vuelve a SET NULL dejando huerfanos.
  },
};
