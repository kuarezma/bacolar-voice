import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  onGlobalPttPress: (callback: () => void) => {
    ipcRenderer.on('global-ptt-press', () => callback());
  },
  onGlobalPttRelease: (callback: () => void) => {
    ipcRenderer.on('global-ptt-release', () => callback());
  },
  onGlobalMuteToggle: (callback: () => void) => {
    ipcRenderer.on('global-mute-toggle', () => callback());
  },
  setGlobalShortcuts: (pttKey: string) => {
    ipcRenderer.send('register-shortcuts', { pttKey });
  }
});
