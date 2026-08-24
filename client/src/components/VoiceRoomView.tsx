import React, { useState } from 'react';
import { useVoice } from '../context/VoiceContext';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { PhoneOff, Mic, MicOff, Volume2, VolumeX, ShieldCheck, Zap, Send, MessageSquare, Sliders, Users, Radio } from 'lucide-react';

export const VoiceRoomView: React.FC = () => {
  const { currentRoom, roomMembers, roomMessages, leaveVoiceRoom, isMuted, isDeafened, isSpeaking, myMicLevel, peerStates, setUserVolume, sendRoomMessage } = useVoice();
  const { user, avatarPresets } = useAuth();
  const { ping } = useSocket();

  const [chatInput, setChatInput] = useState('');
  const [activeVolumePopover, setActiveVolumePopover] = useState<string | null>(null);

  if (!currentRoom) return null;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendRoomMessage(chatInput.trim());
    setChatInput('');
  };

  const getAvatarEmoji = (presetId?: string) => {
    const found = avatarPresets.find(p => p.id === presetId);
    return found ? found.url : '🎮';
  };

  const getAvatarGradient = (presetId?: string) => {
    const found = avatarPresets.find(p => p.id === presetId);
    return found ? found.color : 'from-indigo-600 to-purple-800';
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0e14] overflow-hidden">
      {/* Üst Oda Başlığı */}
      <div className="h-16 px-6 border-b border-slate-800 bg-[#111622] flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-2.5 bg-indigo-500/15 text-indigo-400 rounded-xl border border-indigo-500/20">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">{currentRoom.name}</h2>
              {currentRoom.gameTitle && (
                <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {currentRoom.gameTitle}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-500" /> {roomMembers.length} / {currentRoom.maxUsers} Oyuncu
              </span>
              <span className="flex items-center gap-1 text-emerald-400 font-mono font-medium">
                <Zap className="w-3.5 h-3.5" /> WebRTC P2P (0ms Relay)
              </span>
              <span className="flex items-center gap-1 text-indigo-300 font-mono">
                Ping: <strong>{ping}ms</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Odadan Ayrıl Butonu */}
        <button
          onClick={leaveVoiceRoom}
          className="px-4 py-2 bg-rose-600/90 hover:bg-rose-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-rose-600/30 transition active:scale-95"
        >
          <PhoneOff className="w-4 h-4" /> Odadan Ayrıl
        </button>
      </div>

      {/* Ana Alan: Kullanıcı Kartları & Sağ Panel Chat */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sol Alan: Ses Izgarası (Voice Grid) */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            
            {/* 1. Kendi Kartımız (Local User) */}
            <div className={`relative bg-[#111622] rounded-2xl border p-5 flex flex-col items-center justify-center transition-all duration-200 group ${
              isSpeaking ? 'border-emerald-500/80 shadow-lg shadow-emerald-500/20 bg-[#111622]' : 'border-slate-800/80 hover:border-slate-700'
            }`}>
              {/* Konuşma Rozeti */}
              <div className="relative mb-3">
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-tr ${getAvatarGradient(user?.avatar)} flex items-center justify-center text-4xl shadow-md transition-all ${
                  isSpeaking ? 'speaking-ring ring-4 ring-emerald-500 scale-105' : ''
                }`}>
                  {getAvatarEmoji(user?.avatar)}
                </div>
                {/* Durum İkonları */}
                <div className="absolute -bottom-1 -right-1 flex gap-1">
                  {isMuted && (
                    <div className="p-1.5 bg-rose-600 text-white rounded-lg shadow ring-2 ring-[#111622]">
                      <MicOff className="w-3.5 h-3.5" />
                    </div>
                  )}
                  {isDeafened && (
                    <div className="p-1.5 bg-rose-600 text-white rounded-lg shadow ring-2 ring-[#111622]">
                      <VolumeX className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              </div>

              {/* İsim ve Tag */}
              <div className="text-center w-full">
                <div className="font-bold text-white text-sm flex items-center justify-center gap-1">
                  <span className="truncate">{user?.username}</span>
                  <span className="text-xs text-indigo-400 bg-indigo-500/20 px-1.5 py-0.5 rounded font-mono">SEN</span>
                </div>
                <div className="text-xs text-slate-500 font-mono mt-0.5">#{user?.tag}</div>
              </div>

              {/* Canlı Mikrofon VU Metresi */}
              <div className="w-full mt-3 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-75 ${isSpeaking ? 'bg-emerald-400' : 'bg-slate-600'}`}
                  style={{ width: `${Math.min(100, myMicLevel)}%` }}
                />
              </div>
            </div>

            {/* 2. Diğer Odadaki Üyeler (Remote Peers) */}
            {roomMembers.filter(m => m.id !== user?.id).map((member) => {
              const peerState = peerStates[member.id] || { isSpeaking: false, audioLevel: 0, volume: 100, isMuted: false };
              const isRemoteSpeaking = peerState.isSpeaking;
              const isPopoverOpen = activeVolumePopover === member.id;

              return (
                <div
                  key={member.id}
                  className={`relative bg-[#111622] rounded-2xl border p-5 flex flex-col items-center justify-center transition-all duration-200 group ${
                    isRemoteSpeaking ? 'border-emerald-500/80 shadow-lg shadow-emerald-500/20' : 'border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  {/* Ses Ayar Slider Butonu (Hover'da Çıkar) */}
                  <button
                    onClick={() => setActiveVolumePopover(isPopoverOpen ? null : member.id)}
                    className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition"
                    title="Kişisel Ses Ayarı"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                  </button>

                  {/* Ses Ayar Popover */}
                  {isPopoverOpen && (
                    <div className="absolute top-12 right-2 z-20 bg-[#171f30] border border-slate-700 p-3 rounded-xl shadow-2xl w-48 space-y-2 animate-fade-in">
                      <div className="flex justify-between text-xs text-slate-300 font-semibold">
                        <span>Ses Seviyesi</span>
                        <span className="text-indigo-400">%{peerState.volume}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="200"
                        value={peerState.volume}
                        onChange={(e) => setUserVolume(member.id, Number(e.target.value))}
                        className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>
                  )}

                  {/* Avatar */}
                  <div className="relative mb-3">
                    <div className={`w-20 h-20 rounded-2xl bg-gradient-to-tr ${getAvatarGradient(member.avatar)} flex items-center justify-center text-4xl shadow-md transition-all ${
                      isRemoteSpeaking ? 'speaking-ring ring-4 ring-emerald-500 scale-105' : ''
                    }`}>
                      {getAvatarEmoji(member.avatar)}
                    </div>
                    {/* Durum İkonları */}
                    <div className="absolute -bottom-1 -right-1 flex gap-1">
                      {member.micMuted && (
                        <div className="p-1.5 bg-rose-600 text-white rounded-lg shadow ring-2 ring-[#111622]">
                          <MicOff className="w-3.5 h-3.5" />
                        </div>
                      )}
                      {member.deafened && (
                        <div className="p-1.5 bg-rose-600 text-white rounded-lg shadow ring-2 ring-[#111622]">
                          <VolumeX className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* İsim ve Tag */}
                  <div className="text-center w-full">
                    <div className="font-bold text-white text-sm truncate max-w-[150px] mx-auto">
                      {member.username}
                    </div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">#{member.tag}</div>
                  </div>

                  {/* Canlı VU Barı */}
                  <div className="w-full mt-3 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-75 ${isRemoteSpeaking ? 'bg-emerald-400' : 'bg-slate-600'}`}
                      style={{ width: `${Math.min(100, peerState.audioLevel || 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}

          </div>
        </div>

        {/* Sağ Panel: Oda İçi Taktik & Chat */}
        <div className="w-80 border-l border-slate-800 bg-[#111622] flex flex-col">
          {/* Chat Başlığı */}
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-indigo-400" /> Oda Sohbeti & Taktik
            </span>
            <span className="text-slate-500 font-normal">{roomMessages.length} mesaj</span>
          </div>

          {/* Mesaj Listesi */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
            {roomMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center p-4">
                <MessageSquare className="w-8 h-8 mb-2 opacity-30" />
                <p>Henüz mesaj yok. Oyun taktiği veya lobi linki paylaşın!</p>
              </div>
            ) : (
              roomMessages.map((msg) => (
                <div key={msg.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className={`font-bold ${msg.userId === user?.id ? 'text-indigo-400' : 'text-slate-300'}`}>
                      {msg.username}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="bg-[#171f30] text-slate-200 p-2.5 rounded-xl border border-slate-800/80 break-words">
                    {msg.text}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Mesaj Yazma Girişi */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 bg-[#171f30]">
            <div className="relative">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Mesaj veya taktik yaz..."
                className="w-full bg-[#111622] border border-slate-700 rounded-xl pl-3 pr-10 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="absolute right-1.5 top-1.5 p-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white rounded-lg transition"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
