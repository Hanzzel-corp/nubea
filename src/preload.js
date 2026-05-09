const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("nubeaAPI", {
  minimize: () => ipcRenderer.invoke("window:minimize"),
  maximize: () => ipcRenderer.invoke("window:maximize"),
  close: () => ipcRenderer.invoke("window:close"),

  setMode: (mode) => ipcRenderer.send("mode:set", mode),
  navigationStart: (url) => ipcRenderer.send("navigation:start", url),

  onLiveUpdate: (callback) => {
    ipcRenderer.on("live:update", (_event, data) => callback(data));
  }
});
