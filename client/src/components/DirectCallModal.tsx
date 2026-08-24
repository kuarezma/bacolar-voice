import React, { useEffect, useState } from 'react';
import { useVoice } from '../context/VoiceContext';
import { useAuth } from '../context/AuthContext';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, ShieldCheck } from 'lucide-react';

export const DirectCallModal: React.FC = () => {
  const { incomingCall, directCall, acceptDirectCall, rejectDirectCall, endDirectCall, isMuted, toggleMute, isDeafened, toggleDeafen, isSpeaking } = useVoice();
  const { user, avatarPresets } = useAuth();
  const [callDuration, setCallDuration] = useState(0);

  const getAvatarEmoji = (presetId?: string) => {
    const found = avatarPresets.find(p => p.id === presetId);
    return found ? found.url : '🎮';
  };

  const getAvatarGradient = (presetId?: string) => {
    const found = avatarPresets.find(p => p.id === presetId);
    return found ? found.color : 'from-indigo-600 to-purple-800';
  };

  // Konuşma Süresi Sayacı
  useEffect(() => {
    let timer: any = null;
    if (directCall && directCall.status === 'connected') {
      setCallDuration(0);
      timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [directCall?.status]);

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // 1. Gelen Arama Penceresi (Incoming Ringing)
  if (incomingCall) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in p-4">
        <div className="bg-[#111622] border border-indigo-500/50 w-full max-w-sm rounded-3xl shadow-2xl p-6 text-center flex flex-col items-center space-y-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-4xl shadow-xl animate-bounce">
              {getAvatarEmoji(incomingCall.caller.avatar)}
            </div>
            <div className="absolute -bottom-1 -right-1 p-2 bg-emerald-500 rounded-full text-white ring-4 ring-[#111622]">
              <Phone className="w-4 h-4 animate-pulse" />
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold text-white">{incomingCall.caller.username}</h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">#{incomingCall.caller.tag}</p>
            <p className="text-sm text-indigo-400 font-medium mt-2 animate-pulse">Gelen Doğrudan Sesli Arama...</p>
          </div>

          <div className="flex items-center gap-6 w-full justify-center">
            {/* Reddet */}
            <button
              onClick={rejectDirectCall}
              className="flex flex-col items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition"
            >
              <div className="w-14 h-14 bg-rose-600 hover:bg-rose-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-rose-600/40 transition">
                <PhoneOff className="w-6 h-6" />
              </div>
              <span>Reddet</span>
            </button>

            {/* Kabul Et */}
            <button
              onClick={acceptDirectCall}
              className="flex flex-col items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition"
            >
              <div className="w-14 h-14 bg-emerald-600 hover:bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-600/40 transition animate-pulse">
                <Phone className="w-6 h-6" />
              </div>
              <span>Kabul Et</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Aktif Görüşme Penceresi / Çalıyor Ekranı (Direct Call In-Progress)
  if (directCall) {
    const otherUser = directCall.callerId === user?.id ? directCall.receiver : directCall.caller;

    return (
      <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
        <div className="bg-[#111622]/95 backdrop-blur-md border border-indigo-500/40 rounded-2xl shadow-2xl p-4 w-80 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${getAvatarGradient(otherUser.avatar)} flex items-center justify-center text-xl shadow-md ${isSpeaking ? 'speaking-ring border-2 border-emerald-400' : ''}`}>
                {getAvatarEmoji(otherUser.avatar)}
              </div>
              <div>
                <h4 className="font-bold text-white text-sm truncate max-w-[130px]">{otherUser.username}</h4>
                <div className="flex items-center gap-1 text-[11px] text-indigo-400 font-mono">
                  {directCall.status === 'connected' ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      {formatDuration(callDuration)}
                    </span>
                  ) : (
                    <span className="text-amber-400 animate-pulse">Aranıyor...</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> P2P
              </span>
            </div>
          </div>

          {/* Kontrol Butonları */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleMute}
                className={`p-2.5 rounded-xl transition ${
                  isMuted ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
                title={isMuted ? 'Mikrofonu Aç' : 'Mikrofonu Kapat'}
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <button
                onClick={toggleDeafen}
                className={`p-2.5 rounded-xl transition ${
                  isDeafened ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
                title={isDeafened ? 'Kulaklığı Aç' : 'Sağırlaştır'}
              >
                {isDeafened ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>

            {/* Aramayı Sonlandır */}
            <button
              onClick={endDirectCall}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-rose-600/30 transition"
            >
              <PhoneOff className="w-4 h-4" /> Kapat
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
