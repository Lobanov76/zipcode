(() => {
  "use strict";

  const tg = window.Telegram && window.Telegram.WebApp;
  const CFG = window.ZIP_CONFIG;
  const DATA = window.ZIP_DATA;
  const app = document.getElementById("app");
  const sheet = document.getElementById("sheet");

  if (tg) {
    tg.ready();
    tg.expand();
    try {
      tg.setHeaderColor("#181818");
      tg.setBackgroundColor("#181818");
      if (tg.setBottomBarColor) tg.setBottomBarColor("#181818");
    } catch (_) {}
  }

  /* ---------- Прогресс: облако Telegram, иначе браузер ---------- */

  const KEY = "zip_progress";
  let state = { done: [], member: false };

  const store = {
    load() {
      return new Promise((resolve) => {
        const fromLocal = () => {
          try { resolve(JSON.parse(localStorage.getItem(KEY)) || null); } catch (_) { resolve(null); }
        };
        if (tg && tg.CloudStorage && tg.isVersionAtLeast && tg.isVersionAtLeast("6.9")) {
          tg.CloudStorage.getItem(KEY, (err, value) => {
            if (err || !value) return fromLocal();
            try { resolve(JSON.parse(value)); } catch (_) { fromLocal(); }
          });
        } else fromLocal();
      });
    },
    save() {
      const value = JSON.stringify(state);
      try { localStorage.setItem(KEY, value); } catch (_) {}
      if (tg && tg.CloudStorage && tg.isVersionAtLeast && tg.isVersionAtLeast("6.9")) {
        tg.CloudStorage.setItem(KEY, value, () => {});
      }
    },
  };

  const isDone = (id) => state.done.includes(id);
  function markDone(id) {
    if (!isDone(id)) state.done.push(id);
    store.save();
    haptic("success");
  }

  function haptic(type) {
    if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred(type);
  }

  /* ---------- Путь новичка: 6 клеток индекса ---------- */

  const free = DATA.free;
  const paid = DATA.paid;
  const byId = Object.fromEntries([...free, ...paid].map((l) => [l.id, l]));

  const route = [
    { name: "Разберись, что такое вайбкодинг", hint: "8 минут чтения", done: () => isDone("00-start"), go: () => openLesson("00-start") },
    { name: "Собери первую страницу", hint: "Вечер 1: мастерская", done: () => isDone("01-day-1"), go: () => openLesson("01-day-1") },
    { name: "Сделай сайт о себе", hint: "Вечер 2: агент берёт интервью", done: () => isDone("02-day-2"), go: () => openLesson("02-day-2") },
    { name: "Получи свой адрес в интернете", hint: "Вечер 3: ссылка и QR-код", done: () => isDone("03-day-3"), go: () => openLesson("03-day-3") },
    { name: "Открой курс участников", hint: `${CFG.price} ${CFG.period}`, done: () => state.member, go: () => setTab("access") },
    { name: "Найди первого клиента", hint: "Направление «Клиенты и деньги»", done: () => isDone("41-first-client") && isDone("42-deal"), go: () => openPaid("41-first-client") },
  ];

  const nextStop = () => route.findIndex((s) => !s.done());

  /* ---------- Мини-разметка уроков ---------- */

  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function inline(s) {
    return esc(s)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  }

  function markdown(src) {
    const out = [];
    const lines = src.split("\n");
    let i = 0;
    let codeId = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (line.startsWith("```")) {
        const buf = [];
        i++;
        while (i < lines.length && !lines[i].startsWith("```")) buf.push(lines[i++]);
        i++;
        const id = `code-${codeId++}`;
        out.push(`<div class="code"><pre id="${id}">${esc(buf.join("\n"))}</pre><button class="code__copy" data-copy="${id}">Скопировать</button></div>`);
        continue;
      }
      if (/^# /.test(line)) { out.push(`<h1>${inline(line.slice(2))}</h1>`); i++; continue; }
      if (/^## /.test(line)) { out.push(`<h2>${inline(line.slice(3))}</h2>`); i++; continue; }
      if (/^> /.test(line)) {
        const buf = [];
        while (i < lines.length && lines[i].startsWith("> ")) buf.push(lines[i++].slice(2));
        out.push(`<blockquote><p>${inline(buf.join(" "))}</p></blockquote>`);
        continue;
      }
      if (/^(- |\d+\. )/.test(line)) {
        const ordered = /^\d+\. /.test(line);
        const buf = [];
        while (i < lines.length && /^(- |\d+\. |  )/.test(lines[i])) {
          const item = lines[i++];
          if (item.startsWith("  ") && buf.length) buf[buf.length - 1] += " " + item.trim();
          else buf.push(item.replace(/^(- |\d+\. )/, ""));
        }
        const tag = ordered ? "ol" : "ul";
        out.push(`<${tag}>${buf.map((b) => `<li>${inline(b)}</li>`).join("")}</${tag}>`);
        continue;
      }
      if (!line.trim()) { i++; continue; }
      const buf = [];
      while (i < lines.length && lines[i].trim() && !/^(#|> |- |\d+\. |```)/.test(lines[i])) buf.push(lines[i++]);
      out.push(`<p>${inline(buf.join(" "))}</p>`);
    }
    return out.join("\n");
  }

  /* ---------- Иконки ---------- */

  const ICON = {
    open: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
    done: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    lock: '<svg viewBox="0 0 24 24"><path d="M7 11V8a5 5 0 0 1 10 0v3M5.5 11h13v9h-13z"/></svg>',
    back: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M15 6l-6 6 6 6"/></svg>',
  };

  /* ---------- Экраны ---------- */

  const user = tg && tg.initDataUnsafe && tg.initDataUnsafe.user;
  const firstName = user && user.first_name ? user.first_name : "";

  function top() {
    const avatar = user && user.photo_url
      ? `<img src="${esc(user.photo_url)}" alt="">`
      : esc((firstName || "z").slice(0, 1).toUpperCase());
    return `<header class="top"><span class="wordmark">zip<b>code</b></span><span class="avatar">${avatar}</span></header>`;
  }

  function homeView() {
    const next = nextStop();
    const doneCount = route.filter((s) => s.done()).length;
    const bars = route.map((s, i) => `<span class="${s.done() ? "done" : i === next ? "next" : ""}"></span>`).join("");

    const title = doneCount === 0
      ? "Свой адрес в интернете"
      : doneCount === route.length ? "Путь пройден. Дальше — заказы" : "Продолжаем маршрут";

    const cta = next === -1
      ? `<button class="btn btn--red" data-tab-go="course">Открыть курс</button>`
      : `<button class="btn btn--red" data-route="${next}">${next === 0 ? "Начать с первого шага" : "Продолжить: " + esc(route[next].name.toLowerCase())}</button>`;

    const stops = route.map((s, i) => {
      const cls = s.done() ? "done" : i === next ? "next" : "";
      return `<li><button class="stop ${cls}" data-route="${i}">
        <span class="stop__mark">${s.done() ? ICON.done.replace("<svg", '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"') : i + 1}</span>
        <span><span class="stop__name">${esc(s.name)}</span><span class="stop__hint">${esc(s.hint)}</span></span>
      </button></li>`;
    }).join("");

    return `${top()}
      <section class="envelope">
        <p class="envelope__hello">${firstName ? `Привет, ${esc(firstName)}` : "Привет"}</p>
        <h1 class="envelope__title">${title}</h1>
        <div class="progress" role="img" aria-label="Пройдено шагов: ${doneCount} из ${route.length}">${bars}</div>
        <p class="index__caption">Пройдено ${doneCount} из ${route.length} шагов</p>
        ${cta}
      </section>

      <section class="section">
        <h2 class="section__title">Маршрут</h2>
        <p class="section__lead">От нуля до первого заказа. Каждый шаг открывает следующий.</p>
        <ol class="route">${stops}</ol>
      </section>`;
  }

  function lessonRow(l, locked) {
    const icon = isDone(l.id) ? ICON.done : locked ? ICON.lock : ICON.open;
    return `<li><button class="lesson ${isDone(l.id) ? "done" : ""}" data-${locked ? "paid" : "lesson"}="${l.id}">
      <span><span class="lesson__name">${esc(l.title)}</span><span class="lesson__meta">${l.minutes} мин</span></span>
      <span class="lesson__state">${icon}</span>
    </button></li>`;
  }

  // Направления курса: первая цифра номера урока
  const TRACKS = [
    { id: "1", name: "Фундамент", lead: "API, MCP, скиллы и коннекторы — простыми словами и с практикой." },
    { id: "2", name: "Сайты-фильмы", lead: "Дизайн с характером, анимации, мобильная версия, фото и видео через ИИ." },
    { id: "3", name: "Контент-завод", lead: "Вирусные ролики для TikTok, Reels и Shorts через Claude: идея, сценарий, монтаж." },
    { id: "4", name: "Клиенты и деньги", lead: "Где найти первого клиента, как назвать цену, взять предоплату и сдать проект." },
    { id: "5", name: "ИИ-агенты", lead: "Боты и автоматизации, которые работают за тебя и за бизнес." },
  ];

  function courseView() {
    const start = free.filter((l) => l.id === "00-start");
    const days = free.filter((l) => l.id !== "00-start");
    const daysDone = days.filter((l) => isDone(l.id)).length;
    const paidDone = paid.filter((l) => isDone(l.id)).length;
    return `${top()}
      <section>
        <div class="group-head"><h2 class="section__title">Старт</h2><span class="count">бесплатно</span></div>
        <ul class="lessons">${start.map((l) => lessonRow(l, false)).join("")}</ul>
      </section>

      <section class="section">
        <div class="group-head"><h2 class="section__title">Марафон «Свой адрес в интернете»</h2><span class="count">${daysDone} из ${days.length}</span></div>
        <p class="section__lead">Бесплатно. 3 вечера по 40–60 минут. В конце — твой сайт по ссылке и QR-код.</p>
        <ul class="lessons">${days.map((l) => lessonRow(l, false)).join("")}</ul>
      </section>

      <section class="section">
        <div class="group-head"><h2 class="section__title">Курс участников</h2><span class="count">${paidDone} из ${paid.length}</span></div>
        <p class="section__lead">5 направлений в закрытом канале zipcode club. ${state.member ? "Нажми на урок, чтобы открыть его." : `Доступ — ${CFG.price} ${CFG.period}.`}</p>
      </section>
      ${TRACKS.map((t) => {
        const items = paid.filter((l) => l.track === t.id);
        return `<section class="section">
          <div class="group-head"><h3 class="section__title">${esc(t.name)}</h3><span class="count">${items.length ? `${items.filter((l) => isDone(l.id)).length} из ${items.length}` : "скоро"}</span></div>
          <p class="section__lead">${esc(t.lead)}</p>
          ${items.length ? `<ul class="lessons">${items.map((l) => lessonRow(l, true)).join("")}</ul>` : ""}
        </section>`;
      }).join("")}`;
  }

  function accessView() {
    const inside = [
      "5 направлений на Claude Code: фундамент, сайты-фильмы, вирусные ролики, клиенты и деньги, ИИ-агенты",
      "Готовые промпты под каждый шаг — копируешь и работаешь",
      "Закрытый чат участников и разбор твоих сайтов",
      "Новые уроки каждую неделю",
    ];
    const memberBlock = state.member
      ? `<button class="btn btn--red" data-open="members">Открыть закрытый канал</button>`
      : `<button class="btn btn--red" data-action="buy">Оформить за ${esc(CFG.price)} ${esc(CFG.period)}</button>
         <button class="btn btn--ghost" data-action="already">Проверить подписку</button>`;

    return `${top()}
      <section class="ticket">
        <p class="ticket__name">Участник zipcode</p>
        <p class="ticket__price">${esc(CFG.price)}</p>
        <p class="ticket__period">${esc(CFG.period)}</p>
        <ul>${inside.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
        ${memberBlock}
      </section>

      <section class="section">
        <h2 class="section__title">Как это работает</h2>
        <ol class="steps">
          <li>Жмёшь «Оформить» — откроется личка автора с готовым сообщением.</li>
          <li>Договариваешься об оплате: 1 месяц или сразу 3 месяца.</li>
          <li>После оплаты тебя добавляют в закрытый канал zipcode club.</li>
          <li>Уроки курса в этом приложении открываются кнопкой и ведут в канал.</li>
          <li>Подписка продлевается каждый месяц, пока она оплачена — доступ открыт.</li>
        </ol>
      </section>

      <section class="section">
        <h2 class="section__title">Как здесь учатся</h2>
        <p class="note">Здесь нет лекций ради лекций. Каждый урок заканчивается делом: страница, ссылка, отправленное клиенту сообщение. Сделал задание — у тебя на руках результат. Пропустил — его не будет, волшебной кнопки нет.</p>
      </section>

      <section class="section">
        <h2 class="section__title">Ещё</h2>
        <ul class="links">
          <li><button data-open="channel">Канал zipcode <small>новости и разборы</small></button></li>
          <li><button data-open="support">Написать в поддержку <small>в течение дня</small></button></li>
          <li><button data-action="reset">Сбросить прогресс <small>начать маршрут заново</small></button></li>
        </ul>
      </section>`;
  }

  function readerView(id) {
    const l = byId[id];
    const idx = free.findIndex((x) => x.id === id);
    const after = free[idx + 1];
    const doneBtn = isDone(id)
      ? (after ? `<button class="btn btn--red" data-lesson="${after.id}">Дальше: ${esc(after.title)}</button>` : `<button class="btn btn--red" data-tab-go="access">Открыть курс участников</button>`)
      : `<button class="btn btn--red" data-action="done" data-id="${id}">Отметить пройденным</button>`;
    return `
      <button class="reader__back" data-back>${ICON.back} Назад</button>
      <p class="reader__meta">${l.minutes} мин</p>
      <article class="prose">${markdown(l.body)}</article>
      <div class="reader__done">${doneBtn}</div>`;
  }

  /* ---------- Навигация ---------- */

  let tab = "home";
  let reading = null;

  function render() {
    document.body.classList.toggle("reading", !!reading);
    app.innerHTML = reading ? readerView(reading)
      : tab === "course" ? courseView()
      : tab === "access" ? accessView()
      : homeView();
    document.querySelectorAll(".tab").forEach((b) => {
      if (b.dataset.tab === tab) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
    if (tg && tg.BackButton) reading ? tg.BackButton.show() : tg.BackButton.hide();
  }

  // Плавный вход экрана: блоки поднимаются по очереди. Только при смене экрана, не при каждой отметке
  function enter() {
    app.classList.remove("enter");
    void app.offsetWidth;
    app.classList.add("enter");
  }

  function setTab(name) {
    reading = null;
    tab = name;
    render();
    enter();
    window.scrollTo(0, 0);
  }

  function openLesson(id) {
    reading = id;
    render();
    enter();
    window.scrollTo(0, 0);
  }

  function closeLesson() {
    reading = null;
    render();
    enter();
  }

  function openLink(url) {
    if (!url) {
      showSheet("Ссылка ещё не готова", "Мы заканчиваем настройку. Загляни чуть позже или напиши в поддержку.", []);
      return;
    }
    if (tg && /^https:\/\/t\.me\//.test(url)) tg.openTelegramLink(url);
    else if (tg) tg.openLink(url);
    else window.open(url, "_blank", "noopener");
  }

  /* ---------- Покупка ----------
     Оплата через личку автора. Ник лежит на сервере, в публичный код не попадает. */

  function buy() {
    showSheet("Оформить подписку", "Выбери срок — откроется личка автора с готовым сообщением.", [
      { label: `1 месяц — ${CFG.price}`, cls: "btn--red", run: () => openPay("1m") },
      { label: `3 месяца — ${CFG.price3}`, cls: "btn--ghost", run: () => openPay("3m") },
    ]);
  }

  async function openPay(plan) {
    try {
      const res = await fetch(`${CFG.apiUrl}/api/pay-link?plan=${plan}`);
      const data = await res.json();
      hideSheet();
      openLink(data.url);
    } catch {
      showSheet("Нет связи", "Не получилось открыть оплату. Проверь интернет и попробуй ещё раз.", []);
    }
  }

  async function openPaid(id) {
    const l = byId[id];
    // Без подписки — сразу на оплату. Перед этим перепроверяем: вдруг только что оплатил
    if (!state.member) await checkAccess();
    if (!state.member) {
      haptic("warning");
      buy();
      return;
    }
    showSheet(l.title, l.summary, [
      { label: "Открыть урок в канале", cls: "btn--red", run: () => openLink(CFG.paidPosts[id]) },
      isDone(id)
        ? { label: "Урок пройден", cls: "btn--ghost", run: hideSheet }
        : { label: "Отметить пройденным", cls: "btn--ghost", run: () => { markDone(id); hideSheet(); render(); } },
    ]);
  }

  /* ---------- Проверка подписки на сервере ----------
     Сервер проверяет подпись Telegram и смотрит, состоит ли человек в zipcode club
     (туда добавляют после оплаты). Ответ на слово не принимаем. */

  async function checkAccess() {
    if (!tg || !tg.initData || !CFG.apiUrl) return state.member;
    try {
      const res = await fetch(`${CFG.apiUrl}/api/access`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ initData: tg.initData }),
      });
      const data = await res.json();
      if (typeof data.member === "boolean" && data.member !== state.member) {
        state.member = data.member;
        store.save();
        render();
      }
    } catch (_) {}
    return state.member;
  }

  /* ---------- Нижний лист ---------- */

  let sheetActions = [];
  function showSheet(title, text, actions) {
    sheetActions = actions;
    const panel = sheet.querySelector(".sheet__panel");
    panel.innerHTML = `<h2 id="sheet-title">${esc(title)}</h2><p>${esc(text)}</p>
      ${actions.map((a, i) => `<button class="btn ${a.cls}" data-sheet="${i}">${esc(a.label)}</button>`).join("")}
      <button class="btn btn--ghost" data-close>Закрыть</button>`;
    sheet.hidden = false;
    panel.querySelector("button").focus();
  }
  function hideSheet() { sheet.hidden = true; }

  /* ---------- События ---------- */

  document.addEventListener("click", (e) => {
    const t = e.target.closest("button, [data-close]");
    if (!t) return;
    const d = t.dataset;

    if ("close" in d) return hideSheet();
    if (d.sheet !== undefined) return sheetActions[+d.sheet].run();
    if (d.tab) return setTab(d.tab);
    if (d.tabGo) return setTab(d.tabGo);
    if (d.route !== undefined) return route[+d.route].go();
    if (d.lesson) return openLesson(d.lesson);
    if (d.paid) return openPaid(d.paid);
    if ("back" in d) return closeLesson();

    if (d.copy) {
      const text = document.getElementById(d.copy).textContent;
      const ok = () => { t.textContent = "Скопировано"; t.classList.add("copied"); haptic("success"); };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(ok, () => {});
      return;
    }

    if (d.open === "members") return openLink(CFG.membersLink);
    if (d.open === "channel") return openLink(CFG.channelLink);
    if (d.open === "support") return openLink(CFG.supportLink);

    if (d.action === "buy") return buy();
    if (d.action === "done") { markDone(d.id); return render(); }
    if (d.action === "already") {
      t.textContent = "Проверяем…";
      return checkAccess().then((member) => member
        ? showSheet("Подписка активна", "Все уроки курса открыты. Выбирай урок во вкладке «Курс».", [
            { label: "Открыть курс", cls: "btn--red", run: () => { hideSheet(); setTab("course"); } },
          ])
        : showSheet("Подписка не найдена", "Если ты уже оплатил, дождись, пока тебя добавят в zipcode club, и нажми «Проверить подписку» ещё раз.", [
            { label: `Оформить за ${CFG.price} ${CFG.period}`, cls: "btn--red", run: buy },
          ])).finally(() => render());
    }
    if (d.action === "reset") {
      return showSheet("Сбросить прогресс?", "Отметки о пройденных шагах удалятся. Подписка и доступ к каналу останутся.", [
        { label: "Сбросить", cls: "btn--red", run: () => { state = { done: [], member: state.member }; store.save(); hideSheet(); setTab("home"); } },
      ]);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !sheet.hidden) hideSheet();
  });

  if (tg && tg.BackButton) tg.BackButton.onClick(() => (sheet.hidden ? closeLesson() : hideSheet()));

  store.load().then((saved) => {
    if (saved) state = { done: saved.done || [], member: !!saved.member };
    render();
    checkAccess();
    // Полоска прогресса анимируется только при первом открытии, а не на каждой перерисовке
    setTimeout(() => document.body.classList.add("booted"), 800);
  });
})();
