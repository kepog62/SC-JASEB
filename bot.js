const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
const fetch = require("node-fetch");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { TOKEN, ADMIN_ID, vercelToken } = require("./config");

const bot = new TelegramBot(TOKEN, { polling: true });

// =============================
// Database Awal
// =============================
const premiumDB = "./premium.json";
const tempPremiumDB = "./temp_premium.json";
const groupsDB = "./groups.json";
const channelsDB = "./channels.json";
const groupInviterDB = "./group_inviter.json";
if (!fs.existsSync(groupInviterDB)) fs.writeFileSync(groupInviterDB, JSON.stringify([]));
const utangDB = "./utang.json";
if (!fs.existsSync(utangDB)) fs.writeFileSync(utangDB, JSON.stringify([]));
const payDB = "./pay.json";
if (!fs.existsSync(payDB)) fs.writeFileSync(payDB, JSON.stringify([]));
const blacklistDB = "./blacklist.json";
if (!fs.existsSync(blacklistDB)) fs.writeFileSync(blacklistDB, JSON.stringify([]));
const antilinkDB = "./antilink.json";
const deteksiDB = "./deteksi.json";
if (!fs.existsSync(antilinkDB)) fs.writeFileSync(antilinkDB, JSON.stringify({}));
if (!fs.existsSync(deteksiDB)) fs.writeFileSync(deteksiDB, JSON.stringify({}));

// =============================
// Referral System DB
// =============================
const referralDB = "./referral.json";
if (!fs.existsSync(referralDB)) fs.writeFileSync(referralDB, JSON.stringify([]));

function getReferrals() {
  return JSON.parse(fs.readFileSync(referralDB));
}
function saveReferrals(data) {
  fs.writeFileSync(referralDB, JSON.stringify(data, null, 2));
}
function getReferral(userId) {
  const data = getReferrals();
  return data.find(x => x.userId === userId);
}
function addReferral(userId, refLink) {
  const data = getReferrals();
  if (!data.find(x => x.userId === userId)) {
    data.push({ userId, refLink, clicks: [] });
    saveReferrals(data);
  }
}
function addReferralClick(refUserId, clickerId) {
  const data = getReferrals();
  const ref = data.find(x => x.userId === refUserId);
  if (ref && !ref.clicks.includes(clickerId)) {
    ref.clicks.push(clickerId);
    saveReferrals(data);
  }
}

// =============================
// ...lanjutan kode lama (share, copyweb, antilink, dll)
// =============================

function getAntilink(groupId) {
  const data = JSON.parse(fs.readFileSync(antilinkDB));
  return data[groupId] || false;
}
function setAntilink(groupId, status) {
  const data = JSON.parse(fs.readFileSync(antilinkDB));
  data[groupId] = status;
  fs.writeFileSync(antilinkDB, JSON.stringify(data, null, 2));
}

function getDeteksi(groupId) {
  const data = JSON.parse(fs.readFileSync(deteksiDB));
  return data[groupId] || [];
}
function addDeteksi(groupId, text) {
  const data = JSON.parse(fs.readFileSync(deteksiDB));
  if (!data[groupId]) data[groupId] = [];
  if (!data[groupId].includes(text)) {
    data[groupId].push(text);
    fs.writeFileSync(deteksiDB, JSON.stringify(data, null, 2));
  }
}
function removeDeteksi(groupId, text) {
  const data = JSON.parse(fs.readFileSync(deteksiDB));
  if (!data[groupId]) return;
  data[groupId] = data[groupId].filter(x => x !== text);
  fs.writeFileSync(deteksiDB, JSON.stringify(data, null, 2));
}

function getBlacklist() {
  return JSON.parse(fs.readFileSync(blacklistDB));
}
function addBlacklist(groupId) {
  const data = getBlacklist();
  if (!data.includes(groupId)) {
    data.push(groupId);
    fs.writeFileSync(blacklistDB, JSON.stringify(data, null, 2));
  }
}
function isBlacklisted(groupId) {
  return getBlacklist().includes(groupId);
}

function getPay() {
  return JSON.parse(fs.readFileSync(payDB));
}
function savePay(data) {
  fs.writeFileSync(payDB, JSON.stringify(data, null, 2));
}

function getUtang() {
  return JSON.parse(fs.readFileSync(utangDB));
}
function saveUtang(data) {
  fs.writeFileSync(utangDB, JSON.stringify(data, null, 2));
}

function addGroupInviter(groupId, userId) {
  const data = JSON.parse(fs.readFileSync(groupInviterDB));
  if (!data.find(x => x.groupId === groupId)) {
    data.push({ groupId, userId });
    fs.writeFileSync(groupInviterDB, JSON.stringify(data, null, 2));
  }
}

function getGroupInviter(groupId) {
  const data = JSON.parse(fs.readFileSync(groupInviterDB));
  return data.find(x => x.groupId === groupId);
}

function removeGroupInviter(groupId) {
  let data = JSON.parse(fs.readFileSync(groupInviterDB));
  data = data.filter(x => x.groupId !== groupId);
  fs.writeFileSync(groupInviterDB, JSON.stringify(data, null, 2));
}

if (!fs.existsSync(channelsDB)) fs.writeFileSync(channelsDB, JSON.stringify([]));

function getChannels() {
  return JSON.parse(fs.readFileSync(channelsDB));
}
function addChannel(channelId) {
  const data = getChannels();
  if (!data.includes(channelId)) {
    data.push(channelId);
    fs.writeFileSync(channelsDB, JSON.stringify(data, null, 2));
  }
}
function removeChannel(channelId) {
  let data = getChannels();
  data = data.filter(id => id !== channelId);
  fs.writeFileSync(channelsDB, JSON.stringify(data, null, 2));
}

// buat file database jika belum ada
if (!fs.existsSync(premiumDB)) fs.writeFileSync(premiumDB, JSON.stringify([]));
if (!fs.existsSync(tempPremiumDB)) fs.writeFileSync(tempPremiumDB, JSON.stringify([]));
if (!fs.existsSync(groupsDB)) fs.writeFileSync(groupsDB, JSON.stringify([]));

// helper database
function isPremium(userId) {
  const data = JSON.parse(fs.readFileSync(premiumDB));
  return data.includes(userId);
}
function addPremium(userId) {
  const data = JSON.parse(fs.readFileSync(premiumDB));
  if (!data.includes(userId)) {
    data.push(userId);
    fs.writeFileSync(premiumDB, JSON.stringify(data, null, 2));
  }
}
function removePremium(userId) {
  let data = JSON.parse(fs.readFileSync(premiumDB));
  data = data.filter(id => id !== userId);
  fs.writeFileSync(premiumDB, JSON.stringify(data, null, 2));
}
function addTempPremium(userId) {
  const data = JSON.parse(fs.readFileSync(tempPremiumDB));
  if (!data.find(x => x.userId === userId)) {
    data.push({ userId, addedAt: new Date().toISOString() });
    fs.writeFileSync(tempPremiumDB, JSON.stringify(data, null, 2));
  }
}
function addTempPremiumCustom(userId, durationSec) {
  const data = JSON.parse(fs.readFileSync(tempPremiumDB));
  const expireAt = new Date(Date.now() + durationSec * 1000).toISOString();
  if (!data.find(x => x.userId === userId)) {
    data.push({ userId, expireAt });
    fs.writeFileSync(tempPremiumDB, JSON.stringify(data, null, 2));
  }
}
// Update fungsi cek habis premium
async function checkTempPremium() {
  const data = JSON.parse(fs.readFileSync(tempPremiumDB));
  const now = new Date();
  for (const item of data) {
    if (item.expireAt && new Date(item.expireAt) <= now) {
      removeTempPremium(item.userId);
      removePremium(item.userId);
      bot.sendMessage(item.userId, "<blockquote>⚠️ Premium kamu sudah berakhir</blockquote>", { parse_mode: "HTML" });
    }
  }
}
function removeTempPremium(userId) {
  let data = JSON.parse(fs.readFileSync(tempPremiumDB));
  data = data.filter(x => x.userId !== userId);
  fs.writeFileSync(tempPremiumDB, JSON.stringify(data, null, 2));
}

function getGroups() {
  return JSON.parse(fs.readFileSync(groupsDB));
}
function addGroup(groupId) {
  const data = JSON.parse(fs.readFileSync(groupsDB));
  if (!data.includes(groupId)) {
    data.push(groupId);
    fs.writeFileSync(groupsDB, JSON.stringify(data, null, 2));
  }
}

// Gemini AI
const GEMINI_API_KEY = "AIzaSyAMa-tM6w7sW8_tKV9aZJ9LPePoGRaQRAQ"; // ganti API key kamu
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// =============================
// Premium 1 hari check
// =============================
async function checkTempPremium() {
  const data = JSON.parse(fs.readFileSync(tempPremiumDB));
  const now = new Date();
  for (const item of data) {
    const added = new Date(item.addedAt);
    if ((now - added) / 1000 > 86400) {
      removeTempPremium(item.userId);
      removePremium(item.userId);
      bot.sendMessage(item.userId, "<blockquote>⚠️ Premium 1 hari kamu sudah berakhir</blockquote>", { parse_mode: "HTML" });
    }
  }
}
setInterval(checkTempPremium, 10 * 60 * 1000);

