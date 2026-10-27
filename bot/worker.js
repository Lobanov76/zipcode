// Сервер бота @zipcodeai_bot на Cloudflare Workers (бесплатно).
// Telegram присылает сюда сообщения, бот отвечает приветствием и кнопкой мини-приложения.
// Секреты (BOT_TOKEN, WEBHOOK_SECRET) хранятся в Cloudflare, в код не пишутся.

const APP_URL = "https://lobanov76.github.io/zipcode/";
const CHANNEL = "https://t.me/zipcode_vibecoding";
const WELCOME_IMG = "https://raw.githubusercontent.com/Lobanov76/zipcode/main/design/covers/welcome.png";

const WELCOME = `Привет. Это zipcode — вайбкодинг с нуля.

Ты говоришь словами, ИИ пишет код. Так делаются сайты, ролики, боты — и деньги на них.

Начни с бесплатного марафона «Свой адрес в интернете»: 3 вечера по 20–30 минут — и у тебя сайт по своей ссылке.

А дальше — канал zipcode: ниши, где сейчас есть деньги, разборы сайтов и роликов, фишки Claude: t.me/zipcode_vibecoding

Жми «Открыть марафон» 👇`;

const HELP = `Что умеет бот:

/start — начать сначала
/marathon — открыть марафон
/channel — канал zipcode

Всё обучение — в приложении: кнопка «Открыть» внизу чата.`;

const appButton = (text) => ({ inline_keyboard: [[{ text, web_app: { url: APP_URL } }]] });

