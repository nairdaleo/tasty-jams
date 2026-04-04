#!/usr/bin/env python3
"""
Adds pricing card i18n keys to all locale files and translates missing chlorophyll sections.
Run from the tasty-jams root.
"""
import json, urllib.request, urllib.parse, copy, pathlib, sys

DEEPL_KEY = "93d18a72-a06f-4521-a3a2-5aad7ca79ce3:fx"
LOCALES = pathlib.Path("/Users/adrian/gitworks/me/tasty-jams/locales")

LANG_MAP = {"fr": "FR", "de": "DE", "ja": "JA", "pt": "PT-BR", "es": "ES"}

# ── New pricing keys (English) ──────────────────────────────────────────────

SPARK_PRICING = {
    "sectionTitle": "What's included",
    "freeLabel": "Free",
    "freeName": "Spark",
    "freePrice": "Free forever · No account needed",
    "proLabel": "Pro",
    "proName": "Spark Pro",
    "proPrice": "$4.99 USD/month · or $29.99 USD/year",
    "proInherits": "Everything in Free, plus:",
    "free1": "Up to 3 habits with full tracking",
    "free2": "Forgiving streaks — no shame resets",
    "free3": "Daily reminders for each habit",
    "free4": "Calendar heatmap view",
    "free5": "Habit notes & journaling",
    "pro1": "Unlimited habits",
    "pro2": "Full stats dashboard — bar charts, day-of-week breakdown",
    "pro3": "PDF & CSV export",
    "pro4": "Siri shortcuts — log habits hands-free",
    "pro5": "Home screen & lock screen widgets",
    "pro6": "Custom app icons",
    "pro7": "Custom habit categories",
}

KLICK_PRICING = {
    "sectionTitle": "What's included",
    "freeLabel": "Free",
    "freeName": "Klick",
    "freePrice": "Free forever · No account needed",
    "proLabel": "Pro",
    "proName": "Klick Pro",
    "proPrice": "$4.99 USD · One-time · No subscription",
    "proInherits": "Everything in Free, plus:",
    "free1": "Up to 3 counters",
    "free2": "Tap to count, swipe to reset",
    "free3": "iCloud sync across devices",
    "free4": "Apple Watch companion app",
    "pro1": "Unlimited counters",
    "pro2": "Custom counter colours & icons",
    "pro3": "Watch complications on every face",
    "pro4": "Home screen widgets",
    "pro5": "Siri shortcuts — count hands-free",
    "pro6": "Family Sharing included",
}

CHLOROPHYLL_PRICING = {
    "sectionTitle": "What's included",
    "freeLabel": "Free",
    "freeName": "Chlorophyll",
    "freePrice": "Free forever · No account needed",
    "proLabel": "Pro",
    "proName": "Chlorophyll Pro",
    "proPrice": "$19.99 USD · One-time · No subscription",
    "proInherits": "Everything in Free, plus:",
    "free1": "Unlimited plants & care tasks — watering, fertilizing, repotting, pruning, and custom tasks",
    "free2": "Flexible schedules — every N days or specific days of the week",
    "free3": "Smart reminders — pick your time, filter by day of week",
    "free4": "Full care history — every event logged with notes and product details",
    "free5": "iCloud sync — iPhone, iPad, and Mac, offline-first",
    "pro1": "Photo growth timeline — dated photos in a beautiful gallery view",
    "pro2": "Fertilizer stats — usage by product, application counts, frequency charts",
    "pro3": "CSV & PDF export — full care history as spreadsheet or report",
    "pro4": "Siri shortcuts — log care and check what's due hands-free",
    "pro5": "Home screen widgets — at-a-glance plant status without opening the app",
    "pro6": "Family Sharing — one purchase, all your family's devices",
}

# ── DeepL translation ───────────────────────────────────────────────────────

def translate_batch(texts: list[str], target_lang: str) -> list[str]:
    """Translate a list of strings to target_lang via DeepL free API."""
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

def translate_dict(d: dict, target_lang: str) -> dict:
    """Recursively translate all string values in a dict."""
    keys = []
    vals = []
    def collect(obj, path):
        if isinstance(obj, str):
            keys.append(path)
            vals.append(obj)
        elif isinstance(obj, dict):
            for k, v in obj.items():
                collect(v, path + (k,))
        elif isinstance(obj, list):
            for i, v in enumerate(obj):
                collect(v, path + (i,))
    collect(d, ())

    translated = translate_batch(vals, target_lang)

    result = copy.deepcopy(d)
    for path, text in zip(keys, translated):
        node = result
        for step in path[:-1]:
            node = node[step]
        node[path[-1]] = text
    return result

# ── Load all locales ────────────────────────────────────────────────────────

locales = {}
for f in LOCALES.glob("*.json"):
    with open(f) as fh:
        locales[f.stem] = json.load(fh)

en = locales["en"]

# ── 1. Add pricing keys to English ─────────────────────────────────────────

en.setdefault("spark", {})["pricing"] = SPARK_PRICING
en.setdefault("klick", {})["pricing"] = KLICK_PRICING
en.setdefault("chlorophyll", {})["pricing"] = CHLOROPHYLL_PRICING

# ── 2. Translate pricing keys for all non-English locales ──────────────────

for lang, deepl_code in LANG_MAP.items():
    lc = locales.setdefault(lang, {})
    print(f"Translating pricing keys → {lang}...")

    lc.setdefault("spark", {})["pricing"] = translate_dict(SPARK_PRICING, deepl_code)
    lc.setdefault("klick", {})["pricing"] = translate_dict(KLICK_PRICING, deepl_code)
    lc.setdefault("chlorophyll", {})["pricing"] = translate_dict(CHLOROPHYLL_PRICING, deepl_code)

# ── 3. Add missing chlorophyll section to fr/de/ja/pt ──────────────────────

CHL_BASE = en["chlorophyll"]   # full English chlorophyll (no pricing, added separately above)
CHL_NO_PRICING = {k: v for k, v in CHL_BASE.items() if k != "pricing"}

for lang, deepl_code in LANG_MAP.items():
    if lang in ("es",):
        continue   # es already has chlorophyll
    lc = locales[lang]
    if "faq" not in lc.get("chlorophyll", {}):
        print(f"Translating chlorophyll base → {lang}...")
        translated = translate_dict(CHL_NO_PRICING, deepl_code)
        for k, v in translated.items():
            lc["chlorophyll"][k] = v   # merge; don't overwrite pricing we just set

# ── 4. Write all locales back ───────────────────────────────────────────────

for lang, data in locales.items():
    path = LOCALES / f"{lang}.json"
    with open(path, "w") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
    print(f"Wrote {path}")

print("Done.")
