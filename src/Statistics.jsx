import React, { useState, useEffect } from "react";

function Statistics({ selectedAircraft }) {
  const [statuses, setStatuses] = useState([]);
  const [statsbymonth, setStatsByMonth] = useState([]);
  const [cache, setCache] = useState({}); // egyszerű cache a hónapokhoz

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
    async function fetchStatuses() {
      const list = await window.api.getStatuses();
      setStatuses(Array.isArray(list) ? list : []);
    }
    fetchStatuses();
  }, []);

  
useEffect(() => {
  if (!selectedAircraft) return;
  if (cache[selectedAircraft]) {
    setStatsByMonth(cache[selectedAircraft]);
    return;
  }

  async function fetchStats() {
    const data = await window.api.getStatsByMonth(selectedAircraft);
    setCache(prev => ({ ...prev, [selectedAircraft]: data }));
    setStatsByMonth(data);
  }

  fetchStats();
}, [selectedAircraft]);

  // Biztosabb hónap-kinyerés: kezeli az "YYYY-MM-DD", "YYYY.MM.DD" és "YYYY.MM.DD." formátumokat is
  function getMonthlyStats(monthIdx) {
    const monthly = statsbymonth.filter((s) => s.monthIdx === monthIdx);
    let total = 0;
    const statusCounts = {};

    monthly.forEach((s) => {
      statusCounts[s.jelkod] = s.count;
      total += s.count;
    });

    // minden státuszt megjelenítünk (m kivéve)
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
        const { rows, total } = getMonthlyStats(idx);
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
                  <td>
                    <b>Összesen</b>
                  </td>
                  <td>
                    <b>{total}</b>
                  </td>
                  <td>
                    <b>{total ? "100%" : "0%"}</b>
                  </td>
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
