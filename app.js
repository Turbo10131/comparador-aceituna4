document.addEventListener("DOMContentLoaded", async () => {
  const tipoAceiteSelect = document.getElementById("tipoAceite");
  const periodoBtns = document.querySelectorAll(".periodo-btn");
  const chartCanvas = document.getElementById("chart");
  const yearSelect = document.getElementById("yearSelect");

  let periodo = "Años";
  let chart;

  // ✅ Generar timestamp dinámico para evitar caché
  const timestamp = new Date().getTime();
  const urlHistorico = `https://raw.githubusercontent.com/Turbo10131/comparador-aceituna4/main/precio-aceite-historico.json?v=${timestamp}`;
  const urlActual = `https://raw.githubusercontent.com/Turbo10131/comparador-aceituna4/main/precio-aceite.json?v=${timestamp}`;

  // Cargar datos JSON
  async function cargarDatos() {
    try {
      const response = await fetch(urlHistorico);
      return await response.json();
    } catch (error) {
      console.error("Error cargando datos:", error);
      return {};
    }
  }

  // Agrupar datos por periodo
  function agruparDatosPorPeriodo(datos, periodo, yearFilter = "Todos") {
    const agrupados = {};

    datos.forEach((item) => {
      const fecha = new Date(item.fecha);
      const year = fecha.getFullYear();

      if (yearFilter !== "Todos" && year !== parseInt(yearFilter)) return;

      let clave;
      if (periodo === "Años") {
        clave = year;
      } else if (periodo === "Meses") {
        clave = `${year}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
      } else {
        clave = item.fecha;
      }

      if (!agrupados[clave]) agrupados[clave] = [];
      agrupados[clave].push(item.precio_eur_kg);
    });

    return Object.keys(agrupados).map((clave) => ({
      fecha: clave,
      precio: (
        agrupados[clave].reduce((a, b) => a + b, 0) / agrupados[clave].length
      ).toFixed(3),
    }));
  }

  // Renderizar gráfico
  function renderChart(data, tipo) {
    if (chart) chart.destroy();

    chart = new Chart(chartCanvas, {
      type: "line",
      data: {
        labels: data.map((d) => d.fecha),
        datasets: [
          {
            label: `Aceite de oliva ${tipo}`,
            data: data.map((d) => d.precio),
            borderColor: "rgba(0, 123, 255, 1)",
            backgroundColor: "rgba(0, 123, 255, 0.2)",
            fill: true,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: true },
        },
        scales: {
          x: {
            title: { display: true, text: periodo.slice(0, -1) },
          },
          y: {
            title: { display: true, text: "€/kg" },
          },
        },
      },
    });
  }

  // Poblar selector de años dinámicamente
  function poblarSelectorAnios(datos) {
    const years = [
      ...new Set(datos.map((item) => new Date(item.fecha).getFullYear())),
    ].sort((a, b) => a - b);

    yearSelect.innerHTML =
      `<option value="Todos">Todos los años</option>` +
      years.map((y) => `<option value="${y}">${y}</option>`).join("");
  }

  // Actualizar gráfico
  async function actualizarGrafico() {
    const datos = await cargarDatos();
    const tipo = tipoAceiteSelect.value;

    if (!datos[tipo]) return;

    const yearFilter = yearSelect.value || "Todos";
    const datosFiltrados = agruparDatosPorPeriodo(
      datos[tipo],
      periodo,
      yearFilter
    );

    renderChart(datosFiltrados, tipo);
  }

  // Eventos
  periodoBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      periodoBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      periodo = btn.textContent;
      actualizarGrafico();
    });
  });

  tipoAceiteSelect.addEventListener("change", actualizarGrafico);
  yearSelect.addEventListener("change", actualizarGrafico);

  // Inicialización
  const datos = await cargarDatos();
  if (datos["Aceite de oliva virgen extra"]) {
    poblarSelectorAnios(datos["Aceite de oliva virgen extra"]);
  }
  actualizarGrafico();
});
