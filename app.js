/* global React, ReactDOM */

(function () {
  const { useEffect, useMemo, useState } = React;

  // Mapeo entre las claves del JSON y las etiquetas del selector
  const KEY_TO_LABEL = {
    "Aceite de oliva virgen extra": "Virgen Extra",
    "Aceite de oliva virgen": "Virgen",
    "Aceite de oliva lampante": "Lampante",
  };

  const LABEL_TO_KEY = Object.fromEntries(
    Object.entries(KEY_TO_LABEL).map(([k, v]) => [v, k])
  );

  function formateaEUR(valor) {
    return `${valor.toLocaleString("es-ES", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} €/kg`;
  }

  function App() {
    const [data, setData] = useState(null);
    const [error, setError] = useState("");
    const [selected, setSelected] = useState("Virgen Extra"); // selección por defecto

    useEffect(() => {
      // cache-buster para evitar caché agresiva
      fetch(`/precio-aceite.json?v=${Date.now()}`)
        .then(r => {
          if (!r.ok) throw new Error("No se pudo cargar el JSON");
          return r.json();
        })
        .then(json => setData(json))
        .catch(err => setError(err.message || "Error al cargar datos"));
    }, []);

    useEffect(() => {
      const p = document.getElementById("last-update");
      if (!p) return;
      if (data?.ultima_actualizacion) {
        p.textContent = `Última actualización: ${new Date(data.ultima_actualizacion).toLocaleString("es-ES")}`;
      } else {
        p.textContent = "";
      }
    }, [data]);

    const opciones = useMemo(() => Object.values(KEY_TO_LABEL), []);
    const precios = data?.precios || {};

    const precioSeleccionado = useMemo(() => {
      const key = LABEL_TO_KEY[selected];
      const item = precios[key];
      return item ? formateaEUR(Number(item.precio_eur_kg || 0)) : "";
    }, [selected, precios]);

    if (error) {
      return <div className="card"><strong>Error:</strong> {error}</div>;
    }

    if (!data) {
      return <div className="card">Cargando…</div>;
    }

    return (
      <div>
        <div className="card">
          <label htmlFor="calidad">Calidad del Aceite</label>
          <select
            id="calidad"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">-- Elegir calidad --</option>
            {opciones.map(op => (
              <option key={op} value={op}>{op}</option>
            ))}
          </select>

          {/* SOLO el precio correspondiente – sin variedad ni fuente */}
          {precioSeleccionado && (
            <p className="precio">Precio {selected}: {precioSeleccionado}</p>
          )}
        </div>

        {/* Resumen con los tres precios (opcional, útil para ver todo de un vistazo) */}
        <div className="card">
          <ul className="lista">
            {Object.entries(KEY_TO_LABEL).map(([jsonKey, label]) => {
              const item = precios[jsonKey];
              if (!item) return null;
              return (
                <li key={jsonKey}>
                  Aceite de oliva {label.toLowerCase()} (Picual): {formateaEUR(Number(item.precio_eur_kg))}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    );
  }

  ReactDOM.createRoot(document.getElementById("root")).render(<App />);
})();
