# 🎮 NexusVoice — Ultra-Low Latency Gaming Voice Chat

Online oyun oynarken arkadaşlarınızla en düşük gecikmeyle (ultra-low latency), kristal netliğinde ses iletişimi kurabilmeniz için tasarlanmış modern masaüstü (**macOS & Windows**) ve web sesli sohbet platformu.

---

## ✨ Temel Özellikler

### 1. 🎙️ Düşük Gecikmeli Ses Motoru & Gelişmiş Mikrofon Ayarları
- **WebRTC & 48kHz Opus Codec:** Sunucu gecikmesini sıfırlayan doğrudan P2P Mesh ses iletimi ve `minptime=10` ultra-hızlı paket optimizasyonu.
- **İki Farklı İletim Modu:**
  - **Ses Algılama (Voice Activity):** Canlı VU metre göstergesi ve ayarlanabilir dB eşiği (Hassasiyet Slider'ı).
  - **Bas-Konuş (Push-to-Talk):** İstediğiniz klavye/fare tuşunu atayabilme (Caps Lock, V, Space vb.), basma/bırakma ses efektleri (Chime).
- **Donanım İyileştirmeleri:**
  - Akustik Yankı Engelleme (Echo Cancellation - AEC)
  - Arka Plan Gürültü Engelleme (Noise Suppression)
  - Otomatik Kazanç Kontrolü (Auto Gain Control - AGC)
- **Mikrofonunu Canlı Test Et (Loopback Test):** Kendi sesini kulaklığında sıfır gecikmeyle duyup mikrofon kalitesini test edebilme.
- **Kişi Bazlı Bağımsız Ses Ayarı (%0 - %200):** Odadaki her bir arkadaşınızın ses seviyesini bağımsız yükseltme veya kısma.
- **Konuşuyor Göstergesi:** Biri konuştuğunda profilinin etrafında yeşil halka (`speaking-ring`) ve canlı ses dalgası.

### 2. 👥 Gelişmiş Arkadaşlık & Doğrudan Arama (1-1 DM)
- **Oyuncu Kimliği:** `KullanıcıAdı#Tag` (Örn: `CyberNinja#1337`) formatında etiketli oyuncu kimliği.
- **Özelleştirilebilir Avatar & Durum:** 8 farklı oyun temalı avatar (Cyber Ninja, Gamer Cat, Mecha Pilot vb.), çevrimiçi durumu (Online, Oyunda: "Counter-Strike 2", AFK, DND).
- **Arkadaş Ekleme:** Kullanıcı adı ve etiket ile anında istek gönderme, kabul etme, reddetme, silme.
- **1-1 Doğrudan Sesli Arama (Direct Call):** Telefon çalma melodisi, gelen/giden arama penceresi, görüşme sayacı ve anında P2P ses bağlantısı.

### 3. 🔊 Ses Odaları (Oyun Lobileri & Kanallar)
- Hazır kategoriler: "🎯 CS2 Rekabetçi", "🔥 Valorant 5-Stack", "⚔️ League of Legends", "👥 Duo Odası Alpha", "☕ Sohbet & Lounge", "🌙 AFK".
- Özel oda oluşturma (Oda adı, kişi limiti, oyun başlığı ve isteğe bağlı şifre koyma).
- Oda İçi Metin Kanalı: Oyun oynarken taktik, lobi davet linki veya mesaj paylaşımı.

### 4. 🖥️ Masaüstü & Web Desteği (macOS & Windows)
- **Electron Entegrasyonu:** Tam ekran oyun oynarken bile çalışan global kısayollar (`CommandOrControl+Shift+M` ile Mute vb.) ve arka planda ses kısılmasını engelleyen yapılandırma (`backgroundThrottling: false`).
- **Web Tarayıcı Desteği:** Aynı zamanda herhangi bir tarayıcıdan `http://localhost:5173` ile erişilebilirlik.

---

## 🚀 Hızlı Başlangıç & Çalıştırma

### 1. Gereksinimler
- Node.js (v18+) ve npm

### 2. Tek Komutla Hem Sunucuyu Hem Uygulamayı Başlatma
```bash
# Bağımlılıkları yükleyin (İlk seferde)
npm install
cd server && npm install
cd ../client && npm install
cd ..

# Geliştirme Modunda Başlat (Sunucu + Web İstemci)
npm run dev
```

Tarayıcınızda açmak için:
👉 **`http://localhost:5173`**

### 3. Masaüstü Uygulaması Olarak Başlatma (Electron + macOS / Windows)
```bash
# Sunucu, İstemci ve Electron masaüstü penceresini birlikte başlatır:
npm run dev:all
```

### 4. Masaüstü Kurulum Paketlerini Oluşturma
```bash
# macOS için (.dmg ve .zip):
npm run package:mac

# Windows için (.exe installer ve portable):
npm run package:win
```

---

## 📁 Proje Dizin Yapısı

```
optimistic-newton/
├── client/                     # React 18 + Vite + TailwindCSS Frontend
│   ├── src/
│   │   ├── audio/              # WebRTC & Ses Motoru
│   │   │   ├── AudioController.ts  # WebRTC Mesh, VAD, PTT, VU-meter, Per-user Gain
│   │   │   └── soundEffects.ts     # Web Audio API sentezlenmiş ses efektleri
│   │   ├── components/         # UI Bileşenleri
│   │   │   ├── Sidebar.tsx             # Odalar, Navigasyon, Kullanıcı Kontrol Paneli
│   │   │   ├── VoiceRoomView.tsx       # Ses Izgarası, Konuşanlar, Oda İçi Chat
│   │   │   ├── FriendsView.tsx         # Arkadaş Listesi, Arama, 1-1 Arama Butonu
│   │   │   ├── AudioSettingsModal.tsx  # Cihaz Seçimi, VU Meter, PTT Tuş Atama, Test
│   │   │   ├── UserSettingsModal.tsx   # Avatar, Nick#Tag, Çevrimiçi/Oyun Durumu
│   │   │   ├── CreateRoomModal.tsx     # Yeni Oda / Lobi Oluşturma
│   │   │   └── DirectCallModal.tsx     # 1-1 Sesli Arama Pop-up & Ekranı
│   │   ├── context/            # Global State Yönetimi
│   │   │   ├── AuthContext.tsx         # Kullanıcı Profili & Avatarlar
│   │   │   ├── SocketContext.tsx       # Socket.IO & Realtime Senkronizasyon
│   │   │   └── VoiceContext.tsx        # WebRTC Odası, PTT Dinleyicisi, Aramalar
│   │   ├── App.tsx
│   │   └── index.css           # Tailwind + Özel Dark Theme Animasyonları
│   └── package.json
├── server/                     # Node.js + Express + Socket.IO Signaling Server
│   ├── src/
│   │   ├── index.ts            # Socket.IO Olayları, WebRTC Signaling, REST API
│   │   ├── store.ts            # Odalar, Kullanıcılar, Arkadaşlık İlişkileri
│   │   └── types.ts            # Paylaşılan Tipler
│   └── package.json
├── electron/                   # Electron Masaüstü Sarmalayıcı
│   ├── main.ts                 # Masaüstü Penceresi, İzinler, Global Hotkeys
│   ├── preload.ts              # Güvenli IPC Köprüsü
│   └── tsconfig.json
└── package.json                # Monorepo komutları (dev, build, package)
```

---

## 🛡️ Ağ & Güvenlik
- **WebRTC P2P:** Ses verisi doğrudan kullanıcılar arasında peer-to-peer iletilir, sunucuda ses kaydı tutulmaz.
- **STUN Sunucuları:** NAT arkasındaki oyuncuların kesintisiz bağlanabilmesi için Google STUN sunucuları entegredir.
