import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  onGlobalMuteToggle: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('global-mute-toggle', listener);

    return () => {
      ipcRenderer.removeListener('global-mute-toggle', listener);
    };
  }
});
