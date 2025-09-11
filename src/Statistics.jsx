import { useState, useEffect } from "react";

function Statistics({ selectedAircraft, statuses }) {
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
    const airportHours = {};

    monthly.forEach((s) => {
      statusCounts[s.jelkod] = s.count;
      total += s.count;

      if (s.airport) {
        airportCounter[s.airport] = (airportCounter[s.airport] || 0) + 1;
      if (s.nyitvatartas) {
        try {
          airportHours[s.airport] = JSON.parse(s.nyitvatartas);
        } catch (e) {
          console.warn("Hibás nyitvatartás JSON:", s.nyitvatartas);
        }
      }
      }
    });

    // domináns reptér
    let dominantAirport = Object.entries(airportCounter).sort((a,b) => b[1]-a[1])[0]?.[0] || "LHDC";
    // ha nincs reptérhez tárolt nyitvatartás → default LHDC
    const openingRules =
      airportHours[dominantAirport] ||
      {
        hetvege: { open: 9, close: 14 },
        hetkoznap: { open: 6, close: 16 },
      };
    // hónap napjai
    const year = new Date().getFullYear();
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

    let totalOpenHours = 0;
    let closedHours = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const day = new Date(year, monthIdx, d).getDay(); // 0=vasárnap, 6=szombat
      
      const rule = day === 0 || day === 6 ? openingRules.hetvege : openingRules.hetkoznap;
      const openStart = rule.open;
      const openEnd = rule.close;

      // napi nyitvatartási órák
      const openHours = openEnd - openStart;
      totalOpenHours += openHours;
      closedHours += 24 - openHours;
    }
    
    const notamHours = statusCounts["n"] || 0;
    const availableHours = totalOpenHours - notamHours;

    const summary = {
      totalHours: daysInMonth * 24,
      dominantAirport,
      closedHours,
      notamHours,
      availableHours,
    };

    // minden státuszt megjelenítünk (n kivéve)
    const rows = statuses
      .filter((s) => !["n"].includes(s.jelkod))
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
