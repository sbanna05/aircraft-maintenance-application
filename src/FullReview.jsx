import React, { useState, useEffect, useMemo } from 'react';
import Statistics from './Statistics';

function FullReview() {
  const [aircrafts, setAircrafts] = useState([]);
  const [selectedAircraft, setSelectedAircraft] = useState(null);
  const [usageData, setUsageData] = useState([]);
  const [month, setMonth] = useState('');
  const [statuses, setStatuses] = useState('');

  // Gépek betöltése
  useEffect(() => {
    async function fetchAircrafts() {
      const list = await window.api.getAircrafts();
      setAircrafts(list);
    }
    fetchAircrafts();
  }, []);

  // Adatok betöltése
  useEffect(() => {
    if (!selectedAircraft) {
      setUsageData([]);
      return;
    }
    async function fetchData() {
      let yearMonth = null;
      if (month) {
        const [yearFull, monthStr] = month.split('-'); // ["2025", "05"]
        yearMonth = `${yearFull}.${monthStr}.%`; // pl. "2025.02.%"
        //const monthNum = String(parseInt(monthStr, 10)); // 5 vagy 05 helyett 5
        //yearMonth = `${yearFull}.${monthNum}.%`;
      }
      const data = await window.api.getSchedules(selectedAircraft, yearMonth);
      console.log('usageData:', data);
      setUsageData(data);
    }
    fetchData();
  }, [selectedAircraft, month]);

  // Státuszok betöltése
useEffect(() => {
  async function fetchStatuses() {
    const list = await window.api.getStatuses();
    setStatuses(list);
  }
  fetchStatuses();
}, []);

function getStatusColor(code) {
  const status = statuses.find(s => s.jelkod === code);
  return status ? status.color : 'transparent';
}
function getStatusMeaning(code) {
  const status = statuses.find(s => s.jelkod === code);
  return status ? status.jelentes : 'Ismeretlen';
}

const usageMap = useMemo(() => {
    const map = {}; // map[datum][hour] = status
    usageData.forEach(r => {  
      if (!r.event_timestamp) return;
      const [datum, time] = r.event_timestamp.split(' '); // "2025.05.12", "14:00:00"
      const startHour = parseInt(time.split(':')[0], 10); // 14
      const endHour = (startHour === 23) ? 24 : startHour + 1;

      if (!map[datum]) map[datum] = {}; // napokhoz objektum
      for (let h = startHour; h < endHour; h++) {
        map[datum][h] = r.status; // órákhoz státusz
      }
    });
    return map; // { "2025.05.12": { 14: "r", 15: "k" }, ... }
  }, [usageData]);

// ---- Naptár mátrix előkészítése ----
const hours = Array.from({ length: 24 }, (_, i) => i); // 0-23
const days = Object.keys(usageMap).sort((a,b) => new Date(a) - new Date(b));

const calendarMatrix = useMemo(() => {
  return hours.map(hour => {
    const row = { hour: `${hour}:00` };
    days.forEach(day => {
      row[day] = usageMap[day]?.[hour] || '';
    });
    return row;
  });
}, [usageMap]);


 return (
    <>
   
    <div className="mt-2">
      <h2 className="mb-3 center">Gépek</h2>
      <div className="mb-4 d-flex flex-wrap">
        {aircrafts.map(({ name }) => (
          <button
            key={name}
            onClick={() => setSelectedAircraft(name)}
            className={`btn me-2 mb-2 ${
              selectedAircraft === name ? 'btn-success' : 'btn-outline-secondary'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      <Statistics selectedAircraft={selectedAircraft}/>

      <div className="mb-4">
        <label className="form-label">
          Hónap kiválasztása:
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="form-control mb-2"
            style={{ width: 'auto' }}
          />
        </label>
      </div>

      {usageData.length > 0 ? (
        <div className="table table-sm " style={{ overflowX: 'auto' }}>
          <h3 className="mb-3">
            {selectedAircraft} - {month}
          </h3>
          <table className="table table-bordered table-hover text-center align-middle">
            <thead className="table-secondary">
              <tr>
                <th scope="col">Óra</th>
                {days.map(day => (
                  <th key={day} scope="col">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {calendarMatrix.map(row => (
                <tr key={row.hour}>
                  <td className="fw-bold">{row.hour}</td>
                  {days.map(day => (
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