const esc = (v) => String(v ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;");

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  if (msg.new_chat_members) {
    const botInfo = await bot.getMe();
    for (const member of msg.new_chat_members) {
      if (member.id === botInfo.id) {
        const addedBy = msg.from.id;

        // ✅ cek blacklist
        if (isBlacklisted(chatId)) {
          bot.sendMessage(
            ADMIN_ID,
            `<blockquote>⚠️ BOT DITAMBAHKAN KEMBALI KE GRUP BLACKLIST</blockquote>
<blockquote>🆔 : <code>${esc(chatId)}</code></blockquote>
<blockquote>👥 : ${esc(msg.chat.title || "Unknown Group")}</blockquote>`,
            { parse_mode: "HTML" }
          );

          removePremium(addedBy);
          removeTempPremium(addedBy);
          removeGroupInviter(chatId);
          return; // stop
        }

        // ✅ ambil jumlah member grup
        const memberCount = await bot.getChatMemberCount(chatId);

        // Tentukan durasi premium berdasarkan memberCount
        let durationSec = 0;
        let label = "";

        if (memberCount >= 1 && memberCount <= 20) {
          durationSec = 1 * 60 * 60; // 1 jam
          label = "1 Jam";
        } else if (memberCount >= 30 && memberCount <= 100) {
          durationSec = 24 * 60 * 60; // 1 hari
          label = "1 Hari";
        } else if (memberCount >= 110 && memberCount <= 200) {
          durationSec = 3 * 24 * 60 * 60; // 3 hari
          label = "3 Hari";
        } else if (memberCount >= 210 && memberCount <= 1000) {
          durationSec = 30 * 24 * 60 * 60; // 30 hari
          label = "30 Hari";
        } else {
          durationSec = 24 * 60 * 60; // fallback 1 hari
          label = "1 Hari";
        }

        // === simpan data premium ===
        addPremium(addedBy);
        addTempPremiumCustom(addedBy, durationSec);

        addGroupInviter(chatId, addedBy);
        addGroup(chatId);

        // Notif ke user
        bot.sendMessage(
          addedBy,
          `<blockquote>🎉 Kamu mendapatkan akses Premium selama ${label} karena menambahkan bot ke grup</blockquote>`,
          { parse_mode: "HTML" }
        );

        // Info pengundang
        const inviter = msg.from;
        const userName = inviter.first_name + (inviter.last_name ? " " + inviter.last_name : "");
        const userMention = inviter.username ? `@${inviter.username}` : userName;

        // === Notif ke group tertentu (detail) ===
        const premiumText = `🎉 PREMIUM AKTIF 🎉

👤 Pengguna : ${esc(userName)} (${esc(userMention)})
🆔 ID Pengguna : <code>${esc(addedBy)}</code>
🏡 Group : ${esc(msg.chat.title || "Unknown Group")}
🔗 Id Group : <code>${esc(chatId)}</code>
📊 Member Group : ${memberCount}
💎 Jenis Premium : Premium ${label}`;

        // ganti dengan ID grup tujuan (bukan channel)
        const GROUP_ID = -1002718173393;

        const inlineButtons = {
          inline_keyboard: [
            [
              { text: "🤖 BOT JASEB", url: "https://t.me/JasebFreexVipBot" }
            ]
          ]
        };

        bot.sendMessage(GROUP_ID, premiumText, {
          parse_mode: "HTML",
          reply_markup: inlineButtons
        }).catch(() => {});

        // === Notif ke admin utama (singkat seperti awal) ===
        const notifText =
          `<blockquote>GROUP BARU</blockquote>\n` +
          `<blockquote>🆔 : <code>${esc(chatId)}</code></blockquote>\n` +
          `<blockquote>👤 : ${esc(msg.chat.title || "Unknown Group")}</blockquote>`;

        bot.sendMessage(ADMIN_ID, notifText, { parse_mode: "HTML" }).catch(() => {});
      }
    }
  }
});

// =============================
// Bot ditambahkan / dihapus dari channel
// =============================
bot.on("my_chat_member", async (update) => {
  const chat = update.chat;
  const newStatus = update.new_chat_member.status;

  if (chat.type === "channel") {
    const channelId = chat.id;
    const channelName = chat.title || "Unknown Channel";

    if (newStatus === "administrator" || newStatus === "member") {
      // bot baru ditambahkan ke channel
      addChannel(channelId);

      const notifText = `<blockquote>📌 CHANNEL BARU TERDETEKSI</blockquote>
<blockquote>🆔 : <code>${channelId}</code></blockquote>
<blockquote>📢 : ${channelName}</blockquote>`;
      bot.sendMessage(ADMIN_ID, notifText, { parse_mode: "HTML" });
    } else if (newStatus === "kicked" || newStatus === "left") {
      // bot dihapus dari channel
      removeChannel(channelId);

      const notifText = `<blockquote>🚨 BOT DIHAPUS DARI CHANNEL</blockquote>
<blockquote>🆔 : <code>${channelId}</code></blockquote>
<blockquote>📢 : ${channelName}</blockquote>`;
      bot.sendMessage(ADMIN_ID, notifText, { parse_mode: "HTML" });
    }
  }
});

// =============================
// Bot dikeluarkan dari grup
// =============================
bot.on("my_chat_member", async (update) => {
  const chat = update.chat;
  const newStatus = update.new_chat_member.status;

  if (chat.type === "group" || chat.type === "supergroup") {
    // cek kalau bot dihapus
    if (newStatus === "kicked" || newStatus === "left") {
      const groupId = chat.id;
      const groupName = chat.title || "Unknown Group";

      // hapus dari groups.json
      let groups = getGroups();
      groups = groups.filter(id => id !== groupId);
      fs.writeFileSync(groupsDB, JSON.stringify(groups, null, 2));

      // ✅ tambahkan ke blacklist
      addBlacklist(groupId);

      // cabut premium user pengundang
      const inviter = getGroupInviter(groupId);
      if (inviter) {
        removePremium(inviter.userId);
        removeTempPremium(inviter.userId);
        removeGroupInviter(groupId);

        bot.sendMessage(
          inviter.userId,
          "<blockquote>⚠️ Premium kamu dicabut karena bot dikeluarkan dari grup.</blockquote>",
          { parse_mode: "HTML" }
        );
      }

      // notif admin
      const notifText = `<blockquote>🚨 BOT DIKELUARKAN DARI GRUP</blockquote>
<blockquote>🆔 : <code>${groupId}</code></blockquote>
<blockquote>👤 : ${groupName}</blockquote>`;
      bot.sendMessage(ADMIN_ID, notifText, { parse_mode: "HTML" });
    }
  }
});

const logoUrl = "https://files.catbox.moe/dxwjvv.jpg";

// simpan pesan bot terakhir
let lastBotMessage = {};

// =============================
// START → kirim pesan sambutan
// =============================
// =============================
// START → kirim pesan sambutan + HUBUNGI ADMIN
// =============================
const userChatState = {}; // simpan status user yang sedang kirim pesan ke admin

bot.onText(/^\/start$/, async (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from.username ? `@${msg.from.username}` : msg.from.first_name;

  const users = JSON.parse(fs.readFileSync(premiumDB)).length;
  const groups = getGroups().length;

  // 🔹 Tambahkan tombol HUBUNGI ADMIN di menu utama
  const buttons = [["𝙼𝙴𝙽𝚄 𝙹𝙰𝚂𝙷𝙴𝚁", "𝙷𝚄𝙱𝚄𝙽𝙶𝙸 𝙾𝚆𝙽𝙴𝚁"]];

  const sent = await bot.sendPhoto(chatId, logoUrl, {
    caption: `<blockquote>👋 Ola ${username} Selamat Datang Di Bot Jaseb Free</blockquote>
<blockquote>☐ 𝚅𝙴𝚁𝚂𝙸𝙾𝙽 : 𝟷.𝟶 𝚅𝙸𝙿
☐ 𝙰𝚄𝚃𝙷𝙾𝚁 : @RannTzyBack2</blockquote>
<blockquote>𝙳𝙰𝚃𝙰𝙱𝙰𝚂𝙴</blockquote>
<blockquote>👤 𝚄𝚂𝙴𝚁 : ${users}
👥 𝙶𝚁𝙾𝚄𝙿 : ${groups}</blockquote>`,
    parse_mode: "HTML",
    reply_markup: {
      keyboard: buttons,
      resize_keyboard: true
    }
  });

  lastBotMessage[chatId] = sent.message_id;
});

