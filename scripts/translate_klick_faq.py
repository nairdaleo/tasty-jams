#!/usr/bin/env python3
"""
One-off: translate the newly-added klick.faq and klick.contactForm blocks
from en.json into every other locale, preserving all existing keys.

Mirrors the localize-strings skill's DeepL conventions:
  - Authorization header (not query param)
  - formality=prefer_less (skipped for languages that reject it)
  - Brand names ("Klick", "Tasty Jam", emails) preserved verbatim
"""

import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

API_KEY = "93d18a72-a06f-4521-a3a2-5aad7ca79ce3:fx"
LOCALES_DIR = Path(__file__).resolve().parent.parent / "locales"
NEW_KEY_PATHS = [("klick", "faq"), ("klick", "contactForm")]

# locale code in /locales/<x>.json  ->  DeepL target_lang
LOCALES = {
    "fr": "FR",
    "es": "ES",
    "de": "DE",
    "ja": "JA",
    "pt": "PT-PT",
    "ko": "KO",
}

# DeepL rejects formality for these languages (HTTP 400)
NO_FORMALITY = {"KO", "ZH", "AR", "TR", "ID", "JA"}

# Strings that must NOT be translated — restored verbatim after DeepL pass
PRESERVE_LITERALS = ["Klick", "Tasty Jam", "support@tastyjam.ca", "Apple ID", "iCloud", "Apple Watch", "Family Sharing"]


def deepl_translate(text: str, target_lang: str) -> str:
    params = {"text": text, "source_lang": "EN", "target_lang": target_lang}
    if target_lang.upper() not in NO_FORMALITY:
        params["formality"] = "prefer_less"
    data = urllib.parse.urlencode(params).encode()
    req = urllib.request.Request(
        "https://api-free.deepl.com/v2/translate",
        data=data,
        headers={"Authorization": f"DeepL-Auth-Key {API_KEY}"},
    )
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read())["translations"][0]["text"]


def restore_literals(text: str) -> str:
    """DeepL sometimes alters brand-name casing. Force-restore."""
    for literal in PRESERVE_LITERALS:
        # case-insensitive replace -> canonical form
        lower = text.lower()
        idx = 0
        while True:
            pos = lower.find(literal.lower(), idx)
            if pos < 0:
                break
            text = text[:pos] + literal + text[pos + len(literal):]
            lower = text.lower()
            idx = pos + len(literal)
    return text


def translate_block(block, target_lang: str):
    """Recursively translate every string in a nested dict/list."""
    if isinstance(block, dict):
        return {k: translate_block(v, target_lang) for k, v in block.items()}
    if isinstance(block, list):
        return [translate_block(v, target_lang) for v in block]
    if isinstance(block, str):
        if not block.strip():
            return block
        translated = deepl_translate(block, target_lang)
        translated = restore_literals(translated)
        time.sleep(0.15)  # gentle rate-limit
        return translated
    return block


def main():
    en_path = LOCALES_DIR / "en.json"
    en = json.loads(en_path.read_text(encoding="utf-8"))

    # Extract the new blocks from en.json
    new_blocks = {}
    for parent, child in NEW_KEY_PATHS:
        new_blocks[(parent, child)] = en[parent][child]

    for locale_code, deepl_code in LOCALES.items():
        target_path = LOCALES_DIR / f"{locale_code}.json"
        if not target_path.exists():
            print(f"  skip: {target_path} (missing)")
            continue
        print(f"\n=== {locale_code} ({deepl_code}) ===")
        target = json.loads(target_path.read_text(encoding="utf-8"))

        for (parent, child), block in new_blocks.items():
            print(f"  translating {parent}.{child}…")
            translated = translate_block(block, deepl_code)
            target.setdefault(parent, {})[child] = translated

        target_path.write_text(
            json.dumps(target, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        print(f"  wrote {target_path}")

    print("\nDone.")


if __name__ == "__main__":
    main()
