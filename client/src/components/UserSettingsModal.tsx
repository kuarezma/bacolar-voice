import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserStatus } from '../types';
import { X, User, Gamepad2, Shield, Sparkles, Check, Server } from 'lucide-react';
import { getServerUrl, getDefaultServerUrl, setServerUrl, normalizeServerUrl } from '../config/server';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const UserSettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { user, updateProfile, avatarPresets } = useAuth();

  const [username, setUsername] = useState(user?.username || '');
  const [tag, setTag] = useState(user?.tag || '');
  const [status, setStatus] = useState<UserStatus>(user?.status || 'online');
  const [currentGame, setCurrentGame] = useState(user?.currentGame || '');
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || avatarPresets[0].id);
  const [serverUrl, setServerUrlInput] = useState(getServerUrl());

  if (!isOpen || !user) return null;

  const handleSave = () => {
    if (!username.trim()) return;
    updateProfile({
      username: username.trim(),
      tag: tag.trim() || '1337',
      status,
      currentGame: currentGame.trim() || undefined,
      avatar: selectedAvatar
    });

    const nextServerUrl = normalizeServerUrl(serverUrl) || getDefaultServerUrl();
    if (nextServerUrl !== getServerUrl()) {
      setServerUrl(nextServerUrl);
      // Socket bağlantısı açılışta bir kez kurulduğu için adres değişiminde yeniden yükleme gerekir.
      window.location.reload();
      return;
    }

    onClose();
  };

  const statusOptions: { value: UserStatus; label: string; color: string; desc: string }[] = [
    { value: 'online', label: 'Çevrimiçi', color: 'bg-emerald-500', desc: 'Sohbete ve oyunlara hazır' },
    { value: 'idle', label: 'Boşta / AFK', color: 'bg-amber-500', desc: 'Bilgisayar başında değil' },
    { value: 'dnd', label: 'Rahatsız Etmeyin', color: 'bg-rose-500', desc: 'Bildirim sesleri kapatılır' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-[#111622] border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Başlık */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#171f30]">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Oyuncu Profili & Kimlik</h2>
              <p className="text-xs text-slate-400">Arkadaşlarınızın sizi göreceği kullanıcı adı ve avatar</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* İçerik */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-sm">
          {/* Avatar Seçici */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" /> Profil Avatarı
            </label>
            <div className="grid grid-cols-4 gap-3">
              {avatarPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelectedAvatar(preset.id)}
                  className={`relative p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition ${
                    selectedAvatar === preset.id
                      ? 'border-indigo-500 bg-indigo-500/20 ring-2 ring-indigo-500/50'
                      : 'border-slate-800 bg-[#171f30] hover:border-slate-700'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-tr ${preset.color} shadow-md`}>
                    {preset.url}
                  </div>
                  <span className="text-[11px] font-medium text-slate-300 truncate max-w-[80px]">{preset.label}</span>
                  {selectedAvatar === preset.id && (
                    <div className="absolute top-1 right-1 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center text-white">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Kullanıcı Adı ve Etiket */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Kullanıcı Adı
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Örn: CyberNinja"
                className="w-full bg-[#171f30] border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Etiket (#Tag)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-500 font-mono">#</span>
                <input
                  type="text"
                  maxLength={6}
                  value={tag}
                  onChange={(e) => setTag(e.target.value.replace('#', ''))}
                  placeholder="1337"
                  className="w-full bg-[#171f30] border border-slate-700 rounded-xl pl-7 pr-3 py-2.5 text-white font-mono font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Çevrimiçi Durumu */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Çevrimiçi Durumu
            </label>
            <div className="grid grid-cols-3 gap-2">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={`p-2.5 rounded-xl border flex items-center gap-2 transition text-left ${
                    status === opt.value
                      ? 'border-indigo-500 bg-indigo-500/10 text-white'
                      : 'border-slate-800 bg-[#171f30] text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full ${opt.color}`} />
                  <span className="text-xs font-semibold">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Oynanan Oyun (Durum Mesajı) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Gamepad2 className="w-4 h-4 text-purple-400" /> Şu Anda Oynanan Oyun (İsteğe Bağlı)
            </label>
            <input
              type="text"
              value={currentGame}
              onChange={(e) => setCurrentGame(e.target.value)}
              placeholder="Örn: Counter-Strike 2, Valorant, LoL..."
              className="w-full bg-[#171f30] border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Sinyalleşme Sunucusu */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Server className="w-4 h-4 text-emerald-400" /> Sunucu Adresi
            </label>
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrlInput(e.target.value)}
              placeholder={getDefaultServerUrl()}
              spellCheck={false}
              className="w-full bg-[#171f30] border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
            />
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Varsayılan adres bilgisayarınızda çalışan yerel sunucudur ve yalnızca sizi görür.
              Arkadaşlarınızla aynı odalarda buluşmak için hepinizin <span className="text-slate-300">aynı adresi</span> girmesi gerekir
              (örn. <span className="font-mono text-slate-300">http://192.168.1.20:3001</span>).
              Adres değiştirildiğinde uygulama yeniden yüklenir.
            </p>
          </div>
        </div>

        {/* Alt Çubuk */}
        <div className="px-6 py-4 border-t border-slate-800 bg-[#171f30] flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-white text-sm transition"
          >
            İptal
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-indigo-600/30"
          >
            Kaydet & Güncelle
          </button>
        </div>
      </div>
    </div>
  );
};