async function tg(env, method, body) {
  const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function onMessage(env, msg) {
  const chat_id = msg.chat.id;
  const text = (msg.text || "").trim();

  // Артём (ник из PAY_USERNAME) — владелец: бот запоминает его чат и слушает служебные команды
  if (isOwner(env, msg.from)) {
    await env.ZIP.put("owner", String(chat_id));
    const reply = await ownerCommand(env, text);
    if (reply) return tg(env, "sendMessage", { chat_id, text: reply, parse_mode: "HTML" });
  }

  if (text.startsWith("/start")) {
    return tg(env, "sendPhoto", {
      chat_id,
      photo: WELCOME_IMG,
      caption: WELCOME,
      reply_markup: appButton("Открыть марафон"),
    });
  }
  if (text.startsWith("/marathon")) {
    return tg(env, "sendMessage", { chat_id, text: "Марафон «Свой адрес в интернете» — внутри приложения:", reply_markup: appButton("Открыть марафон") });
  }
  if (text.startsWith("/channel")) {
    return tg(env, "sendMessage", { chat_id, text: `Канал zipcode: ${CHANNEL}` });
  }
  return tg(env, "sendMessage", { chat_id, text: HELP, reply_markup: appButton("Открыть zipcode") });
}

/* ---------- Учёт участников клуба ----------
   Оплата идёт в личку, в клуб Артём добавляет вручную. Бот видит вступления и выходы (chat_member),
   хранит срок подписки и каждое утро напоминает, у кого он кончается. Запись участника: m:<id>. */

const DAY = 86400000;
const esc = (s) => String(s || "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
const fmt = (ms) => new Date(ms + 5 * 3600000).toISOString().slice(0, 10).split("-").reverse().join(".");
const who = (m) => (m.username ? "@" + m.username : esc(m.name)) + ` <code>${m.id}</code>`;

function isOwner(env, from) {
  return from && from.username && env.PAY_USERNAME && from.username.toLowerCase() === env.PAY_USERNAME.toLowerCase();
}

async function notifyOwner(env, text) {
  const owner = await env.ZIP.get("owner");
  if (owner) await tg(env, "sendMessage", { chat_id: owner, text, parse_mode: "HTML" });
}

async function members(env) {
  const list = await env.ZIP.list({ prefix: "m:" });
  const all = await Promise.all(list.keys.map((k) => env.ZIP.get(k.name, "json")));
  return all.filter(Boolean).sort((a, b) => a.until - b.until);
}

async function onClubMember(env, upd) {
  if (String(upd.chat.id) !== String(env.CLUB_CHAT_ID)) return;
  const u = upd.new_chat_member.user;
  const now = upd.new_chat_member.status;
  const was = upd.old_chat_member.status;
  if (u.is_bot || ["creator", "administrator"].includes(now)) return;
  const inNow = ["member", "restricted"].includes(now);
  const inWas = ["member", "restricted", "administrator", "creator"].includes(was);
  if (inNow && !inWas) {
    const m = { id: u.id, name: [u.first_name, u.last_name].filter(Boolean).join(" "), username: u.username || "", joined: Date.now(), until: Date.now() + 30 * DAY };
    await env.ZIP.put(`m:${u.id}`, JSON.stringify(m));
    await notifyOwner(env, `Новый участник клуба: ${who(m)}\nПодписка до <b>${fmt(m.until)}</b> (1 месяц).\nКупил 3 месяца — отправь: <code>/paid ${m.username ? "@" + m.username : m.id} 2</code>`);
  } else if (!inNow && inWas) {
    await env.ZIP.delete(`m:${u.id}`);
  }
}

async function ownerCommand(env, text) {
  if (text.startsWith("/members")) {
    const list = await members(env);
    if (!list.length) return "В клубе пока нет участников с оплатой.";
    return "<b>Участники клуба</b>\n\n" + list.map((m) => {
      const left = Math.ceil((m.until - Date.now()) / DAY);
      return `${who(m)} — до ${fmt(m.until)} (${left > 0 ? `осталось ${left} дн.` : "<b>кончилась</b>"})`;
    }).join("\n");
  }
  if (text.startsWith("/paid")) {
    const [, target, n] = text.split(/\s+/);
    const months = Number(n || 1);
    if (!target || !(months > 0)) return "Формат: <code>/paid @ник 1</code> — продлить на 1 месяц от текущего срока.";
    const list = await members(env);
    const t = target.replace("@", "").toLowerCase();
    const m = list.find((x) => String(x.id) === t || x.username.toLowerCase() === t);
    if (!m) return "Не нашёл такого участника. Посмотри список: /members";
    m.until = Math.max(m.until, Date.now()) + months * 30 * DAY;
    await env.ZIP.put(`m:${m.id}`, JSON.stringify(m));
    return `Продлил ${who(m)} на ${months} мес. Теперь до <b>${fmt(m.until)}</b>.`;
  }
  if (text.startsWith("/stats")) return stats(env, 7);
  if (text.startsWith("/admin")) {
    return "<b>Команды владельца</b>\n/members — участники и сроки\n/paid @ник 1 — продлить на N месяцев\n/stats — статистика за 7 дней";
  }
  return null;
}

// Утренний отчёт: у кого кончается (≤3 дней) и у кого уже кончилась подписка
async function dailyReport(env) {
  const list = await members(env);
  const soon = list.filter((m) => m.until > Date.now() && m.until - Date.now() <= 3 * DAY);
  const over = list.filter((m) => m.until <= Date.now());
  const parts = [];
  if (soon.length) parts.push("<b>Скоро кончится — напомни о продлении:</b>\n" + soon.map((m) => `${who(m)} — до ${fmt(m.until)}`).join("\n"));
  if (over.length) parts.push("<b>Подписка кончилась — продли (/paid) или убери из клуба:</b>\n" + over.map((m) => `${who(m)} — была до ${fmt(m.until)}`).join("\n"));
  if (parts.length) await notifyOwner(env, parts.join("\n\n"));
  if (new Date().getUTCDay() === 1) await notifyOwner(env, await stats(env, 7));
}

/* ---------- Статистика воронки ----------
   Мини-приложение шлёт события без личных данных, сервер считает их по дням: c:<дата>:<событие> */

const EVENTS = { open: "Открыли приложение", lesson: "Открыли бесплатный урок", day3: "Прошли марафон до конца", buy: "Нажали «Оформить»", pay_1m: "Перешли к оплате 1 мес", pay_3m: "Перешли к оплате 3 мес", paid_tap: "Тап по платному уроку без подписки" };

async function onEvent(request, env) {
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  let body;
  try { body = await request.json(); } catch { return json({ ok: false }, 400); }
  if (!EVENTS[body.e]) return json({ ok: false }, 400);
  const key = `c:${new Date().toISOString().slice(0, 10)}:${body.e}`;
  const n = Number((await env.ZIP.get(key)) || 0) + 1;
  await env.ZIP.put(key, String(n), { expirationTtl: 120 * 86400 });
  return json({ ok: true });
}

async function stats(env, days) {
  const sum = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.now() - i * DAY).toISOString().slice(0, 10);
    for (const e of Object.keys(EVENTS)) sum[e] = (sum[e] || 0) + Number((await env.ZIP.get(`c:${d}:${e}`)) || 0);
  }
  const clubs = (await members(env)).filter((m) => m.until > Date.now()).length;
  return `<b>Статистика за ${days} дней</b>\n\n` + Object.entries(EVENTS).map(([e, name]) => `${name}: <b>${sum[e]}</b>`).join("\n") + `\n\nАктивных подписок сейчас: <b>${clubs}</b>`;
}