// =============================
// Handler tombol
// =============================
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const userId = msg.from.id;

  // === MENU JASHER ===
  if (text === "𝙼𝙴𝙽𝚄 𝙹𝙰𝚂𝙷𝙴𝚁") {
    bot.deleteMessage(chatId, msg.message_id).catch(() => {});
    if (lastBotMessage[chatId]) bot.deleteMessage(chatId, lastBotMessage[chatId]).catch(() => {});

    const backButtons = [["⬅ BACK"]];
    const sent = await bot.sendPhoto(chatId, logoUrl, {
      caption: `<blockquote>𝗙𝗜𝗧𝗨𝗥 𝗝𝗔𝗦𝗛𝗘𝗥 𝗠𝗘𝗡𝗨</blockquote>
<blockquote>/share -> 𝚂𝙷𝙰𝚁𝙴 𝙲𝙾𝙿𝚈 + 𝚂𝙴𝙱𝙰𝚁 
/share2 -> 𝚂𝙷𝙰𝚁𝙴 𝙵𝙾𝚁𝙴𝚆𝙳 + 𝚂𝙴𝙱𝙰𝚁
/bcuser -> 𝙵𝙾𝚁𝚆𝙴𝙳 𝙺𝙴 𝙿𝙴𝙽𝙶𝙶𝚄𝙽𝙰 BOT
/sharech -> 𝙵𝙾𝚁𝚆𝙴𝙳 𝙺𝙴 𝙲𝙷𝙰𝙽𝙽𝙴𝙻
/tourl -> 𝙹𝙰𝙳𝙸𝙺𝙰𝙽 𝙵𝙾𝚃𝙾/𝚅𝙸𝙳𝙴𝙾 𝙹𝙰𝙳𝙸 𝙻𝙸𝙽𝙺
/copyweb -> 𝙲𝙾𝙿𝚈 𝚆𝙴𝙱𝚂𝙸𝚃𝙴
/createweb -> 𝙳𝙴𝙿𝙻𝙾𝚈 WEB
/ai -> 𝚃𝙰𝙽𝚈𝙰 AI</blockquote>`,
      parse_mode: "HTML",
      reply_markup: { keyboard: backButtons, resize_keyboard: true }
    });

    lastBotMessage[chatId] = sent.message_id;
    return;
  }

  // === HUBUNGI ADMIN ===
  if (text === "𝙷𝚄𝙱𝚄𝙽𝙶𝙸 𝙾𝚆𝙽𝙴𝚁") {
    userChatState[userId] = "waiting_admin_message";

    await bot.sendMessage(chatId,
      "<blockquote>📨 Silakan kirim pesan yang ingin disampaikan ke admin.\n\nTekan BATAL untuk membatalkan.</blockquote>",
      {
        parse_mode: "HTML",
        reply_markup: { keyboard: [["BATAL"]], resize_keyboard: true }
      }
    );
    return;
  }

  // === BATAL ===
  if (text === "BATAL") {
    delete userChatState[userId];

    const username = msg.from.username ? `@${msg.from.username}` : msg.from.first_name;
    const users = JSON.parse(fs.readFileSync(premiumDB)).length;
    const groups = getGroups().length;
    const buttons = [["𝙼𝙴𝙽𝚄 𝙹𝙰𝚂𝙷𝙴𝚁", "𝙷𝚄𝙱𝚄𝙽𝙶𝙸 𝙾𝚆𝙽𝙴𝚁"]];

    const sent = await bot.sendPhoto(chatId, logoUrl, {
      caption: `<blockquote>👋 Ola ${username} Selamat Datang Di Bot Jaseb Free</blockquote>
<blockquote>☐ 𝚅𝙴𝚁𝚂𝙸𝙾𝙽 : 𝟷.𝟶 𝚅𝙸𝙿
☐ 𝙰𝚄𝚃𝙷𝙾𝚁 : @RannTzyBack2</blockquote>
<blockquote>𝙳𝙰𝚃𝙰𝙱𝙰𝚂𝙴</blockquote>
<blockquote>👤 𝚄𝚂𝙴𝚁 : ${users}
👥 𝙶𝚁𝙾𝚄𝙿 : ${groups}</blockquote>`,
      parse_mode: "HTML",
      reply_markup: { keyboard: buttons, resize_keyboard: true }
    });

    lastBotMessage[chatId] = sent.message_id;
    return;
  }

  // === jika user sedang dalam mode kirim pesan ke admin ===
  if (userChatState[userId] === "waiting_admin_message" && text) {
    const info = `📩 Pesan baru dari pengguna\n\n👤 Nama: ${msg.from.first_name}\n🆔 ID: <code>${userId}</code>\n💬 Pesan:\n${text}`;
    await bot.sendMessage(ADMIN_ID, info, { parse_mode: "HTML" });
    await bot.forwardMessage(ADMIN_ID, chatId, msg.message_id);
    await bot.sendMessage(chatId, "<blockquote>✅ Pesan kamu sudah dikirim ke admin.</blockquote>", { parse_mode: "HTML" });
    delete userChatState[userId];
    return;
  }

  // === jika admin membalas pesan user (reply pesan yang diteruskan bot) ===
  if (msg.reply_to_message && msg.chat.id === ADMIN_ID) {
    const fwd = msg.reply_to_message.forward_from;
    if (fwd && fwd.id) {
      try {
        await bot.sendMessage(
          fwd.id,
          `📬 Balasan dari admin:\n\n${text}`,
          { parse_mode: "HTML" }
        );
        await bot.sendMessage(ADMIN_ID, `✅ Pesan berhasil dikirim ke <code>${fwd.id}</code>`, { parse_mode: "HTML" });
      } catch (err) {
        await bot.sendMessage(ADMIN_ID, `❌ Gagal mengirim ke user <code>${fwd.id}</code>`, { parse_mode: "HTML" });
      }
    }
    return;
  }

  // === BACK ===
  if (text === "⬅ BACK") {
    bot.deleteMessage(chatId, msg.message_id).catch(() => {});
    if (lastBotMessage[chatId]) bot.deleteMessage(chatId, lastBotMessage[chatId]).catch(() => {});

    const username = msg.from.username ? `@${msg.from.username}` : msg.from.first_name;
    const users = JSON.parse(fs.readFileSync(premiumDB)).length;
    const groups = getGroups().length;
    const buttons = [["𝙼𝙴𝙽𝚄 𝙹𝙰𝚂𝙷𝙴𝚁", "𝙷𝚄𝙱𝚄𝙽𝙶𝙸 𝙾𝚆𝙽𝙴𝚁"]];

    const sent = await bot.sendPhoto(chatId, logoUrl, {
      caption: `<blockquote>👋 Ola ${username} Selamat Datang Di Bot Jaseb Free</blockquote>
<blockquote>☐ 𝚅𝙴𝚁𝚂𝙸𝙾𝙽 : 𝟷.𝟶 𝚅𝙸𝙿
☐ 𝙰𝚄𝚃𝙷𝙾𝚁 : @RannTzyBack2</blockquote>
<blockquote>𝙳𝙰𝚃𝙰𝙱𝙰𝚂𝙴</blockquote>
<blockquote>👤 𝚄𝚂𝙴𝚁 : ${users}
👥 𝙶𝚁𝙾𝚄𝙿 : ${groups}</blockquote>`,
      parse_mode: "HTML",
      reply_markup: { keyboard: buttons, resize_keyboard: true }
    });

    lastBotMessage[chatId] = sent.message_id;
  }
});

// =============================
// Cooldown Map untuk /share
// =============================
const shareCooldown = new Map(); // NEW

