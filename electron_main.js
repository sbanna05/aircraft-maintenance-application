const { app, BrowserWindow, ipcMain, ipcRenderer } = require('electron');
const fs = require('fs');
const xlsx = require("xlsx");
const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "aircrafts.db");
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
    },
  });

  const isDev = !app.isPackaged;
 if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
 // win.loadFile(path.join(__dirname, 'frontend', 'index.html'));

}

// --- Adatbázis táblák létrehozása ---
/*
db.prepare(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user'
)`).run();

db.prepare(`
  INSERT OR IGNORE INTO users (username, password, role) VALUES
  ('admin', 'admin', 'admin'),
  ('Példa Béla', '1234', 'user')
`).run();


db.prepare(`CREATE TABLE IF NOT EXISTS aircrafts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL unique,
    type TEXT NOT NULL,
    fogyasztas INTEGER DEFAULT 0
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user'
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS statuses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jelkod TEXT NOT NULL,
    jelentes TEXT NOT NULL,
    color TEXT NOT NULL
  )`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS data_table (
    esemeny_id INTEGER PRIMARY KEY AUTOINCREMENT,
    gep_azonosito TEXT NOT NULL,
    datum TEXT NOT NULL,
    kezdes_idopont TEXT NOT NULL,
    vege_idopont TEXT NOT NULL,
    idotartam_perc INTEGER NOT NULL,
    tevekenyseg_kod TEXT NOT NULL,
    megjegyzes TEXT,
    FOREIGN KEY (gep_azonosito) REFERENCES aircrafts(name)
  )`).run();

  db.prepare(`CREATE TABLE IF NOT EXISTS airports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repter TEXT NOT NULL,
    repter_id text NOT NULL,
    nyitvatartas TEXT
  )`).run();

  db.prepare(`
  INSERT OR IGNORE INTO airports (repter, repter_id) VALUES
  ('Nagyvárad Reptér', 'LROD'),
  ('Debrecen Nemzetközi Repülőtér', 'LHDC');
`).run();

db.prepare(`
  INSERT OR IGNORE INTO aircrafts (name, type, fogyasztas) VALUES
  ('HA-ENI', 'Tecnam P2006T', 40),
  ('HA-ENM', 'Tecnam P2006T', 40),
  ('HA-ENJ', 'Tecnam P2008JC', 20),
  ('HA-ENK', 'Tecnam P2008JC', 20),
  ('HA-ENL', 'Tecnam P2008JC', 20),
  ('HA-ENY', 'Tecnam P2006T', 40);
`).run();


  db.prepare(`
    INSERT OR IGNORE INTO statuses (jelkod, jelentes, color) VALUES
    ('m', 'API szerint zárva', '#cdcdcd'),
    ('z', 'repülőtér', '#f4b400'),
    ('n', 'NOTAM', '#fb170f'),
    ('s', 'korai sötétedés', '#434343'),
    ('at', 'repülés lemondás (ATO, oktató)', '#f7e55cff'),
    ('d', 'repülés lemondás (Diák)', '#b04ab7'),
    ('dh', 'diákok haladási fázisa', '#f8c3f3'),
    ('cs', 'személyzet csere', '#fae3af'),
    ('o', 'kevés/nincs elérhető oktató', '#6c7bb1'),
    ('sz', 'munkaszüneti nap', '#d1a587'),
    ('a', 'repülésre alkalmatlan időjárás', '#d8736a'),
    ('k', 'karbantartáson volt', '#8fb2cd'),
    ('r', 'repült', '#66b65b')
  `).run();

*/

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});



/*================= Hozzáadások/ Lekérdezés ===================== */
ipcMain.handle('get-aircrafts', () => {
  const stmt = db.prepare('SELECT * FROM aircrafts ORDER BY name');
  return stmt.all();
});

ipcMain.handle('get-airports', () => {
  const stmt = db.prepare('SELECT * FROM airports');
  return stmt.all();
});



ipcMain.handle('get-schedules', (event, year = null, aircraftName, yearMonth) => {
  let query = `
    SELECT 
      s.event_id,
      s.event_timestamp,
      substr(s.event_timestamp, 11) AS kezdes,
      substr(s.event_timestamp, 1, 10) AS datum,
      s.created,
      s.note,
      a.name AS aircraft,
      ap.repter_id AS airport,
      st.jelkod AS status
    FROM schedules s
    LEFT JOIN aircrafts a ON s.aircraft_id = a.id
    LEFT JOIN airports ap ON s.airport_id = ap.id
    LEFT JOIN statuses st ON s.status_id = st.id
    WHERE 1=1 
  `;
  const params = [];

  if (year) {
    query += ` AND CAST(substr(s.event_timestamp, 1, 4) AS INTEGER) = ?`;
    params.push(year);
  }

  if (aircraftName) {
    query += ` AND a.name = ?`;
    params.push(aircraftName);
  }

  if (yearMonth) {
    // pl. '2025-09%' --> minden szeptemberi adat
    query += ` AND s.event_timestamp LIKE ?`;
    params.push(`${yearMonth}%`);
  }

  query += ' ORDER BY s.event_timestamp DESC';

  const stmt = db.prepare(query);
  return stmt.all(...params);
});



