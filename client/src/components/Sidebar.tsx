import React from 'react';
import { useSocket } from '../context/SocketContext';
import { useVoice } from '../context/VoiceContext';
import { useAuth } from '../context/AuthContext';
import { VoiceRoom } from '../types';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Settings,
  Users,
  Plus,
  Radio,
  Gamepad2,
  Lock,
  Wifi,
  Sparkles,
  Sliders
} from 'lucide-react';

interface Props {
  activeView: 'friends' | 'room';
  setActiveView: (view: 'friends' | 'room') => void;
  openAudioSettings: () => void;
  openUserSettings: () => void;
  openCreateRoom: () => void;
}

export const Sidebar: React.FC<Props> = ({
  activeView,
  setActiveView,
  openAudioSettings,
  openUserSettings,
  openCreateRoom
}) => {
  const { rooms, friendRequests, isConnected, ping } = useSocket();
  const { currentRoom, joinVoiceRoom, isMuted, isDeafened, toggleMute, toggleDeafen, isSpeaking } = useVoice();
  const { user, avatarPresets } = useAuth();

  const getAvatarEmoji = (presetId?: string) => {
    const found = avatarPresets.find(p => p.id === presetId);
    return found ? found.url : '🎮';
  };

  const getAvatarGradient = (presetId?: string) => {
    const found = avatarPresets.find(p => p.id === presetId);
    return found ? found.color : 'from-indigo-600 to-purple-800';
  };

  const handleRoomClick = async (room: VoiceRoom) => {
    if (currentRoom?.id === room.id) {
      setActiveView('room');
      return;
    }

    let password = undefined;
    if (room.isPrivate) {
      password = prompt('Bu oda şifrelidir. Lütfen oda şifresini girin:') || undefined;
      if (!password) return;
    }

    const ok = await joinVoiceRoom(room.id, password);
    if (ok) {
      setActiveView('room');
    }
  };

  const pendingRequestsCount = friendRequests.incoming.length;

  return (
    <div className="w-72 bg-[#111622] border-r border-slate-800 flex flex-col h-full select-none">
      {/* Üst Logo */}
      <div className="h-16 px-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-wider text-white bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              BACOLAR<span className="text-indigo-400">VOICE</span>
            </h1>
            <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Düşük Gecikme WebRTC</span>
            </div>
          </div>
        </div>

        {/* Bağlantı Durumu */}
        <div className="flex items-center gap-1 text-[11px] font-mono px-2 py-1 bg-[#171f30] rounded-lg border border-slate-800">
          <Wifi className={`w-3 h-3 ${isConnected ? 'text-emerald-400' : 'text-rose-400'}`} />
          <span className="text-slate-300">{ping}ms</span>
        </div>
      </div>

      {/* Navigasyon & Odalar Listesi */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        
        {/* Arkadaşlar Sekmesi Butonu */}
        <button
          onClick={() => setActiveView('friends')}
          className={`w-full p-2.5 rounded-xl font-medium text-xs flex items-center justify-between transition ${
            activeView === 'friends'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-300 hover:bg-[#171f30] hover:text-white'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            <Users className="w-4 h-4" />
            <span>Arkadaşlar & DM</span>
          </div>
          {pendingRequestsCount > 0 && (
            <span className="px-1.5 py-0.5 bg-rose-500 text-white rounded-full text-[10px] font-bold">
              {pendingRequestsCount}
            </span>
          )}
        </button>

        {/* Ses Odaları Başlığı ve Ekle Butonu */}
        <div className="pt-2">
          <div className="flex items-center justify-between px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <span>Ses Odaları ({rooms.length})</span>
            <button
              onClick={openCreateRoom}
              className="p-1 hover:text-indigo-400 hover:bg-[#171f30] rounded-md transition"
              title="Yeni Oda Oluştur"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Oda Listesi */}
          <div className="mt-2 space-y-1">
            {rooms.map((room) => {
              const isCurrent = currentRoom?.id === room.id;
              const isFull = room.members.length >= room.maxUsers;

              return (
                <button
                  key={room.id}
                  onClick={() => handleRoomClick(room)}
                  className={`w-full p-2.5 rounded-xl text-left transition flex items-center justify-between group ${
                    isCurrent
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-semibold'
                      : 'hover:bg-[#171f30] text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <span className="text-sm">{room.isPrivate ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : '🔊'}</span>
                    <div className="truncate">
                      <div className="text-xs truncate font-medium flex items-center gap-1">
                        <span>{room.name}</span>
                      </div>
                      {room.gameTitle && (
                        <div className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                          <Gamepad2 className="w-2.5 h-2.5 text-purple-400" />
                          <span>{room.gameTitle}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 text-[11px] font-mono">
                    <span className={`px-1.5 py-0.5 rounded ${
                      isCurrent ? 'bg-emerald-500/20 text-emerald-400 font-bold' :
                      isFull ? 'bg-rose-500/20 text-rose-400' : 'bg-[#171f30] text-slate-400'
                    }`}>
                      {room.members.length}/{room.maxUsers}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Alt Kullanıcı Kontrol Paneli */}
      <div className="p-3 border-t border-slate-800 bg-[#171f30]/80">
        <div className="flex items-center justify-between">
          
          {/* Avatar & İsim */}
          <div
            onClick={openUserSettings}
            className="flex items-center space-x-2.5 cursor-pointer hover:opacity-80 transition truncate flex-1 mr-2"
            title="Profili Düzenle"
          >
            <div className="relative flex-shrink-0">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${getAvatarGradient(user?.avatar)} flex items-center justify-center text-lg shadow-md ${
                isSpeaking ? 'speaking-ring ring-2 ring-emerald-500' : ''
              }`}>
                {getAvatarEmoji(user?.avatar)}
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-[#171f30] ${
                user?.status === 'online' ? 'bg-emerald-500' :
                user?.status === 'idle' ? 'bg-amber-500' :
                user?.status === 'dnd' ? 'bg-rose-500' : 'bg-slate-600'
              }`} />
            </div>

            <div className="truncate">
              <div className="text-xs font-bold text-white truncate">{user?.username}</div>
              <div className="text-[10px] text-slate-400 font-mono">#{user?.tag}</div>
            </div>
          </div>

          {/* Hızlı Butonlar (Mute, Deafen, Ses Ayarları) */}
          <div className="flex items-center space-x-1">
            {/* Mikrofon Sustur */}
            <button
              onClick={toggleMute}
              className={`p-2 rounded-lg transition ${
                isMuted
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={isMuted ? 'Mikrofonu Aç' : 'Mikrofonu Kapat'}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Sağırlaştır */}
            <button
              onClick={toggleDeafen}
              className={`p-2 rounded-lg transition ${
                isDeafened
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={isDeafened ? 'Kulaklığı Aç' : 'Sağırlaştır'}
            >
              {isDeafened ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Ses ve Mikrofon Ayarları */}
            <button
              onClick={openAudioSettings}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              title="Ses ve Mikrofon Ayarları"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