// =============================
// Fitur /share (premium + admin)
// =============================
bot.onText(/^\/share$/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!msg.reply_to_message) return bot.sendMessage(chatId, "⚠️ Reply pesan untuk /share");
  if (!(userId === ADMIN_ID || isPremium(userId))) return bot.sendMessage(chatId, "❌ Hanya Admin/Premium yang bisa pakai.");

  // === Cek cooldown (hanya untuk premium, bukan admin utama) ===
  if (userId !== ADMIN_ID && isPremium(userId)) {
    const lastUsed = shareCooldown.get(userId);
    const now = Date.now();
    if (lastUsed && now - lastUsed < 30000) { // 30 detik
      const waitSec = Math.ceil((30000 - (now - lastUsed)) / 1000);
      return bot.sendMessage(chatId, `⏳ Tunggu ${waitSec} detik sebelum menggunakan /share lagi.`);
    }
    shareCooldown.set(userId, now);
  }
  // ============================================================

  const GROUPS = getGroups();
  if (GROUPS.length === 0) return bot.sendMessage(chatId, "📭 Tidak ada grup tersimpan.");

  let success = 0, failed = 0;
  let progressMsg = await bot.sendMessage(chatId, `<blockquote>📤 Mengirim ke grup 0%\n▱▱▱▱▱▱▱▱▱▱</blockquote>`, { parse_mode: "HTML" });

  for (let i = 0; i < GROUPS.length; i++) {
    if (isBlacklisted(GROUPS[i])) continue; // ✅ skip grup blacklist
    try {
      if (msg.reply_to_message.text) {
        let textToSend = msg.reply_to_message.text;
        if (isPremium(userId)) {
          textToSend += `\n\nBOT JASEB FREE : @JasebFreexVipBot`; // ✅ auto tambah untuk premium
        }
        await bot.sendMessage(GROUPS[i], textToSend);
      } else if (msg.reply_to_message.photo) {
        const photo = msg.reply_to_message.photo.pop().file_id;
        let captionToSend = msg.reply_to_message.caption || "";
        if (isPremium(userId)) {
          captionToSend += (captionToSend ? "\n\n" : "") + `BOT JASEB FREE : @JasebFreexVipBot`; // ✅ auto tambah untuk premium
        }
        await bot.sendPhoto(GROUPS[i], photo, { caption: captionToSend });
      }
      success++;
    } catch { failed++; }

    const percent = Math.round(((i + 1) / GROUPS.length) * 100);
    if (percent % 5 === 0 || percent === 100) {
      const filled = Math.round(percent / 10);
      const bar = "▰".repeat(filled) + "▱".repeat(10 - filled);
      await bot.editMessageText(`<blockquote>📤 Mengirim ke grup ${percent}%\n${bar}</blockquote>`, {
        chat_id: chatId,
        message_id: progressMsg.message_id,
        parse_mode: "HTML"
      }).catch(() => {});
      await new Promise(r => setTimeout(r, 300));
    }
  }

  await bot.deleteMessage(chatId, progressMsg.message_id).catch(() => {});
  bot.sendMessage(chatId, `<blockquote>✅ Berhasil: ${success}</blockquote>
<blockquote>❌ Gagal: ${failed}</blockquote>
<blockquote>📊 Total: ${GROUPS.length}</blockquote>`, { parse_mode: "HTML" });
});


// =============================
// Cooldown Map untuk /share2
// =============================
const share2Cooldown = new Map();

// =============================
// Fitur /share2 (Admin Utama & Premium)
// =============================
bot.onText(/^\/share2$/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!msg.reply_to_message) {
    return bot.sendMessage(chatId, "⚠️ Reply pesan untuk /share2");
  }

  // ✅ hanya admin utama atau premium
  if (!(userId === ADMIN_ID || isPremium(userId))) {
    return bot.sendMessage(chatId, "❌ Hanya Admin Utama & Premium yang bisa pakai.");
  }

  // ✅ cek cooldown (hanya untuk premium, bukan admin utama)
  if (userId !== ADMIN_ID && isPremium(userId)) {
    const lastUsed = share2Cooldown.get(userId);
    const now = Date.now();
    if (lastUsed && now - lastUsed < 60 * 1000) { // 1 menit
      const waitSec = Math.ceil((60 * 1000 - (now - lastUsed)) / 1000);
      return bot.sendMessage(chatId, `⏳ Tunggu ${waitSec} detik sebelum pakai /share2 lagi.`);
    }
    share2Cooldown.set(userId, now);
  }

  const GROUPS = getGroups();
  if (GROUPS.length === 0) {
    return bot.sendMessage(chatId, "📭 Tidak ada grup tersimpan.");
  }

  let success = 0, failed = 0;
  let progressMsg = await bot.sendMessage(
    chatId,
    `<blockquote>📤 Forwarding ke grup 0%\n▱▱▱▱▱▱▱▱▱▱</blockquote>`,
    { parse_mode: "HTML" }
  );

  for (let i = 0; i < GROUPS.length; i++) {
    if (isBlacklisted(GROUPS[i])) continue; // ✅ skip grup blacklist
    try {
      await bot.forwardMessage(GROUPS[i], chatId, msg.reply_to_message.message_id);
      success++;
    } catch {
      failed++;
    }

    const percent = Math.round(((i + 1) / GROUPS.length) * 100);
    if (percent % 5 === 0 || percent === 100) {
      const filled = Math.round(percent / 10);
      const bar = "▰".repeat(filled) + "▱".repeat(10 - filled);
      await bot.editMessageText(
        `<blockquote>📤 Forwarding ke grup ${percent}%\n${bar}</blockquote>`,
        {
          chat_id: chatId,
          message_id: progressMsg.message_id,
          parse_mode: "HTML",
        }
      ).catch(() => {});
    }
  }

  await bot.deleteMessage(chatId, progressMsg.message_id).catch(() => {});
  bot.sendMessage(
    chatId,
    `<blockquote>✅ Berhasil: ${success}</blockquote>
<blockquote>❌ Gagal: ${failed}</blockquote>
<blockquote>📊 Total: ${GROUPS.length}</blockquote>`,
    { parse_mode: "HTML" }
  );
});

// =============================
// Admin commands: add/list premium & groups
// =============================
bot.onText(/\/addprem (\d+)/, (msg, match) => {
  if (msg.from.id !== ADMIN_ID) return;
  const userId = parseInt(match[1]);
  addPremium(userId);
  bot.sendMessage(msg.chat.id, `<blockquote>✅ User ${userId} ditambahkan ke Premium</blockquote>`, { parse_mode: "HTML" });
});

bot.onText(/\/listprem/, (msg) => {
  if (msg.from.id !== ADMIN_ID) return;
  const data = JSON.parse(fs.readFileSync(premiumDB));
  bot.sendMessage(msg.chat.id, `<blockquote>👤 Premium Users:</blockquote>\n${data.join("\n") || "Kosong"}`, { parse_mode: "HTML" });
});

// =============================
// Admin command: delprem
// =============================
bot.onText(/\/delprem (\d+)/, (msg, match) => {
  if (msg.from.id !== ADMIN_ID) return;
  const userId = parseInt(match[1]);
  removePremium(userId);
  bot.sendMessage(msg.chat.id, `<blockquote>🗑 User ${userId} dihapus dari Premium</blockquote>`, { parse_mode: "HTML" });
});

// =============================
// Admin command: addgrupid & delgrupid
// =============================
bot.onText(/\/addgrupid (-?\d+)/, (msg, match) => { // NEW
  if (msg.from.id !== ADMIN_ID) return;
  const groupId = parseInt(match[1]);
  const groups = getGroups();
  if (!groups.includes(groupId)) {
    groups.push(groupId);
    fs.writeFileSync(groupsDB, JSON.stringify(groups, null, 2));
    bot.sendMessage(msg.chat.id, `<blockquote>✅ Grup ${groupId} berhasil ditambahkan ke database</blockquote>`, { parse_mode: "HTML" });
  } else {
    bot.sendMessage(msg.chat.id, `<blockquote>⚠️ Grup ${groupId} sudah ada di database</blockquote>`, { parse_mode: "HTML" });
  }
});

bot.onText(/\/delgrupid (-?\d+)/, async (msg, match) => { // NEW
  if (msg.from.id !== ADMIN_ID) return;
  const groupId = parseInt(match[1]);

  // hapus dari database
  let groups = getGroups();
  if (groups.includes(groupId)) {
    groups = groups.filter(id => id !== groupId);
    fs.writeFileSync(groupsDB, JSON.stringify(groups, null, 2));

    // coba keluar dari grup
    try {
      await bot.leaveChat(groupId);
      bot.sendMessage(msg.chat.id, `<blockquote>🚪 Bot keluar dan grup ${groupId} dihapus dari database</blockquote>`, { parse_mode: "HTML" });
    } catch (e) {
      bot.sendMessage(msg.chat.id, `<blockquote>⚠️ Grup ${groupId} dihapus dari database, tapi bot tidak bisa keluar (mungkin bukan member)</blockquote>`, { parse_mode: "HTML" });
    }
  } else {
    bot.sendMessage(msg.chat.id, `<blockquote>❌ Grup ${groupId} tidak ditemukan di database</blockquote>`, { parse_mode: "HTML" });
  }
});

bot.onText(/\/listgroup/, (msg) => {
  if (msg.from.id !== ADMIN_ID) return;
  const data = getGroups();
  bot.sendMessage(msg.chat.id, `<blockquote>👥 Groups:</blockquote>\n${data.join("\n") || "Kosong"}`, { parse_mode: "HTML" });
});

// =============================
// Admin command: bcuser (broadcast ke user Premium)
// =============================
bot.onText(/^\/bcuser$/, async (msg) => { // NEW
  if (msg.from.id !== ADMIN_ID) return;
  if (!msg.reply_to_message) return bot.sendMessage(msg.chat.id, "⚠️ Reply pesan untuk /bcuser");

  const data = JSON.parse(fs.readFileSync(premiumDB));
  if (data.length === 0) return bot.sendMessage(msg.chat.id, "📭 Tidak ada user premium terdaftar.");

  let success = 0, failed = 0;
  for (const userId of data) {
    try {
      await bot.forwardMessage(userId, msg.chat.id, msg.reply_to_message.message_id);
      success++;
    } catch {
      failed++;
    }
    await new Promise(r => setTimeout(r, 200)); // beri jeda kecil biar aman
  }

  bot.sendMessage(msg.chat.id, `<blockquote>📢 Broadcast selesai</blockquote>
<blockquote>✅ Berhasil: ${success}</blockquote>
<blockquote>❌ Gagal: ${failed}</blockquote>
<blockquote>👤 Total: ${data.length}</blockquote>`, { parse_mode: "HTML" });
});