ipcMain.handle('get-statuses', () => {
  const stmt = db.prepare('SELECT * FROM statuses ORDER BY id');
  return stmt.all();
});

ipcMain.handle('get-users', () => {
  const stmt = db.prepare('SELECT * FROM users ORDER BY id');
  return stmt.all();
});

// Statisztika: adott gép havi bontásban státuszok szerint
ipcMain.handle('get-stats-by-month', (event, gepAzonosito) => {
  const query = `
    SELECT 
      CAST(substr(s.event_timestamp, 1, 4) AS INTEGER) AS year,
      CAST(substr(s.event_timestamp, 6, 2) AS INTEGER) - 1 AS monthIdx,
      st.jelkod,
      COUNT(*) as count,
      ap.repter_id AS airport,
      ap.nyitvatartas AS nyitvatartas
    FROM schedules s
    LEFT JOIN statuses st ON s.status_id = st.id
    left join aircrafts a on a.id = s.aircraft_id
    left join airports ap on ap.id = s.airport_id
    WHERE a.name = ?
      AND st.jelkod <> '-'
    GROUP BY year, monthIdx, st.jelkod
    ORDER BY year, monthIdx;
  `;
  return db.prepare(query).all(gepAzonosito);
});



ipcMain.handle('add-aircraft', (event, name, type, consumption) => {
  const stmt = db.prepare('INSERT INTO aircrafts (name, type, fogyasztas) VALUES (?, ?, ?)');
  return stmt.run(name, type, consumption);
});


function findDatabaseInfos(aircraftName, airportCode, eventCode) {
  // 1. Aircraft ID
  const aircraftRow = db.prepare(`SELECT id FROM aircrafts WHERE name = ?`).get(aircraftName);
  if (!aircraftRow) throw new Error(`Aircraft not found: ${aircraftName}`);
  const aircraftId = aircraftRow.id;

  // 2. Airport ID
  let airportId = null;
  const airportRow = db.prepare(`SELECT id FROM airports WHERE repter_id = ?`).get(airportCode);
  airportId = airportRow ? airportRow.id : null;

  // 3. Status ID
  const statusRow = db.prepare(`SELECT id FROM statuses WHERE jelkod = ?`).get(eventCode);
  if (!statusRow) throw new Error(`Status not found: ${eventCode}`);
  const statusId = statusRow.id;

  return { aircraftId, airportId, statusId };
}


