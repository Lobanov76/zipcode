"""Собирает docs/data.js из уроков в content/.

Бесплатные уроки попадают в приложение целиком.
У платных берутся только название, описание и длительность —
сам текст живёт в закрытом канале и в публичный код не попадает.

Запуск: python build.py
"""
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).parent
FRONT = re.compile(r"^---\n(.*?)\n---\n(.*)$", re.S)


def read(path):
    text = path.read_text(encoding="utf-8").replace("\r\n", "\n")
    head, body = FRONT.match(text).groups()
    meta = dict(line.split(": ", 1) for line in head.splitlines() if ": " in line)
    return {
        "id": path.stem,
        "title": meta["title"],
        "summary": meta["summary"],
        "minutes": int(meta.get("minutes", 0)),
    }, body.strip()


def main():
    free = []
    for path in sorted((ROOT / "content/free").glob("*.md")):
        lesson, body = read(path)
        lesson["body"] = body
        free.append(lesson)

    paid = [read(path)[0] for path in sorted((ROOT / "content/paid").glob("*.md"))]

    data = {"free": free, "paid": paid}
    out = ROOT / "docs/data.js"
    out.write_text(
        "// Файл собран build.py — правь уроки в content/, а не здесь.\n"
        f"window.ZIP_DATA = {json.dumps(data, ensure_ascii=False, indent=1)};\n",
        encoding="utf-8",
    )
    print(f"docs/data.js: {len(free)} бесплатных, {len(paid)} платных (только заголовки)")


if __name__ == "__main__":
    main()
