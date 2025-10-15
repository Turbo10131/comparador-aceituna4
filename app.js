// app.js

const TIPO_LABEL = {
  virgen_extra: "Aceite de oliva virgen extra",
  virgen: "Aceite de oliva virgen",
  lampante: "Aceite de oliva lampante",
};

let PRECIOS_MAP = {};

function setTexto(el, txt) { if (el) el.textContent = txt; }
function euros(n) { return `${Number(n).toFixed(3)} €/kg`; }

function normalizaPrecios(preciosRaw) {
  const map = {};
  const ve = preciosRaw["Aceite de oliva virgen extra"]?.precio_eur_kg ?? null;
  const v  = preciosRaw["Aceite de oliva virgen"]?.precio_eur_kg ?? null;
  const l  = preciosRaw["Aceite de oliva lampante"]?.precio_eur_kg ?? null;
  if (ve && ve > 0 && ve < 20) map.virgen_extra = Number(ve);
  if (v  && v  > 0 && v  < 20) map.virgen       = Number(v);
  if (l  && l  > 0 && l  < 20) map.lampante     = Number(l);
  return map;
}

function renderTabla(preciosRaw) {
  const cont = document.getElementById("tabla-precios");
  if (!cont) return;

  const rows = [
    ["Aceite de oliva virgen extra", preciosRaw["Aceite de oliva virgen extra"]?.precio_eur_kg],
    ["Aceite de oliva virgen",       preciosRaw["Aceite de oliva virgen"]?.precio_eur_kg],
    ["Aceite de oliva lampante",     preciosRaw["Aceite de oliva lampante"]?.precio_eur_kg],
  ];

  const cuerpo = rows.map(([label, val]) => {
    const precioTxt = (val && val > 0 && val < 20) ? euros(val) : "—";
    return `
      <tr>
        <td class="tipo">${label}</td>
        <td class="precio">${precioTxt}</td>
      </tr>`;
  }).join("");

  cont.innerHTML = `
    <table class="price-table">
      <thead>
        <tr>
          <th>Tipo de aceite de oliva</th>
          <th>Precio €/kg</th>
        </tr>
      </thead>
      <tbody>${cuerpo}</tbody>
    </table>
  `;
}

function actualizarPrecioSeleccion() {
  const sel = document.getElementById("tipo");
  const precioEl = document.getElementById("precio");
  if (!sel || !precioEl) return;

  const key = sel.value;
  const precio = PRECIOS_MAP[key];

  if (precio) setTexto(precioEl, `Precio ${TIPO_LABEL[key]}: ${euros(precio)}`);
  else if (key) setTexto(precioEl, "— Precio no disponible —");
  else setTexto(precioEl, "");
}

function calcular() {
  const sel = document.getElementById("tipo");
  const res = document.getElementById("resultado");
  const rEl = document.getElementById("rendimiento");
  const finalBox = document.getElementById("resultado-final"); // ✅ nuevo: caja final
  if (!sel || !res || !rEl) return;

  const key = sel.value;
  const rendimiento = Number(rEl.value);
  const precio = PRECIOS_MAP[key];

  if (!key || !precio || isNaN(rendimiento) || rendimiento < 0 || rendimiento > 100) {
    res.classList.add("error");
    res.textContent = "Falta información: selecciona calidad y rendimiento válido.";
    if (finalBox) finalBox.textContent = ""; // ✅ limpia la caja final si no hay datos válidos
    return;
  }

  const precioAceituna = (rendimiento / 100) * precio;

  res.classList.remove("error");
  res.innerHTML = `
    <table class="calc-table">
      <thead>
        <tr>
          <th>Rendimiento (%)</th>
          <th>Calidad del Aceite</th>
          <th>Precio del Aceite</th>
          <th>Precio aceituna (€/kg)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${rendimiento}%</td>
          <td>${TIPO_LABEL[key]}</td>
          <td>${precio.toFixed(3)} €/kg</td>
          <td><strong>${precioAceituna.toFixed(3)} €/kg</strong></td>
        </tr>
      </tbody>
    </table>
  `;

  // ✅ Actualiza la caja de resultado final (opción 2)
  if (finalBox) {
    finalBox.textContent = `💶 Precio final de la aceituna: ${precioAceituna.toFixed(3)} €/kg`;
  }
}

function setupFuenteModal() {
  const link = document.getElementById("fuente-link");
  const modal = document.getElementById("fuente-modal");
  const closeBtn = document.getElementById("fuente-close");
  if (!link || !modal || !closeBtn) return;

  const open = () => { modal.classList.add("open"); link.blur(); };
  const close = () => { modal.classList.remove("open"); link.focus(); };

  link.addEventListener("click", e => { e.preventDefault(); open(); });
  closeBtn.addEventListener("click", close);
  modal.addEventListener("click", e => { if (e.target === modal) close(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && modal.classList.contains("open")) close(); });
}

async function cargarDatos() {
  const tablaInfoEl = document.getElementById("tabla-info");

  try {
    const res = await fetch(`precio-aceite.json?v=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const datos = await res.json();

    console.log("📦 Datos cargados:", datos);

    // Detecta si el JSON tiene "precios" o está plano
    const precios = datos.precios || datos;

    let fechaTxt = datos.fecha || "desconocida";
    if (datos.ultima_actualizacion || datos.generated_at) {
      const f = new Date(datos.ultima_actualizacion || datos.generated_at);
      if (!isNaN(f)) fechaTxt = f.toLocaleString("es-ES");
    }

    setTexto(tablaInfoEl, `Precios actualizados — ${fechaTxt}`);
    renderTabla(precios);

    PRECIOS_MAP = normalizaPrecios(precios);
    const sel = document.getElementById("tipo");
    if (sel && !sel.value) {
      if (PRECIOS_MAP.virgen_extra) sel.value = "virgen_extra";
      else if (PRECIOS_MAP.virgen)  sel.value = "virgen";
      else if (PRECIOS_MAP.lampante) sel.value = "lampante";
    }

    actualizarPrecioSeleccion();
    calcular();

    sel?.addEventListener("change", () => { actualizarPrecioSeleccion(); calcular(); });
    document.getElementById("rendimiento")?.addEventListener("input", calcular);

  } catch (err) {
    console.error("[cargarDatos] Error:", err);
    setTexto(tablaInfoEl, "Error cargando precios.");
    const tabla = document.getElementById("tabla-precios");
    if (tabla) tabla.innerHTML = "";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  cargarDatos();
  setupFuenteModal();
});
