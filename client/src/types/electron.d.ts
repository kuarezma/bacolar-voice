interface ElectronAPI {
  onGlobalMuteToggle(callback: () => void): () => void;
}

interface Window {
  electronAPI?: ElectronAPI;
}