/* ---------- Проверка подписки ----------
   Оплатил в Tribute = состоит в закрытом канале zipcode club.
   Мини-приложение присылает initData от Telegram, сервер проверяет подпись
   и спрашивает у Telegram, есть ли человек в канале. */

const APP_ORIGIN = "https://lobanov76.github.io";
const MEMBER_STATUSES = ["creator", "administrator", "member", "restricted"];

const cors = {
  "Access-Control-Allow-Origin": APP_ORIGIN,
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};
const json = (data, status = 200) => Response.json(data, { status, headers: cors });

async function hmac(key, data) {
  const raw = typeof key === "string" ? new TextEncoder().encode(key) : key;
  const k = await crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(data)));
}
const hex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");

// Возвращает пользователя, если initData действительно выдал Telegram
async function verifyInitData(env, initData) {
  if (!initData) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");
  const check = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort().join("\n");
  const secret = await hmac("WebAppData", env.BOT_TOKEN);
  if (hex(await hmac(secret, check)) !== hash) return null;
  if (Date.now() / 1000 - Number(params.get("auth_date")) > 86400) return null;
  try { return JSON.parse(params.get("user")); } catch { return null; }
}

async function isMember(env, userId) {
  const res = await tg(env, "getChatMember", { chat_id: env.CLUB_CHAT_ID, user_id: userId });
  return Boolean(res.ok && MEMBER_STATUSES.includes(res.result.status) && res.result.is_member !== false);
}

