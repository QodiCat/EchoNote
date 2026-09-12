const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('echoNote', {
  selectOutputDirectory: () => ipcRenderer.invoke('select-output-directory'),
  saveRecording: (payload) => ipcRenderer.invoke('save-recording', payload),
  deleteRecording: (payload) => ipcRenderer.invoke('delete-recording', payload),
  getProxyStatus: () => ipcRenderer.invoke('get-proxy-status')
});
