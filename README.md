# Ütopya Yarışması — Jüri Oylama Sistemi

Web tabanlı, gerçek zamanlı jüri oylama sistemi.
IGÜ Sağlık Bilimleri Fakültesi · Sempozyum III · 2025

---

## Ekranlar

| URL | Açıklama | Cihaz |
|-----|----------|-------|
| `/` | Ana giriş sayfası | Herhangi |
| `/jury` | Jüri oylama ekranı | Mobil/Tablet |
| `/display` | Projeksiyon / leaderboard | 1920×1080 |
| `/admin` | Yönetici paneli | Masaüstü |

---

## Kurulum

### 1. Bağımlılıkları Yükle

```bash
npm install
```

### 2. Supabase Kurulumu

1. [supabase.com](https://supabase.com) → Yeni proje oluşturun
2. **SQL Editor** → `supabase/schema.sql` dosyasının tamamını yapıştırıp çalıştırın
3. **Supabase Dashboard → Settings → API**'den alın:
   - `Project URL`
   - `anon / public` anahtarı

### 3. Ortam Değişkenleri

`.env.local.example` dosyasını `.env.local` olarak kopyalayın:

```bash
cp .env.local.example .env.local
```

Ardından kendi değerlerinizi girin:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
ADMIN_PASSWORD=güçlü_şifreniz
```

> `ADMIN_PASSWORD` **asla** `NEXT_PUBLIC_` ile başlamamalı — sunucu taraflıdır.

### 4. Geliştirme Sunucusu

```bash
npm run dev
```

Tarayıcıda `http://localhost:3000` açın.

---

## Supabase Realtime Ayarı

Schema.sql çalıştırdıktan sonra Supabase Dashboard'da:

1. **Database → Replication** bölümüne gidin
2. `competitions`, `groups`, `votes` tablolarının **"Source"** sütununda aktif olduğunu doğrulayın
3. Tablo görünmüyorsa: SQL Editor'da şunu çalıştırın:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE competitions, groups, votes;
   ```

---

## Vercel Deploy

```bash
# 1. Vercel CLI
npm i -g vercel

# 2. Deploy
vercel

# 3. Ortam değişkenlerini Vercel'e ekleyin:
#    Vercel Dashboard → Project → Settings → Environment Variables
#    NEXT_PUBLIC_SUPABASE_URL
#    NEXT_PUBLIC_SUPABASE_ANON_KEY
#    ADMIN_PASSWORD
```

Veya GitHub'a push → Vercel otomatik deploy eder.

---

## Etkinlik Günü Kullanım Rehberi

### Hazırlık
1. `/display` sayfasını projektöre açın (F11 → tam ekran)
2. "Sesi Aç" butonuna basın (Web Audio API için gerekli)
3. Admin `/admin` sayfasını masaüstünde açın, şifre ile giriş yapın
4. Her jüriye `/jury` linkini veya QR kodu gönderin

### Oylama Akışı

```
1. Admin → "Sıradaki Grubu Çağır"    → Grup adı display'de belirir
2. Admin → "Oylamayı Aç"             → Jüriler kendi ekranlarında oyu görür
3. Jüriler 5 kriteri puanlar ve gönderir → Display'de ışıklar yeşile döner
4. Tüm jüriler oy verince             → "✓ Tüm Jüriler Oy Verdi!" bildirimi
5. Admin → "Sonucu Açıkla"           → Display'de sayaç animasyonu başlar
6. Admin → Sonraki grup için 1'e dön
```

### Final
```
7. Tüm gruplar bitince admin → "Final Podyumunu Göster"
   → Display'de dramatik podyum animasyonu (3. → 2. → 1. sıra)
   → Konfeti yağar
```

---

## Yapı

```
src/
├── app/
│   ├── admin/page.tsx       Admin paneli
│   ├── jury/page.tsx        Jüri oylama (mobil-first)
│   ├── display/page.tsx     Projeksiyon ekranı
│   ├── api/auth/admin/      Admin şifre kontrolü (sunucu)
│   └── layout.tsx
├── components/
│   ├── ScoreReveal.tsx      Sayaç animasyonu
│   ├── Podium.tsx           Podyum animasyonu
│   ├── ConfettiBurst.tsx    Konfeti efekti (Canvas)
│   ├── JuryStatusLights.tsx Jüri durum göstergesi
│   └── LeaderboardPanel.tsx Canlı sıralama
├── hooks/
│   └── useCompetitionRealtime.ts  Supabase realtime hook
├── lib/
│   ├── supabase.ts          Supabase client
│   ├── constants.ts         Kriterler + sabitler
│   └── audio.ts             Web Audio API ses efektleri
└── types/index.ts
```

---

## Değerlendirme Kriterleri

Her kriter 1–5 puan, toplam **25 puan/jüri**.
20 jüri × 25 = **500 maksimum toplam**.

| # | Kriter |
|---|--------|
| 1 | Fikir ve Yaratıcılık |
| 2 | Toplumsal Duyarlılık ve Kapsayıcılık |
| 3 | Eleştirel Bakış ve Öneri Geliştirme |
| 4 | Etik Değerler ve Yaklaşım |
| 5 | Poster Tasarımının Niteliği ve Sunum Becerisi |

---

## Logo Ekleme

Display ve anasayfada iki adet logo kutusu rezerve edilmiştir.
`src/app/display/page.tsx` içindeki `DisplayHeader` bileşeninde:

```tsx
// IGÜ logosu için:
<Image src="/logo-igu.png" alt="IGÜ" width={96} height={56} />

// SBF logosu için:
<Image src="/logo-sbf.png" alt="SBF" width={96} height={56} />
```

Logo dosyalarını `public/` klasörüne koyun ve `next.config.ts`'de `images` ayarını yapın.

---

## Güvenlik Notu

Bu sistem üniversite etkinlikleri için tasarlanmıştır. Jüri oylarının anonimliği **uygulama katmanında** sağlanır: display ve jüri ekranları hiçbir zaman jüri-puan eşleşmesini göstermez. Yalnızca `/admin` sayfası tüm detayları sunar.
