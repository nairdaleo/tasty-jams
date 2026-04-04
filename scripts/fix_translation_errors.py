#!/usr/bin/env python3
"""
fix_translation_errors.py
Corrects values that should never be translated:
  - proLabel → always "Pro" (not "Pour"/"Para"/"Für" etc.)
  - freeName / proName → app names are brand names, never translate
  - Adds missing spark.pricing.pro2 to de/es/fr/pt
Run from the tasty-jams root.
"""
import json, pathlib, urllib.request, urllib.parse

DEEPL_KEY = "93d18a72-a06f-4521-a3a2-5aad7ca79ce3:fx"
LOCALES = pathlib.Path("/Users/adrian/gitworks/me/tasty-jams/locales")
LANG_MAP = {"fr": "FR", "de": "DE", "ja": "JA", "pt": "PT-BR", "es": "ES"}

# Values that are brand/product names — identical in every language
FIXED = {
    "spark.pricing.proLabel":       "Pro",
    "spark.pricing.freeName":       "Spark",
    "spark.pricing.proName":        "Spark Pro",
    "klick.pricing.proLabel":       "Pro",
    "klick.pricing.freeName":       "Klick",
    "klick.pricing.proName":        "Klick Pro",
    "chlorophyll.pricing.proLabel": "Pro",
    "chlorophyll.pricing.freeName": "Chlorophyll",
    "chlorophyll.pricing.proName":  "Chlorophyll Pro",
}

# Keys missing in some locales — translate from English
MISSING_EN = {
    "spark.pricing.pro2": "Full stats dashboard — bar charts, day-of-week breakdown",
}

def translate_batch(texts, target_lang):
    params = [("target_lang", target_lang)]
    for text in texts:
        params.append(("text", text))
    data = urllib.parse.urlencode(params).encode()
    req = urllib.request.Request(
        "https://api-free.deepl.com/v2/translate",
        data=data,
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": f"DeepL-Auth-Key {DEEPL_KEY}",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        result = json.loads(r.read())
    return [t["text"] for t in result["translations"]]

def set_nested(d, dotkey, value):
    """Set d[app][group][key] = value from a dot-separated key like 'spark.pricing.proLabel'."""
    parts = dotkey.split(".")
    node = d
    for part in parts[:-1]:
        node = node.setdefault(part, {})
    node[parts[-1]] = value

def get_nested(d, dotkey):
    parts = dotkey.split(".")
    node = d
    for part in parts:
        if not isinstance(node, dict):
            return None
        node = node.get(part)
    return node

# Load all locales
locales = {}
for f in LOCALES.glob("*.json"):
    with open(f) as fh:
        locales[f.stem] = json.load(fh)

# 1. Apply fixed (untranslatable) values to all non-English locales
for lang in LANG_MAP:
    lc = locales[lang]
    for dotkey, value in FIXED.items():
        current = get_nested(lc, dotkey)
        if current != value:
            print(f"[{lang}] fixing {dotkey}: {current!r} → {value!r}")
            set_nested(lc, dotkey, value)

# 2. Translate missing keys
for lang, deepl_code in LANG_MAP.items():
    lc = locales[lang]
    for dotkey, en_value in MISSING_EN.items():
        current = get_nested(lc, dotkey)
        if not current:
            translated = translate_batch([en_value], deepl_code)[0]
            print(f"[{lang}] translating missing {dotkey}: {translated!r}")
            set_nested(lc, dotkey, translated)

# 3. Write all locales back
for lang, data in locales.items():
    path = LOCALES / f"{lang}.json"
    with open(path, "w") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
    print(f"Wrote {path}")

print("Done.")
