const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const mariadb = require('mariadb');
const bcrypt = require('bcryptjs');

// MariaDB kapcsolat létrehozása
const pool = mariadb.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root1234',
  database: 'aircrafts',
  connectionLimit: 5
});

async function query(sql, params =[]) {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(sql, params);
    return rows;
  }finally {
    if (conn) conn.release(); // visszaadjuk a poolnak a kapcsolatot
  }
}

// =================== Bejelentkezés ==========================
ipcMain.handle('handleLogin', async (e, arg1, arg2) => {
  const payload = (arg1 && typeof arg1 === 'object')
    ? arg1
    : { username: arg1, password: arg2 };

  const username = String(payload?.username ?? '').trim();
  const password = String(payload?.password ?? '');

  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      `SELECT id, username, role, password_hash FROM users WHERE username = ?`, [username]
    );

    if (rows.length === 0) throw new Error('Hibás felhasználónév vagy jelszó');

    const user = rows[0];
    // Jelszó ellenőrzés
    const ok = await bcrypt.compareSync(password, user.password_hash);
    if (!ok) throw new Error('Hibás felhasználónév vagy jelszó');

    return { id: user.id, username: user.username, role: user.role };
  } catch (err) {
    console.error('Login hiba:', err);
    throw err;
  } finally {
    if (conn) conn.release();
  }
});



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
}


app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});



/*================= Hozzáadások/ Lekérdezés ===================== */
ipcMain.handle('get-aircrafts', async () => {
  const rows = await query('SELECT * FROM aircrafts ORDER BY name');
  return rows;
});

ipcMain.handle('get-airports', async () => {
  const rows = await query('SELECT * FROM airports');
  return rows;
});


ipcMain.handle('get-schedules', async (event, year = null, aircraftName, yearMonth) => {
  let sql = `
    SELECT 
      s.event_id,
      s.event_timestamp,
      SUBSTRING(s.event_timestamp, 12) AS kezdes,
      SUBSTRING(s.event_timestamp, 1, 10) AS datum,
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
  if(year) {
    sql += " AND YEAR(s.event_timestamp) = ?";
    params.push(year);
  }
  if(aircraftName) {
    sql += " AND a.name = ?";
    params.push(aircraftName);
  }
  if(yearMonth) {
    sql += " AND s.event_timestamp LIKE ?";
    params.push(`${yearMonth}%`);
  }
  sql += " ORDER BY s.event_timestamp DESC";
  return await query(sql, params);
});




ipcMain.handle('get-statuses', async () => {
  const rows = await query('SELECT * FROM statuses ORDER BY id');
  return rows;
});

ipcMain.handle('get-users',async () => {
  const rows = await query('SELECT * FROM users ORDER BY id');
  return rows;
});

// Statisztika: adott gép havi bontásban státuszok szerint
ipcMain.handle('get-stats-by-month', async (event, gepAzonosito) => {
  const sql = `
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
  return await query(sql, [gepAzonosito]);
});


// =================== Hozzáadások ==========================
ipcMain.handle('add-aircraft', async (event, name, type, consumption) => {
  const sql = 'INSERT INTO aircrafts (name, type, fogyasztas) VALUES (?, ?, ?)';
  const result = await query(sql, [name, type, consumption]);
  return result;
});


async function findDatabaseInfos(aircraftName, airportCode, eventCode) {
  // 1. Aircraft ID
  const aircraftRow = await query(`SELECT id FROM aircrafts WHERE name = ?`, [aircraftName]);
  if (!aircraftRow.length) throw new Error(`Aircraft not found: ${aircraftName}`);
  const aircraftId = aircraftRow[0].id;

  // 2. Airport ID
  const airportResult = await query(`SELECT id FROM airports WHERE repter_id = ?`, [airportCode]);
  const airportId = airportResult.length ? airportResult[0].id : null;

  // 3. Status ID
  const statusRow = await query(`SELECT id FROM statuses WHERE jelkod = ?`, [eventCode]);
  if (!statusRow.length) throw new Error(`Status not found: ${eventCode}`);
  const statusId = statusRow[0].id;

  return { aircraftId, airportId, statusId };
}



