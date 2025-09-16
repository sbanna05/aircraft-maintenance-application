import { useState } from 'react';
import './App.css';

function Login({ onSuccess }) {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    const username = formData.username.trim();
    const password = formData.password.trim();

    if (!username || !password) {
      setErr('Minden mezőt tölts ki!');
      return;
    }

    setLoading(true);
    try {
      const result = await window.api.handleLogin(username, password);
      if (result && result.id) {
        onSuccess?.();
      } else {
        setErr('Hibás felhasználónév vagy jelszó');
      }
    } catch (error) {
      console.error(error);
      setErr('Bejelentkezési hiba');
    } finally {
      setLoading(false);
    }
  }

  const disabled = loading || !formData.username.trim() || !formData.password.trim();

  return (
    <>
      <h1 className="text-center">Aircraft Maintenance Application</h1>

      <form className="row g-3" onSubmit={handleSubmit} autoComplete="off">
        <div className="form-floating">
          <input
            className="form-control"
            type="text"
            placeholder="Username"
            value={formData.username}
            onChange={e => setFormData(f => ({ ...f, username: e.target.value }))}
            name="username"
            autoFocus
          />
          <label className="form-label">Username:</label>
        </div>

        <div className="form-floating">
          <input
            className="form-control"
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={e => setFormData(f => ({ ...f, password: e.target.value }))}
            name="password"
          />
          <label className="form-label">Password:</label>
        </div>

        {err && (
          <div className="text-danger" role="alert" style={{ marginTop: 4 }}>
            {err}
          </div>
        )}

        <div>
          <button type="submit" className="btn btn-primary" disabled={disabled}>
            {loading ? 'Belépés…' : 'Sign in'}
          </button>
        </div>
      </form>
    </>
  );
}

export default Login;