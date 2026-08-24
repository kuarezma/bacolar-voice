import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { VoiceRoom } from '../types';
import { X, PlusCircle, Lock, Users, Gamepad2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateRoomModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { createRoom } = useSocket();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<VoiceRoom['category']>('Gaming');
  const [gameTitle, setGameTitle] = useState('');
  const [maxUsers, setMaxUsers] = useState(5);
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createRoom(name.trim(), category, {
      maxUsers,
      isPrivate,
      password: isPrivate ? password : undefined,
      gameTitle: gameTitle.trim() || undefined
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-[#111622] border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Başlık */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#171f30]">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Yeni Ses Kanalı Oluştur</h2>
              <p className="text-xs text-slate-400">Takımınız veya arkadaşlarınız için özel lobi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Oda Adı
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: 🏆 Turnuva Lobisi, Squad Alpha"
              className="w-full bg-[#171f30] border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Kategori
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-[#171f30] border border-slate-700 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="Gaming">🎮 Oyun</option>
                <option value="Competitive">🏆 Rekabetçi</option>
                <option value="Duo">👥 Duo / İkili</option>
                <option value="Casual">☕ Sohbet</option>
                <option value="Custom">✨ Özel</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-indigo-400" /> Kişi Limiti
              </label>
              <select
                value={maxUsers}
                onChange={(e) => setMaxUsers(Number(e.target.value))}
                className="w-full bg-[#171f30] border border-slate-700 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value={2}>2 Kişi (Duo)</option>
                <option value={3}>3 Kişi (Trio)</option>
                <option value={5}>5 Kişi (Squad / 5-Stack)</option>
                <option value={10}>10 Kişi (Custom 5v5)</option>
                <option value={25}>25 Kişi (Topluluk)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1">
              <Gamepad2 className="w-3.5 h-3.5 text-purple-400" /> Oyun Adı (İsteğe Bağlı)
            </label>
            <input
              type="text"
              value={gameTitle}
              onChange={(e) => setGameTitle(e.target.value)}
              placeholder="Örn: Counter-Strike 2, Apex Legends"
              className="w-full bg-[#171f30] border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Şifreli / Özel Oda */}
          <div className="pt-2 space-y-3">
            <label className="flex items-center justify-between p-3 bg-[#171f30] border border-slate-800 rounded-xl cursor-pointer">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-medium text-slate-200">Şifreli Özel Oda</span>
              </div>
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
              />
            </label>

            {isPrivate && (
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Oda Şifresi Belirleyin"
                className="w-full bg-[#171f30] border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500 animate-fade-in"
              />
            )}
          </div>

          <div className="pt-4 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white text-sm transition"
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-indigo-600/30"
            >
              Odayı Başlat
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
