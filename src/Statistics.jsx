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

    // 2) fallback: split ponttal/perjellel/kötőjellel; levágjuk a záró pontot
    const parts = String(datum)
      .trim()
      .replace(/\.$/, "")
      .split(/[.\/-]/); // . / -

    // Elvárt: [YYYY, MM, DD]
    if (parts.length >= 2) {
      const m = parseInt(parts[1], 10);
      if (!Number.isNaN(m)) return m - 1; // 0-11
    }
    return null; // ismeretlen formátum
  }

  // Havi statisztikák státuszokra bontva
  function getMonthlyStatusStats(monthIdx) {
    const monthlySchedules = schedules.filter((sch) => {
      const schMonth = getMonthIndexFromDatum(sch?.datum);
      if (schMonth === null) return false;

        const aircraftMatch = selectedAircraft?.length
        ? selectedAircraft.includes(sch.gep_azonosito)
        : true;

      return schMonth === monthIdx && aircraftMatch;
    });

    const total = monthlySchedules.length;

    // Elő-alloc ismert státuszkódokra
    const statusCounts = new Map(statuses.map((s) => [s.jelkod, 0]));

    // Számolás
    for (const sch of monthlySchedules) {
      const code = sch?.tevekenyseg_kod; // Ütemezésben lévő státuszkód (pl. "OK", "CNX" stb.)
      if (statusCounts.has(code)) {
        statusCounts.set(code, statusCounts.get(code) + 1);
      }
    }

    // Eredmény tömb (rendezve darab szerint)
    const rows = statuses.map((s) => {
      const count = statusCounts.get(s.jelkod) || 0;
      const percent = total ? Math.round((count / total) * 100) : 0;
      return {
        jelkod: s.jelkod,
        megnevezes: s.megnevezes ?? "",
        count,
        percent,
      };
    });

    rows.sort((a, b) => b.count - a.count);

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
                  <td>{row.jelkod}</td>
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
