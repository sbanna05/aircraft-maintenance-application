import { useState } from 'react';
import './App.css';
import Input from './Input';
import Editor from './Editor';
import FullReview from './FullReview';

function App() {
  const [page, setPage] = useState('home'); // kezdetben főoldal

  return (
    <>
      <h1>Aircraft Maintenance Application</h1>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button onClick={() => setPage('statistics')}>Statisztika</button>
        <button onClick={() => setPage('home')}>Főoldal</button>
        <button onClick={() => setPage('editor')}>Szerkesztő</button>
      </div>

      {page === 'home' && <Input />}
      {page === 'statistics' && <FullReview />}
      {page === 'editor' && <Editor />}
    </>
  );
}

export default App;
