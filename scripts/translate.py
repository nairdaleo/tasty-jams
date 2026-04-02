#!/usr/bin/env python3
"""
Translate all strings in en.json to target languages using DeepL API.

Usage:
  python3 scripts/translate.py [language_codes...]

Examples:
  python3 scripts/translate.py es fr
  python3 scripts/translate.py pt-BR
  python3 scripts/translate.py                    # translates all supported languages
"""

import json
import requests
import sys
import time
from typing import Any

# Configuration
API_KEY = "93d18a72-a06f-4521-a3a2-5aad7ca79ce3:fx"
EN_FILE = "locales/en.json"
PRESERVE_KEYS = {"tastyJam", "name", "email", "brand"}
DEFAULT_LANGUAGES = ["fr", "es", "de", "ja", "pt"]


def translate_text(text: str, target_lang: str) -> str:
    """Translate text using DeepL API with rate limiting."""
    try:
        response = requests.post(
            "https://api-free.deepl.com/v1/translate",
            headers={"Authorization": f"DeepL-Auth-Key {API_KEY}"},
            data={"text": text, "target_lang": target_lang},
        )
        response.raise_for_status()
        result = response.json()
        if result.get("translations"):
            return result["translations"][0]["text"]
        return text
    except Exception as e:
        print(f"Translation error: {e}", file=sys.stderr)
        return text


def translate_nested(obj: Any, target_lang: str, current_key: str = "") -> Any:
    """Recursively translate all strings in a nested structure."""
    if isinstance(obj, dict):
        result = {}
        for key, value in obj.items():
            result[key] = translate_nested(value, target_lang, key)
        return result
    elif isinstance(obj, list):
        result = []
        for i, item in enumerate(obj):
            result.append(translate_nested(item, target_lang, f"[{i}]"))
        return result
    elif isinstance(obj, str):
        if current_key in PRESERVE_KEYS or "@" in obj or not obj.strip():
            return obj
        print(f"  {current_key}: {obj[:50]}...")
        translated = translate_text(obj, target_lang)
        time.sleep(0.2)
        return translated
    else:
        return obj


def preserve_brand_names(translated: dict) -> dict:
    """Force preserve brand names and app names."""
    translated["common"]["tastyJam"] = "Tasty Jam"
    translated["spark"]["name"] = "Spark"
    translated["klick"]["name"] = "Klick"
    translated["fartSoundboard"]["name"] = "Fart Soundboard"
    translated["nav"]["tastyJam"] = "Tasty Jam"
    translated["common"]["email"] = "support@tastyjam.ca"
    return translated


def main():
    # Load English translations
    try:
        with open(EN_FILE, "r", encoding="utf-8") as f:
            en_data = json.load(f)
    except FileNotFoundError:
        print(f"❌ Error: {EN_FILE} not found")
        sys.exit(1)

    # Determine languages to translate
    languages = sys.argv[1:] if len(sys.argv) > 1 else DEFAULT_LANGUAGES

    lang_mapping = {
        "en": "en",
        "english": "en",
        "fr": "FR",
        "french": "FR",
        "es": "ES",
        "spanish": "ES",
        "de": "DE",
        "german": "DE",
        "ja": "JA",
        "japanese": "JA",
        "pt": "PT",
        "portuguese": "PT",
        "pt-br": "PT-BR",
        "brazilian": "PT-BR",
    }

    for lang_input in languages:
        lang_lower = lang_input.lower()
        target_code = lang_mapping.get(lang_lower)

        if not target_code:
            print(f"⚠️  Skipping unknown language: {lang_input}")
            continue

        # Map language code to filename
        filename_code = lang_input.lower().replace("-", "_")
        output_file = f"locales/{filename_code}.json"

        print(f"\n{'='*60}")
        print(f"Translating to {lang_input.upper()} ({target_code})...")
        print(f"{'='*60}")

        translated = translate_nested(en_data, target_code)
        translated = preserve_brand_names(translated)

        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(translated, f, ensure_ascii=False, indent=2)

        print(f"✓ Saved to {output_file}")

    print(f"\n{'='*60}")
    print("✓ All translations complete!")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
