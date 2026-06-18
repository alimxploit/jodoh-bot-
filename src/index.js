require('dotenv').config();
const { Telegraf } = require('telegraf');
const { initDB, getUser, getProgress, setUserAktif } = require('./database');
const { handleRegistrasi, handleGenderCallback, handleCariCallback } = require('./registrasi');
const { handleCari, handleLike, handleSkip, handleMatches } = require('./browse');
const { handleMulaiChat, handlePesanChat, handleStopChat } = require('./chat');

if (!process.env.BOT_TOKEN) {
  console.error('❌ BOT_TOKEN tidak ditemukan! Buat file .env dulu.');
  process.exit(1);
}

const bot = new Telegraf(process.env.BOT_TOKEN);
initDB();

// ── /start ────────────────────────────────────────────
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const user = getUser(userId);

  if (user) {
    return ctx.reply(
      `👋 Halo lagi, *${user.nama}*!\n\nMau ngapain nih?`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [
            ['🔍 Cari Jodoh', '💞 Matches'],
            ['👤 Profil Saya', '⚙️ Edit Profil'],
            ['🔴 Nonaktifkan Profil']
          ],
          resize_keyboard: true
        }
      }
    );
  }

  await ctx.reply(
    '💘 *Selamat datang di Jodoh Bot!*\n\nBot ini akan membantumu menemukan pasangan yang cocok.\n\n' +
    'Ayo mulai dengan membuat profil kamu!',
    { parse_mode: 'Markdown' }
  );
  return handleRegistrasi(ctx);
});

// ── /daftar ───────────────────────────────────────────
bot.command('daftar', async (ctx) => {
  const progress = getProgress(ctx.from.id);
  if (!progress) {
    await ctx.reply('📝 Yuk buat profil! Ikuti langkah berikut:');
  }
  return handleRegistrasi(ctx);
});

// ── /profil ───────────────────────────────────────────
bot.command('profil', async (ctx) => {
  const user = getUser(ctx.from.id);
  if (!user) return ctx.reply('❗ Kamu belum daftar! Ketik /daftar dulu.');

  const genderEmoji = user.gender === 'L' ? '👨' : '👩';
  const status = user.aktif ? '🟢 Aktif' : '🔴 Nonaktif';
  const caption =
    `${genderEmoji} *${user.nama}*, ${user.umur} tahun\n` +
    `📍 ${user.lokasi}\n` +
    `💬 _${user.bio}_\n\n` +
    `Status: ${status}`;

  if (user.foto_id) {
    await ctx.replyWithPhoto(user.foto_id, { caption, parse_mode: 'Markdown' });
  } else {
    await ctx.reply(caption, { parse_mode: 'Markdown' });
  }
});

// ── /cari ─────────────────────────────────────────────
bot.command('cari', handleCari);

// ── /matches ──────────────────────────────────────────
bot.command('matches', handleMatches);

// ── /stopchat ─────────────────────────────────────────
bot.command('stopchat', handleStopChat);

// ── /nonaktif ─────────────────────────────────────────
bot.command('nonaktif', async (ctx) => {
  setUserAktif(ctx.from.id, 0);
  await ctx.reply('🔴 Profil kamu sudah dinonaktifkan. Orang lain tidak bisa melihatmu.\nKetik /aktifkan untuk aktif lagi.');
});

bot.command('aktifkan', async (ctx) => {
  setUserAktif(ctx.from.id, 1);
  await ctx.reply('🟢 Profil kamu aktif lagi! Yuk /cari jodoh.');
});

// ── /help ─────────────────────────────────────────────
bot.command('help', (ctx) => ctx.reply(
  '📖 *Daftar Perintah:*\n\n' +
  '/daftar - Buat profil baru\n' +
  '/cari - Lihat & cari profil\n' +
  '/matches - Lihat semua match\n' +
  '/profil - Lihat profilmu\n' +
  '/stopchat - Akhiri sesi chat\n' +
  '/nonaktif - Sembunyikan profil\n' +
  '/aktifkan - Aktifkan profil lagi',
  { parse_mode: 'Markdown' }
));

// ── Keyboard menu ─────────────────────────────────────
bot.hears('🔍 Cari Jodoh', handleCari);
bot.hears('💞 Matches', handleMatches);
bot.hears('👤 Profil Saya', (ctx) => ctx.reply('/profil'));
bot.hears('⚙️ Edit Profil', (ctx) => {
  ctx.reply('Untuk edit profil, ketik /daftar lagi ya!');
});
bot.hears('🔴 Nonaktifkan Profil', async (ctx) => {
  setUserAktif(ctx.from.id, 0);
  ctx.reply('🔴 Profil kamu dinonaktifkan. Ketik /aktifkan untuk aktif lagi.');
});

// ── Callback Queries ──────────────────────────────────
bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;

  if (data.startsWith('gender_')) return handleGenderCallback(ctx);
  if (data.startsWith('cari_')) return handleCariCallback(ctx);
  if (data.startsWith('like_')) return handleLike(ctx);
  if (data.startsWith('skip_')) return handleSkip(ctx);
  if (data.startsWith('chat_')) return handleMulaiChat(ctx);

  await ctx.answerCbQuery('❓ Aksi tidak dikenal');
});

// ── Pesan teks & foto (registrasi / chat) ─────────────
bot.on(['message'], async (ctx) => {
  const userId = ctx.from.id;

  // Jika sedang registrasi
  const progress = getProgress(userId);
  if (progress) {
    return handleRegistrasi(ctx);
  }

  // Jika sedang dalam sesi chat
  const { getChatAktif } = require('./database');
  const session = getChatAktif(userId);
  if (session) {
    return handlePesanChat(ctx);
  }

  // Jika bukan keduanya, arahkan ke menu
  if (ctx.message?.text && !ctx.message.text.startsWith('/')) {
    return ctx.reply('Ketik /help untuk melihat perintah yang tersedia.');
  }
});

// ── Error handler ─────────────────────────────────────
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  ctx.reply('❌ Terjadi error. Coba lagi ya!').catch(() => {});
});

// ── Launch ────────────────────────────────────────────
bot.launch().then(() => {
  console.log('🤖 Jodoh Bot berjalan!');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
