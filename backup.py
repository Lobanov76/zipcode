"""Резервная копия того, что не попадает в публичный репозиторий: платные уроки, исследования,
скрипты публикации клуба, заметки проекта. Копия уходит в закрытый репозиторий Lobanov76/zipcode-private.

Запуск: python backup.py
Ключи и токены (*.local.*, .env) в копию не попадают.
"""
import datetime
import pathlib
import shutil
import subprocess

ROOT = pathlib.Path(__file__).parent
DEST = ROOT.parent / "zipcode-private"
REMOTE = "https://github.com/Lobanov76/zipcode-private.git"
WHAT = ["content/paid", "content/channel", "research", "bot/club", "CLAUDE.md", "SETUP.md"]
SKIP = shutil.ignore_patterns("*.local.*", ".env", "*.mp4", "__pycache__", "videos")


def git(*args):
    return subprocess.run(["git", *args], cwd=DEST, capture_output=True, text=True, encoding="utf-8")


def main():
    if not (DEST / ".git").exists():
        DEST.mkdir(exist_ok=True)
        git("init", "-b", "main")
        git("remote", "add", "origin", REMOTE)
    for item in WHAT:
        src, dst = ROOT / item, DEST / item
        if not src.exists():
            continue
        if src.is_dir():
            shutil.copytree(src, dst, ignore=SKIP, dirs_exist_ok=True)
        else:
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
    git("add", "-A")
    stamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    if "nothing to commit" in git("commit", "-m", f"Копия {stamp}").stdout:
        print("Изменений нет — копия актуальна")
        return
    res = git("push", "-u", "origin", "main")
    print("Копия отправлена" if res.returncode == 0 else res.stderr)


if __name__ == "__main__":
    main()
