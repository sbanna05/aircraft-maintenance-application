# Aircraft Maintenance Application - React + Vite + Electron Project

Ez a projekt egy asztali alkalmazás, amely **React**, **Vite**, **Electron**, **Better SQLite3**, **Bootstrap** és **xlsx** könyvtárakat használ. A cél egy gépek ütemezését és statisztikáit kezelő alkalmazás létrehozása.

---

## Kezdés

### 1. Klónozd a projektet

```bash
git clone <repository_url>
cd <project_folder>

#Telepítsd a függőségeket
# Vite és React plugin
npm install vite @vitejs/plugin-react --save-dev

# Electron
npm install electron

# Párhuzamos futtatáshoz
npm install -D concurrently wait-on

# Excel kezeléshez
npm install xlsx

# Adatbázis kezeléshez
npm install better-sqlite3

# Bootstrap stílusokhoz
npm install bootstrap

#main.jsx fájlban a stílushoz:
import 'bootstrap/dist/css/bootstrap.min.css';

#package.json-ban legyen benne:
[
 "scripts": {"start": "electron ."}
]


# fejlesztői mód futtatás: React + Electron egyszerre
npm run dev


###Build készítése electron-builddel:
npm run build

# kész build futtatása
npm run start

```
