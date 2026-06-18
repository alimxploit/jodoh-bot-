const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../jodoh.db'));

function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY,
      username TEXT,
      nama TEXT,
      umur INTEGER,
      gender TEXT,
      cari TEXT,
      lokasi TEXT,
      bio TEXT,
      foto_id TEXT,
      aktif INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dari_user INTEGER,
      ke_user INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(dari_user, ke_user)
    );

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user1 INTEGER,
      user2 INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user1, user2)
    );

    CREATE TABLE IF NOT EXISTS chat_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user1 INTEGER,
      user2 INTEGER,
      aktif INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS registrasi_progress (
      user_id INTEGER PRIMARY KEY,
      step TEXT DEFAULT 'nama'
    );
  `);
  console.log('✅ Database siap!');
}

function getUser(userId) {
  return db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
}

function upsertUser(data) {
  return db.prepare(`
    INSERT INTO users (user_id, username, nama, umur, gender, cari, lokasi, bio, foto_id)
    VALUES (@user_id, @username, @nama, @umur, @gender, @cari, @lokasi, @bio, @foto_id)
    ON CONFLICT(user_id) DO UPDATE SET
      username=@username, nama=@nama, umur=@umur,
      gender=@gender, cari=@cari, lokasi=@lokasi,
      bio=@bio, foto_id=@foto_id, aktif=1
  `).run(data);
}

function setUserAktif(userId, aktif) {
  db.prepare('UPDATE users SET aktif = ? WHERE user_id = ?').run(aktif, userId);
}

function getProgress(userId) {
  return db.prepare('SELECT * FROM registrasi_progress WHERE user_id = ?').get(userId);
}

function setProgress(userId, step) {
  db.prepare(`
    INSERT INTO registrasi_progress (user_id, step) VALUES (?, ?)
    ON CONFLICT(user_id) DO UPDATE SET step = ?
  `).run(userId, step, step);
}

function deleteProgress(userId) {
  db.prepare('DELETE FROM registrasi_progress WHERE user_id = ?').run(userId);
}

function getKandidatBerikutnya(userId) {
  const user = getUser(userId);
  if (!user) return null;
  return db.prepare(`
    SELECT * FROM users
    WHERE user_id != ? AND aktif = 1 AND gender = ?
      AND user_id NOT IN (SELECT ke_user FROM likes WHERE dari_user = ?)
    ORDER BY RANDOM() LIMIT 1
  `).get(userId, user.cari, userId);
}

function addLike(dariUser, keUser) {
  try { db.prepare('INSERT OR IGNORE INTO likes (dari_user, ke_user) VALUES (?, ?)').run(dariUser, keUser); } catch (e) {}
}

function cekMatch(user1, user2) {
  return !!db.prepare('SELECT * FROM likes WHERE dari_user = ? AND ke_user = ?').get(user2, user1);
}

function createMatch(user1, user2) {
  const a = Math.min(user1, user2), b = Math.max(user1, user2);
  try { db.prepare('INSERT OR IGNORE INTO matches (user1, user2) VALUES (?, ?)').run(a, b); } catch (e) {}
}

function getMatches(userId) {
  return db.prepare(`
    SELECT u.* FROM matches m
    JOIN users u ON (CASE WHEN m.user1 = ? THEN m.user2 ELSE m.user1 END = u.user_id)
    WHERE (m.user1 = ? OR m.user2 = ?) AND u.aktif = 1
  `).all(userId, userId, userId);
}

function isMatch(user1, user2) {
  const a = Math.min(user1, user2), b = Math.max(user1, user2);
  return !!db.prepare('SELECT * FROM matches WHERE user1 = ? AND user2 = ?').get(a, b);
}

function getChatAktif(userId) {
  return db.prepare(`
    SELECT * FROM chat_sessions WHERE (user1 = ? OR user2 = ?) AND aktif = 1 LIMIT 1
  `).get(userId, userId);
}

function startChat(user1, user2) {
  db.prepare('UPDATE chat_sessions SET aktif = 0 WHERE user1 = ? OR user2 = ?').run(user1, user1);
  db.prepare('UPDATE chat_sessions SET aktif = 0 WHERE user1 = ? OR user2 = ?').run(user2, user2);
  db.prepare('INSERT INTO chat_sessions (user1, user2) VALUES (?, ?)').run(user1, user2);
}

function endChat(userId) {
  db.prepare('UPDATE chat_sessions SET aktif = 0 WHERE user1 = ? OR user2 = ?').run(userId, userId);
}

function getLawanChat(session, userId) {
  return session.user1 === userId ? session.user2 : session.user1;
}

module.exports = {
  initDB, getUser, upsertUser, setUserAktif,
  getProgress, setProgress, deleteProgress,
  getKandidatBerikutnya, addLike, cekMatch, createMatch,
  getMatches, isMatch, getChatAktif, startChat, endChat, getLawanChat,
};
