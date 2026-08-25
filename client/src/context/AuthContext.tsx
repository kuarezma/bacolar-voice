import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserStatus } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  setUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  updateProfile: (updates: Partial<UserProfile>) => void;
  avatarPresets: { id: string; label: string; url: string; color: string }[];
}

export const AVATAR_PRESETS = [
  { id: 'avatar-cyber-ninja', label: 'Cyber Ninja', url: '🥷', color: 'from-purple-600 to-indigo-800' },
  { id: 'avatar-gamer-cat', label: 'Gamer Cat', url: '😼', color: 'from-pink-500 to-rose-700' },
  { id: 'avatar-neon-wolf', label: 'Neon Wolf', url: '🐺', color: 'from-cyan-500 to-blue-700' },
  { id: 'avatar-space-marine', label: 'Space Marine', url: '🚀', color: 'from-emerald-500 to-teal-800' },
  { id: 'avatar-mecha-pilot', label: 'Mecha Pilot', url: '🤖', color: 'from-amber-500 to-orange-700' },
  { id: 'avatar-retro-pixel', label: 'Retro Gamer', url: '👾', color: 'from-violet-500 to-fuchsia-800' },
  { id: 'avatar-skull-king', label: 'Skull King', url: '💀', color: 'from-gray-700 to-zinc-900' },
  { id: 'avatar-dragon-lord', label: 'Dragon Lord', url: '🐉', color: 'from-red-600 to-rose-900' },
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('bacolar_user_profile');
      if (saved) return JSON.parse(saved);
    } catch (e) {}

    // Otomatik varsayılan kullanıcı oluştur
    const randomNames = ['Vortex', 'Shadow', 'Cyber', 'Neon', 'Phantom', 'Titan', 'Apex', 'Matrix'];
    const chosenName = randomNames[Math.floor(Math.random() * randomNames.length)] + '_' + Math.floor(10 + Math.random() * 90);
    const tag = Math.floor(1000 + Math.random() * 9000).toString();
    const avatar = AVATAR_PRESETS[Math.floor(Math.random() * AVATAR_PRESETS.length)].id;

    const initialUser: UserProfile = {
      id: 'usr_' + Math.random().toString(36).substring(2, 10),
      username: chosenName,
      tag,
      avatar,
      status: 'online',
      micMuted: false,
      deafened: false
    };

    localStorage.setItem('bacolar_user_profile', JSON.stringify(initialUser));
    return initialUser;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('bacolar_user_profile', JSON.stringify(user));
    }
  }, [user]);

  const updateProfile = (updates: Partial<UserProfile>) => {
    setUser(prev => (prev ? { ...prev, ...updates } : null));
  };

  return (
    <AuthContext.Provider value={{ user, setUser, updateProfile, avatarPresets: AVATAR_PRESETS }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
