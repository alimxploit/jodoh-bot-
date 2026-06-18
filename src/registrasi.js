const { getProgress, setProgress, deleteProgress, upsertUser, getUser } = require('./database');

// Temp storage untuk data registrasi per user
const tempData = {};

const STEPS = ['nama', 'umur', 'gender', 'cari', 'lokasi', 'bio', 'foto'];

async function handleRegistrasi(ctx) {
  const userId = ctx.from.id;
  const progress = getProgress(userId);

  if (!progress) {
    // Mulai registrasi
    tempData[userId] = { user_id: userId, username: ctx.from.username || '' };
    setProgress(userId, 'nama');
    return ctx.reply(
      '📝 *Pendaftaran Jodoh Bot*\n\nAyo kenalan dulu! Siapa nama kamu?\n\n_(Ketik nama panggilanmu)_',
      { parse_mode: 'Markdown' }
    );
  }

  const step = progress.step;
  const input = ctx.message?.text;
  const photo = ctx.message?.photo;

  if (!tempData[userId]) {
    tempData[userId] = { user_id: userId, username: ctx.from.username || '' };
  }

  switch (step) {
    case 'nama':
      if (!input || input.length < 2) return ctx.reply('❌ Nama terlalu pendek, coba lagi ya!');
      tempData[userId].nama = input;
      setProgress(userId, 'umur');
      return ctx.reply('🎂 Berapa umurmu sekarang? _(contoh: 22)_', { parse_mode: 'Markdown' });

    case 'umur':
      const umur = parseInt(input);
      if (isNaN(umur) || umur < 17 || umur > 60) return ctx.reply('❌ Umur harus antara 17–60 tahun ya!');
      tempData[userId].umur = umur;
      setProgress(userId, 'gender');
      return ctx.reply('⚧ Kamu seorang?', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '👨 Laki-laki', callback_data: 'gender_L' }],
            [{ text: '👩 Perempuan', callback_data: 'gender_P' }],
          ]
        }
      });

    case 'lokasi':
      if (!input || input.length < 2) return ctx.reply('❌ Isi lokasi dulu ya!');
      tempData[userId].lokasi = input;
      setProgress(userId, 'bio');
      return ctx.reply('✍️ Ceritain sedikit tentang diri kamu (bio singkat):');

    case 'bio':
      if (!input || input.length < 5) return ctx.reply('❌ Bio terlalu pendek, minimal 5 karakter!');
      tempData[userId].bio = input;
      setProgress(userId, 'foto');
      return ctx.reply('📸 Terakhir, kirim foto profilmu ya! _(foto terbaik kamu)_', { parse_mode: 'Markdown' });

    case 'foto':
      if (!photo) return ctx.reply('📸 Kirim foto ya, bukan teks!');
      const fotoId = photo[photo.length - 1].file_id;
      tempData[userId].foto_id = fotoId;

      // Simpan ke database
      upsertUser(tempData[userId]);
      deleteProgress(userId);
      delete tempData[userId];

      return ctx.reply(
        '🎉 *Yeay, profil kamu sudah jadi!*\n\nSekarang kamu bisa mulai cari jodoh.\nKetik /cari untuk lihat profil orang lain!',
        { parse_mode: 'Markdown' }
      );
  }
}

async function handleGenderCallback(ctx) {
  const userId = ctx.from.id;
  const gender = ctx.callbackQuery.data.replace('gender_', '');

  if (!tempData[userId]) tempData[userId] = { user_id: userId, username: ctx.from.username || '' };
  tempData[userId].gender = gender;

  await ctx.answerCbQuery();
  setProgress(userId, 'cari');
  return ctx.reply('💞 Kamu sedang cari siapa?', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '👨 Laki-laki', callback_data: 'cari_L' }],
        [{ text: '👩 Perempuan', callback_data: 'cari_P' }],
      ]
    }
  });
}

async function handleCariCallback(ctx) {
  const userId = ctx.from.id;
  const cari = ctx.callbackQuery.data.replace('cari_', '');

  if (!tempData[userId]) tempData[userId] = { user_id: userId, username: ctx.from.username || '' };
  tempData[userId].cari = cari;

  await ctx.answerCbQuery();
  setProgress(userId, 'lokasi');
  return ctx.reply('📍 Kamu tinggal di kota mana? _(contoh: Jakarta, Bandung, Surabaya)_', { parse_mode: 'Markdown' });
}

module.exports = { handleRegistrasi, handleGenderCallback, handleCariCallback };
