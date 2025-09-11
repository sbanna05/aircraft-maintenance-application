import { useState, useEffect } from 'react';
import './App.css';
import Input from './Input';
import Editor from './Editor';
import FullReview from './FullReview';

function App() {
  const [page, setPage] = useState('home'); // kezdetben főoldal
  // Globális adatok
  const [aircrafts, setAircrafts] = useState([]);
  const [airports, setAirports] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [schedules, setSchedules] = useState([]);

  useEffect(() => {
      async function fetchAll() {
        const [schedules, aircrafts, airports, statuses] = await Promise.all([
          window.api.getSchedules(),
          window.api.getAircrafts(),
          window.api.getAirports(),
          window.api.getStatuses(),
        ]);
        setSchedules(schedules);
        setAircrafts(aircrafts);
        setAirports(airports);
        setStatuses(statuses);
      }
      fetchAll();
    }, []);

  return (
    <>
      <h1>Aircraft Maintenance Application</h1>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button onClick={() => setPage('statistics')}>Statisztika</button>
        <button onClick={() => setPage('home')}>Főoldal</button>
        <button onClick={() => setPage('editor')}>Szerkesztő</button>
      </div>

      {page === 'home' && <Input aircrafts={aircrafts} airports={airports} statuses={statuses} 
        schedules={schedules} setSchedules={setSchedules}/>}
      {page === 'statistics' && <FullReview aircrafts={aircrafts} statuses={statuses} />}
      {page === 'editor' && (
          <Editor
            aircrafts={aircrafts}
            setAircrafts={setAircrafts}
            airports={airports}
            setAirports={setAirports}
            statuses={statuses}
            setStatuses={setStatuses}
          />
      )}
</>
  );
}

export default App;
