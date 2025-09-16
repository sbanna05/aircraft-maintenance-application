import  { useState, useEffect } from 'react'

const Editor = ({aircrafts, airports, statuses, setAircrafts, setAirports, setStatuses}) => {
  const [users, setUsers] = useState([])

  // új rekord state-ek
  const [newAircraft, setNewAircraft] = useState({ name: "", type: "", fogyasztas: "" })
  const [newStatus, setNewStatus] = useState({ jelkod: "", jelentes: "", color: "" })
  const [newAirport, setNewAirport] = useState({ repter: "", repter_id: "", nyitvatartas: "" })
  const [newUser, setNewUser] = useState({ username: "", password: "", role: "" })

  // adatbetöltések
  useEffect(() => { window.api.getUsers().then(setUsers) }, [])

  // --- Aircraft mentés ---
  async function addAircraft() {
    if (!newAircraft.name || !newAircraft.type || !newAircraft.fogyasztas) {
      alert("Töltsd ki az összes mezőt!")
      return
    }
    await window.api.addAircraft(newAircraft.name, newAircraft.type, newAircraft.fogyasztas)
    setAircrafts(await window.api.getAircrafts())
    setNewAircraft({ name: "", type: "", fogyasztas: "" })
  }

  // --- Status mentés ---
  async function addStatus() {
    if (!newStatus.jelkod || !newStatus.jelentes || !newStatus.color) {
      alert("Töltsd ki az összes mezőt!")
      return
    }
    await window.api.addStatus(newStatus.jelkod, newStatus.jelentes, newStatus.color)
    setStatuses(await window.api.getStatuses())
    setNewStatus({ jelkod: "", jelentes: "", color: "" })
  }

  // --- Airport mentés ---
  async function addAirport() {
    if (!newAirport.repter || !newAirport.repter_id || !newAirport.nyitvatartas) {
      alert("Töltsd ki az összes mezőt!")
      return
    }
    await window.api.addAirport(newAirport.repter, newAirport.repter_id, newAirport.nyitvatartas)
    setAirports(await window.api.getAirports())
    setNewAirport({ repter: "", repter_id: "", nyitvatartas: "" })
  }

  // --- User mentés ---
  async function addUser() {
    if (!newUser.username || !newUser.password || !newUser.role) {
      alert("Töltsd ki az összes mezőt!")
      return
    }
    await window.api.addUser(newUser.username, newUser.password, newUser.role)
    setUsers(await window.api.getUsers())
    setNewUser({ username: "", password: "", role: "" })
  }

  return (
    <div className="container">
      {/* AIRCRAFT */}
      <h2>Aircraft Editor</h2>
      <table className='table table-sm table-striped'>
        <thead>
          <tr className='text-center'>
            <th>Name</th>
            <th>Type</th>
            <th>Consumption</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {/* Új hozzáadás sora */}
          <tr>
            <td><input value={newAircraft.name} onChange={e => setNewAircraft({ ...newAircraft, name: e.target.value })} /></td>
            <td><input value={newAircraft.type} onChange={e => setNewAircraft({ ...newAircraft, type: e.target.value })} /></td>
            <td><input value={newAircraft.fogyasztas} onChange={e => setNewAircraft({ ...newAircraft, fogyasztas: e.target.value })} /></td>
            <td><button className="btn btn-success btn-sm" onClick={addAircraft}>Add</button></td>
          </tr>
          {aircrafts.map((aircraft, index) => (
            <tr key={index}>
              <td>{aircraft.name}</td>
              <td>{aircraft.type}</td>
              <td>{aircraft.fogyasztas}</td>
              <td>
                <button className="btn btn-danger btn-sm" 
                    onClick={async () => {
                              await window.api.deleteAircraft(aircraft.id)
                              setAircrafts(await window.api.getAircrafts())
                    }}>Delete
              </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* STATUS */}
      <h2>Status Editor</h2>
      <table className='table table-sm table-striped'>
        <thead>
          <tr className='text-center'>
            <th>Code</th>
            <th>Description</th>
            <th>Color</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><input value={newStatus.jelkod} onChange={e => setNewStatus({ ...newStatus, jelkod: e.target.value })} /></td>
            <td><input value={newStatus.jelentes} onChange={e => setNewStatus({ ...newStatus, jelentes: e.target.value })} /></td>
            <td><input type="color" value={newStatus.color} onChange={e => setNewStatus({ ...newStatus, color: e.target.value })} /></td>
            <td><button className="btn btn-success btn-sm" onClick={addStatus}>Add</button></td>
          </tr>
          {statuses.map((status, index) => (
            <tr key={index}>
              <td>{status.jelkod}</td>
              <td>{status.jelentes}</td>
              <td style={{ backgroundColor: status.color }}>{status.color}</td>
                <td>
                  <button className="btn btn-danger btn-sm" 
                  onClick={async () => window.api.deleteStatus(status.id)
                    .then(() => setStatuses(window.api.getStatuses()))
                  }>
                    Delete
                    </button></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* AIRPORT */}
      <h2>Airport Editor</h2>
      <table className='table table-sm table-striped'>
        <thead>
          <tr className='text-center'>
            <th>ID</th>
            <th>Name</th>
            <th>Opening Hours</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><input value={newAirport.repter} onChange={e => setNewAirport({ ...newAirport, repter: e.target.value })} /></td>
            <td><input value={newAirport.repter_id} onChange={e => setNewAirport({ ...newAirport, repter_id: e.target.value })} /></td>
            <td><input value={newAirport.nyitvatartas} onChange={e => setNewAirport({ ...newAirport, nyitvatartas: e.target.value })} /></td>
            <td><button className="btn btn-success btn-sm" onClick={addAirport}>Add</button></td>
          </tr>
          {airports.map((airport, index) => (
            <tr key={index}>
              <td>{airport.repter}</td>
              <td>{airport.repter_id}</td>
              <td>{airport.nyitvatartas}</td>
              <td><button className="btn btn-danger btn-sm" onClick={async () => window.api.deleteAirport(airport.id)
                .then(() => setAirports(window.api.getAirports()))
              }>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* USER */}
      <h2>User Editor</h2>
      <table className='table table-sm table-striped'>
        <thead>
          <tr>
            <th>Username</th>
            <th>Password</th>
            <th>Role</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><input value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} /></td>
            <td><input type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} /></td>
            <td><input value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} /></td>
            <td><button className="btn btn-success btn-sm" onClick={addUser}>Add</button></td>
          </tr>
          {users.map((user, index) => (
            <tr key={index}>
              <td>{user.username}</td>
              <td>{user.password_hash ? "******" : ''}</td>
              <td>{user.role}</td>
              <td> 
                <button
                    className="btn btn-danger btn-sm"
                    onClick={async () => {
                      await window.api.deleteUser(user.id);
                      const refreshed = await window.api.getUsers(); // új lista lekérése
                      setUsers(refreshed); // state frissítés
                    }}
                >Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default Editor
