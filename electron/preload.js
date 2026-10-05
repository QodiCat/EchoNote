const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('echoNote', {
  selectOutputDirectory: () => ipcRenderer.invoke('select-output-directory'),
  processRecording: (payload) => ipcRenderer.invoke('process-recording', payload),
  importMedia: (payload) => ipcRenderer.invoke('import-media', payload),
  onTaskProgress: (callback) => {
    const listener = (_event, phase) => callback(phase);
    ipcRenderer.on('task-progress', listener);
    return () => ipcRenderer.removeListener('task-progress', listener);
  },
  deleteRecording: () => ipcRenderer.invoke('delete-recording'),
  openResultFolder: () => ipcRenderer.invoke('open-result-folder'),
  saveServiceSettings: (settings) => ipcRenderer.invoke('save-service-settings', settings),
  getProxyStatus: () => ipcRenderer.invoke('get-proxy-status'),
  getShortcuts: () => ipcRenderer.invoke('get-shortcuts'),
  saveShortcuts: (settings) => ipcRenderer.invoke('save-shortcuts', settings)
});
