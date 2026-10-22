// Сервер бота @zipcodeai_bot на Cloudflare Workers (бесплатно).
// Telegram присылает сюда сообщения, бот отвечает приветствием и кнопкой мини-приложения.
// Секреты (BOT_TOKEN, WEBHOOK_SECRET) хранятся в Cloudflare, в код не пишутся.

const APP_URL = "https://lobanov76.github.io/zipcode/";
const CHANNEL = "https://t.me/zipcode_vibecoding";
const WELCOME_IMG = "https://raw.githubusercontent.com/Lobanov76/zipcode/main/design/covers/welcome.png";

const WELCOME = `Привет! Это zipcode — вайбкодинг с нуля.

Здесь ты научишься делать сайты с помощью ИИ, даже если никогда не писал код.

Начни с бесплатного марафона «Свой адрес в интернете»: 3 вечера по 40–60 минут — и у тебя сайт по своей ссылке.

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

/* ---------- Проверка подписки ----------
   Оплатил в Tribute = состоит в закрытом канале zipcode club.
   Мини-приложение присылает initData от Telegram, сервер проверяет подпись
   и спрашивает у Telegram, есть ли человек в канале. */

const APP_ORIGIN = "https://lobanov76.github.io";
const MEMBER_STATUSES = ["creator", "administrator", "member", "restricted"];

const cors = {
  "Access-Control-Allow-Origin": APP_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
      return new Response("ok");
    }

    return new Response("zipcode bot");
  },
};
