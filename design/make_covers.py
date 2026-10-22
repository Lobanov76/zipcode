"""Рендерит шапки постов zipcode в PNG через Edge в фоновом режиме.

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
    # имя файла, номер в углу, надпись сверху, заголовок
    ("00-start", "0", "Старт", "Ты заказчик, ИИ — команда"),
    ("01-day-1", "1", "Свой адрес в интернете, вечер 1", "Мастерская и первая страница"),
    ("02-day-2", "2", "Свой адрес в интернете, вечер 2", "Сайт о тебе"),
    ("03-day-3", "3", "Свой адрес в интернете, вечер 3", "Ссылка, QR-код и первые отзывы"),
    ("lesson-01", "01", "Урок 1 для участников", "Дизайн с характером"),
    ("lesson-02", "02", "Урок 2 для участников", "Живой сайт: анимации"),
    ("lesson-03", "03", "Урок 3 для участников", "Телефон — главный экран"),
    ("lesson-04", "04", "Урок 4 для участников", "Настрой Claude под себя"),
    ("lesson-05", "05", "Урок 5 для участников", "Фото и видео через ИИ"),
    ("lesson-06", "06", "Урок 6 для участников", "Первый клиент"),
    ("lesson-07", "07", "Урок 7 для участников", "Цена, предоплата, сдача"),
    ("welcome", "", "Вайбкодинг с нуля", "Свой адрес в интернете за 3 вечера"),
]


def render(name, params, size):
    url = (HERE / "cover.html").as_uri() + "?" + urllib.parse.urlencode(params)
    subprocess.run(
        [
            EDGE, "--headless=new", "--disable-gpu", "--hide-scrollbars",
            "--force-device-scale-factor=1", "--virtual-time-budget=6000",
            f"--window-size={size}", f"--screenshot={OUT / (name + '.png')}", url,
        ],
        check=True, capture_output=True,
    )
    print("готово:", name)


def main():
    OUT.mkdir(exist_ok=True)
    for name, n, k, t in COVERS:
        render(name, {"n": n, "k": k, "t": t}, "1280,720")
    # Аватарка канала и бота: квадрат
    render("avatar", {"n": "", "k": "", "t": "", "sq": 1}, "1080,1080")


if __name__ == "__main__":
    main()
