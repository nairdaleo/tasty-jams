#!/usr/bin/env python3
"""
add_pill_keys.py — adds pricing pill, common.seePriceIn, and App Store badge keys
to all locale files and translates them via DeepL.
Run from the tasty-jams root.
"""
import json, urllib.request, urllib.parse, pathlib

DEEPL_KEY = "93d18a72-a06f-4521-a3a2-5aad7ca79ce3:fx"
LOCALES = pathlib.Path("/Users/adrian/gitworks/me/tasty-jams/locales")
LANG_MAP = {"fr": "FR", "de": "DE", "ja": "JA", "pt": "PT-BR", "es": "ES"}

NEW_COMMON = {
    "seePriceIn": "See price in…",
    "downloadOnAppStore": "Download on the App Store",
}

NEW_SPARK_PILL = {
    "freeTier": "Free tier available",
    "proMonthly": "Pro: $4.99 USD/month",
    "proYearly": "or $29.99 USD/year",
}

NEW_KLICK_PILL = {
    "freeTier": "Free tier available",
    "proOnce": "Pro: $4.99 USD one-time",
    "noSub": "No subscription",
}

NEW_CHL_PILL = {
    "comingSoon": "Coming soon to the App Store",
    "freeForever": "🌿 Free forever",
    "proOnce": "Pro: $19.99 USD one-time",
    "noSub": "No subscription",
}

def translate_batch(texts, target_lang):
    params = [("target_lang", target_lang)]
    for t in texts:
        params.append(("text", t))
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

def translate_dict(d, target_lang):
    keys = list(d.keys())
    vals = list(d.values())
    translated = translate_batch(vals, target_lang)
    return dict(zip(keys, translated))

# Load all locales
locales = {}
for f in LOCALES.glob("*.json"):
    with open(f) as fh:
        locales[f.stem] = json.load(fh)

en = locales["en"]

# Add English keys
en.setdefault("common", {}).update(NEW_COMMON)
en.setdefault("spark", {})["pill"] = NEW_SPARK_PILL
en.setdefault("klick", {})["pill"] = NEW_KLICK_PILL
en.setdefault("chlorophyll", {})["pill"] = NEW_CHL_PILL

# Translate for all other locales
for lang, deepl_code in LANG_MAP.items():
    print(f"Translating pill keys → {lang}...")
    lc = locales.setdefault(lang, {})
    lc.setdefault("common", {}).update(translate_dict(NEW_COMMON, deepl_code))
    lc.setdefault("spark", {})["pill"] = translate_dict(NEW_SPARK_PILL, deepl_code)
    lc.setdefault("klick", {})["pill"] = translate_dict(NEW_KLICK_PILL, deepl_code)
    lc.setdefault("chlorophyll", {})["pill"] = translate_dict(NEW_CHL_PILL, deepl_code)

# Write all back
for lang, data in locales.items():
    path = LOCALES / f"{lang}.json"
    with open(path, "w") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
    print(f"Wrote {path}")

print("Done.")
