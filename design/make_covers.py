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
    # Уроки клуба: имя файла, номер, слово-призрак, направление, короткий заголовок
    ("lesson-11", "1.1", "api", "ИИ на пальцах", "API за 5 минут"),
    ("lesson-12", "1.2", "mcp", "ИИ на пальцах", "MCP за 5 минут"),
    ("lesson-13", "1.3", "skills", "ИИ на пальцах", "Научи ИИ чему угодно"),
    ("lesson-14", "1.4", "inbox", "ИИ на пальцах", "ИИ разбирает твою рутину"),
    ("lesson-15", "1.5", "claude", "ИИ на пальцах", "Claude — твой сотрудник"),
    ("lesson-21", "2.1", "design", "Сайты", "Сайт, который не выдаёт ИИ"),
    ("lesson-22", "2.2", "motion", "Сайты", "Сайт оживает при прокрутке"),
    ("lesson-23", "2.3", "375px", "Сайты", "«Вау» с телефона"),
    ("lesson-24", "2.4", "media", "Сайты", "Фото и видео, которых нет"),
    ("lesson-25", "2.5", "client", "Сайты", "Первый клиент"),
    ("lesson-26", "2.6", "deal", "Сайты", "Твои первые деньги"),
    ("lesson-31", "3.1", "ideas", "Контент-завод", "Идеи, которые уже залетели"),
    ("lesson-32", "3.2", "hook", "Контент-завод", "Хук за 2 секунды"),
    ("lesson-33", "3.3", "faceless", "Контент-завод", "Ролики без камеры"),
    ("lesson-34", "3.4", "edit", "Контент-завод", "Claude монтирует, пока ты спишь"),
    ("lesson-41", "4.1", "agent", "ИИ-агенты", "ИИ-сотрудник без зарплаты"),
    ("lesson-42", "4.2", "bot", "ИИ-агенты", "Бот с ИИ за вечер"),
    ("lesson-43", "4.3", "cron", "ИИ-агенты", "Деньги каждый месяц"),
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
