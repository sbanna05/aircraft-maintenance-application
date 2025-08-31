import React, { useState, useEffect } from "react";
import './App.css'; // Assuming you have some styles for the Input component


function Input() {
  const [aircrafts, setAircrafts] = useState([]);
  const [airports, setAirports] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [events, setEvents] = useState([]);
  const [formData, setFormData] = useState({
    aircraft: "",
    airport: "",
    event: "",
    start: "",
    end: "",
    note: "",
  });

   useEffect(() => {
  async function fetchAll() {
    const [schedules, aircrafts, airports, events] = await Promise.all([
      window.api.getSchedules(),
      window.api.getAircrafts(),
      window.api.getAirports(),
      window.api.getStatuses(),
    ]);
    setSchedules(schedules);
    setAircrafts(aircrafts);
    setAirports(airports);
    setEvents(events);
  }
  fetchAll();
}, []);


  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  }

  async function handleSave() {
    if (
      !formData.aircraft ||
      !formData.event ||
      !formData.start ||
      !formData.end
    ) {
      alert("Minden kötelező mezőt tölts ki!");
      return;
    }

    await window.api.addSchedule(
      formData.aircraft,
      formData.airport,
      formData.event,
      formData.start,
      formData.end,
      formData.note
    );

    // újra lekérjük az adatokat
    const updated = await window.api.getSchedules();
    setSchedules(updated);

    // ürítjük a formot
    setFormData({
      aircraft: "",
      airport: "",
      event: "",
      start: "",
      end: "",
      note: "",
    });
  }

  
  // lapozáshoz state-ek
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Lapozáshoz szükséges adatok
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = schedules.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(schedules.length / rowsPerPage);

  return (
    <>
      <table className="table table-bordered table-striped">
        <thead>
          <tr className="table-primary">
            <th>Gép azonosító</th>
            <th>Reptér</th>
            <th>Event</th>
            <th>Kezdés időpont</th>
            <th>Vége időpont</th>
            <th>Megjegyzés</th>
            <th>Művelet</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <select
                name="aircraft"
                id="aircraft"
                value={formData.aircraft}
                onChange={handleChange}
              >
                <option value="">Válassz gépet</option>
                {aircrafts.map((aircraft) => (
                  <option key={aircraft.name} value={aircraft.name}>
                    {aircraft.name}
                  </option>
                ))}
              </select>
            </td>
            <td>
              <select
                name="airport"
                id="airport"
                value={formData.airport}
                onChange={handleChange}
              >
                <option value="">Válassz repteret</option>
                {airports.map((airport) => (
                  <option key={airport.repter_id} value={airport.repter_id}>
                    {airport.repter_id}
                  </option>
                ))}
              </select>
            </td>
            <td>
              <select
                name="event"
                id="event"
                value={formData.event}
                onChange={handleChange}
              >
                <option value="">Válassz eseményt</option>
                {events.map((event) => (
                  <option key={event.jelkod} value={event.jelkod}>
                    {event.jelentes}
                  </option>
                ))}
              </select>
            </td>
            <td>
              <input
              id="start"
              type="datetime-local"
                name="start"
                value={formData.start}
                onChange={handleChange}
              />
            </td>
            <td>
              <input
              id="end"
                type="datetime-local"
                name="end"
                value={formData.end}
                onChange={handleChange}
              />
            </td>
             <td>
              <input
              id="note"
                type="text"
                name="note"
                value={formData.note || ""}
                onChange={handleChange}
              />
            </td>
            <td>
              <button className="btn btn-primary" onClick={handleSave}>Mentés</button>
            </td>
          </tr>
        </tbody>
      </table>

      {/* --- Schedules lista + lapozás --- */}
      <div className="d-flex justify-content-between align-items-center mb-2">
        <span>Összesen: {schedules.length} rekord</span>
        <div>
          <label> Sor / oldal: </label>
          <select
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value, 10));
              setCurrentPage(1); // mindig vissza első oldalra
            }}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      <table className="table table-bordered table-striped">
        <thead>
          <tr className="table-secondary">
            <th>Gép azonosító</th>            
            <th>Dátum</th>
            <th>Esemény</th>
            <th>Kezdés időpont</th>
            <th>Vége időpont</th>
            <th>Megjegyzés</th>
          </tr>
        </thead>
        <tbody>
          {currentRows.map((schedule, index) => (
            <tr key={index}>
              <td>{schedule.gep_azonosito}</td>              
              <td>{schedule.datum}</td>
              <td>{schedule.tevekenyseg_kod}</td>
              <td>{schedule.kezdes_idopont}</td>
              <td>{schedule.vege_idopont}</td>
              <td>{schedule.megjegyzes}</td>
              <td>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={async () => {
                    await window.api.deleteSchedule(schedule.esemeny_id);
                    setSchedules(await window.api.getSchedules()); // frissítés törlés után
                  }}
                >
                  Törlés
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Lapozás */}
      {/* --- Lapozó --- */}
<nav>
  <ul className="pagination">
    <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
      <button className="page-link" onClick={() => setCurrentPage(currentPage - 1)}>
        Előző
      </button>
    </li>

    {/* Első oldal */}
    {currentPage > 3 && (
      <>
        <li className="page-item">
          <button className="page-link" onClick={() => setCurrentPage(1)}>1</button>
        </li>
        <li className="page-item disabled"><span className="page-link">...</span></li>
      </>
    )}

    {/* Aktuális oldal körül ±2 oldal */}
    {Array.from({ length: totalPages }, (_, i) => i + 1)
      .filter(page => page >= currentPage - 2 && page <= currentPage + 2)
      .map(page => (
        <li key={page} className={`page-item ${currentPage === page ? "active" : ""}`}>
          <button className="page-link" onClick={() => setCurrentPage(page)}>
            {page}
          </button>
        </li>
      ))}

    {/* Utolsó oldal */}
    {currentPage < totalPages - 2 && (
      <>
        <li className="page-item disabled"><span className="page-link">...</span></li>
        <li className="page-item">
          <button className="page-link" onClick={() => setCurrentPage(totalPages)}>{totalPages}</button>
        </li>
      </>
    )}

    <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
      <button className="page-link" onClick={() => setCurrentPage(currentPage + 1)}>
        Következő
      </button>
    </li>
  </ul>
</nav>

    </>
  );
}
export default Input;
