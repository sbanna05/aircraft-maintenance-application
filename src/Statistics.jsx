import { useState, useEffect } from "react";

function Statistics({ selectedAircraft, statuses, schedules, airports }) {
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
    if (!selectedAircraft) return;
    if (cache[selectedAircraft]) {
      setStatsByMonth(cache[selectedAircraft]);
      return;
    }

    async function fetchStats() {
      const data = await window.api.getStatsByMonth(selectedAircraft);
      setCache((prev) => ({ ...prev, [selectedAircraft]: data }));
      setStatsByMonth(data);
    }

    fetchStats();
  }, [selectedAircraft]);

  function parseDateTime(event_timestamp) {
    const [datumStr, timeStr] = event_timestamp.split(" ");
    // datumStr: "2025.01.01"
    const [y, m, d] = datumStr.split(".").map(Number);
    const [hh, mm, ss] = timeStr.split(":").map(Number);
    return new Date(y, m - 1, d, hh, mm, ss); // hónap 0-indexes!
  }

  function getOpeningRule(airportname, datum) {
    const defaultHours = {
      hetvege: { open: 9, close: 14 },
      hetkoznap: { open: 6, close: 16 },
    };
    const airport = airports.find((a) => a.repter_id === airportname);
    const openingHours = airport?.nyitvatartas
      ? JSON.parse(airport.nyitvatartas)
      : defaultHours;
    const day = datum.getDay();
    return day === 0 || day === 6
      ? openingHours.hetvege || defaultHours.hetvege
      : openingHours.hetkoznap || defaultHours.hetkoznap;
  }

  function isWithinOpening(begin, rule) {
    const hour = begin.getHours();
    return hour >= rule.open && hour <= rule.close;
  }

  function countWeekdaysAndWeekends(year, monthIdx) {
    let weekdays = 0;
    let weekends = 0;

    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

    for (let d = 1; d <= daysInMonth; d++) {
      const day = new Date(year, monthIdx, d).getDay(); // 0=vasárnap, 6=szombat
      if (day === 0 || day === 6) {
        weekends++;
      } else {
        weekdays++;
      }
    }
    return { weekdays, weekends, daysInMonth };
  }

  // Biztosabb hónap-kinyerés: kezeli az "YYYY-MM-DD", "YYYY.MM.DD" és "YYYY.MM.DD." formátumokat is
  function getMonthlyStats(monthIdx) {
    const monthly = statsbymonth.filter((s) => s.monthIdx === monthIdx);
    if (monthly.length === 0) return { summary: null, rows: [] };
    const statusCounts = {}; //összesített státusz darabszám
    const airportCounter = {};
    const airportHours = {};

    const statusOutOfOpening = {}; // zárvatartási órákon kívüli státuszok darabszáma
    const statusInOpening = {}; // nyitvatartási órákon belüli státuszok darabszáma

    monthly.forEach((s) => {
      statusCounts[s.jelkod] = s.count;

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
    let dominantAirport =
      Object.entries(airportCounter).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      "LHDC";
    // ha nincs reptérhez tárolt nyitvatartás → default LHDC
    const openingRules = airportHours[dominantAirport] || {
      hetvege: { open: 9, close: 14 },
      hetkoznap: { open: 6, close: 16 },
    };

    schedules
      .filter((sch) => {
        const dt = parseDateTime(sch.event_timestamp);
        return dt.getMonth() === monthIdx && sch.aircraft === selectedAircraft;
      })
      .forEach((sch) => {
        const dt = parseDateTime(sch.event_timestamp);
        const rule = getOpeningRule(dominantAirport, dt);
        const inside = isWithinOpening(dt, rule);

        if (inside) {
          statusInOpening[sch.status] = (statusInOpening[sch.status] || 0) + 1;
        } else {
          statusOutOfOpening[sch.status] =
            (statusOutOfOpening[sch.status] || 0) + 1;
        }
      });
    // adott hónap napjainak száma, és nyitvatartási órák számítása
    const year = new Date().getFullYear();
    const { weekdays, weekends, daysInMonth } = countWeekdaysAndWeekends(
      year,
      monthIdx
    );

    const weekdayHours =
      openingRules.hetkoznap.close - openingRules.hetkoznap.open;
    const weekendHours = openingRules.hetvege.close - openingRules.hetvege.open;

    const totalOpenHours = weekdays * weekdayHours + weekends * weekendHours;
    const closedHours = daysInMonth * 24 - totalOpenHours;

    const notamHours = statusCounts["n"] || 0;
    const availableHours = totalOpenHours - notamHours;

    const summary = {
      totalHours: daysInMonth * 24,
      dominantAirport,
      closedHours,
      notamHours,
      availableHours,
      inClosedHourCountFull: Object.values(statusOutOfOpening).reduce(
        (a, b) => a + b,
        0
      ),
    };

    // minden státuszt megjelenítünk (n kivéve)
    const rows = statuses
      .filter((s) => !["n", "-"].includes(s.jelkod))
      .map((s) => {
        const count = statusCounts[s.jelkod] || 0;
        const percent = availableHours
          ? ((count / availableHours) * 100).toFixed(1)
          : 0;
        return {
          jelkod: s.jelkod,
          megnevezes: s.jelentes ?? "",
          count,
          percent,
          inClosedHourCount: statusOutOfOpening[s.jelkod] || 0,
          inOpenHourCount: statusInOpening[s.jelkod] || 0,
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
                  <td>
                    <b>Összesen (hónap óraszám)</b>
                  </td>
                  <td>{summary.totalHours}</td>
                  <td>{"100%"}</td>
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
                  <td>
                    <b>Elérhető órák</b>
                  </td>
                  <td>
                    <b>{summary.availableHours}</b>
                  </td>
                  <td>
                    <b>
                      {(
                        (summary.availableHours / summary.totalHours) *
                        100
                      ).toFixed(1)}
                      %
                    </b>
                  </td>
                </tr>
                <tr>
                  <td>Zárvatartási órákon kívüli események</td>
                  <td>{summary.inClosedHourCountFull}</td>
                  <td>
                    {summary.availableHours
                      ? (
                          (summary.inClosedHourCountFull /
                            summary.availableHours) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
                  </td>
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
                  <th>Darab: Nyitva/Zárva</th>
                  <th>%</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.jelkod}>
                    <td>{row.megnevezes}</td>
                    <td>
                      <b>{row.count}</b>: ({row.inOpenHourCount}/
                      {row.inClosedHourCount})
                    </td>
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
