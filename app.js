// URL del JSON con cache-busting (también desactivamos caché en Netlify vía _headers)
const JSON_URL = `precio-aceite.json?v=${Date.now()}`;

// Mapeo de etiquetas "bonitas" del selector <-> claves del JSON
// Las claves del JSON son:
///  "Aceite de oliva virgen extra", "Aceite de oliva virgen", "Aceite de oliva lampante"
const LABEL_TO_KEY = {
  "Virgen Extra": "Aceite de oliva virgen extra",
  "Virgen": "Aceite de oliva virgen",
  "Lampante": "Aceite de oliva lampante",
};

// Elementos del DOM
const $fecha = document.getElementById("fecha-actualizacion");
const $lista = document.getElementById("lista-precios");
const $select = document.getElementById("calidad");
const $resultado = document.getElementById("resultado");
const $infoVariedad = document.getElementById("info-variedad");

let datos = null;

// Utilidad para formatear números a 3 decimales con coma si el locale es ES
function formatEuroKg(n) {
  // Asegura número y 3 decimales
  const fixed = Number(n).toFixed(3);
  // Muestra con coma en ES, punto en otros
  return (Number(fixed)).toLocaleString('es-ES', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

// Pinta el bloque “lista de todos los precios”
function renderListaPrecios(data) {
  const precios = data.precios;
  const lineas = Object.keys(precios).map(key => {
    const item = precios[key];
    return `<p class="precio">${key} (${item.variedad}): ${formatEuroKg(item.precio_eur_kg)} €/kg</p>`;
  }).join("");
  $lista.innerHTML = lineas;
}

// Pinta fecha de actualización
function renderFecha(data) {
  try {
    const fecha = new Date(data.ultima_actualizacion).toLocaleString('es-ES');
    $fecha.textContent = fecha;
  } catch {
    $fecha.textContent = data.ultima_actualizacion || "—";
  }
}

// Rellena el <select> desde el JSON para que siempre esté sincronizado
function rellenarSelect(data) {
  // Orden deseado
  const ordenBonito = ["Virgen Extra", "Virgen", "Lampante"];
  const frag = document.createDocumentFragment();

  ordenBonito.forEach(label => {
    const key = LABEL_TO_KEY[label];
    if (key && data.precios[key]) {
      const opt = document.createElement("option");
      opt.value = label;
      opt.textContent = label;
      frag.appendChild(opt);
    }
  });

  $select.appendChild(frag);
}

// Muestra el precio según selección
function mostrarPrecioSeleccion(label) {
  if (!label) {
    $resultado.textContent = "";
    $infoVariedad.textContent = "";
    return;
  }
  const key = LABEL_TO_KEY[label];
  const item = datos?.precios?.[key];
  if (!item) {
    $resultado.textContent = "No hay datos para esa calidad.";
    $infoVariedad.textContent = "";
    return;
  }

  $resultado.textContent = `Precio ${label}: ${formatEuroKg(item.precio_eur_kg)} €/kg`;
  $infoVariedad.textContent = `Variedad: ${item.variedad} — Fuente: Infaoliva`;
}

// Eventos
$select.addEventListener("change", (e) => {
  mostrarPrecioSeleccion(e.target.value);
});

// Carga inicial
fetch(JSON_URL, { cache: "no-store" })
  .then(r => {
    if (!r.ok) throw new Error(`Error HTTP ${r.status}`);
    return r.json();
  })
  .then(data => {
    datos = data;
    renderFecha(data);
    renderListaPrecios(data);
    rellenarSelect(data);
  })
  .catch(err => {
    console.error("Error al cargar JSON:", err);
    $lista.textContent = "Error al cargar los precios.";
    $fecha.textContent = "—";
  });
