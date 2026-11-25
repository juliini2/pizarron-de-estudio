(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root && root.document) api.iniciar(root.document, root);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const CLAVE_NOTAS = 'entre-lineas-cuaderno-ideas-julieta-v1';
  const UNIDADES = {
    longitud: { m: 1, km: 1000, cm: 0.01 },
    masa: { g: 1, kg: 1000 },
    temperatura: { C: 'C', F: 'F', K: 'K' }
  };
  const GRUPOS = ['Por leer', 'Ideas clave', 'Ejercicios'];
  const ETIQUETAS_GRUPO = { 'Por leer': 'Pendientes', 'Ideas clave': 'Ideas clave', Ejercicios: 'Cálculos' };

  function convertir(magnitud, valor, origen, destino) {
    const numero = Number(valor);
    if (valor === '' || !Number.isFinite(numero)) throw new Error('Ingresá un número válido.');
    const unidades = UNIDADES[magnitud];
    if (!unidades || !Object.hasOwn(unidades, origen) || !Object.hasOwn(unidades, destino)) {
      throw new Error('Elegí unidades válidas para esta magnitud.');
    }
    let resultado;
    if (magnitud === 'temperatura') {
      let celsius = numero;
      if (origen === 'F') celsius = (numero - 32) * 5 / 9;
      if (origen === 'K') celsius = numero - 273.15;
      if (celsius < -273.15) throw new Error('La temperatura no puede ser menor al cero absoluto.');
      resultado = destino === 'F' ? celsius * 9 / 5 + 32 : destino === 'K' ? celsius + 273.15 : celsius;
    } else resultado = numero * unidades[origen] / unidades[destino];
    if (!Number.isFinite(resultado)) throw new Error('El resultado no es un número finito.');
    return Number(resultado.toPrecision(12));
  }

  function leerNotas(storage) {
    const contenido = storage.getItem(CLAVE_NOTAS);
    if (contenido === null) return [];
    try {
      const notas = JSON.parse(contenido);
      return Array.isArray(notas) ? notas.filter((nota) => nota && typeof nota.id === 'string' && typeof nota.texto === 'string' && GRUPOS.includes(nota.grupo)) : [];
    } catch {
      return [];
    }
  }

  function guardarNotas(storage, notas) {
    storage.setItem(CLAVE_NOTAS, JSON.stringify(notas));
  }

  function iniciar(documento, entorno) {
    const porId = (id) => documento.getElementById(id);
    const formulario = porId('formulario-nota');
    if (!formulario) return;
    const texto = porId('texto-nota');
    const grupo = porId('grupo-nota');
    const filtro = porId('filtro');
    const contenedor = porId('notas');
    const estado = porId('estado');
    const magnitud = porId('magnitud');
    const valor = porId('valor');
    const origen = porId('origen');
    const destino = porId('destino');
    const salida = porId('conversion');
    const formConversion = porId('formulario-conversion');
    const convertirBtn = porId('convertir');
    const anotarBtn = porId('anotar-conversion');
    let notas = [];
    let editando = null;
    let resultadoActual = null;
    const avisar = (mensaje, error = false) => {
      estado.textContent = mensaje;
      estado.dataset.tipo = error ? 'error' : 'info';
    };
    const guardar = (nuevasNotas, mensaje) => {
      try {
        guardarNotas(entorno.localStorage, nuevasNotas);
        notas = nuevasNotas;
        avisar(mensaje);
        dibujarNotas();
        return true;
      } catch {
        avisar('No se pudo guardar en este navegador. Tus cambios no se confirmaron.', true);
        return false;
      }
    };
    function dibujarNotas() {
      contenedor.replaceChildren();
      const visibles = notas.filter((nota) => filtro.value === 'todas' || nota.grupo === filtro.value);
      if (!visibles.length) {
        const vacio = documento.createElement('p');
        vacio.className = 'vacio';
        vacio.textContent = filtro.value === 'todas' ? 'Todavía no hay notas. Una idea pequeña también merece un lugar.' : 'No hay notas en este grupo todavía.';
        contenedor.append(vacio);
        return;
      }
      visibles.forEach((nota) => {
        const tarjeta = documento.createElement('article');
        tarjeta.className = 'nota';
        const etiqueta = documento.createElement('p');
        etiqueta.className = 'nota-grupo';
        etiqueta.textContent = ETIQUETAS_GRUPO[nota.grupo] || nota.grupo;
        const contenido = documento.createElement('p');
        contenido.className = 'nota-texto';
        contenido.textContent = nota.texto;
        const acciones = documento.createElement('div');
        acciones.className = 'acciones-nota';
        const editar = documento.createElement('button');
        editar.type = 'button'; editar.textContent = 'Editar';
        editar.addEventListener('click', () => {
          editando = nota.id; texto.value = nota.texto; grupo.value = nota.grupo;
          porId('guardar-nota').textContent = 'Guardar cambios';
          porId('cancelar-edicion').hidden = false;
          avisar('Estás editando una nota.'); texto.focus();
        });
        const borrar = documento.createElement('button');
        borrar.type = 'button'; borrar.className = 'boton-texto'; borrar.textContent = 'Eliminar';
        borrar.addEventListener('click', () => {
          const nuevas = notas.filter((item) => item.id !== nota.id);
          if (guardar(nuevas, 'Nota eliminada.')) {
            if (editando === nota.id) cancelarEdicion();
          }
        });
        acciones.append(editar, borrar);
        tarjeta.append(etiqueta, contenido, acciones);
        contenedor.append(tarjeta);
      });
    }
    function cancelarEdicion() {
      editando = null; formulario.reset();
      porId('guardar-nota').textContent = 'Guardar nota';
      porId('cancelar-edicion').hidden = true;
    }
    formulario.addEventListener('submit', (evento) => {
      evento.preventDefault();
      const cuerpo = texto.value.trim();
      if (!cuerpo) { avisar('Escribí una nota antes de guardarla.', true); texto.focus(); return; }
      const id = editando || `nota-${entorno.crypto && entorno.crypto.randomUUID ? entorno.crypto.randomUUID() : Date.now().toString(36)}`;
      const nota = { id, texto: cuerpo, grupo: grupo.value };
      const nuevas = editando ? notas.map((item) => item.id === editando ? nota : item) : [nota, ...notas];
      if (guardar(nuevas, editando ? 'Cambios guardados.' : 'Nota guardada.')) cancelarEdicion();
    });
    porId('cancelar-edicion').addEventListener('click', cancelarEdicion);
    filtro.addEventListener('change', dibujarNotas);

    function limpiarResultado() {
      resultadoActual = null; salida.textContent = 'El resultado aparecerá acá.';
      salida.classList.remove('resultado-listo'); anotarBtn.disabled = true;
    }
    function cambiarUnidades() {
      const opciones = {
        longitud: [['m', 'Metros (m)'], ['km', 'Kilómetros (km)'], ['cm', 'Centímetros (cm)']],
        masa: [['g', 'Gramos (g)'], ['kg', 'Kilogramos (kg)']],
        temperatura: [['C', 'Celsius (°C)'], ['F', 'Fahrenheit (°F)'], ['K', 'Kelvin (K)']]
      }[magnitud.value];
      [origen, destino].forEach((select) => {
        const anterior = select.value;
        select.replaceChildren(...opciones.map(([value, label]) => {
          const opcion = documento.createElement('option'); opcion.value = value; opcion.textContent = label; return opcion;
        }));
        if (opciones.some(([value]) => value === anterior)) select.value = anterior;
      });
      limpiarResultado();
    }
    [magnitud, valor, origen, destino].forEach((control) => control.addEventListener(control === valor ? 'input' : 'change', limpiarResultado));
    magnitud.addEventListener('change', cambiarUnidades);
    formConversion.addEventListener('submit', (evento) => {
      evento.preventDefault();
      try {
        const numero = convertir(magnitud.value, valor.value, origen.value, destino.value);
        const textoResultado = `${numero.toLocaleString('es-AR', { maximumSignificantDigits: 12 })} ${destino.options[destino.selectedIndex].textContent.match(/\((.*?)\)/)?.[1] || destino.value}`;
        resultadoActual = `${valor.value} ${origen.value} = ${textoResultado}`;
        salida.textContent = resultadoActual; salida.classList.add('resultado-listo'); anotarBtn.disabled = false;
        avisar('Conversión lista. Podés guardarla como nota de Cálculos.');
      } catch (error) { limpiarResultado(); salida.textContent = error.message; avisar(error.message, true); }
    });
    anotarBtn.addEventListener('click', () => {
      if (!resultadoActual) return;
      const nota = { id: `nota-${entorno.crypto && entorno.crypto.randomUUID ? entorno.crypto.randomUUID() : Date.now().toString(36)}`, texto: resultadoActual, grupo: 'Ejercicios' };
      if (guardar([nota, ...notas], 'Conversión guardada en Cálculos.')) { filtro.value = 'todas'; dibujarNotas(); }
    });
    try {
      const guardado = entorno.localStorage.getItem(CLAVE_NOTAS);
      notas = leerNotas(entorno.localStorage);
      let corrupto = false;
      if (guardado !== null) {
        try {
          const datos = JSON.parse(guardado);
          corrupto = !Array.isArray(datos) || datos.length !== notas.length;
        } catch { corrupto = true; }
      }
      if (corrupto) avisar('Algunas notas guardadas estaban dañadas; conservamos las que pudimos leer.', true);
      else avisar('Tus apuntes se guardan en este navegador.');
    } catch { notas = []; avisar('El almacenamiento no está disponible. Podés usar el cuaderno, pero no guardar cambios.', true); }
    cambiarUnidades(); dibujarNotas();
  }

  return { CLAVE_NOTAS, convertir, leerNotas, guardarNotas, ETIQUETAS_GRUPO, iniciar };
});
