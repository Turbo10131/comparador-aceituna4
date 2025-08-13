document.addEventListener('DOMContentLoaded', () => {
  const ultimaActualizacionElem = document.getElementById('ultima-actualizacion');
  const tipoAceiteSelect = document.getElementById('tipo-aceite');
  const precioElem = document.getElementById('precio');
  const listaPreciosElem = document.getElementById('lista-precios');
  const rendimientoInput = document.getElementById('rendimiento');

  let precios = {};

  // --- Cargar datos desde tu API o archivo JSON ---
  fetch('precios.json')
    .then(res => res.json())
    .then(data => {
      precios = data.precios;
      ultimaActualizacionElem.textContent = `Última actualización: ${data.fecha}`;
      mostrarListaCompleta();
    })
    .catch(err => {
      ultimaActualizacionElem.textContent = 'Error cargando datos';
      console.error(err);
    });

  // --- Cambio en selector de tipo de aceite ---
  tipoAceiteSelect.addEventListener('change', () => {
    mostrarPrecio();
  });

  // --- Cambio en rendimiento ---
  rendimientoInput.addEventListener('input', () => {
    // Sustituir coma por punto
    let v = rendimientoInput.value.replace(',', '.').trim();
    if (v === '') {
      mostrarPrecio();
      return;
    }

    let n = parseFloat(v);
    if (Number.isNaN(n)) {
      rendimientoInput.value = '';
      mostrarPrecio();
      return;
    }

    // Limitar 0–100
    if (n < 0) n = 0;
    if (n > 100) n = 100;

    // Formato máx. 2 decimales
    rendimientoInput.value = String(n).includes('.') 
      ? n.toFixed(2).replace(/\.?0+$/, '') 
      : String(n);

    mostrarPrecio();
  });

  // Evitar scroll accidental
  rendimientoInput.addEventListener('wheel', (e) => {
    if (document.activeElement !== rendimientoInput) e.preventDefault();
  }, { passive: false });

  // --- Función: Mostrar precio según selección y rendimiento ---
  function mostrarPrecio() {
    const tipo = tipoAceiteSelect.value;
    const rendimiento = parseFloat(rendimientoInput.value.replace(',', '.')) || null;

    if (!tipo || !precios[tipo]) {
      precioElem.textContent = '';
      return;
    }

    let precioBase = precios[tipo];
    let texto = `Precio ${formatearTipo(tipo)}: ${precioBase.toFixed(3)} €/kg`;

    if (rendimiento !== null) {
      let precioKgAceituna = precioBase * (rendimiento / 100);
      texto += ` — Equivale a ${precioKgAceituna.toFixed(3)} €/kg de aceituna`;
    }

    precioElem.textContent = texto;
  }

  // --- Función: Mostrar lista completa ---
  function mostrarListaCompleta() {
    let html = '';
    html += `<p>Aceite de oliva virgen extra: ${precios.extra?.toFixed(3)} €/kg</p>`;
    html += `<p>Aceite de oliva virgen: ${precios.virgen?.toFixed(3)} €/kg</p>`;
    html += `<p>Aceite de oliva lampante: ${precios.lampante?.toFixed(3)} €/kg</p>`;
    listaPreciosElem.innerHTML = html;
  }

  function formatearTipo(tipo) {
    switch (tipo) {
      case 'extra': return 'Virgen Extra';
      case 'virgen': return 'Virgen';
      case 'lampante': return 'Lampante';
      default: return tipo;
    }
  }
});
