const STORAGE_KEY = 'bacolar.serverUrl';

// Paketlenmiş uygulamada her kurulum kendi yerel sinyalleşme sunucusunu başlatır.
// Farklı bilgisayarlardaki kullanıcıların aynı odayı görebilmesi için hepsinin
// tek bir sunucuya bağlanması gerekir; bu adres kullanıcı tarafından girilir.
const DEFAULT_SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export const getServerUrl = (): string => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored?.trim() || DEFAULT_SERVER_URL;
};

export const getDefaultServerUrl = (): string => DEFAULT_SERVER_URL;

export const isCustomServerUrl = (): boolean => Boolean(localStorage.getItem(STORAGE_KEY)?.trim());

export const setServerUrl = (url: string): void => {
  const trimmed = url.trim();
  if (!trimmed || trimmed === DEFAULT_SERVER_URL) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, trimmed);
};

export const normalizeServerUrl = (raw: string): string => {
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
};