ipcMain.handle('add-schedule', (event, aircraftName, airportCode, eventCode, start, end, note) => {
  
  // 1. Aircraft ID, Airport ID, Status ID
  const { aircraftId, airportId, statusId } = findDatabaseInfos(aircraftName, airportCode, eventCode);
    
  // Event timestamp: YYYY.MM.DD H:mm:ss (helyi idő szerint)
  const createdTimestamp = new Date().toLocaleString('sv-SE', 
    { timeZone: 'Europe/Budapest', hour12: false });

  const pad = (n) => n.toString().padStart(2, '0');
  
  const stmt = db.prepare(`
    INSERT INTO schedules (
      event_id, aircraft_id, airport_id, status_id, event_timestamp, created, note
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // 4. Start / End datetime
  let current = new Date(start);  // start a datetime-local string pl. "2025-09-03T09:39"
  const endDate = new Date(end);
  const conflicts = [];

  while (current < endDate) {

  const eventTimestamp = `${current.getFullYear()}.${pad(current.getMonth()+1)}.${pad(current.getDate())} ${current.getHours()}:${pad(current.getMinutes())}:${pad(current.getSeconds())}`;

    // Event ID: AIRCRAFTNAME_YYYYMMDD_HHMMSS
    const eventId = `${aircraftName}_${current.getFullYear()}${pad(current.getMonth()+1)}${pad(current.getDate())}_${pad(current.getHours())}${pad(current.getMinutes())}${pad(current.getSeconds())}`;
 // Konflikt ellenőrzés: van-e már rekord ugyanazzal az event_timestamp-tel
    const existing = db.prepare(`
      SELECT s.event_id, s.event_timestamp, st.jelkod
      FROM schedules s
      LEFT JOIN statuses st ON s.status_id = st.id
      WHERE s.aircraft_id = ? AND s.event_timestamp = ?
    `).all(aircraftId, eventTimestamp);

    if (existing.length > 0) {
      //ütköző rekordokat adod vissza
      conflicts.push(...existing);
    } else {
      stmt.run(eventId, aircraftId, airportId || null, statusId, eventTimestamp, createdTimestamp, note || null);
    }

    // Következő 1 órás blokk
    current.setHours(current.getHours() + 1);
  }

  if (conflicts.length > 0) {
    return { success: false, conflicts };
  }
  return { success: true };
});


ipcMain.handle('update-schedule', (event, eventId, updateData) => {
  const {aircraft, airport, status, event_timestamp, note} = updateData;  
  // 1. Aircraft ID, Airport ID, Status ID
  const { aircraftId, airportId, statusId } = findDatabaseInfos(aircraft, airport, status);

  const updatedCreated = new Date().toLocaleString('sv-SE',
    { timeZone: 'Europe/Budapest', hour12: false });
  
  // 4. Update
  const stmt = db.prepare(`
    UPDATE schedules
    SET aircraft_id = ?, airport_id = ?, status_id = ?, event_timestamp = ?, note = ?, created = ?
    WHERE event_id = ?
  `);
  const info = stmt.run(aircraftId, airportId, statusId, event_timestamp, note || null, updatedCreated, eventId);
  return { success: info.changes > 0}; // módosított sorok száma (0 vagy 1)
});


ipcMain.handle('add-status', (event, code, description, color) => {
  const stmt = db.prepare('INSERT INTO statuses (jelkod, jelentes, color) VALUES (?, ?, ?)');
  return stmt.run(code, description, color);
});

ipcMain.handle('add-user', (event, username, password, role) => {
  const stmt = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)');
  return stmt.run(username, password, role);
});


/*============ TÖRLÉSEK ========================= */
ipcMain.handle('delete-schedule', (event, id) => {
  const stmt = db.prepare('DELETE FROM schedules WHERE event_id = ?');
  return stmt.run(id);
});


ipcMain.handle('delete-aircraft', (event, id) => {
  const stmt = db.prepare('DELETE FROM aircrafts WHERE id = ?');
  return stmt.run(id);
});


ipcMain.handle('delete-status', (event, id) => {
  const stmt = db.prepare('DELETE FROM statuses WHERE id = ?');
  return stmt.run(id);
});



/*
//console.log("CSV import kész.");
const csvPath = path.join(__dirname, "proba_adatok.csv");

// Beolvassuk a CSV-t
const csvData = fs.readFileSync(csvPath, "utf-8");

// Feldolgozzuk soronként
const lines = csvData.split("\n").filter(Boolean);

lines.forEach((line) => {
  // Feltételezzük, hogy ;-vel vannak elválasztva
  const [id, aircraftName, date, startTime, endTime, duration, statusCode] =
    line.split(";").map((s) => s.trim());

  if (statusCode === 'm') return; // kihagyjuk az 'm' státuszt
  // Lekérjük az azonosítókat
  const aircraftRow = db.prepare(`SELECT id FROM aircrafts WHERE name = ?`).get(aircraftName);
  if (!aircraftRow) {
    console.warn(`Aircraft not found: ${aircraftName}, sor: ${id}`);
    return;
  }
  const aircraftId = aircraftRow.id;

  // Airport ID (ha van, pl HA-ENI)
  const airportRow = db.prepare(`SELECT id FROM airports WHERE repter_id = ?`).get(aircraftName);
  const airportId = airportRow ? airportRow.id : null;

  // Status ID
  const statusRow = db.prepare(`SELECT id FROM statuses WHERE jelkod = ?`).get(statusCode);
  if (!statusRow) {
    console.warn(`Status not found: ${statusCode}, sor: ${id}`);
    return;
  }
  const statusId = statusRow.id;

  // Event timestamp (dátum + kezdő idő)
  const eventTimestamp = `${date} ${startTime}`;

  // Created timestamp
  const created = new Date().toLocaleString('sv-SE',
    { timeZone: 'Europe/Budapest', hour12: false });

  // Event ID
  //const eventId = `${aircraftName}_${eventTimestamp}`;
  // Event ID formázása: YYYYMMDD_HHMMSS
  const dateParts = date.split(".").map(d => d.padStart(2, '0')); // ["2025","01","01"]
  const timeParts = startTime.split(":").map(t => t.padStart(2, '0')); // ["1","00","00"] → ["01","00","00"]
  const eventId = `${aircraftName}_${dateParts.join("")}_${timeParts.join("")}`; // "HA-ENI_20250101_010000"


  // Beszúrás
  db.prepare(`
    INSERT INTO schedules (event_id, aircraft_id, airport_id, status_id, event_timestamp, note, created)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(eventId, aircraftId, airportId, statusId, eventTimestamp, null, created);
});
*/