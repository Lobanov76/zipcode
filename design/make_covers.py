"""Рендерит картинки zipcode в PNG через Edge в фоновом режиме.

Запуск: python design/make_covers.py
Картинки появятся в design/covers/.
"""
import pathlib
import subprocess
import urllib.parse

HERE = pathlib.Path(__file__).parent
OUT = HERE / "covers"
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

COVERS = [
    # имя файла, номер в углу, слово-призрак на фоне, надпись сверху, заголовок
    ("00-start", "0", "vibe", "Старт", "Ты заказчик, ИИ — команда"),
    ("01-day-1", "1", "01", "Свой адрес в интернете, вечер 1", "Мастерская и первая страница"),
    ("02-day-2", "2", "02", "Свой адрес в интернете, вечер 2", "Сайт о тебе"),
    ("03-day-3", "3", "03", "Свой адрес в интернете, вечер 3", "Ссылка, QR-код и первые отзывы"),
    ("lesson-01", "01", "design", "Урок 1 для участников", "Дизайн с характером"),
    ("lesson-02", "02", "motion", "Урок 2 для участников", "Живой сайт: анимации"),
    ("lesson-03", "03", "375px", "Урок 3 для участников", "Телефон — главный экран"),
    ("lesson-04", "04", "claude", "Урок 4 для участников", "Настрой Claude под себя"),
    ("lesson-05", "05", "media", "Урок 5 для участников", "Фото и видео через ИИ"),
    ("lesson-06", "06", "client", "Урок 6 для участников", "Первый клиент"),
    ("lesson-07", "07", "deal", "Урок 7 для участников", "Цена, предоплата, сдача"),
    ("lesson-31", "31", "ideas", "Контент-завод", "Идеи, которые залетают"),
    ("lesson-32", "32", "hook", "Контент-завод", "Хук за 2 секунды"),
    ("lesson-33", "33", "faceless", "Контент-завод", "Видео без камеры"),
    ("lesson-34", "34", "edit", "Контент-завод", "Монтаж через Claude и цифры"),
    ("lesson-25", "25", "client", "Сайты-фильмы", "Первый клиент"),
    ("lesson-26", "26", "deal", "Сайты-фильмы", "Сделка и первые деньги"),
    ("lesson-41", "41", "agent", "ИИ-агенты", "Сотрудник, который не спит"),
    ("lesson-42", "42", "bot", "ИИ-агенты", "Telegram-бот с ИИ за вечер"),
    ("lesson-43", "43", "cron", "ИИ-агенты", "Автоматизации и как их продать"),
    ("welcome", "", "zip", "Вайбкодинг с нуля, без знания кода", "ИИ работает. Ты зарабатываешь"),
    # Посты канала
    ("post-01", "", "vibe", "Коротко", "Что такое вайбкодинг"),
    ("post-02", "", "8", "Подборка", "8 сайтов, которые можно собрать в первый месяц"),
    ("post-03", "", "agent", "Разбираемся", "Агент или чат: в чём разница"),
    ("post-04", "", "prompt", "Промпт, который можно скопировать", "Приглашение за 15 минут"),
    # Обложка подписки в Tribute
    ("tribute-cover", "", "club", "Подписка $19 в месяц", "zipcode club: курс и чат участников"),
]

AVATARS = [
    ("avatar", ""),
    ("avatar-channel", "channel"),
    ("avatar-bot", "private"),
    ("avatar-chat", "chat"),
    ("avatar-club", "club"),
]


def render(name, params, size):
    url = (HERE / "cover.html").as_uri() + "?" + urllib.parse.urlencode(params)
    shot = str((OUT / f"{name}.png").resolve())
    subprocess.run(
        [
            EDGE, "--headless=new", "--disable-gpu", "--hide-scrollbars",
            "--force-device-scale-factor=1", "--virtual-time-budget=8000",
            f"--window-size={size}", f"--screenshot={shot}", url,
        ],
        check=True, capture_output=True,
    )
    print("готово:", name)


STORIES = [
    # имя файла, слово-призрак, надпись сверху, заголовок, подпись внизу
    ("story-01", "zip", "Новый канал", "Учимся делать сайты с ИИ", "Бесплатный марафон — в @zipcodeai_bot"),
    ("story-02", "3", "Марафон", "Свой адрес в интернете за 3 вечера", "Открой бота → «Открыть»"),
    ("story-03", "8", "Новый пост", "8 сайтов на первый месяц", "Читай в канале zipcode"),
]


def main():
    OUT.mkdir(exist_ok=True)
    for name, n, g, k, t in COVERS:
        render(name, {"n": n, "g": g, "k": k, "t": t}, "1280,720")
    # Аватарки: квадрат, подпись снизу показывает, где канал, а где бот
    for name, tag in AVATARS:
        render(name, {"sq": 1, "tag": tag}, "1080,1080")
    # Вертикальные картинки для сторис
    for name, g, k, title, cta in STORIES:
        render(name, {"story": 1, "g": g, "k": k, "t": title, "cta": cta}, "1080,1920")


if __name__ == "__main__":
    main()
