const db = require('./database');

function formatProfil(user) {
  const genderEmoji = user.gender === 'L' ? '👨' : '👩';
  return `${genderEmoji} *${user.nama}*, ${user.umur} tahun\n📍 ${user.lokasi}\n\n💬 _${user.bio}_`;
}

async function tampilkanKandidat(ctx, kandidat) {
  const caption = formatProfil(kandidat);
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '❌ Skip', callback_data: `skip_${kandidat.user_id}` },
          { text: '❤️ Suka', callback_data: `like_${kandidat.user_id}` },
        ]
      ]
    }
  };

  if (kandidat.foto_id) {
    await ctx.replyWithPhoto(kandidat.foto_id, { caption, parse_mode: 'Markdown', ...keyboard });
  } else {
    await ctx.reply(caption, { parse_mode: 'Markdown', ...keyboard });
  }
}

async function handleCari(ctx) {
  const userId = ctx.from.id;
  const user = db.getUser(userId);

  if (!user) {
    return ctx.reply('❗ Kamu belum daftar!\nKetik /daftar untuk buat profil dulu ya.');
  }

  const kandidat = db.getKandidatBerikutnya(userId);
  if (!kandidat) {
    return ctx.reply('😔 Belum ada profil yang cocok saat ini.\nCoba lagi nanti ya!');
  }

  await tampilkanKandidat(ctx, kandidat);
}

async function handleLike(ctx) {
  const userId = ctx.from.id;
  const keUserId = parseInt(ctx.callbackQuery.data.replace('like_', ''));

  await ctx.answerCbQuery('❤️ Kamu suka!');
  db.addLike(userId, keUserId);

  // Cek apakah match!
  if (db.cekMatch(userId, keUserId)) {
    db.createMatch(userId, keUserId);

    const lawanUser = db.getUser(keUserId);
    const myUser = db.getUser(userId);

    // Notif ke diri sendiri
    await ctx.reply(
      `🎉 *Selamat, kalian MATCH!*\n\nKamu dan *${lawanUser.nama}* saling suka!\n\nKetik /matches untuk mulai chat dengan dia!`,
      { parse_mode: 'Markdown' }
    );

    // Notif ke lawan
    try {
      await ctx.telegram.sendMessage(
        keUserId,
        `🎉 *Kamu dapat MATCH baru!*\n\n*${myUser.nama}* juga suka kamu!\n\nKetik /matches untuk chat sekarang!`,
        { parse_mode: 'Markdown' }
      );
    } catch (e) { /* user mungkin belum mulai bot */ }
  } else {
    // Lanjut cari berikutnya
    const kandidat = db.getKandidatBerikutnya(userId);
    if (kandidat) {
      await tampilkanKandidat(ctx, kandidat);
    } else {
      await ctx.reply('😔 Sudah habis profilnya untuk sekarang. Coba lagi nanti!');
    }
  }
}

async function handleSkip(ctx) {
  const userId = ctx.from.id;
  const keUserId = parseInt(ctx.callbackQuery.data.replace('skip_', ''));

  await ctx.answerCbQuery('Skip...');
  // Catat sebagai "tidak suka" agar tidak muncul lagi
  db.addLike(userId, keUserId * -1); // Trick: simpan dengan id negatif buat skip
  // Lebih bersih: pakai tabel skip sendiri, tapi untuk simpelnya kita exclude aja lewat "like" palsu
  // Sebenernya kita hanya perlu skip dari tampilan, tidak perlu disimpan. Cukup reload:
  const kandidat = db.getKandidatBerikutnya(userId);
  if (kandidat) {
    await tampilkanKandidat(ctx, kandidat);
  } else {
    await ctx.reply('😔 Sudah habis profilnya untuk sekarang. Coba lagi nanti!');
  }
}

async function handleMatches(ctx) {
  const userId = ctx.from.id;
  const user = db.getUser(userId);

  if (!user) return ctx.reply('❗ Kamu belum daftar! Ketik /daftar dulu.');

  const matches = db.getMatches(userId);

  if (!matches.length) {
    return ctx.reply('💔 Belum ada match nih. Yuk /cari dulu!');
  }

  let text = '💞 *Match kamu:*\n\n';
  const keyboard = [];

  matches.forEach((m, i) => {
    const emoji = m.gender === 'L' ? '👨' : '👩';
    text += `${i + 1}. ${emoji} *${m.nama}* — ${m.umur} thn, ${m.lokasi}\n`;
    keyboard.push([{ text: `💬 Chat dengan ${m.nama}`, callback_data: `chat_${m.user_id}` }]);
  });

  await ctx.reply(text, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: keyboard }
  });
}

module.exports = { handleCari, handleLike, handleSkip, handleMatches };
    
