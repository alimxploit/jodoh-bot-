# 💘 Jodoh Bot — Bot Pencari Jodoh Telegram

Bot Telegram lengkap untuk mencari pasangan, dengan fitur profil foto, like/skip, match otomatis, dan chat langsung.

---

## 🚀 Cara Setup

### 1. Buat Bot di Telegram
1. Buka Telegram, cari **@BotFather**
2. Ketik `/newbot`
3. Ikuti instruksinya, masukkan nama & username bot
4. Copy **token** yang diberikan

### 2. Install Dependencies
```bash
cd jodoh-bot
npm install
```

### 3. Buat File `.env`
```bash
cp .env.example .env
```
Buka file `.env`, isi token bot:
```
BOT_TOKEN=8743380527:AAGskPnnKYmWQtDJgoUiof6gIxq8Q_Udi_U
```

### 4. Jalankan Bot
```bash
# Mode produksi
npm start

# Mode development (auto-restart)
npm run dev
```

---

## ✨ Fitur

| Fitur | Keterangan |
|---|---|
| 📝 Registrasi | Nama, umur, gender, lokasi, bio, foto profil |
| 🔍 Browse | Lihat profil satu per satu |
| ❤️ Like / ❌ Skip | Pilih suka atau lewati |
| 💞 Match | Notifikasi otomatis saat kedua pihak saling like |
| 💬 Chat | Chat langsung antar match dalam bot |
| 🔴 Nonaktif | Sembunyikan profil sementara |

## 📁 Struktur File

```
jodoh-bot/
├── src/
│   ├── index.js        # Entry point & routing
│   ├── database.js     # SQLite queries
│   ├── registrasi.js   # Alur pendaftaran
│   ├── browse.js       # Cari, like, skip, matches
│   └── chat.js         # Sesi chat antar match
├── .env.example
├── package.json
└── README.md
```

## ☁️ Deploy ke Railway (Gratis)

1. Push kode ke GitHub
2. Buka [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Tambahkan variable `BOT_TOKEN` di Settings → Variables
4. Done! Bot jalan 24/7

---

*Dibuat dengan ❤️ menggunakan Telegraf.js + SQLite*
