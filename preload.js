const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getAircrafts: () => ipcRenderer.invoke('get-aircrafts'),
  getSchedules: (name, filter) => ipcRenderer.invoke('get-schedules', name, filter),
  getStatuses: () => ipcRenderer.invoke('get-statuses'),
  getAirports: () => ipcRenderer.invoke('get-airports'),
  getUsers: () => ipcRenderer.invoke('get-users'),
  getStatsByMonth: (gepAzonosito) => ipcRenderer.invoke('get-stats-by-month', gepAzonosito),
  
  addAircraft: (name, type, consumption) => ipcRenderer.invoke('add-aircraft', name, type, consumption),
  addSchedule: (aircraft, airport, event, start, end, note) => ipcRenderer.invoke('add-schedule', aircraft, airport, event, start, end, note),
  addStatus: (code, description, color) => ipcRenderer.invoke('add-status', code, description, color),
  addUser: (username, password, role) => ipcRenderer.invoke('add-user', username, password, role),

  updateSchedule: (id, updateData) => ipcRenderer.invoke('update-schedule', id, updateData),

  deleteAircraft: (id) => ipcRenderer.invoke('delete-aircraft', id),
  deleteSchedule: (id) => ipcRenderer.invoke('delete-schedule', id),
  deleteStatus: (id) => ipcRenderer.invoke('delete-status', id),

});