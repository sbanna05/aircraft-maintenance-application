import { useState, useEffect, useMemo } from "react";
import Statistics from "./Statistics";

function FullReview({ aircrafts, statuses, schedules, airports }) {
  const [selectedAircraft, setSelectedAircraft] = useState(null);
  const [usageData, setUsageData] = useState([]);
  const [month, setMonth] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());

  // Adatok betöltése
  useEffect(() => {
    if (!selectedAircraft) {
      setUsageData([]);
      return;
    }
    async function fetchData() {
      let yearMonth = null;
      if (month) {
        yearMonth = `${year}-${month}-%`; // most a year state-et használjuk
      }
      const data = await window.api.getSchedules(year, selectedAircraft, yearMonth);
      console.log("usageData:", data);
      setUsageData(data);
    }
    fetchData();
  }, [year, selectedAircraft, month]);

  // Évlista a schedules alapján
  const  availableYears = useMemo(() => {
      const yearsSet = new Set();
      schedules.forEach((sch) => {
        if (!sch.event_timestamp) return;
        const y = parseInt(sch.datum.split(".")[0], 10); // "2025.05.12" -> "2025" -> 2025
        yearsSet.add(y);
      });
      return Array.from(yearsSet).sort((a,b) => b - a); // csökkenő sorrend
    }, [schedules]);

  // ---- Segédfüggvények a státuszokhoz ---- ne számoljuk újra minden rendernél
  const statusMap = useMemo(() => {
    const map = {};
    statuses.forEach((s) => {
      map[s.jelkod] = { color: s.color, meaning: s.jelentes };
    });
    return map;
  }, [statuses]);

  function getStatusColor(code) {
    return statusMap[code]?.color || "transparent";
  }

  function getStatusMeaning(code) {
    return statusMap[code]?.meaning || "Ismeretlen";
  }



  const usageMap = useMemo(() => {
    const map = {}; // map[datum][hour] = status
    usageData.forEach((r) => {
      if (!r.event_timestamp) return;
      const [datum, time] = [r.datum, r.kezdes]; // "2025.05.12", "14:00:00"
      const startHour = parseInt(time.split(":")[0], 10); // 14
      const endHour = startHour === 23 ? 24 : startHour + 1;

      if (!map[datum]) map[datum] = {}; // napokhoz objektum
      for (let h = startHour; h < endHour; h++) {
        map[datum][h] = r.status; // órákhoz státusz
      }
    });

    // Nyitvatartási órák jelzése "m"-ként
    const defaultOpening = {
      hetvege: { open: 9, close: 14 },
      hetkoznap: { open: 6, close: 16 },
    };
    Object.keys(map).forEach((datum) => {
      const day = new Date(datum).getDay();
      const rule =
        day === 0 || day === 6
          ? defaultOpening.hetvege
          : defaultOpening.hetkoznap;
      for (let h = 0; h < 24; h++) {
        if (h <= rule.open || h >= rule.close) {
          if (!map[datum][h]) map[datum][h] = "-";
        }
      }
    });
    return map; // { "2025.05.12": { 14: "r", 15: "k" }, ... }
  }, [usageData]);

  // ---- Naptár mátrix előkészítése ----
  const hours = Array.from({ length: 24 }, (_, i) => i); // 0-23
  const days = Object.keys(usageMap).sort((a, b) => new Date(a) - new Date(b));

  const calendarMatrix = useMemo(() => {
    return hours.map((hour) => {
      const row = { hour: `${hour}:00` };
      days.forEach((day) => {
        row[day] = usageMap[day]?.[hour] || "";
      });
      return row;
    });
  }, [usageMap]);

  return (
    <>
      <div className="mt-2">
        <div className="d-flex mb-4 justify-content-between align-items-center">
          <div className="d-flex flex-column align-items-center">
            <h2 className="mb-3 align-middle">Gépek</h2>
            <div className="mb-4 d-flex flex-wrap">
              {aircrafts.map(({ name }) => (
                <button
                  key={name}
                  onClick={() => setSelectedAircraft(name)}
                  className={`btn me-2 mb-2 ${
                    selectedAircraft === name
                      ? "btn-success"
                      : "btn-outline-secondary"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
  
          <div className="mb-4">
            <strong>Év kiválasztása:</strong>
            <select
              className="form-select d-inline-block w-auto ms-2"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Statistics
          selectedAircraft={selectedAircraft}
          statuses={statuses}
          schedules={schedules}
          airports={airports}
          year={year}
        />
      </div>
      <div>
        <div className="mb-4">
          <label className="form-label">
            Hónap kiválasztása:
            <input
              type="month"
              value={month ? `${year}-${month}`: ""}
              onChange={(e) => {
                const [, m] = e.target.value.split("-");
                setMonth(m);
              }}
              className="form-control mb-2"
              style={{ width: "auto" }}
            />
          </label>
        </div>

        {usageData.length > 0 ? (
          <div className="table table-sm " style={{ overflowX: "auto" }}>
            <h3 className="mb-3">
              {selectedAircraft} - {month}
            </h3>
            <table className="table table-bordered table-hover text-center align-middle">
              <thead className="table-secondary">
                <tr>
                  <th scope="col">Óra</th>
                  {days.map((day) => (
                    <th key={day} scope="col">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {calendarMatrix.map((row) => (
                  <tr key={row.hour}>
                    <td className="fw-bold">{row.hour}</td>
                    {days.map((day) => (
                      <td
                        key={day}
                        style={{ backgroundColor: getStatusColor(row[day]) }}
                        title={getStatusMeaning(row[day])}
                      >
                        {row[day]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : selectedAircraft ? (
          <p>Nincsenek adatok erre a hónapra.</p>
        ) : null}
      </div>
    </>
  );
}

export default FullReview;
