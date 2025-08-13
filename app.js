fetch('precio-aceite.json?v=' + Date.now())
    .then(response => {
        if (!response.ok) throw new Error("Error al cargar JSON");
        return response.json();
    })
    .then(datos => {
        document.getElementById('fecha-actualizacion').textContent =
            new Date(datos.ultima_actualizacion).toLocaleString('es-ES');

        let html = '';
        for (let tipo in datos.precios) {
            const item = datos.precios[tipo];
            html += `<p class="precio">${tipo} (${item.variedad}): ${item.precio_eur_kg.toFixed(3)} €/kg</p>`;
        }
        document.getElementById('lista-precios').innerHTML = html;
    })
    .catch(error => {
        document.getElementById('lista-precios').textContent = "Error al cargar los precios.";
        console.error(error);
    });
