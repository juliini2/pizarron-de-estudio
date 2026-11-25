const test = require('node:test');
const assert = require('node:assert/strict');
const { convertir, leerNotas, guardarNotas, CLAVE_NOTAS, ETIQUETAS_GRUPO } = require('../script.js');

test('convierte kilómetros a metros sin perder precisión', () => {
  assert.equal(convertir('longitud', 1.25, 'km', 'm'), 1250);
});

test('convierte masa y temperatura con resultados comprobables', () => {
  assert.equal(convertir('masa', 2, 'kg', 'g'), 2000);
  assert.equal(convertir('temperatura', 32, 'F', 'C'), 0);
  assert.equal(convertir('temperatura', 0, 'C', 'K'), 273.15);
});

test('rechaza unidades incompatibles y valores inválidos', () => {
  assert.throws(() => convertir('longitud', 1, 'm', 'kg'), /unidad/i);
  assert.throws(() => convertir('longitud', '', 'm', 'km'), /número/i);
  assert.throws(() => convertir('longitud', Infinity, 'm', 'km'), /número/i);
  assert.throws(() => convertir('longitud', Number.MAX_VALUE, 'm', 'cm'), /finito/i);
  assert.throws(() => convertir('temperatura', -274, 'C', 'K'), /cero absoluto/i);
});

test('leerNotas recupera notas guardadas y devuelve una lista ante JSON corrupto', () => {
  const almacen = new Map([[CLAVE_NOTAS, JSON.stringify([{ id: 'n1', texto: 'Repasar', grupo: 'Por leer' }])]]);
  const storage = { getItem: (key) => almacen.get(key) ?? null };
  assert.deepEqual(leerNotas(storage), [{ id: 'n1', texto: 'Repasar', grupo: 'Por leer' }]);
  almacen.set(CLAVE_NOTAS, '{ roto');
  assert.deepEqual(leerNotas(storage), []);
});

test('guardarNotas persiste y propaga errores para que la interfaz no anuncie éxito', () => {
  let guardado;
  const storage = { setItem: (key, value) => { guardado = [key, JSON.parse(value)]; } };
  const notas = [{ id: 'n2', texto: 'Una idea' }];
  guardarNotas(storage, notas);
  assert.deepEqual(guardado, [CLAVE_NOTAS, notas]);

  const storageBloqueado = { setItem: () => { throw new Error('cuota'); } };
  assert.throws(() => guardarNotas(storageBloqueado, notas), /cuota/);
});


test('mantiene grupos históricos al cargar y solo cambia su etiqueta visible', () => {
  const legacy = [{ id: 'legacy', texto: 'Contenido original', grupo: 'Ejercicios' }];
  const storage = { getItem: () => JSON.stringify(legacy) };
  const loaded = leerNotas(storage);
  assert.deepEqual(loaded, legacy);
  assert.equal(ETIQUETAS_GRUPO[loaded[0].grupo], 'Cálculos');
  assert.equal(loaded[0].grupo, 'Ejercicios');
});