async function onAccess(request, env) {
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  let body;
  try { body = await request.json(); } catch { return json({ error: "bad request" }, 400); }
  const user = await verifyInitData(env, body.initData);
  if (!user) return json({ error: "Открой приложение из бота @zipcodeai_bot" }, 401);
  return json({ member: await isMember(env, user.id) });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/access") return onAccess(request, env);
    if (url.pathname === "/api/event") return onEvent(request, env);

    // Включить приём событий о вступлении в клуб (chat_member): POST /admin/setup, поле key = ADMIN_KEY
    if (url.pathname === "/admin/setup" && request.method === "POST") {
      const form = await request.formData();
      if (!env.ADMIN_KEY || form.get("key") !== env.ADMIN_KEY) return new Response("Нет доступа", { status: 403 });
      const hook = await tg(env, "setWebhook", { url: `${url.origin}/webhook`, secret_token: env.WEBHOOK_SECRET, allowed_updates: ["message", "chat_member"] });
      return Response.json(hook);
    }

    // Ссылка на оплату: личка автора. Ник хранится в секретах (PAY_USERNAME), не в публичном коде
    if (url.pathname === "/api/pay-link") {
      if (request.method === "OPTIONS") return new Response(null, { headers: cors });
      const plan = url.searchParams.get("plan") === "3m" ? "на 3 месяца" : "на 1 месяц";
      const text = `Привет! Хочу оформить подписку zipcode club ${plan}. Как оплатить?`;
      return json({ url: `https://t.me/${env.PAY_USERNAME}?text=${encodeURIComponent(text)}` });
    }

    // Публикация уроков в zipcode club с компьютера Артёма: POST /admin/tg (multipart, поле key = ADMIN_KEY).
    // Пишет только в закрытый канал и только разрешёнными методами — тексты уроков в код не попадают
    if (url.pathname === "/admin/tg" && request.method === "POST") {
      const form = await request.formData();
      if (!env.ADMIN_KEY || form.get("key") !== env.ADMIN_KEY) return new Response("Нет доступа", { status: 403 });
      const method = form.get("method");
      if (!["sendAnimation", "sendMessage", "editMessageText", "editMessageCaption", "editMessageMedia", "setChatPhoto", "setChatDescription", "pinChatMessage"].includes(method)) return new Response("Метод запрещён", { status: 400 });
      form.delete("key");
      form.delete("method");
      // target=chat — группа обсуждения клуба (её id берём у Telegram, а не из кода)
      let chat = env.CLUB_CHAT_ID;
      if (form.get("target") === "chat") {
        const info = await tg(env, "getChat", { chat_id: env.CLUB_CHAT_ID });
        chat = info.result && info.result.linked_chat_id;
      }
      form.delete("target");
      form.set("chat_id", chat);
      const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, { method: "POST", body: form });
      return Response.json(await res.json());
    }

    // Проверка, что бот видит закрытый канал: /club?key=WEBHOOK_SECRET
    if (url.pathname === "/club") {
      if (url.searchParams.get("key") !== env.WEBHOOK_SECRET) return new Response("Нет доступа", { status: 403 });
      const id = url.searchParams.get("id") || env.CLUB_CHAT_ID;
      const chat = await tg(env, "getChat", { chat_id: id });
      const me = await tg(env, "getMe", {});
      const admin = me.ok ? await tg(env, "getChatMember", { chat_id: id, user_id: me.result.id }) : null;
      return Response.json({ chat: chat.ok ? chat.result.title : chat.description, botStatus: admin && admin.ok ? admin.result.status : admin && admin.description });
    }

    // Разовая настройка: открыть /setup?key=WEBHOOK_SECRET в браузере после деплоя
    if (url.pathname === "/setup") {
      if (url.searchParams.get("key") !== env.WEBHOOK_SECRET) return new Response("Нет доступа", { status: 403 });
      const hook = await tg(env, "setWebhook", {
        url: `${url.origin}/webhook`,
        secret_token: env.WEBHOOK_SECRET,
        allowed_updates: ["message"],
      });
      const cmds = await tg(env, "setMyCommands", {
        commands: [
          { command: "start", description: "Начать" },
          { command: "marathon", description: "Открыть марафон" },
          { command: "channel", description: "Канал zipcode" },
        ],
      });
      return Response.json({ webhook: hook.ok, commands: cmds.ok, description: hook.description });
    }

    if (url.pathname === "/webhook" && request.method === "POST") {
      // Пускаем только запросы от Telegram
      if (request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== env.WEBHOOK_SECRET) {
        return new Response("Нет доступа", { status: 403 });
      }
      const update = await request.json();
      if (update.message) await onMessage(env, update.message);
      if (update.chat_member) await onClubMember(env, update.chat_member);
      return new Response("ok");
    }

    return new Response("zipcode bot");
  },

  // Каждое утро в 9:00 по Ташкенту — отчёт о подписках, по понедельникам ещё и статистика
  async scheduled(event, env, ctx) {
    ctx.waitUntil(dailyReport(env));
  },
};
