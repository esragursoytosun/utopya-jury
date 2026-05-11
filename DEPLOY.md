# Online'a Alma Rehberi

Bu uygulamayı internetten erişilebilir hale getirmek için **3 yol** var. Senin için en uygunu işaretlendi.

---

## 🟢 Yol 1: Aynı WiFi (en kolay, ücretsiz, internet bile gerekmez)

**Etkinlik günü tek laptopta çalıştırırsan** ve tüm jüri telefonları aynı WiFi'da ise:

1. Laptop'ta `npm run dev` ile başlat (zaten yapıyorsun)
2. Laptop'un yerel IP'sini öğren: `ipconfig` (Windows) → `IPv4 Adresi` (örn `192.168.1.92`)
3. Jürilere şu linki ver: **`http://192.168.1.92:3000/jury`**
4. Display için projektör laptopundan: `http://localhost:3000/display`

**Artıları:** Bedava, kurulum yok, en hızlı.
**Eksileri:** Sadece aynı WiFi'daki cihazlar. Laptop kapanırsa biter.

---

## 🌟 Yol 2: Render.com (kalıcı, ucuz/ücretsiz, ÖNERİLEN)

GitHub'a push → Render otomatik deploy eder. Veriler kalıcı diskte saklanır.

### Adımlar

**1. Kodu GitHub'a yükle**
```bash
cd C:\Users\Esra\Desktop\utopya-jury
git init
git add .
git commit -m "Ütopya Yarışması"
# GitHub'da yeni repo oluştur (utopya-jury), sonra:
git remote add origin https://github.com/KULLANICI_ADIN/utopya-jury.git
git branch -M main
git push -u origin main
```

**2. Render hesabı**
- [render.com](https://render.com) → GitHub ile giriş

**3. Web Service oluştur**
- Dashboard → **New** → **Web Service**
- GitHub repo'nu seç
- Ayarlar:
  - **Name:** `utopya-jury`
  - **Region:** Frankfurt (Türkiye'ye en yakın)
  - **Branch:** `main`
  - **Runtime:** Node
  - **Build Command:** `npm install && npm run build`
  - **Start Command:** `npm start`
  - **Plan:** Free (yeterli — 750 saat/ay)

**4. Veri için kalıcı disk**
- Service → **Disks** sekmesi → **Add Disk**
- **Mount Path:** `/opt/render/project/src/data`
- **Size:** 1 GB (yeterli)
- ❗ Kalıcı disk için **Standard plan** ($7/ay) gerekir
- Ya da **Free plan** ile devam et — veri her deploy'da sıfırlanır (şifre admin, jüriler yeniden oluşturulur)

**5. Şifre için ortam değişkeni** (opsiyonel — admin paneliden de değiştirilebilir)
- Service → **Environment** → **Add Environment Variable**
- `ADMIN_PASSWORD` = `gucluSifreniz`

**6. Deploy!**
- Render otomatik build edip ayağa kaldırır (~3 dk)
- URL: `https://utopya-jury.onrender.com`
- Jüri linki: `https://utopya-jury.onrender.com/jury`
- Display: `https://utopya-jury.onrender.com/display`
- Admin: `https://utopya-jury.onrender.com/admin`

**Artıları:** Kalıcı URL, push-to-deploy, Türkçe karakterler sorunsuz.
**Eksileri:** Free plan'da disk yok (veri ephemeral). Standard plan $7/ay.

---

## 🚀 Yol 3: Fly.io (ücretsiz + kalıcı disk, CLI gerekli)

Free tier 3 GB volume + 3 paylaşılan vCPU verir.

**1. Flyctl kur**
```bash
# Windows PowerShell:
iwr https://fly.io/install.ps1 -useb | iex
```

**2. Hesap aç**
```bash
flyctl auth signup
```

**3. Uygulama oluştur**
```bash
cd C:\Users\Esra\Desktop\utopya-jury
flyctl launch
# Sorulara cevap:
#   App name: utopya-jury
#   Region: ams (Amsterdam, TR'ye yakın)
#   Postgres: No
#   Deploy now: No
```

**4. Volume oluştur** (kalıcı disk)
```bash
flyctl volumes create utopya_data --size 1 --region ams
```

**5. `fly.toml` dosyasına volume mount ekle:**
```toml
[mounts]
  source = "utopya_data"
  destination = "/app/data"
```

**6. Deploy**
```bash
flyctl deploy
```

**7. Şifre ayarla** (opsiyonel)
```bash
flyctl secrets set ADMIN_PASSWORD=gucluSifreniz
```

URL: `https://utopya-jury.fly.dev`

---

## 🔐 Şifre Yönetimi

Hangi yola gidersen git, **admin paneline girdikten sonra**:
- Sağ üstte: **🔐 Şifre Değiştir**
- Mevcut şifre + yeni şifre (en az 4 karakter) → Değiştir
- Yeni şifre veritabanında saklanır, sonraki girişlerde geçerli olur

**İlk şifre nereden geliyor?**
1. `ADMIN_PASSWORD` environment variable varsa → o
2. Yoksa → `admin`

İlk girişten sonra UI'dan değiştir, daha güvenli olur.

---

## Hangisini Seçmeli?

| Senaryo | Öneri |
|---------|-------|
| Sadece etkinlik günü, hep aynı WiFi | **Yol 1** (yerel) |
| Etkinlik öncesi/sonrası test, herkes farklı yerden bağlansın | **Yol 2** Render |
| Ücretsiz + kalıcı + biraz teknik | **Yol 3** Fly.io |

**Benim tavsiyem:** Etkinlik günü için **Yol 1**'i yedek olarak hazırla (laptop + WiFi). Eş zamanlı **Yol 2** Render'a deploy et — internet üzerinden de çalışır. İki yoldan birini açık tut.
