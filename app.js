// app.js

async function cargarDatos() {
  try {
    const res = await fetch("datos.json", { cache: "no-store" });
    const datos = await res.json();

    const contenedor = document.getElementById("app");
    contenedor.innerHTML = "";

    // Aviso si no hay cierre de operaciones
    if (datos.sin_cierre_operaciones) {
      const aviso = document.createElement("div");
      aviso.textContent =
        "⚠️ Hoy no hay cierre de operaciones en Infaoliva. Se muestran los últimos precios disponibles.";
      aviso.style.margin = "12px 0";
      aviso.style.padding = "10px 12px";
      aviso.style.background = "#fff3cd";
      aviso.style.border = "1px solid #ffe69c";
      aviso.style.borderRadius = "8px";
      aviso.style.color = "#5c4f00";
      contenedor.appendChild(aviso);
    }

    // Título con fecha
    const titulo = document.createElement("h2");
    titulo.innerHTML = "📊 Precios del Aceite de Oliva (Infaoliva)";
    contenedor.appendChild(titulo);

    const fecha = document.createElement("p");
    fecha.textContent = `Última actualización: ${datos.fecha}`;
    contenedor.appendChild(fecha);

    // Input de rendimiento
    const inputRend = document.createElement("div");
    inputRend.innerHTML = `
      <label for="rendimiento"><strong>Rendimiento (%)</strong></label>
      <input id="rendimiento" type="number" min="0" max="100" value="20" class="form-control" />
      <small>Introduce un número entre 0 y 100.</small>
    `;
    contenedor.appendChild(inputRend);

    // Selector de tipo de aceite
    const selectDiv = document.createElement("div");
    selectDiv.innerHTML = `
      <label for="tipo"><strong>Calidad del Aceite</strong></label>
      <select id="tipo" class="form-control"></select>
    `;
    contenedor.appendChild(selectDiv);

    // Tabla de precios
    const tabla = document.createElement("table");
    tabla.className = "tabla-precios";
    tabla.innerHTML = `
      <thead>
        <tr>
          <th>Tipo de aceite de oliva</th>
          <th>Precio €/kg</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    contenedor.appendChild(tabla);

    const cuerpoTabla = tabla.querySelector("tbody");

    Object.entries(datos.precios).forEach(([tipo, info]) => {
      const row = document.createElement("tr");

      const tdTipo = document.createElement("td");
      tdTipo.textContent = tipo;

      const tdPrecio = document.createElement("td");
      tdPrecio.textContent = info.precio_eur_kg
        ? info.precio_eur_kg.toFixed(3) + " €"
        : "—";

      row.appendChild(tdTipo);
      row.appendChild(tdPrecio);
      cuerpoTabla.appendChild(row);
    });

    // Rellenar el selector
    const select = document.getElementById("tipo");
    Object.keys(datos.precios).forEach((tipo) => {
      const opt = document.createElement("option");
      opt.value = tipo;
      opt.textContent = tipo;
      select.appendChild(opt);
    });

    // Zona resultado calculadora
    const resultadoDiv = document.createElement("div");
    resultadoDiv.id = "resultado";
    resultadoDiv.style.marginTop = "15px";
    resultadoDiv.style.padding = "10px";
    resultadoDiv.style.border = "1px solid #ddd";
    resultadoDiv.style.borderRadius = "8px";
    resultadoDiv.style.background = "#f9f9f9";
    contenedor.appendChild(resultadoDiv);

    function calcular() {
      const tipoSeleccionado = select.value;
      const rendimiento = parseFloat(
        document.getElementById("rendimiento").value
      );
      const precioAceite = datos.precios[tipoSeleccionado]?.precio_eur_kg;

      if (!rendimiento || !precioAceite) {
        resultadoDiv.textContent = "Introduce un rendimiento válido.";
        return;
      }

      const precioAceituna = (rendimiento / 100) * precioAceite;
      resultadoDiv.innerHTML = `
        <strong>Resultado:</strong><br>
        Con un rendimiento del <strong>${rendimiento}%</strong> y el precio de aceite seleccionado,
        cobrarías <strong>${precioAceituna.toFixed(3)} €/kg</strong> de aceituna.
      `;
    }

    select.addEventListener("change", calcular);
    document.getElementById("rendimiento").addEventListener("input", calcular);

    calcular(); // cálculo inicial
  } catch (err) {
    document.getElementById("app").innerHTML =
      "❌ Error cargando datos: " + err.message;
  }
}

cargarDatos();