// =============================
// Fitur /tourl (Admin Utama & Premium Only)
// =============================
bot.onText(/^\/tourl$/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  // ✅ hanya Admin Utama & Premium
  if (!(userId === ADMIN_ID || isPremium(userId))) {
    return bot.sendMessage(chatId, `<blockquote>❌ Hanya Admin Utama & Premium yang bisa menggunakan perintah ini.</blockquote>`, { parse_mode: "HTML" });
  }

  // Harus reply
  if (!msg.reply_to_message) {
    return bot.sendMessage(chatId, `<blockquote>⚠️ Harus reply foto/video!</blockquote>`, { parse_mode: "HTML" });
  }

  try {
    const reply = msg.reply_to_message;
    let fileId, filename;

    if (reply.photo) {
      fileId = reply.photo[reply.photo.length - 1].file_id;
      filename = "file.jpg";
    } else if (reply.video) {
      fileId = reply.video.file_id;
      filename = "file.mp4";
    } else if (reply.document) {
      fileId = reply.document.file_id;
      filename = reply.document.file_name || "file.bin";
    } else {
      return bot.sendMessage(chatId, `<blockquote>❌ Harus reply foto atau video!</blockquote>`, { parse_mode: "HTML" });
    }

    // Ambil file dari Telegram
    const file = await bot.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`;
    const buffer = await (await fetch(fileUrl)).buffer();

    // Upload ke Catbox
    const form = new FormData();
    form.append("reqtype", "fileupload");
    form.append("fileToUpload", buffer, { filename });

    const { data } = await axios.post("https://catbox.moe/user/api.php", form, {
      headers: form.getHeaders(),
      maxBodyLength: Infinity,
    });

    if (typeof data === "string" && data.startsWith("https://")) {
      await bot.sendMessage(chatId, `<blockquote>🔗 URL: ${data}</blockquote>`, {
        parse_mode: "HTML",
        reply_to_message_id: msg.message_id,
      });
    } else {
      throw new Error("Upload gagal, respons tidak valid dari Catbox.");
    }
  } catch (err) {
    console.error("Tourl Error:", err.message);
    bot.sendMessage(chatId, `<blockquote>❌ Gagal upload media.\nAlasan: ${err.message}</blockquote>`, {
      parse_mode: "HTML",
      reply_to_message_id: msg.message_id,
    });
  }
});

// =============================
// Admin command: sharech (broadcast ke channel)
// =============================
bot.onText(/^\/sharech$/, async (msg) => { // NEW
  if (msg.from.id !== ADMIN_ID) return;
  if (!msg.reply_to_message) return bot.sendMessage(msg.chat.id, "⚠️ Reply pesan untuk /sharech");

  const CHANNELS = getChannels();
  if (CHANNELS.length === 0) return bot.sendMessage(msg.chat.id, "📭 Tidak ada channel tersimpan.");

  let success = 0, failed = 0;
  let progressMsg = await bot.sendMessage(msg.chat.id, `<blockquote>📤 Mengirim ke channel 0%\n▱▱▱▱▱▱▱▱▱▱</blockquote>`, { parse_mode: "HTML" });

  for (let i = 0; i < CHANNELS.length; i++) {
    try {
      await bot.forwardMessage(CHANNELS[i], msg.chat.id, msg.reply_to_message.message_id);
      success++;
    } catch {
      failed++;
    }

    const percent = Math.round(((i + 1) / CHANNELS.length) * 100);
    if (percent % 5 === 0 || percent === 100) {
      const filled = Math.round(percent / 10);
      const bar = "▰".repeat(filled) + "▱".repeat(10 - filled);
      await bot.editMessageText(`<blockquote>📤 Mengirim ke channel ${percent}%\n${bar}</blockquote>`, {
        chat_id: msg.chat.id,
        message_id: progressMsg.message_id,
        parse_mode: "HTML"
      }).catch(() => {});
      await new Promise(r => setTimeout(r, 300));
    }
  }

  await bot.deleteMessage(msg.chat.id, progressMsg.message_id).catch(() => {});
  bot.sendMessage(msg.chat.id, `<blockquote>✅ Berhasil: ${success}</blockquote>
<blockquote>❌ Gagal: ${failed}</blockquote>
<blockquote>📊 Total: ${CHANNELS.length}</blockquote>`, { parse_mode: "HTML" });
});

// =============================
// Admin command: add/list/del utang
// =============================
// /addutang <teks>
bot.onText(/^\/addutang (.+)/, (msg, match) => {
  if (msg.from.id !== ADMIN_ID) return;
  const text = match[1].trim();
  if (!text) return bot.sendMessage(msg.chat.id, "<blockquote>⚠️ Teks utang tidak boleh kosong</blockquote>", { parse_mode: "HTML" });

  const data = getUtang();
  data.push(text);
  saveUtang(data);

  bot.sendMessage(msg.chat.id, `<blockquote>✅ Utang berhasil ditambahkan</blockquote>\n<blockquote>${text}</blockquote>`, { parse_mode: "HTML" });
});

// /listutang
bot.onText(/^\/listutang$/, (msg) => {
  if (msg.from.id !== ADMIN_ID) return;
  const data = getUtang();
  if (data.length === 0) return bot.sendMessage(msg.chat.id, "<blockquote>📭 Tidak ada utang tersimpan</blockquote>", { parse_mode: "HTML" });

  let listText = "<blockquote>📑 DAFTAR UTANG</blockquote>\n";
  data.forEach((utang, i) => {
    listText += `<blockquote>${i + 1}. ${utang}</blockquote>\n`;
  });

  bot.sendMessage(msg.chat.id, listText.trim(), { parse_mode: "HTML" });
});

// /delutang <nomor>
bot.onText(/^\/delutang (\d+)$/, (msg, match) => {
  if (msg.from.id !== ADMIN_ID) return;
  const index = parseInt(match[1]) - 1;
  let data = getUtang();

  if (index < 0 || index >= data.length) {
    return bot.sendMessage(msg.chat.id, "<blockquote>❌ Nomor utang tidak valid</blockquote>", { parse_mode: "HTML" });
  }

  const removed = data.splice(index, 1);
  saveUtang(data);

  bot.sendMessage(msg.chat.id, `<blockquote>🗑 Utang berhasil dihapus:</blockquote>\n<blockquote>${removed[0]}</blockquote>`, { parse_mode: "HTML" });
});

// =============================
// Admin command: add/del pay + fitur /pay
// =============================
// /addpay namapay,nomer,atasnama
bot.onText(/^\/addpay (.+)/, (msg, match) => {
  if (msg.from.id !== ADMIN_ID) return;
  const input = match[1].split(",");
  if (input.length < 3) {
    return bot.sendMessage(
      msg.chat.id,
      "<blockquote>⚠️ Format salah.\nContoh: /addpay DANA,08123456789,Budi</blockquote>",
      { parse_mode: "HTML" }
    );
  }

  const [nama, nomor, atasnama] = input.map(x => x.trim());
  const data = getPay();

  data.push({ nama, nomor, atasnama });
  savePay(data);

  bot.sendMessage(
    msg.chat.id,
    `<blockquote>✅ Payment berhasil ditambahkan</blockquote>
<blockquote>💳 ${nama} : ${nomor}</blockquote>
<blockquote>👤 ATAS NAMA : ${atasnama}</blockquote>`,
    { parse_mode: "HTML" }
  );
});

// /delpay namapay
bot.onText(/^\/delpay (.+)/, (msg, match) => {
  if (msg.from.id !== ADMIN_ID) return;
  const nama = match[1].trim().toLowerCase();
  let data = getPay();

  const index = data.findIndex(x => x.nama.toLowerCase() === nama);
  if (index === -1) {
    return bot.sendMessage(
      msg.chat.id,
      `<blockquote>❌ Payment dengan nama "${nama}" tidak ditemukan</blockquote>`,
      { parse_mode: "HTML" }
    );
  }

  const removed = data.splice(index, 1);
  savePay(data);

  bot.sendMessage(
    msg.chat.id,
    `<blockquote>🗑 Payment berhasil dihapus:</blockquote>
<blockquote>💳 ${removed[0].nama} : ${removed[0].nomor}</blockquote>
<blockquote>👤 ATAS NAMA : ${removed[0].atasnama}</blockquote>`,
    { parse_mode: "HTML" }
  );
});

// /pay
bot.onText(/^\/pay$/, (msg) => {
  const chatId = msg.chat.id;
  const data = getPay();
  if (data.length === 0) {
    return bot.sendMessage(
      chatId,
      "<blockquote>📭 Belum ada data payment tersimpan</blockquote>",
      { parse_mode: "HTML" }
    );
  }

  let text = "<blockquote>💰 DETAIL PAYMENT</blockquote>\n\n";
  data.forEach((p) => {
    text += `<blockquote>💳 ${p.nama} : ${p.nomor}</blockquote>\n<blockquote>👤 ATAS NAMA : ${p.atasnama}</blockquote>\n\n`;
  });
  text += "<blockquote>📷 QRIS SCAN DI ATAS</blockquote>";

  const buttons = [[{ text: "👤 OWNER", url: "https://t.me/RannTzyBack2" }]];

  // Kirim foto QRIS terlebih dahulu (bisa URL atau path lokal)
  const qrisPhoto = "https://files.catbox.moe/cvhg67.jpg"; // ganti dengan URL/file QRIS kamu
  bot.sendPhoto(chatId, qrisPhoto, {
    caption: text.trim(),
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: buttons }
  });
});

// =============================
// Fitur /copyweb (Admin Utama & Premium + Wajib Join Channel)
// =============================
bot.onText(/^\/copyweb (.+)$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const targetUrl = (match[1] || "").trim();

  // cek admin/premium
  if (!(userId === ADMIN_ID || isPremium(userId))) {
    return bot.sendMessage(chatId, "❌ Fitur ini hanya untuk Admin Utama & Premium.");
  }

  // cek join group
  try {
    const GROUP_ID = -1002718173393; // ganti dengan ID grup tujuan
    const member = await bot.getChatMember(GROUP_ID, userId);
    if (["left", "kicked"].includes(member.status)) {
      const buttons = [[{ text: "👥 JOIN GROUP", url: "https://t.me/aboutdewaback1" }]];
      return bot.sendMessage(
        chatId,
        "⚠️ Untuk menggunakan fitur ini kamu harus join group 👥",
        { reply_markup: { inline_keyboard: buttons } }
      );
    }
  } catch (e) {
    console.error("Error cek group:", e.message);
    return bot.sendMessage(chatId, "❌ Tidak bisa memverifikasi membership group.");
  }

  // validasi URL
  if (!/^https?:\/\//i.test(targetUrl)) {
    return bot.sendMessage(chatId, "⚠️ Contoh: /copyweb https://example.com");
  }

  await bot.sendMessage(chatId, "⏳ Sedang menyalin website...");

  const stamp = Date.now();
  const workDir = path.join(__dirname, `copyweb-${stamp}`);
  fs.mkdirSync(workDir, { recursive: true });

  function tryBeautify(content, type = "html") {
    try {
      const beautify = require("js-beautify");
      if (type === "js") return beautify.js(content, { indent_size: 2 });
      if (type === "css") return beautify.css(content, { indent_size: 2 });
      return beautify.html(content, { indent_size: 2 });
    } catch {
      return content;
    }
  }

  try {
    const res = await axios.get(targetUrl, {
      timeout: 20000,
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const type = res.headers["content-type"] || "";
    let fileName = "index.html";
    let content = res.data.toString();

    if (/text\/html/i.test(type)) {
      content = tryBeautify(content, "html");
      fileName = "index.html";
    } else if (/javascript/i.test(type)) {
      content = tryBeautify(content, "js");
      fileName = path.basename(new URL(targetUrl).pathname) || "script.js";
    } else if (/css/i.test(type)) {
      content = tryBeautify(content, "css");
      fileName = path.basename(new URL(targetUrl).pathname) || "style.css";
    } else {
      fileName = path.basename(new URL(targetUrl).pathname) || "file.txt";
    }

    const filePath = path.join(workDir, fileName);
    fs.writeFileSync(filePath, content, "utf8");

    await bot.sendDocument(chatId, filePath, {
      caption: `✅ File berhasil disalin:\n🌐 ${targetUrl}\n📄 ${fileName}`,
      parse_mode: "HTML"
    });

    fs.rmSync(workDir, { recursive: true, force: true });

  } catch (err) {
    console.error("COPYWEB ERROR:", err);
    bot.sendMessage(chatId, "❌ Gagal menyalin website.");
    try { fs.rmSync(workDir, { recursive: true, force: true }); } catch {}
  }
});

// =============================
// Admin command: add/del/list blacklist group
// =============================

// /addbl -> hanya admin utama, dipakai di grup
bot.onText(/^\/addbl$/, (msg) => {
  if (msg.from.id !== ADMIN_ID) return; // ✅ hanya admin utama
  const chatId = msg.chat.id;
  if (msg.chat.type !== "group" && msg.chat.type !== "supergroup") {
    return bot.sendMessage(chatId, "<blockquote>⚠️ Perintah ini hanya bisa digunakan di grup.</blockquote>", { parse_mode: "HTML" });
  }

  addBlacklist(chatId);
  bot.sendMessage(chatId, `<blockquote>✅ Grup "${esc(msg.chat.title || "Unknown Group")}" berhasil ditambahkan ke blacklist.</blockquote>`, { parse_mode: "HTML" });

  // Notif admin utama
  bot.sendMessage(ADMIN_ID, `<blockquote>🚫 Grup masuk blacklist</blockquote>\n<blockquote>👥 ${esc(msg.chat.title || "Unknown Group")}</blockquote>\n<blockquote>🆔 <code>${chatId}</code></blockquote>`, { parse_mode: "HTML" });
});

// /deladdbl -> hanya admin utama, dipakai di grup
bot.onText(/^\/deladdbl$/, (msg) => {
  if (msg.from.id !== ADMIN_ID) return; // ✅ hanya admin utama
  const chatId = msg.chat.id;
  if (msg.chat.type !== "group" && msg.chat.type !== "supergroup") {
    return bot.sendMessage(chatId, "<blockquote>⚠️ Perintah ini hanya bisa digunakan di grup.</blockquote>", { parse_mode: "HTML" });
  }

  let data = getBlacklist();
  if (data.includes(chatId)) {
    data = data.filter(id => id !== chatId);
    fs.writeFileSync(blacklistDB, JSON.stringify(data, null, 2));
    bot.sendMessage(chatId, `<blockquote>🗑 Grup "${esc(msg.chat.title || "Unknown Group")}" berhasil dihapus dari blacklist.</blockquote>`, { parse_mode: "HTML" });

    // Notif admin utama
    bot.sendMessage(ADMIN_ID, `<blockquote>✅ Grup dihapus dari blacklist</blockquote>\n<blockquote>👥 ${esc(msg.chat.title || "Unknown Group")}</blockquote>\n<blockquote>🆔 <code>${chatId}</code></blockquote>`, { parse_mode: "HTML" });
  } else {
    bot.sendMessage(chatId, `<blockquote>❌ Grup ini tidak ada di blacklist.</blockquote>`, { parse_mode: "HTML" });
  }
});

// /listaddbl -> hanya admin utama
bot.onText(/^\/listaddbl$/, async (msg) => {
  if (msg.from.id !== ADMIN_ID) return; // ✅ hanya admin utama
  const data = getBlacklist();
  if (data.length === 0) {
    return bot.sendMessage(msg.chat.id, "<blockquote>📭 Tidak ada grup dalam blacklist.</blockquote>", { parse_mode: "HTML" });
  }

  let listText = "<blockquote>📑 DAFTAR BLACKLIST GROUP</blockquote>\n\n";
  for (let i = 0; i < data.length; i++) {
    try {
      const chat = await bot.getChat(data[i]);
      listText += `<blockquote>${i + 1}. ${esc(chat.title || "Unknown Group")} (ID: <code>${data[i]}</code>)</blockquote>\n`;
    } catch {
      listText += `<blockquote>${i + 1}. ID: <code>${data[i]}</code> (❌ Tidak bisa ambil nama)</blockquote>\n`;
    }
  }

  listText += `\n<blockquote>📊 Total blacklist: ${data.length} grup</blockquote>`;

  bot.sendMessage(msg.chat.id, listText.trim(), { parse_mode: "HTML" });
});

// =============================
// AUTO SHARE SYSTEM
// =============================
let autoShareInterval = null;
let autoShareCooldown = 60000; // default 1 menit
let autoShareMessage = null;
let autoShareRunning = false; // biar tidak tabrakan dengan /share2

// Parser fleksibel: contoh "90s", "5m", "2h", "1h30m20s"
function parseDuration(str) {
  const regex = /(\d+)([smh])/g;
  let total = 0;
  let match;
  while ((match = regex.exec(str)) !== null) {
    const value = parseInt(match[1]);
    const unit = match[2];
    if (unit === "s") total += value * 1000;
    if (unit === "m") total += value * 60 * 1000;
    if (unit === "h") total += value * 60 * 60 * 1000;
  }
  return total > 0 ? total : null;
}

// Format ms jadi string (contoh: 1h30m20s)
function formatDuration(ms) {
  let sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  sec %= 3600;
  const m = Math.floor(sec / 60);
  sec %= 60;
  let parts = [];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (sec) parts.push(`${sec}s`);
  return parts.length ? parts.join(" ") : "0s";
}

// Fungsi forward cepat ke semua grup
async function forwardToAllGroups(message, fromChatId) {
  const GROUPS = getGroups();
  for (const gid of GROUPS) {
    if (isBlacklisted(gid)) continue;
    try {
      await bot.forwardMessage(gid, fromChatId, message.message_id);
    } catch {}
  }
}

// /autoshare
bot.onText(/^\/autoshare$/, async (msg) => {
  if (msg.from.id !== ADMIN_ID) return;
  if (!msg.reply_to_message) return bot.sendMessage(msg.chat.id, "<blockquote>⚠️ Harus reply pesan untuk /autoshare</blockquote>", { parse_mode: "HTML" });

  if (autoShareInterval) {
    return bot.sendMessage(msg.chat.id, "<blockquote>⚠️ AutoShare sudah aktif.\nGunakan /stopauto untuk menghentikan.</blockquote>", { parse_mode: "HTML" });
  }

  autoShareMessage = msg.reply_to_message;

  const cycle = async () => {
    if (autoShareRunning) return; // skip kalau ada cycle yang masih jalan
    autoShareRunning = true;
    await forwardToAllGroups(autoShareMessage, msg.chat.id);
    autoShareRunning = false;
  };

  // jalankan pertama kali langsung
  await cycle();

  // jalankan berulang sesuai cooldown
  autoShareInterval = setInterval(cycle, autoShareCooldown);

  bot.sendMessage(msg.chat.id, `<blockquote>✅ AutoShare dimulai</blockquote>\n<blockquote>⏳ Cooldown antar cycle: ${formatDuration(autoShareCooldown)}</blockquote>`, { parse_mode: "HTML" });
});

// /stopauto
bot.onText(/^\/stopauto$/, (msg) => {
  if (msg.from.id !== ADMIN_ID) return;
  if (!autoShareInterval) return bot.sendMessage(msg.chat.id, "<blockquote>⚠️ AutoShare belum aktif.</blockquote>", { parse_mode: "HTML" });

  clearInterval(autoShareInterval);
  autoShareInterval = null;
  autoShareMessage = null;
  autoShareRunning = false;

  bot.sendMessage(msg.chat.id, "<blockquote>🛑 AutoShare dihentikan.</blockquote>", { parse_mode: "HTML" });
});

// /setcd <durasi>
bot.onText(/^\/setcd (.+)$/, (msg, match) => {
  if (msg.from.id !== ADMIN_ID) return;
  const input = match[1].trim();
  const ms = parseDuration(input);
  if (!ms) return bot.sendMessage(msg.chat.id, "<blockquote>⚠️ Format salah.</blockquote>\n<blockquote>Contoh: 30s, 5m, 2h, 1h30m20s</blockquote>", { parse_mode: "HTML" });
  autoShareCooldown = ms;

  if (autoShareInterval) {
    clearInterval(autoShareInterval);
    autoShareInterval = setInterval(async () => {
      if (autoShareRunning) return;
      autoShareRunning = true;
      await forwardToAllGroups(autoShareMessage, msg.chat.id);
      autoShareRunning = false;
    }, autoShareCooldown);
  }

  bot.sendMessage(msg.chat.id, `<blockquote>✅ Cooldown AutoShare diatur ke ${formatDuration(ms)}</blockquote>`, { parse_mode: "HTML" });
});

// /listcd
bot.onText(/^\/listcd$/, (msg) => {
  if (msg.from.id !== ADMIN_ID) return;
  bot.sendMessage(
    msg.chat.id,
    `<blockquote>⏳ Cooldown AutoShare sekarang: ${formatDuration(autoShareCooldown)}</blockquote>\n\n` +
    `<blockquote>Cara pakai:</blockquote>\n` +
    `<blockquote>/setcd 30s → 30 detik</blockquote>\n` +
    `<blockquote>/setcd 5m → 5 menit</blockquote>\n` +
    `<blockquote>/setcd 2h → 2 jam</blockquote>\n` +
    `<blockquote>/setcd 1h30m → 1 jam 30 menit</blockquote>\n` +
    `<blockquote>/setcd 1h30m20s → 1 jam 30 menit 20 detik</blockquote>`,
    { parse_mode: "HTML" }
  );
});

// =============================
// Fitur /backup (Admin Utama saja)
// =============================
bot.onText(/^\/backup$/, async (msg) => {
  if (msg.from.id !== ADMIN_ID) return; // hanya admin utama

  try {
    if (!fs.existsSync(groupsDB)) {
      return bot.sendMessage(msg.chat.id, "<blockquote>❌ File groups.json tidak ditemukan</blockquote>", { parse_mode: "HTML" });
    }

    await bot.sendDocument(ADMIN_ID, groupsDB, {
      caption: "<blockquote>📦 Backup file groups.json berhasil dikirim</blockquote>",
      parse_mode: "HTML"
    });
  } catch (err) {
    console.error("Backup Error:", err);
    bot.sendMessage(msg.chat.id, "<blockquote>❌ Gagal membuat backup groups.json</blockquote>", { parse_mode: "HTML" });
  }
});

// =============================
// Anti Link + Deteksi Custom (Per Grup)
// =============================
// /antilink on/off (hanya Admin Utama, di grup)
bot.onText(/^\/antilink (on|off)$/, (msg, match) => {
  if (msg.from.id !== ADMIN_ID) return;
  if (!["group", "supergroup"].includes(msg.chat.type)) {
    return bot.sendMessage(msg.chat.id, "<blockquote>⚠️ Perintah ini hanya bisa dipakai di grup.</blockquote>", { parse_mode: "HTML" });
  }
  const status = match[1] === "on";
  setAntilink(msg.chat.id, status);
  bot.sendMessage(
    msg.chat.id,
    `<blockquote>✅ Antilink untuk grup ini sekarang ${status ? "AKTIF" : "NONAKTIF"}</blockquote>`,
    { parse_mode: "HTML" }
  );
});

// /deteksi <teks/link>
bot.onText(/^\/deteksi (.+)/, (msg, match) => {
  if (msg.from.id !== ADMIN_ID) return;
  if (!["group", "supergroup"].includes(msg.chat.type)) {
    return bot.sendMessage(msg.chat.id, "<blockquote>⚠️ Perintah ini hanya bisa dipakai di grup.</blockquote>", { parse_mode: "HTML" });
  }
  const keyword = match[1].trim();
  if (!keyword) return bot.sendMessage(msg.chat.id, "<blockquote>⚠️ Harus isi teks/link!</blockquote>", { parse_mode: "HTML" });

  addDeteksi(msg.chat.id, keyword);
  bot.sendMessage(
    msg.chat.id,
    `<blockquote>✅ Kata/Link "${keyword}" ditambahkan ke daftar deteksi grup ini.</blockquote>`,
    { parse_mode: "HTML" }
  );
});

// /hapusdt <teks/link>
bot.onText(/^\/hapusdt (.+)/, (msg, match) => {
  if (msg.from.id !== ADMIN_ID) return;
  if (!["group", "supergroup"].includes(msg.chat.type)) {
    return bot.sendMessage(msg.chat.id, "<blockquote>⚠️ Perintah ini hanya bisa dipakai di grup.</blockquote>", { parse_mode: "HTML" });
  }
  const keyword = match[1].trim();
  removeDeteksi(msg.chat.id, keyword);
  bot.sendMessage(
    msg.chat.id,
    `<blockquote>🗑 Kata/Link "${keyword}" dihapus dari daftar deteksi grup ini.</blockquote>`,
    { parse_mode: "HTML" }
  );
});

// /listdt
bot.onText(/^\/listdt$/, (msg) => {
  if (msg.from.id !== ADMIN_ID) return;
  if (!["group", "supergroup"].includes(msg.chat.type)) {
    return bot.sendMessage(msg.chat.id, "<blockquote>⚠️ Perintah ini hanya bisa dipakai di grup.</blockquote>", { parse_mode: "HTML" });
  }
  const data = getDeteksi(msg.chat.id);
  if (data.length === 0) {
    return bot.sendMessage(msg.chat.id, "<blockquote>📭 Daftar deteksi grup ini kosong.</blockquote>", { parse_mode: "HTML" });
  }

  let text = "<blockquote>📑 DAFTAR DETEKSI GRUP INI:</blockquote>\n";
  data.forEach((d, i) => {
    text += `<blockquote>${i + 1}. ${d}</blockquote>\n`;
  });

  bot.sendMessage(msg.chat.id, text.trim(), { parse_mode: "HTML" });
});

// Listener hapus pesan (hanya kalau antilink aktif untuk grup itu)
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text || msg.caption || "";

  if (!["group", "supergroup"].includes(msg.chat.type)) return;

  const status = getAntilink(chatId);
  if (!status) return; // antilink off → tidak ada aksi

  // cek daftar deteksi grup ini
  const deteksiList = getDeteksi(chatId);
  for (const keyword of deteksiList) {
    if (text.toLowerCase().includes(keyword.toLowerCase())) {
      try {
        await bot.deleteMessage(chatId, msg.message_id);
        console.log(`🚫 Pesan dengan keyword "${keyword}" dihapus di grup ${chatId}`);
        return;
      } catch (e) {
        console.error("Gagal hapus pesan deteksi:", e.message);
      }
    }
  }

  // cek regex link standar
  const urlRegex = /(https?:\/\/[^\s]+|t\.me\/[^\s]+|www\.[^\s]+)/gi;
  if (urlRegex.test(text)) {
    try {
      await bot.deleteMessage(chatId, msg.message_id);
      console.log(`🚫 Link dihapus di grup ${chatId}`);
    } catch (e) {
      console.error("Gagal hapus pesan link:", e.message);
    }
  }
});

// /listantilink (hanya Admin Utama)
bot.onText(/^\/listantilink$/, async (msg) => {
  if (msg.from.id !== ADMIN_ID) return;

  const data = JSON.parse(fs.readFileSync(antilinkDB));
  const groupIds = Object.keys(data);
  if (groupIds.length === 0) {
    return bot.sendMessage(msg.chat.id, "<blockquote>📭 Tidak ada data antilink tersimpan.</blockquote>", { parse_mode: "HTML" });
  }

  let listText = "<blockquote>📑 STATUS ANTILINK PER GRUP</blockquote>\n\n";
  for (let i = 0; i < groupIds.length; i++) {
    const gid = groupIds[i];
    const status = data[gid] ? "✅ ON" : "❌ OFF";
    try {
      const chat = await bot.getChat(gid);
      listText += `<blockquote>${i + 1}. ${chat.title || "Unknown Group"} (ID: <code>${gid}</code>) → ${status}</blockquote>\n`;
    } catch {
      listText += `<blockquote>${i + 1}. ID: <code>${gid}</code> → ${status} (❌ Tidak bisa ambil nama)</blockquote>\n`;
    }
  }

  bot.sendMessage(msg.chat.id, listText.trim(), { parse_mode: "HTML" });
});

// =============================
// Fitur /createweb dengan Referral + Vercel
// =============================
bot.onText(/^\/(createweb|cweb) (.+)$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!(userId === ADMIN_ID || isPremium(userId))) {
    return bot.sendMessage(chatId, "❌ Hanya Admin Utama & Premium.");
  }

  // wajib join group
  try {
    const GROUP_ID = -1002718173393; // ganti dengan ID grup tujuan
    const member = await bot.getChatMember(GROUP_ID, userId);
    if (["left", "kicked"].includes(member.status)) {
      return bot.sendMessage(chatId, "⚠️ Wajib join group untuk gunakan fitur ini.", {
        reply_markup: { inline_keyboard: [[{ text: "👥 JOIN GROUP", url: "https://t.me/aboutdewaback1" }]] }
      });
    }
  } catch {
    return bot.sendMessage(chatId, "❌ Tidak bisa memverifikasi membership group.");
  }

  // cek referral
  const ref = getReferral(userId);
  if (userId !== ADMIN_ID) {
    if (!ref) {
      const refLink = `https://t.me/${(await bot.getMe()).username}?start=ref${userId}`;
      addReferral(userId, refLink);
      return bot.sendMessage(chatId, `⚠️ Kamu hanya bisa pakai fitur ini 1x.\n\n🔗 Bagikan link referral:\n${refLink}\n\nSetelah 5 orang klik, kamu bisa gunakan lagi.`);
    } else if (ref.clicks.length < 5) {
      return bot.sendMessage(chatId, `⚠️ Belum cukup referral.\n\n🔗 Link: ${ref.refLink}\n👥 Klik: ${ref.clicks.length}/5`);
    }
  }

  const webName = match[2].trim().toLowerCase().replace(/[^a-z0-9-_]/g, "");
  if (!webName || webName.length < 3) {
    return bot.sendMessage(chatId, "⚠️ Nama web minimal 3 karakter.\nGunakan: `/createweb namaweb`", { parse_mode: "Markdown" });
  }

  if (!msg.reply_to_message || !msg.reply_to_message.document) {
    return bot.sendMessage(chatId, "⚠️ Reply file `.html`!");
  }

  const fileName = msg.reply_to_message.document.file_name || "";
  if (!fileName.endsWith(".html")) {
    return bot.sendMessage(chatId, "❌ File harus `.html`");
  }

  try {
    const file = await bot.getFile(msg.reply_to_message.document.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`;
    const res = await fetch(fileUrl);
    const buffer = await res.buffer();
    const htmlContent = buffer.toString("utf-8");

    const headers = {
      Authorization: `Bearer ${vercelToken}`,
      "Content-Type": "application/json"
    };

    await fetch("https://api.vercel.com/v9/projects", {
      method: "POST",
      headers,
      body: JSON.stringify({ name: webName })
    }).catch(() => {});

    const deploy = await fetch("https://api.vercel.com/v13/deployments", {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: webName,
        project: webName,
        files: [
          { file: "index.html", data: Buffer.from(htmlContent).toString("base64"), encoding: "base64" }
        ],
        projectSettings: { framework: null }
      })
    });

    const json = await deploy.json();
    if (!json || !json.url) return bot.sendMessage(chatId, "❌ Gagal deploy ke Vercel.");

    bot.sendMessage(chatId, `✅ Website berhasil dibuat!\n🌐 https://${webName}.vercel.app`);
  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, "⚠️ Error saat membuat website.");
  }
});

