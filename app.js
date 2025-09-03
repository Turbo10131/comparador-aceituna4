const ctx = document.getElementById("chart").getContext("2d");

let chart;
let historico = {};
let periodo = "Años";
let aceiteSeleccionado = "Aceite de oliva virgen extra";
let yearSeleccionado = "Todos";

const yearSelect = document.getElementById("yearSelect");
const tipoAceite = document.getElementById("tipoAceite");

// URL con ?v=timestamp para evitar caché
const urlHistorico = `https://raw.githubusercontent.com/Turbo10131/comparador-aceituna4/main/precio-aceite-historico.json?v=${Date.now()}`;

async function cargarHistorico() {
  const res = await fetch(urlHistorico);
  historico = await res.json();

  // Inicializar gráfico
  actualizarGrafica();

  // Llenar selector de años
  actualizarSelectorAnios();
}

function actualizarSelectorAnios() {
  const datos = historico[aceiteSeleccionado] || [];
  const anios = [...new Set(datos.map(d => new Date(d.fecha).getFullYear()))].sort();

  yearSelect.innerHTML = `<option value="Todos">Todos los años</option>`;
  anios.forEach(anio => {
    const option = document.createElement("option");
    option.value = anio;
    option.textContent = anio;
    yearSelect.appendChild(option);
  });
}

function actualizarGrafica() {
  if (!historico[aceiteSeleccionado]) return;

  let datos = historico[aceiteSeleccionado];

  // Filtrar por año si corresponde
  if (yearSeleccionado !== "Todos") {
    datos = datos.filter(d => new Date(d.fecha).getFullYear() == yearSeleccionado);
  }

  let labels, values;

  if (periodo === "Años") {
    const agrupado = {};
    datos.forEach(d => {
      const anio = new Date(d.fecha).getFullYear();
      if (!agrupado[anio]) agrupado[anio] = [];
      agrupado[anio].push(d.precio_eur_kg);
    });

    labels = Object.keys(agrupado).sort();
    values = labels.map(anio =>
      (agrupado[anio].reduce((a, b) => a + b, 0) / agrupado[anio].length).toFixed(2)
    );
  } else if (periodo === "Meses") {
    const agrupado = {};
    datos.forEach(d => {
      const fecha = new Date(d.fecha);
      const clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
      if (!agrupado[clave]) agrupado[clave] = [];
      agrupado[clave].push(d.precio_eur_kg);
    });

    labels = Object.keys(agrupado).sort();
    values = labels.map(mes =>
      (agrupado[mes].reduce((a, b) => a + b, 0) / agrupado[mes].length).toFixed(2)
    );
  } else {
    labels = datos.map(d => d.fecha);
    values = datos.map(d => d.precio_eur_kg);
  }

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: aceiteSeleccionado,
          data: values,
          fill: true,
          borderColor: "blue",
          backgroundColor: "rgba(0, 0, 255, 0.1)",
          tension: 0.2,
          pointRadius: 3
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true }
      },
      scales: {
        x: {
          title: { display: true, text: periodo === "Años" ? "Año" : periodo === "Meses" ? "Mes" : "Día" }
        },
        y: {
          title: { display: true, text: "€/kg" }
        }
      }
    }
  });
}

// Eventos
document.querySelectorAll(".periodo-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".periodo-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    periodo = btn.textContent;
    actualizarGrafica();
  });
});

tipoAceite.addEventListener("change", e => {
  aceiteSeleccionado = e.target.value;
  actualizarSelectorAnios();
  actualizarGrafica();
});

yearSelect.addEventListener("change", e => {
  yearSeleccionado = e.target.value;
  actualizarGrafica();
});

// Cargar al inicio
cargarHistorico();
