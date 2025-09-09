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
    const monthly = statsbymonth.filter((s) => s.monthIdx === monthIdx)
    if (monthly.length === 0) return { summary: null, rows: [] };
    ;

    let total = 0;
    const statusCounts = {};
    const airportCounter = {};

    monthly.forEach((s) => {
      statusCounts[s.jelkod] = (statusCounts[s.jelkod] || 0) + 1;
      total++;

      if (s.airport) {
        airportCounter[s.airport] = (airportCounter[s.airport] || 0) + 1;
      }
    });
    // domináns reptér
    const dominantAirport = "N/A"; // jelenleg nincs repülőtér adat

    //const dominantAirport = Object.entries(airportCounter).sort((a,b) => b[1]-a[1])[0]?.[0] || "N/A";


    monthly.forEach((s) => {
      statusCounts[s.jelkod] = s.count;
      total += s.count;
    });
    
    // hónap napjai
    const year = new Date().getFullYear();
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

    let totalHours = 0;
    let closedHours = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const day = new Date(year, monthIdx, d).getDay(); // 0=vasárnap, 6=szombat
      const openStart = day === 0 || day === 6 ? 9 : 6;
      const openEnd   = (day === 0 || day === 6) ? 14 :16

      // napi nyitvatartási órák
      const openHours = openEnd - openStart;
      totalHours += openHours;

      // összes óra (24h) - nyitva = zárva
      closedHours += 24 - openHours;
    }
    
    totalHours += closedHours; // összes nyitvatartási óra a hónapban
    const notamHours = statusCounts["n"] || 0;
    const availableHours = totalHours - closedHours - notamHours;

    const summary = {
      totalHours,
      dominantAirport,
      closedHours,
      notamHours,
      availableHours,
    };

    // minden státuszt megjelenítünk (m kivéve)
    const rows = statuses
      .filter((s) => !["m","n"].includes(s.jelkod))
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

    return { rows, summary };
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
        const { rows, summary } = getMonthlyStats(idx);
        if (!summary) return null;
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
            <table className="table table-sm" style={{ fontSize: "0.85rem" }}>
              <tbody>
                <tr>
                  <td><b>Összesen (hónap óraszám)</b></td>
                  <td>{summary.totalHours}</td>
                  <td>{'100%'}</td>
                  
                </tr>
                <tr>
                  <td>Domináns reptér</td>
                  <td>{summary.dominantAirport}</td>
                  <td>-</td>
                </tr>
                <tr>
                  <td>Zárvatartás órák</td>
                  <td>{summary.closedHours}</td>
                  <td>-</td>
                </tr>
                <tr>
                  <td>NOTAM órák</td>
                  <td>{summary.notamHours}</td>
                  <td>-</td>
                </tr>
                <tr>
                  <td><b>Elérhető órák</b></td>
                  <td><b>{summary.availableHours}</b></td>
                  <td><b>{((summary.availableHours / summary.totalHours) * 100).toFixed(1)}%</b></td>
                </tr>
              </tbody>
            </table>
            
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
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

export default Statistics;