// =============================
// Command /cekwiter
// =============================
bot.onText(/^\/cekwiter$/, async (msg) => {
  const userId = msg.from.id;
  const chatId = msg.chat.id;
  const ref = getReferral(userId);
  if (!ref) return bot.sendMessage(chatId, "❌ Kamu belum punya referral link.");
  bot.sendMessage(chatId, `🔗 Referral link kamu:\n${ref.refLink}\n👥 Klik: ${ref.clicks.length}/5`);
});

// =============================
// Handler start referral
// =============================
bot.onText(/^\/start ref(\d+)$/, async (msg, match) => {
  const refUserId = parseInt(match[1]);
  const clickerId = msg.from.id;
  if (refUserId !== clickerId) {
    addReferralClick(refUserId, clickerId);
    bot.sendMessage(clickerId, "✅ Kamu berhasil mendukung referral!");
    bot.sendMessage(refUserId, `👤 Referral baru!\nSekarang total klik: ${getReferral(refUserId).clicks.length}/5`);
  }
});

// =============================
// Fitur /ai (Admin Utama & Premium Only)
// =============================
bot.onText(/^\/ai (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const question = match[1].trim();

  if (!(userId === ADMIN_ID || isPremium(userId))) {
    return bot.sendMessage(chatId, "❌ Fitur ini hanya bisa digunakan oleh Admin Utama & Premium.");
  }

  if (!question) {
    return bot.sendMessage(chatId, "⚠️ Contoh: /ai siapa presiden indonesia sekarang?");
  }

  await bot.sendMessage(chatId, "⏳ Sedang berpikir...");

  try {
    const result = await model.generateContent(question);
    const answer = result.response.text();
    bot.sendMessage(chatId, `🤖 AI: ${answer}`);
  } catch (err) {
    console.error("Gemini Error:", err.message);
    bot.sendMessage(chatId, "⚠️ Terjadi kesalahan saat menghubungi AI.");
  }
});

// =============================
// Fitur /statusbot (Admin Utama saja)
// =============================
bot.onText(/^\/statusbot$/, async (msg) => {
  if (msg.from.id !== ADMIN_ID) return; // hanya admin utama
  const chatId = msg.chat.id;

  try {
    const users = JSON.parse(fs.readFileSync(premiumDB)).length;
    const groups = getGroups().length;

    const buttons = [[{ text: "BOT JASEB", url: "https://t.me/JasebFreexVipBot" }]];

    const logoUrl = "https://files.catbox.moe/dxwjvv.jpg"; // ganti sesuai logo bot
    await bot.sendPhoto(chatId, logoUrl, {
      caption: `<blockquote>DETAIL INFORMASI BOT</blockquote>\n` +
               `<blockquote>👤 USER : ${users}</blockquote>\n` +
               `<blockquote>📦 GROUP : ${groups}</blockquote>`,
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: buttons }
    });
  } catch (err) {
    console.error("StatusBot Error:", err.message);
    bot.sendMessage(chatId, `<blockquote>❌ Gagal menampilkan status bot.</blockquote>`, { parse_mode: "HTML" });
  }
});
