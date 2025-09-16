import { useState, useEffect } from "react";
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import Login from "./Login.jsx";
import App from "./App.jsx";
import Statistics from "./Statistics.jsx";

function RouteSaver() {
  const location = useLocation();
  useEffect(() => {
    const path = location.pathname + location.search + location.hash;
    sessionStorage.setItem("lastRoute", path);
  }, [location]);
  return null;
}

function AuthedApp({ onLogout }) {
  const navigate = useNavigate();

  useEffect(() => {
    const last = sessionStorage.getItem("lastRoute");
    if (!last || last.startsWith("/login")) {
      last = "/statistics";
    }
    const current = window.location.hash.replace(/^#/, "") || "/";
    //console.log(current)
    if (last && last !== current) {
      navigate(last, { replace: true });
    }
  }, [navigate]);

  return (
    <>
      <RouteSaver />
      <App onLogout={onLogout} />
    </>
  );
}

export default function Root() {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("authed") === "true") setAuthed(true);
  }, []);

  function handleSuccess() {
    setAuthed(true);
    sessionStorage.setItem("authed", "true"); 
  }

  function handleLogout() {
    setAuthed(false);
    sessionStorage.removeItem("authed");
    sessionStorage.removeItem("lastRoute");
  }

  return (
    <HashRouter>
      <Routes>
        <Route
          path="/login"
          element={authed ? <Navigate to="/" replace /> : <Login onSuccess={handleSuccess} />}
        />
        <Route
          path="/statistics"
          element={authed ? <Statistics /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/*"
          element={authed ? <AuthedApp onLogout={handleLogout} /> : <Navigate to="/login" replace />}
        />   
      </Routes>
    </HashRouter>
  );
}

