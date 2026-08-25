# 🎮 BacolarVoice — Ultra-Low Latency Gaming Voice Chat

Online oyun oynarken arkadaşlarınızla en düşük gecikmeyle (ultra-low latency), kristal netliğinde ses iletişimi kurabilmeniz için tasarlanmış modern masaüstü (**macOS & Windows**) ve web sesli sohbet platformu.

[![GitHub Release](https://img.shields.io/github/v/release/kuarezma/bacolar-voice?style=for-the-badge&color=6366f1&logo=github)](https://github.com/kuarezma/bacolar-voice/releases/latest)
[![macOS Support](https://img.shields.io/badge/macOS-Apple%20Silicon%20%26%20Intel-000000?style=for-the-badge&logo=apple)](https://github.com/kuarezma/bacolar-voice/releases/latest)
[![Windows Support](https://img.shields.io/badge/Windows-10%20%2F%2011%20x64-0078D6?style=for-the-badge&logo=windows)](https://github.com/kuarezma/bacolar-voice/releases/latest)

---

## 📥 İndirme Seçenekleri (Downloads)

Uygulamanın en son sürümünü işletim sisteminize göre doğrudan aşağıdaki linklerden indirebilirsiniz:

| Platform | Format | İndirme Linki |
|---|---|---|
| 🍏 **macOS (Apple Silicon M1/M2/M3/M4)** | `.dmg` Dosyası | [⬇️ BacolarVoice-mac-arm64.dmg İndir](https://github.com/kuarezma/bacolar-voice/releases/latest) |
| 🍏 **macOS (Intel x64)** | `.dmg` Dosyası | [⬇️ BacolarVoice-mac-x64.dmg İndir](https://github.com/kuarezma/bacolar-voice/releases/latest) |
| 🪟 **Windows 10 / 11 (Kurulum Sihirbazı)** | `.exe` (NSIS Installer) | [⬇️ BacolarVoice-win-x64-Setup.exe İndir](https://github.com/kuarezma/bacolar-voice/releases/latest) |
| 🪟 **Windows Portable (Kurulumsuz)** | `.exe` (Portable) | [⬇️ BacolarVoice-win-x64-Portable.exe İndir](https://github.com/kuarezma/bacolar-voice/releases/latest) |

> 💡 Tüm geçmiş sürümler ve ek paketler için **[GitHub Releases Sayfası](https://github.com/kuarezma/bacolar-voice/releases)**'nı ziyaret edebilirsiniz.

---

## 🔐 macOS'ta İlk Açılış (Önemli)

macOS paketleri **ad-hoc imzayla** dağıtılıyor; Apple Developer ID ile notarize edilmediği için macOS ilk açılışta uyarı verir. Uygulama zarar görmüş değildir, tek seferlik onay ister:

1. DMG'yi açıp `BacolarVoice.app`'i **Applications** klasörüne sürükleyin.
2. Applications içindeki `BacolarVoice`'a **sağ tıklayın** → **Aç** → çıkan uyarıda tekrar **Aç**.

Bu adımı yalnızca bir kez yapmanız yeterlidir; sonraki açılışlar normal çift tıklamayla olur. Terminali tercih ederseniz aynı sonucu şu komut verir:

```bash
xattr -cr /Applications/BacolarVoice.app
```

---

## 🌐 Farklı Şehirlerden Ücretsiz Bağlanma (Tailscale)

Rize–Trabzon gibi farklı internet bağlantılarında ücretsiz kullanım için önerilen yöntem **Tailscale Personal** ağıdır. Ayrı bir VPS, modem port yönlendirmesi veya sabit genel IP gerekmez. Sunucu birinizin bilgisayarında çalışır; bu bilgisayar ve BacolarVoice konuşma boyunca açık kalmalıdır.

1. İki bilgisayara da [Tailscale](https://tailscale.com/download) kurun ve herkes kendi hesabıyla giriş yapsın.
2. Sunucuyu çalıştıracak kişi [Tailscale Users](https://login.tailscale.com/admin/users) sayfasından **Invite external users** ile diğer kişiyi kendi ağına davet etsin. Hesap paylaşmayın.
3. İki cihazın da aynı Tailscale ağında ve çevrimiçi olduğunu Machines sayfasından doğrulayın; iki cihazın `100.x.y.z` adreslerini not edin.
4. Tailscale **Access controls** ekranında varsayılan “herkese izin ver” kuralını aşağıdaki politikayla değiştirin. Örnek IP'leri iki bilgisayarın gerçek Tailscale IP'leriyle değiştirin. Bu politika yalnızca bu iki cihazın birbiriyle konuşmasına izin verir; WebRTC'nin dinamik ses portları nedeniyle iki cihaz arasında tüm protokoller gereklidir.

```json
{
  "hosts": {
    "rize-bacolar": "100.90.80.70",
    "trabzon-bacolar": "100.60.50.40"
  },
  "grants": [
    {
      "src": ["rize-bacolar", "trabzon-bacolar"],
      "dst": ["rize-bacolar", "trabzon-bacolar"],
      "ip": ["*"]
    }
  ]
}
```

5. Sunucu olacak bilgisayarda BacolarVoice'u açın. Bu cihazın Tailscale IPv4 adresini Tailscale uygulamasından veya `tailscale ip -4` komutuyla öğrenin.
6. Her iki BacolarVoice uygulamasında **Oyuncu Profili & Kimlik → Sunucu Adresi** alanına `http://100.x.y.z:3001` yazıp **Kaydet & Güncelle** seçeneğine basın.
7. Aynı oda listesinin görünmesi sinyalleşmenin çalıştığını gösterir. Tam kabul için aynı odaya girip iki yönde de sesin duyulduğunu doğrulayın.

Tailscale bağlantısı uçtan uca şifreli özel ağ içinde kalır. **Tailscale Funnel açmayın** ve modemde `3001` portunu internete yönlendirmeyin.

---

## 🔒 Sunucuyu Şifreyle Koruma

Sinyalleşme sunucusu varsayılan olarak korumasızdır: adrese erişebilen herkes bağlanabilir. Yerel ağda sorun değildir, ama herkese açık bir adreste çalıştırıyorsanız bir şifre belirleyin:

```bash
cp .env.example .env
# .env içinde BACOLAR_SERVER_TOKEN değerini belirleyin
npm start
```

Kullanıcılar aynı değeri **Oyuncu Profili → Sunucu Şifresi** alanına girer. Yanlış şifreyle hem WebSocket bağlantısı hem REST çağrıları reddedilir ve uygulamada açıklayıcı bir uyarı çıkar. `/api/health` bilinçli olarak korumasız bırakılmıştır; masaüstü uygulaması 3001 portunu kimin tuttuğunu şifreyi bilmeden anlayabilmelidir.

Ek olarak aynı hesapla ikinci bir oturum açılamaz — açık oturum kapanmadan gelen ikinci bağlantı reddedilir.

---

## 🌍 TURN Sunucusu (Simetrik NAT Arkasındaki Kullanıcılar)

Ses trafiği eşler arasında doğrudan (P2P) akar. Yalnızca STUN kullanıldığında simetrik NAT veya CGNAT arkasındaki kullanıcılar (bazı mobil hatlar ve ISS'ler) birbirine bağlanamaz. Bunu çözmek için bir TURN sunucusu gerekir; adres ve kimlik bilgisi sunucuya tanımlanır, istemciler listeyi `/api/ice-servers` üzerinden otomatik çeker:

```bash
BACOLAR_TURN_URLS="turn:turn.ornek.net:3478,turns:turn.ornek.net:5349" \
BACOLAR_TURN_USERNAME=kullanici \
BACOLAR_TURN_CREDENTIAL=parola \
npm start
```

TURN sunucusunu kendiniz barındırabilir (`coturn`) veya hazır bir servis kullanabilirsiniz. Tanımlanmazsa uygulama STUN listesiyle çalışmaya devam eder; çoğu ev ağında bu yeterlidir.

---

## ✍️ Windows Paketlerini İmzalama

Windows paketleri varsayılan olarak imzasız üretilir ve kullanıcı ilk çalıştırmada SmartScreen uyarısı görür. Bir kod imzalama sertifikanız varsa depo ayarlarına iki secret ekleyin; CI bunları görürse paketleri otomatik imzalar:

| Secret | İçerik |
|---|---|
| `WINDOWS_CERTIFICATE_BASE64` | `.pfx` sertifikanın base64 kodlanmış hali |
| `WINDOWS_CERTIFICATE_PASSWORD` | Sertifikanın parolası |

Secret'lar tanımlı değilse yapı akışı değişmez, paketler imzasız üretilir. macOS tarafında ad-hoc imza kullanılır; Windows'ta ad-hoc imzanın karşılığı yoktur ve kendinden imzalı sertifika SmartScreen uyarısını kaldırmaz.

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
- **Electron Entegrasyonu:** Tam ekran oyun oynarken bile çalışan global sessize alma kısayolu (`CommandOrControl+Shift+M`) ve arka planda ses kısılmasını engelleyen yapılandırma (`backgroundThrottling: false`). Bas-konuş tuşu uygulama açıkken çalışır.
- **Paketli Masaüstü Uygulaması:** DMG/EXE sürümü, gerekli yerel sinyalleşme sunucusunu otomatik başlatır; kullanıcı ayrıca `localhost:3001` sunucusu kurmaz.
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

# Sunucu regresyon testleri
npm test
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

Paketli masaüstü uygulaması ilk açılışta kullanıcı verilerini işletim sisteminin uygulama veri dizininde saklar.

---

## Değişiklik Günlüğü

### v1.0.6 — 2026-08-25

- Farklı şehirlerdeki kullanıcılar için ücretsiz Tailscale bağlantı akışı eklendi.
- Sunucu varsayılan olarak `0.0.0.0` üzerinde dinleyerek Tailscale ve yerel ağ bağlantılarını açıkça kabul ediyor; `BACOLAR_BIND_HOST` ile sınırlandırılabiliyor.
- Tailscale erişim politikası yalnızca seçilen iki bilgisayarı kapsayacak şekilde sınırlandırıldı.
- Ortam değişkenleri `.env` dosyasından yükleniyor ve kökten `npm start` komutuyla sunucu derlenip başlatılıyor.
- Uygulamadaki sunucu adresi yardımı `100.x.y.z` Tailscale adresini gösterecek şekilde güncellendi.
- Ağ bağlama ayarı ile hatalı port değerleri için regresyon testleri eklendi.

### v1.0.5 — 2026-08-25

- Sunucuya paylaşılan şifre koruması eklendi (`BACOLAR_SERVER_TOKEN`); yanlış şifre hem WebSocket hem REST tarafında reddediliyor ve uygulamada uyarı olarak gösteriliyor.
- Aynı hesapla ikinci oturum açılması engellendi.
- TURN sunucusu desteği eklendi; ICE listesi artık sunucudan (`/api/ice-servers`) dinamik olarak alınıyor, tanımlı değilse STUN'a düşülüyor.
- CI, kod imzalama sertifikası secret olarak tanımlandığında Windows paketlerini imzalıyor.
- Sunucu regresyon testleri 2'den 7'ye çıkarıldı: sinyal yönlendirme, oturum kilidi, TURN dağıtımı ve şifre koruması kapsandı.
- Ortam değişkenleri için `.env.example` eklendi.

### v1.0.4 — 2026-08-25

- Uygulama adı **BacolarVoice** olarak değiştirildi; paket kimliği, pencere başlığı, sunucu servis adı, yerel ayar anahtarları ve depo adresi buna göre güncellendi.
- Uygulamaya kendi ikonu eklendi (indigo-mor gradyan zemin üzerinde yayın simgesi); macOS ve Windows paketleri artık varsayılan Electron ikonunu kullanmıyor.

### v1.0.3 — 2026-08-25

- 3001 portu başka bir uygulama tarafından kullanıldığında uygulama artık sessizce bağlantısız kalmıyor; sebebi açıklayan bir uyarı gösteriyor.
- Aynı anda ikinci bir BacolarVoice penceresi açılması engellendi; ikinci deneme mevcut pencereyi öne getiriyor.
- Zaten çalışan bir BacolarVoice sunucusu varsa uygulama onu tanıyıp yeniden başlatmaya çalışmıyor.
- Windows kurulum sihirbazı ve portable sürüm aynı dosya adını üretip birbirini eziyordu; artık `-Setup.exe` ve `-Portable.exe` olarak ayrı yayınlanıyor.

### v1.0.2 — 2026-08-25

- macOS paketi artık tutarlı bir ad-hoc imzayla üretiliyor; "uygulama zarar görmüş" hatası giderildi.
- Paketli sürümde boş pencereyle açılma hatası düzeltildi (Vite `base` yolu `file://` protokolüne uyarlandı).
- Ayarlara sunucu adresi alanı eklendi; farklı bilgisayarlardaki kullanıcılar artık ortak bir sunucuda buluşabiliyor.
- Pencere başlığı "client" yerine "BacolarVoice" olarak düzeltildi.

### v1.0.1 — 2026-08-25

- Paketli Electron sürümüne otomatik yerel sinyalleşme sunucusu eklendi.
- Yeni oda listesinin anlık senkronu ve gerçek ping ölçümü düzeltildi.
- Mikrofon başlatılamadığında oda ve doğrudan arama akışlarına açıklayıcı hata geri bildirimi eklendi.
- Global sessize alma kısayolu React ses kontrolüne bağlandı; sinyalleşme regresyon testleri eklendi.
