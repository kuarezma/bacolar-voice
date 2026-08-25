import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider, useSocket } from './context/SocketContext';
import { VoiceProvider, useVoice } from './context/VoiceContext';
import { Sidebar } from './components/Sidebar';
import { VoiceRoomView } from './components/VoiceRoomView';
import { FriendsView } from './components/FriendsView';
import { AudioSettingsModal } from './components/AudioSettingsModal';
import { UserSettingsModal } from './components/UserSettingsModal';
import { CreateRoomModal } from './components/CreateRoomModal';
import { DirectCallModal } from './components/DirectCallModal';
import { Radio, Users, Sliders, ShieldCheck, Zap, Headphones, Gamepad2, AlertTriangle } from 'lucide-react';

const ConnectionBanner: React.FC = () => {
  const { connectionError } = useSocket();
  if (!connectionError) return null;

  return (
    <div className="flex items-start gap-2.5 px-4 py-2.5 bg-rose-950/70 border-b border-rose-800 text-rose-100 text-xs">
      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
      <span className="leading-relaxed">{connectionError}</span>
    </div>
  );
};

const MainLayout: React.FC = () => {
  const { currentRoom } = useVoice();
  const [activeView, setActiveView] = useState<'friends' | 'room'>('friends');
  const [isAudioSettingsOpen, setIsAudioSettingsOpen] = useState(false);
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false);
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);

  // Odaya girildiğinde otomatik olarak odaya geç
  useEffect(() => {
    if (currentRoom) {
      setActiveView('room');
    }
  }, [currentRoom?.id]);

  return (
    <div className="flex h-screen w-screen bg-[#0b0e14] text-slate-100 overflow-hidden font-sans">
      {/* Sol Kenar Çubuğu */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        openAudioSettings={() => setIsAudioSettingsOpen(true)}
        openUserSettings={() => setIsUserSettingsOpen(true)}
        openCreateRoom={() => setIsCreateRoomOpen(true)}
      />

      {/* Ana İçerik Alanı */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <ConnectionBanner />
        {activeView === 'room' && currentRoom ? (
          <VoiceRoomView />
        ) : activeView === 'friends' ? (
          <FriendsView />
        ) : (
          /* Karşılama / Boş Durum Ekranı */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#0b0e14]">
            <div className="w-20 h-20 rounded-3xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6 shadow-2xl animate-pulse">
              <Radio className="w-10 h-10" />
            </div>

            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              BacolarVoice Oyun Sesli İletişim Ağına Hoş Geldiniz
            </h2>
            <p className="text-sm text-slate-400 max-w-md mt-2">
              Sol menüden bir ses odasına katılabilir, arkadaş ekleyebilir veya doğrudan 1-1 sesli arama başlatabilirsiniz.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mt-8 text-left">
              <div className="p-4 bg-[#111622] border border-slate-800 rounded-2xl">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg w-fit mb-2">
                  <Zap className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-white text-xs">Sıfır Sunucu Gecikmesi</h4>
                <p className="text-[11px] text-slate-400 mt-1">WebRTC P2P Mesh altyapısı ile en düşük milisaniye gecikme.</p>
              </div>

              <div className="p-4 bg-[#111622] border border-slate-800 rounded-2xl">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg w-fit mb-2">
                  <Headphones className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-white text-xs">Opus 48kHz Kristal Ses</h4>
                <p className="text-[11px] text-slate-400 mt-1">Yankı engelleme, gürültü filtreleme ve otomatik kazanç kontrolü.</p>
              </div>

              <div className="p-4 bg-[#111622] border border-slate-800 rounded-2xl">
                <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg w-fit mb-2">
                  <Gamepad2 className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-white text-xs">Oyun Odaklı Kontroller</h4>
                <p className="text-[11px] text-slate-400 mt-1">Bas-Konuş kısayolları ve kişi başı %200 ses yükseltme.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modallar ve Bildirimler */}
      <AudioSettingsModal
        isOpen={isAudioSettingsOpen}
        onClose={() => setIsAudioSettingsOpen(false)}
      />

      <UserSettingsModal
        isOpen={isUserSettingsOpen}
        onClose={() => setIsUserSettingsOpen(false)}
      />

      <CreateRoomModal
        isOpen={isCreateRoomOpen}
        onClose={() => setIsCreateRoomOpen(false)}
      />

      <DirectCallModal />
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <VoiceProvider>
          <MainLayout />
        </VoiceProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
