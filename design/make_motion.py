"""Записывает анимированные шапки zipcode в MP4 (Telegram показывает их как гифку).

Запуск: python design/make_motion.py            — все шапки
        python design/make_motion.py lesson-51  — только нужные
Ролики появятся в design/covers/*.mp4.
"""
import pathlib
import shutil
import subprocess
import sys
import tempfile
import urllib.parse

from playwright.sync_api import sync_playwright

from make_covers import COVERS, HERE, OUT

FPS = 30
DUR = 6  # секунд, как DUR в cover.html


def record(page, name, params):
    url = (HERE / "cover.html").as_uri() + "?" + urllib.parse.urlencode({**params, "anim": 1})
    page.goto(url)
    page.evaluate("document.fonts.ready")
    page.wait_for_timeout(500)
    tmp = pathlib.Path(tempfile.mkdtemp())
    for i in range(FPS * DUR):
        page.evaluate(f"seek({i / FPS})")
        page.screenshot(path=str(tmp / f"{i:04d}.png"))
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", str(tmp / "%04d.png"),
         "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-preset", "slow",
         "-movflags", "+faststart", "-an", str(OUT / f"{name}.mp4")],
        check=True,
    )
    shutil.rmtree(tmp)
    print("готово:", name)


def main():
    only = set(sys.argv[1:])
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge")
        page = browser.new_page(viewport={"width": 1280, "height": 720})
        for name, n, g, k, t in COVERS:
            if not only or name in only:
                record(page, name, {"n": n, "g": g, "k": k, "t": t})
        browser.close()


if __name__ == "__main__":
    main()
