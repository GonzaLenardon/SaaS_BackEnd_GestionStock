'use strict';

// Regenera los codigos de barras de un tenant usando su correlativo como
// prefijo numerico (0001, 0002...) en lugar del id interno.
//
// Por que: en las tiendas con numeracion por correlativo el numero que ve el
// usuario es el correlativo. Si el codigo impreso siguiera usando el id, el
// usuario tendria que tipear 0826 para encontrar el producto 86. Con el
// correlativo, tipea 0086 y lo encuentra.
//
// El codigo anterior de cada producto queda como alias en producto_codigos:
// las etiquetas ya impresas siguen resolviendo al producto correcto.
//
// Es idempotente: si el codigo ya esta bien, no se toca nada.
//
// Uso:
//   node scripts/regenerar-codigos-correlativo.js <id_cliente> [--dry-run]

require('dotenv').config();

const { Productos, ProductoCodigos, ClienteConfig } = require('../models');
const { generarCodigo } = require('../utils/generarCodigo');

const CLAVE = 'numeracion_por_correlativo';

const idCliente = Number(process.argv[2]);
const dryRun = process.argv.includes('--dry-run');

if (!idCliente) {
  console.error('Uso: node scripts/regenerar-codigos-correlativo.js <id_cliente> [--dry-run]');
  process.exit(1);
}

(async () => {
  const config = await ClienteConfig.findOne({
    where: { id_cliente: idCliente, key: CLAVE },
  });

  const usaCorrelativo = String(config?.value).toLowerCase() === 'true';
  if (!usaCorrelativo) {
    console.log(
      `El cliente ${idCliente} no usa numeracion por correlativo. ` +
        'No se modifica nada (usar --forzar para regenerar igual).',
    );
    process.exit(0);
  }

  const productos = await Productos.findAll({
    where: { id_cliente: idCliente },
    order: [['id_producto', 'ASC']],
  });

  console.log(`Cliente ${idCliente}: ${productos.length} productos`);
  if (dryRun) console.log('--- DRY RUN: no se escribe nada ---\n');

  let cambiados = 0;
  let sinCambio = 0;
  let sinCorrelativo = 0;

  for (const prod of productos) {
    const plano = prod.get({ plain: true });

    if (plano.correlativo == null) {
      sinCorrelativo += 1;
      console.log(`  [sin correlativo] id=${plano.id_producto} ${plano.nombre}`);
      continue;
    }

    const nuevoCodigo = await generarCodigo(plano, { prefijo: plano.correlativo });

    if (nuevoCodigo === plano.codigo) {
      sinCambio += 1;
      continue;
    }

    console.log(
      `  id=${plano.id_producto} nro=${plano.correlativo}: ${plano.codigo} -> ${nuevoCodigo}`,
    );

    if (!dryRun) {
      // El codigo viejo queda como alias para las etiquetas ya impresas.
      if (plano.codigo) {
        await ProductoCodigos.findOrCreate({
          where: { id_cliente: idCliente, codigo: plano.codigo },
          defaults: {
            id_producto: plano.id_producto,
            id_cliente: idCliente,
            codigo: plano.codigo,
            created_at: new Date(),
          },
        });
      }

      await prod.update({ codigo: nuevoCodigo });
    }

    cambiados += 1;
  }

  console.log(
    `\nResumen: ${cambiados} cambiados, ${sinCambio} sin cambio, ` +
      `${sinCorrelativo} sin correlativo`,
  );
  if (dryRun) console.log('Dry run: no se escribo nada.');

  process.exit(0);
})().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
