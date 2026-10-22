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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

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
