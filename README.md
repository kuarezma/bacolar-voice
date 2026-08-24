# 🎮 NexusVoice — Ultra-Low Latency Gaming Voice Chat

Online oyun oynarken arkadaşlarınızla en düşük gecikmeyle (ultra-low latency), kristal netliğinde ses iletişimi kurabilmeniz için tasarlanmış modern masaüstü (**macOS & Windows**) ve web sesli sohbet platformu.

[![GitHub Release](https://img.shields.io/github/v/release/kuarezma/nexus-voice?style=for-the-badge&color=6366f1&logo=github)](https://github.com/kuarezma/nexus-voice/releases/latest)
[![macOS Support](https://img.shields.io/badge/macOS-Apple%20Silicon%20%26%20Intel-000000?style=for-the-badge&logo=apple)](https://github.com/kuarezma/nexus-voice/releases/latest)
[![Windows Support](https://img.shields.io/badge/Windows-10%20%2F%2011%20x64-0078D6?style=for-the-badge&logo=windows)](https://github.com/kuarezma/nexus-voice/releases/latest)

---

## 📥 İndirme Seçenekleri (Downloads)

Uygulamanın en son sürümünü işletim sisteminize göre doğrudan aşağıdaki linklerden indirebilirsiniz:

| Platform | Format | İndirme Linki |
|---|---|---|
| 🍏 **macOS (Apple Silicon M1/M2/M3/M4)** | `.dmg` Dosyası | [⬇️ NexusVoice-mac-arm64.dmg İndir](https://github.com/kuarezma/nexus-voice/releases/latest) |
| 🍏 **macOS (Intel x64)** | `.dmg` Dosyası | [⬇️ NexusVoice-mac-x64.dmg İndir](https://github.com/kuarezma/nexus-voice/releases/latest) |
| 🪟 **Windows 10 / 11 (Kurulum Sihirbazı)** | `.exe` (NSIS Installer) | [⬇️ NexusVoice-win-Setup.exe İndir](https://github.com/kuarezma/nexus-voice/releases/latest) |
| 🪟 **Windows Portable (Kurulumsuz)** | `.exe` (Portable) | [⬇️ NexusVoice-win-portable.exe İndir](https://github.com/kuarezma/nexus-voice/releases/latest) |

> 💡 Tüm geçmiş sürümler ve ek paketler için **[GitHub Releases Sayfası](https://github.com/kuarezma/nexus-voice/releases)**'nı ziyaret edebilirsiniz.

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
- **1-1 Doğrudan Sesli Arama (Direct Call):** Telefon çalma melodisi, gelen/giden arama ekranı, görüşme sayacı ve anında P2P ses bağlantısı.

### 3. 🔊 Ses Odaları (Oyun Lobileri & Kanallar)
- Hazır kategoriler: "🎯 CS2 Rekabetçi", "🔥 Valorant 5-Stack", "⚔️ League of Legends", "👥 Duo Odası Alpha", "☕ Sohbet & Lounge", "🌙 AFK".
- Özel oda oluşturma (Oda adı, kişi limiti, oyun başlığı ve isteğe bağlı şifre koyma).
- Oda İçi Metin Kanalı: Oyun oynarken taktik, lobi davet linki veya mesaj paylaşımı.

### 4. 🖥️ Masaüstü & Web Desteği (macOS & Windows)
- **Electron Entegrasyonu:** Tam ekran oyun oynarken bile çalışan global kısayollar (`CommandOrControl+Shift+M` ile Mute vb.) ve arka planda ses kısılmasını engelleyen yapılandırma (`backgroundThrottling: false`).
- **Web Tarayıcı Desteği:** Aynı zamanda herhangi bir tarayıcıdan `http://localhost:5173` ile erişilebilirlik.

---

## 🚀 Kaynak Koddan Çalıştırma & Geliştirme

```bash
# Bağımlılıkları yükleyin
npm install
cd server && npm install
cd ../client && npm install
cd ..

# Web Geliştirme Modunda Başlat (Sunucu + Web İstemci)
npm run dev
# Tarayıcıda aç: http://localhost:5173

# Masaüstü Modunda Başlat (Electron Penceresi)
npm run dev:all
```

---

## 📦 Yerel Olarak DMG ve EXE Paketleme

```bash
# macOS için (.dmg ve .zip):
npm run package:mac

# Windows için (.exe installer ve portable):
npm run package:win
```
Paketler otomatik olarak `release/` klasörüne oluşturulur.
