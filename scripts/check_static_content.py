#!/usr/bin/env python3
"""Check static HTML and local asset references without running the site."""
from html.parser import HTMLParser
import json
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"


class StaticHTML(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.tags: set[str] = set()
        self.ids: list[str] = []
        self.references: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self._record(tag, attrs)

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self._record(tag, attrs)

    def _record(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.tags.add(tag.lower())
        values = dict(attrs)
        if values.get("id"):
            self.ids.append(values["id"] or "")
        for key in ("href", "src", "poster"):
            if values.get(key):
                self.references.append(values[key] or "")


def main() -> int:
    index = PUBLIC / "index.html"
    try:
        source = index.read_text(encoding="utf-8")
        parser = StaticHTML()
        parser.feed(source)
        parser.close()
    except (OSError, UnicodeError, ValueError):
        print("public/index.html must be readable UTF-8 HTML")
        return 1

    if not {"html", "head", "body"}.issubset(parser.tags):
        print("public/index.html must contain html, head, and body elements")
        return 1
    ids = set(parser.ids)
    if len(ids) != len(parser.ids):
        print("public/index.html contains duplicate id attributes")
        return 1

    for reference in parser.references:
        parsed = urlsplit(reference)
        if parsed.scheme or reference.startswith("//"):
            continue
        if parsed.fragment and not parsed.path and unquote(parsed.fragment) not in ids:
            print("public/index.html contains a broken local fragment link")
            return 1
        if not parsed.path:
            continue
        path_text = unquote(parsed.path)
        target = (PUBLIC / path_text.lstrip("/")) if path_text.startswith("/") else (index.parent / path_text)
        if target.is_dir():
            target = target / "index.html"
        try:
            target.resolve().relative_to(PUBLIC.resolve())
        except ValueError:
            print("public/index.html contains a reference outside public/")
            return 1
        if not target.exists():
            print("public/index.html contains a missing local file reference")
            return 1

    for config in (PUBLIC / "site.webmanifest", ROOT / "vercel.json"):
        try:
            data = json.loads(config.read_text(encoding="utf-8"))
        except (OSError, UnicodeError, json.JSONDecodeError):
            print(f"{config.relative_to(ROOT)} must be valid UTF-8 JSON")
            return 1
        if config.name == "site.webmanifest":
            for icon in data.get("icons", []):
                src = icon.get("src")
                if isinstance(src, str) and src:
                    target = (PUBLIC / unquote(src.lstrip("/"))).resolve()
                    try:
                        target.relative_to(PUBLIC.resolve())
                    except ValueError:
                        print("public/site.webmanifest contains an icon outside public/")
                        return 1
                    if not target.exists():
                        print("public/site.webmanifest contains a missing local icon")
                        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
