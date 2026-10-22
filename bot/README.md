# Сервер бота @zipcodeai_bot — запуск за 10 минут

Бесплатно, на Cloudflare Workers. Бот будет отвечать на «Старт» приветствием с картинкой и кнопкой «Открыть марафон», и у него появится меню команд.

Все команды — в терминале, в папке `C:\Users\redmi\Projects\zipcode\bot`.

1. Зарегистрируйся на **cloudflare.com** (бесплатный тариф).
2. Войди из терминала (откроется браузер, нажми «Allow»):

```bash
npx wrangler login
```

3. Сохрани токен бота в Cloudflare. Команда спросит значение — вставь токен из @BotFather (сообщение «Use this token…»). Токен никуда больше не пиши и никому не отправляй:

```bash
npx wrangler secret put BOT_TOKEN
```

4. Придумай длинный секретный пароль (буквы и цифры, 30+ символов) и сохрани его:

```bash
npx wrangler secret put WEBHOOK_SECRET
```

5. Выложи сервер:

```bash
npx wrangler deploy
```

В конце появится адрес вида `https://zipcode-bot.ИМЯ.workers.dev`.

6. Открой в браузере (подставь адрес и пароль из шага 4):

```text
https://zipcode-bot.ИМЯ.workers.dev/setup?key=ТВОЙ_ПАРОЛЬ
```

Должно показать `"webhook":true,"commands":true`.

7. Проверь: открой @zipcodeai_bot → «Старт». Бот пришлёт приветствие с кнопкой.

Если что-то не так — открой Claude в папке zipcode и напиши «бот не отвечает», приложив, что показал шаг 6.
