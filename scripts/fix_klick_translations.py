#!/usr/bin/env python3
"""
Post-process klick translations:
  1. Reuse spark.contactForm translations for all shared fields (consistency,
     since the English values are identical between spark and klick).
  2. Reuse chlorophyll.contactForm.subscriptionIssue as klick.contactForm.purchaseIssue
     (English value matches: "Purchase issue").
  3. Restore brand-name "Klick" in ja/ko FAQ strings where DeepL translated
     it as the local word for "click" (クリック / 클릭).
"""

import json
import re
from pathlib import Path

LOCALES_DIR = Path(__file__).resolve().parent.parent / "locales"

SHARED_CONTACT_FIELDS = [
    "title", "nameLabel", "namePlaceholder", "emailLabel", "emailPlaceholder",
    "subjectLabel", "messageLabel", "messagePlaceholder", "submitBtn",
    "bugReport", "featureRequest", "generalQuestion", "successMsg", "errorMsg",
]

# Brand-name word that DeepL localizes; restore to "Klick"
BRAND_FIXES = {
    "ja": "クリック",
    "ko": "클릭",
}


def restore_brand(text: str, foreign: str) -> str:
    return text.replace(foreign, "Klick")


def main():
    for path in sorted(LOCALES_DIR.glob("*.json")):
        lang = path.stem
        if lang == "en":
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        if "klick" not in data or "contactForm" not in data["klick"]:
            continue

        # 1+2: reuse spark/chlorophyll translations for shared keys
        spark_cf = data.get("spark", {}).get("contactForm", {})
        chloro_cf = data.get("chlorophyll", {}).get("contactForm", {})
        for f in SHARED_CONTACT_FIELDS:
            if f in spark_cf:
                data["klick"]["contactForm"][f] = spark_cf[f]
        if "subscriptionIssue" in chloro_cf:
            data["klick"]["contactForm"]["purchaseIssue"] = chloro_cf["subscriptionIssue"]

        # 3: restore brand name in FAQ for ja/ko
        if lang in BRAND_FIXES:
            foreign = BRAND_FIXES[lang]
            faq = data["klick"]["faq"]
            for k, v in faq.items():
                if isinstance(v, str):
                    faq[k] = restore_brand(v, foreign)

        path.write_text(
            json.dumps(data, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        print(f"  patched {path.name}")


if __name__ == "__main__":
    main()
