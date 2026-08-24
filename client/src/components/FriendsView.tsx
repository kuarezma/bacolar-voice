import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { useVoice } from '../context/VoiceContext';
import { useAuth } from '../context/AuthContext';
import { UserProfile } from '../types';
import { Users, UserPlus, Phone, Check, X, Trash2, Gamepad2, Search, Sparkles, Clock } from 'lucide-react';

export const FriendsView: React.FC = () => {
  const { friends, friendRequests, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend } = useSocket();
  const { startDirectCall } = useVoice();
  const { avatarPresets } = useAuth();

  const [activeTab, setActiveTab] = useState<'online' | 'all' | 'pending' | 'add'>('online');
  const [targetInput, setTargetInput] = useState('');
  const [addStatus, setAddStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const getAvatarEmoji = (presetId?: string) => {
    const found = avatarPresets.find(p => p.id === presetId);
    return found ? found.url : '🎮';
  };

  const getAvatarGradient = (presetId?: string) => {
    const found = avatarPresets.find(p => p.id === presetId);
    return found ? found.color : 'from-indigo-600 to-purple-800';
  };

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetInput.trim()) return;

    let username = targetInput.trim();
    let tag = '';

    if (username.includes('#')) {
      const parts = username.split('#');
      username = parts[0].trim();
      tag = parts[1].trim();
    }

    if (!tag) {
      setAddStatus({ type: 'error', message: 'Lütfen kullanıcı adı ve etiket girin (Örn: CyberNinja#1337)' });
      return;
    }

    setIsSubmitting(true);
    setAddStatus(null);

    const res = await sendFriendRequest(username, tag);
    setIsSubmitting(false);

    if (res.success) {
      setAddStatus({ type: 'success', message: res.message });
      setTargetInput('');
    } else {
      setAddStatus({ type: 'error', message: res.message });
    }
  };

  // Filtrelenmiş Arkadaşlar
  const filteredFriends = friends.filter(f => {
    const matchesSearch = f.username.toLowerCase().includes(searchQuery.toLowerCase()) || f.tag.includes(searchQuery);
    if (!matchesSearch) return false;
    if (activeTab === 'online') return f.status !== 'offline';
    return true;
  });

  const onlineCount = friends.filter(f => f.status !== 'offline').length;
  const pendingCount = friendRequests.incoming.length;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0e14] overflow-hidden">
      {/* Üst Sekme Çubuğu */}
      <div className="h-16 px-6 border-b border-slate-800 bg-[#111622] flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2 text-white font-bold text-base">
            <Users className="w-5 h-5 text-indigo-400" />
            <span>Arkadaşlar</span>
          </div>

          <div className="flex items-center space-x-1 bg-[#171f30] p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('online')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'online' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Çevrimiçi ({onlineCount})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'all' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tümü ({friends.length})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                activeTab === 'pending' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Bekleyen İstekler
              {pendingCount > 0 && (
                <span className="w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('add')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'add' ? 'bg-emerald-600 text-white shadow' : 'text-emerald-400 hover:bg-emerald-500/10'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" /> Arkadaş Ekle
            </button>
          </div>
        </div>

        {/* Arama Kutusu (Tüm ve Online sekmelerinde) */}
        {activeTab !== 'add' && activeTab !== 'pending' && (
          <div className="relative w-60">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Arkadaş ara..."
              className="w-full bg-[#171f30] border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}
      </div>

      {/* Sekme İçerikleri */}
      <div className="flex-1 p-6 overflow-y-auto">
        
        {/* 1. ARKADAŞ EKLE SEKMESİ */}
        {activeTab === 'add' && (
          <div className="max-w-xl mx-auto bg-[#111622] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 animate-fade-in">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" /> Arkadaş Ekle
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Arkadaşınızın Kullanıcı Adı ve Etiketini (örneğin <span className="text-indigo-400 font-mono">Gamer#1337</span>) girerek sesli sohbete ve oyunlara davet edin.
              </p>
            </div>

            <form onSubmit={handleAddFriend} className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  placeholder="KullanıcıAdı#1234"
                  className="w-full bg-[#171f30] border border-slate-700 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              {addStatus && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium ${
                    addStatus.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {addStatus.message}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !targetInput.trim()}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-sm rounded-xl transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {isSubmitting ? 'İstek Gönderiliyor...' : 'Arkadaşlık İsteği Gönder'}
              </button>
            </form>
          </div>
        )}

        {/* 2. BEKLEYEN İSTEKLER SEKMESİ */}
        {activeTab === 'pending' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Gelen Arkadaşlık İstekleri ({friendRequests.incoming.length})
            </h4>

            {friendRequests.incoming.length === 0 ? (
              <div className="bg-[#111622] border border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-sm">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Bekleyen gelen arkadaşlık isteği yok.
              </div>
            ) : (
              <div className="space-y-2">
                {friendRequests.incoming.map((req) => (
                  <div
                    key={req.id}
                    className="bg-[#111622] border border-slate-800 rounded-2xl p-4 flex items-center justify-between hover:border-slate-700 transition"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${getAvatarGradient(req.fromUser.avatar)} flex items-center justify-center text-xl shadow-md`}>
                        {getAvatarEmoji(req.fromUser.avatar)}
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">{req.fromUser.username}</div>
                        <div className="text-xs text-slate-500 font-mono">#{req.fromUser.tag}</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => acceptFriendRequest(req.id)}
                        className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow transition"
                        title="Kabul Et"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => rejectFriendRequest(req.id)}
                        className="p-2 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-xl transition"
                        title="Reddet"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. ÇEVRİMİÇİ VE TÜMÜ LİSTESİ */}
        {(activeTab === 'online' || activeTab === 'all') && (
          <div className="space-y-3">
            {filteredFriends.length === 0 ? (
              <div className="bg-[#111622] border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-sm max-w-lg mx-auto">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-semibold text-slate-400">Henüz arkadaşınız bulunmuyor veya çevrimdışı.</p>
                <p className="text-xs text-slate-500 mt-1">"Arkadaş Ekle" sekmesinden arkadaşlarınızı ekleyip doğrudan sesli görüşme yapabilirsiniz.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredFriends.map((friend) => {
                  const isOnline = friend.status !== 'offline';

                  return (
                    <div
                      key={friend.id}
                      className="bg-[#111622] border border-slate-800 rounded-2xl p-4 flex items-center justify-between hover:border-slate-700 hover:bg-[#141a29] transition group"
                    >
                      <div className="flex items-center space-x-3 truncate">
                        <div className="relative">
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${getAvatarGradient(friend.avatar)} flex items-center justify-center text-2xl shadow-md`}>
                            {getAvatarEmoji(friend.avatar)}
                          </div>
                          {/* Durum Noktası */}
                          <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#111622] ${
                            friend.status === 'online' ? 'bg-emerald-500' :
                            friend.status === 'idle' ? 'bg-amber-500' :
                            friend.status === 'dnd' ? 'bg-rose-500' : 'bg-slate-600'
                          }`} />
                        </div>

                        <div className="truncate">
                          <div className="font-bold text-white text-sm truncate flex items-center gap-1.5">
                            <span>{friend.username}</span>
                            <span className="text-slate-500 font-mono text-xs">#{friend.tag}</span>
                          </div>

                          {friend.currentGame ? (
                            <div className="text-xs text-purple-400 flex items-center gap-1 mt-0.5 truncate font-medium">
                              <Gamepad2 className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="truncate">{friend.currentGame}</span>
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-500 mt-0.5 capitalize">
                              {friend.status === 'online' ? 'Çevrimiçi' :
                               friend.status === 'idle' ? 'Boşta' :
                               friend.status === 'dnd' ? 'Rahatsız Etmeyin' : 'Çevrimdışı'}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Aksiyon Butonları */}
                      <div className="flex items-center space-x-2">
                        {/* Doğrudan Sesli Ara */}
                        <button
                          disabled={!isOnline}
                          onClick={() => startDirectCall(friend.id)}
                          className="p-2.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white disabled:opacity-20 rounded-xl transition shadow"
                          title="Doğrudan Sesli Ara"
                        >
                          <Phone className="w-4 h-4" />
                        </button>

                        {/* Arkadaş Sil */}
                        <button
                          onClick={() => {
                            if (confirm(`${friend.username} arkadaş listenizden silinsin mi?`)) {
                              removeFriend(friend.id);
                            }
                          }}
                          className="p-2.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition opacity-0 group-hover:opacity-100"
                          title="Arkadaşı Kaldır"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
