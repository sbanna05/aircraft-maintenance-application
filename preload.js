const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getAircrafts: async () =>await ipcRenderer.invoke('get-aircrafts'),
  getSchedules:async (year, name, filter) => await ipcRenderer.invoke('get-schedules',year, name, filter),
  getStatuses:async () => await ipcRenderer.invoke('get-statuses'),
  getAirports:async () => await ipcRenderer.invoke('get-airports'),
  getUsers:async () => await ipcRenderer.invoke('get-users'),
  getStatsByMonth:async (gepAzonosito) => await ipcRenderer.invoke('get-stats-by-month', gepAzonosito),
  
  addAircraft:async (name, type, consumption) => await ipcRenderer.invoke('add-aircraft', name, type, consumption),
  addSchedule:async (aircraft, airport, event, start, end, note) => await ipcRenderer.invoke('add-schedule', aircraft, airport, event, start, end, note),
  addStatus:async (code, description, color) => await ipcRenderer.invoke('add-status', code, description, color),
  addUser:async (username, password, role) => await ipcRenderer.invoke('add-user', username, password, role),

  updateSchedule:async (id, updateData) => await ipcRenderer.invoke('update-schedule', id, updateData),

  deleteAircraft:async (id) => await ipcRenderer.invoke('delete-aircraft', id),
  deleteSchedule:async (id) => await ipcRenderer.invoke('delete-schedule', id),
  deleteStatus:async (id) => await ipcRenderer.invoke('delete-status', id),

});