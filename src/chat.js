const db = require('./database');

async function handleMulaiChat(ctx) {
  const userId = ctx.from.id;
  const lawanId = parseInt(ctx.callbackQuery.data.replace('chat_', ''));

  // Cek apakah beneran match
  if (!db.isMatch(userId, lawanId)) {
    await ctx.answerCbQuery('❌ Kalian belum match!');
    return;
  }

  await ctx.answerCbQuery('💬 Memulai chat...');
  db.startChat(userId, lawanId);

  const lawan = db.getUser(lawanId);

  await ctx.reply(
    `💬 *Chat dimulai dengan ${lawan.nama}!*\n\nSetiap pesan yang kamu kirim akan diteruskan ke dia.\nKetik /stopchat untuk mengakhiri sesi chat.`,
    { parse_mode: 'Markdown' }
  );

  // Notif ke lawan
  try {
    const myUser = db.getUser(userId);
    await ctx.telegram.sendMessage(
      lawanId,
      `💬 *${myUser.nama} mengajakmu chat!*\n\nBalas pesanmu di sini dan akan dikirim ke dia.\nKetik /stopchat untuk berhenti.`,
      { parse_mode: 'Markdown' }
    );
  } catch (e) {}
}

async function handlePesanChat(ctx) {
  const userId = ctx.from.id;
  const session = db.getChatAktif(userId);

  if (!session) return; // Bukan dalam sesi chat, biarkan handler lain tangani

  const lawanId = db.getLawanChat(session, userId);
  const myUser = db.getUser(userId);

  // Forward pesan ke lawan
  try {
    if (ctx.message.photo) {
      const foto = ctx.message.photo[ctx.message.photo.length - 1];
      const caption = ctx.message.caption ? `📸 *${myUser.nama}:* ${ctx.message.caption}` : `📸 *${myUser.nama}* mengirim foto`;
      await ctx.telegram.sendPhoto(lawanId, foto.file_id, { caption, parse_mode: 'Markdown' });
    } else if (ctx.message.sticker) {
      await ctx.telegram.sendMessage(lawanId, `😊 *${myUser.nama}* mengirim stiker:`, { parse_mode: 'Markdown' });
      await ctx.telegram.sendSticker(lawanId, ctx.message.sticker.file_id);
    } else if (ctx.message.text && ctx.message.text !== '/stopchat') {
      await ctx.telegram.sendMessage(
        lawanId,
        `💬 *${myUser.nama}:* ${ctx.message.text}`,
        { parse_mode: 'Markdown' }
      );
    }
  } catch (e) {
    await ctx.reply('❌ Gagal mengirim pesan. Mungkin lawan chat sudah tidak aktif.');
  }
}

async function handleStopChat(ctx) {
  const userId = ctx.from.id;
  const session = db.getChatAktif(userId);

  if (!session) {
    return ctx.reply('❗ Kamu tidak sedang dalam sesi chat.');
  }

  const lawanId = db.getLawanChat(session, userId);
  const myUser = db.getUser(userId);

  db.endChat(userId);

  await ctx.reply('👋 Sesi chat diakhiri. Ketik /matches untuk chat dengan orang lain.');

  try {
    await ctx.telegram.sendMessage(
      lawanId,
      `👋 *${myUser.nama}* mengakhiri sesi chat.\nKetik /matches untuk mulai chat baru.`,
      { parse_mode: 'Markdown' }
    );
  } catch (e) {}
}

module.exports = { handleMulaiChat, handlePesanChat, handleStopChat };
