import React, { useState, useEffect } from "react";

function Statistics({ selectedAircraft }) {
  const [schedules, setSchedules] = useState([]);
  const [statuses, setStatuses] = useState([]);

  const months = [
    "Január",
    "Február",
    "Március",
    "Április",
    "Május",
    "Június",
    "Július",
    "Augusztus",
    "Szeptember",
    "Október",
    "November",
    "December",
  ];

  useEffect(() => {
    async function fetchSchedules() {
      const list = await window.api.getSchedules();
      setSchedules(Array.isArray(list) ? list : []);
    }
    async function fetchStatuses() {
      const list = await window.api.getStatuses();
      setStatuses(Array.isArray(list) ? list : []);
    }
    fetchSchedules();
    fetchStatuses();
  }, []);

  // Biztosabb hónap-kinyerés: kezeli az "YYYY-MM-DD", "YYYY.MM.DD" és "YYYY.MM.DD." formátumokat is
 function getMonthIndexFromDatum(datum) {
  if (!datum) return null;
  // Több szóköz kezelése, formátumok: YYYY.MM.DD, YYYY.MM.DD., YYYY-MM-DD
  const match = datum.match(/(\d{4})[.\-]\s*(\d{1,2})[.\-]\s*(\d{1,2})/);
  if (!match) return null;
  const month = parseInt(match[2], 10);
  return month - 1; // 0–11
}

  function getMonthlyStatusStats(monthIdx) {
    // Számolás: egy passzban, csak az "m" nélküli státuszokat
    const statusCounts = {};
    let total = 0;

    schedules.forEach((sch) => {
      const schMonth = getMonthIndexFromDatum(sch?.datum);
      const gep_azonosito = sch.aircraft ?? null;
      const aircraftMatch = selectedAircraft?.length 
              ? selectedAircraft.includes(gep_azonosito) : true;

      if (schMonth === monthIdx && aircraftMatch && sch.status !== "m") {
        statusCounts[sch.status] = (statusCounts[sch.status] || 0) + 1;
        total += 1;
      }
  });

    // Eredmény tömb: minden státusz, ami nem "m", még ha 0 is
    const rows = statuses
      .filter((s) => s.jelkod !== "m")
      .map((s) => {
        const count = statusCounts[s.jelkod] || 0;
        const percent = total ? ((count / total) * 100).toFixed(1) : 0;
        return {
          jelkod: s.jelkod,
          megnevezes: s.jelentes ?? "",
          count,
          percent,
      };
    });

    return { rows, total };
  }

 return (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
      gap: "1rem",
    }}
  >
    {months.map((month, idx) => {
      const { rows, total } = getMonthlyStatusStats(idx);
      return (
        <div
          key={month}
          style={{
            border: "1px solid #ccc",
            borderRadius: "8px",
            padding: "0.5rem",
            backgroundColor: "#fafafa",
          }}
        >
          <h4 style={{ textAlign: "center", fontSize: "1rem" }}>{month}</h4>
          <table
            className="table table-sm"
            border="1"
            cellPadding="2"
            style={{
              width: "100%",
              fontSize: "0.85rem",
              textAlign: "center",
            }}
          >
            <thead>
              <tr>
                <th>Státusz</th>
                <th>Darab</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.jelkod}>
                  <td>{row.megnevezes}</td>
                  <td>{row.count}</td>
                  <td>{row.percent}%</td>
                </tr>
              ))}
              <tr>
                <td><b>Összesen</b></td>
                <td><b>{total}</b></td>
                <td><b>{total ? "100%" : "0%"}</b></td>
              </tr>
            </tbody>
          </table>
        </div>
      );
    })}
  </div>
);



}

export default Statistics;
