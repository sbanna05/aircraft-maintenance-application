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


// --- Adatbázis előkészítése ---
function seedFromCSV() {
  const filePath = path.join(__dirname, 'proba_adatok.csv');
  const workbook = xlsx.readFile(filePath, { type: 'file', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: true, defval: null });


  const insertData = db.prepare(`
    INSERT INTO data_table
      (gep_azonosito, datum, kezdes_idopont, vege_idopont, idotartam_perc, tevekenyseg_kod, megjegyzes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const pad = (n) => String(n).padStart(2, '0');

  db.transaction(() => {
    for (const row of rows) {
      const gepAzonosito = row["gep_azonosito"];
      const datum = formatHungarianDate(row["datum"]);
      const kezdes = formatHungarianTime(row["kezdes_idopont"]);
      const vege = formatHungarianTime(row["vege_idopont"]);
      const idotartam = parseFloat(String(row["idotartam_perc"] || "0").replace(",", "."));
      const tevekenyseg = row["tevekenyseg_kod"];
      const megjegyzes = row["megjegyzes"] || null;

      insertData.run(gepAzonosito, datum, kezdes, vege, idotartam, tevekenyseg, megjegyzes);
    }
  })();

  console.log("CSV-ből feltöltés kész!");
}


function formatHungarianDate(val) {
  if (typeof val === 'number') {
    const date = xlsx.SSF.parse_date_code(val);
    if (!date) return val;
    return `${date.y}.${pad(date.m)}.${pad(date.d)}`;
  }
  const d = new Date(val);
  if (!isNaN(d)) {
    return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
  }
  return val;
}

function formatHungarianTime(val) {
  if (typeof val === 'number') {
    const date = xlsx.SSF.parse_date_code(val);
    return `${pad(date.H)}:${pad(date.M)}:${pad(Math.floor(date.S))}`;
  }
  const d = new Date(`1970-01-01T${val}`);
  if (!isNaN(d)) {
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }
  return val;
}

function pad(n) {
  return String(n).padStart(2, '0');
}


seedFromCSV();
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

/*
ipcMain.handle('get-schedules', (event, gepAzonosito, yearMonth) => {
  let query = `
    SELECT * FROM data_table
    WHERE gep_azonosito = ?
  `;
  const params = [gepAzonosito];

  if (yearMonth) {
    query += ` AND datum LIKE ?`;
    params.push(yearMonth);  // pl: '5/%/25'
  }
  query += ' ORDER BY datum, kezdes_idopont';

  const stmt = db.prepare(query);
  return stmt.all(...params);
});
*/

ipcMain.handle('get-schedules', (event, gepAzonosito, yearMonth) => {
  let query = `SELECT * FROM data_table WHERE 1=1`;
  const params = [];

  if (gepAzonosito) {
    query += ` AND gep_azonosito = ?`;
    params.push(gepAzonosito);
  }

  if (yearMonth) {
    query += ` AND datum LIKE ?`;
    params.push(yearMonth);
  }

  query += ' ORDER BY datum desc, kezdes_idopont desc';

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



ipcMain.handle('add-aircraft', (event, name, type, consumption) => {
  const stmt = db.prepare('INSERT INTO aircrafts (name, type, fogyasztas) VALUES (?, ?, ?)');
  return stmt.run(name, type, consumption);
});

/*
ipcMain.handle('add-schedule', (event, aircraft, airport, eventCode, start, end) => {
  duration = Math.round((new Date(end) - new Date(start)) / 60000); // percben
  const stmt = db.prepare(`
    INSERT INTO data_table (gep_azonosito, megjegyzes, tevekenyseg_kod, kezdes_idopont, vege_idopont, idotartam_perc)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(aircraft, airport, eventCode, start, end, duration);
});
*/


/*
ipcMain.handle('add-schedule', (event, aircraft, airport, eventCode, start, end, note) => {
  const duration = Math.round((new Date(end) - new Date(start)) / 60000); // percben
  let datum = (start.split('T')[0]).replace(/-/g, '.'); // csak a dátum részt vesszük
  const finalNote = [airport, note].filter(Boolean).join(" - ");

  let startTime = `${parseInt(start.split('T')[1].split(':')[0], 10)}:${start.split('T')[1].split(':')[1]}:00`;
  let endTime   = `${parseInt(end.split('T')[1].split(':')[0], 10)}:${end.split('T')[1].split(':')[1]}:00`;

  const stmt = db.prepare(`
    INSERT INTO data_table (
      gep_azonosito, megjegyzes, tevekenyseg_kod, datum, kezdes_idopont, vege_idopont, idotartam_perc
    )
    VALUES (?, ?, ?, ?, ?, ?,?)
  `);

  return stmt.run(
    aircraft,   // gép azonosító
    finalNote || null,    // reptér neve ide kerül, megjegyzésként
    eventCode,  // esemény kód
    datum,
    startTime,   // kezdés
    endTime,    // vége
    duration    // időtartam percben
  );
});
*/
ipcMain.handle('add-schedule', (event, aircraftName, airportCode, eventCode, start, end, note) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  let current = new Date(startDate);
  const createdTimestamp = new Date().toLocaleString('sv-SE', 
    { timeZone: 'Europe/Budapest', hour12: false });
  console.log(createdTimestamp); // pl. 2025-09-01 14:34:56


  // Lekérdezzük az azonosítókat
  const aircraftRow = db.prepare(`SELECT id FROM aircrafts WHERE name = ?`).get(aircraftName);
  if (!aircraftRow) throw new Error(`Aircraft not found: ${aircraftName}`);
  const aircraftId = aircraftRow.id;

  const airportRow = db.prepare(`SELECT id FROM airports WHERE repter_id = ?`).get(airportCode);
  if (!airportRow) throw new Error(`Airport not found: ${airportCode}`);
  const airportId = airportRow.id;

  const statusRow = db.prepare(`SELECT id FROM statuses WHERE jelkod = ?`).get(eventCode);
  if (!statusRow) throw new Error(`Status not found: ${eventCode}`);
  const statusId = statusRow.id;

  const stmt = db.prepare(`
    INSERT INTO schedules (
      event_id, aircraft_id, airport_id, status_id, event_timestamp, created, note
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const conflicts = [];

  while (current < endDate) {
    //const eventTimestamp = current.slice(0,19).replace('T',' ');
    const eventTimestamp = current.toLocaleString('sv-SE', { 
      timeZone: 'Europe/Budapest', hour12: false 
    }).replace(' ', ' ');


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
      const eventId = `${aircraftName}_${eventTimestamp}`;
      stmt.run(eventId, aircraftId, airportId, statusId, eventTimestamp, createdTimestamp, note || null);
    }

    // Következő 1 órás blokk
    current.setHours(current.getHours() + 1);
  }

  if (conflicts.length > 0) {
    return { success: false, conflicts };
  }
  return { success: true };
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
  const stmt = db.prepare('DELETE FROM data_table WHERE esemeny_id = ?');
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