ipcMain.handle('add-schedule', async (event, aircraftName, airportCode, eventCode, start, end, note) => {
  const { aircraftId, airportId, statusId } = await findDatabaseInfos(aircraftName, airportCode, eventCode);

  const createdTimestamp = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Budapest', hour12: false });
  const pad = n => n.toString().padStart(2, '0');

  const conflicts = [];
  let current = new Date(start);
  const endDate = new Date(end);

  while (current < endDate) {
    const eventTimestamp = `${current.getFullYear()}.${pad(current.getMonth() + 1)}.${pad(current.getDate())} ${current.getHours()}:${pad(current.getMinutes())}:${pad(current.getSeconds())}`;
    const eventId = `${aircraftName}_${current.getFullYear()}${pad(current.getMonth() + 1)}${pad(current.getDate())}_${pad(current.getHours())}${pad(current.getMinutes())}${pad(current.getSeconds())}`;


    const existing = await query(
      `SELECT s.event_id, s.event_timestamp, st.jelkod
       FROM schedules s
       LEFT JOIN statuses st ON s.status_id = st.id
       WHERE s.aircraft_id = ? AND s.event_timestamp = ?`,
      [aircraftId, eventTimestamp]
    );

    if (existing.length > 0) conflicts.push(...existing);
    else {
      await query(
        `INSERT INTO schedules (event_id, aircraft_id, airport_id, status_id, event_timestamp, created, note)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [eventId, aircraftId, airportId || null, statusId, eventTimestamp, createdTimestamp, note || null]
      );
    }

    current.setHours(current.getHours() + 1);
  }

  return conflicts.length > 0 ? { success: false, conflicts } : { success: true };
});


ipcMain.handle('update-schedule', async (event, eventId, updateData) => {
  const { aircraft, airport, status, event_timestamp, note } = updateData;
  const { aircraftId, airportId, statusId } = await findDatabaseInfos(aircraft, airport, status);
  const updatedCreated = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Budapest', hour12: false });

  const result = await query(
    `UPDATE schedules
     SET aircraft_id = ?, airport_id = ?, status_id = ?, event_timestamp = ?, note = ?, created = ?
     WHERE event_id = ?`,
    [aircraftId, airportId, statusId, event_timestamp, note || null, updatedCreated, eventId]
  );
  return { success: result.affectedRows > 0 };
});


ipcMain.handle('add-status', async (event, code, description, color) => {
  const sql = 'INSERT INTO statuses (jelkod, jelentes, color) VALUES (?, ?, ?)';
  const result = await query(sql, [code, description, color]);
  return result;
});

ipcMain.handle('add-user', async (event, username, password, role) => {
  const hash = bcrypt.hashSync(String(password), 10); // 10 a saltRounds  
  let conn;
  try {
    conn = await pool.getConnection();
    const res = await conn.query(
      `INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)`, [username, hash, role || 'user']
    );
    return res;
  } catch (err) {
    console.error(err);
    throw err;
  } finally {
    if (conn) conn.release();
  }
});

// =================== TÖRLÉSEK ==========================

ipcMain.handle('delete-schedule', async (event, id) => {
  const result = await query('DELETE FROM schedules WHERE event_id = ?', [id]);
  return result;
});

// delete-aircraft
ipcMain.handle('delete-aircraft', async (event, id) => {
  const result = await query('DELETE FROM aircrafts WHERE id = ?', [id]);
  return result;
});

// delete-status
ipcMain.handle('delete-status', async (event, id) => {
  const result = await query('DELETE FROM statuses WHERE id = ?', [id]);
  return result;
});

ipcMain.handle('delete-user', async (event, id) => {
  const result = await query('DELETE FROM users WHERE id = ?', [id]);
  return result;
});

