# utils/file_manager/txt.py

import re

__all__ = ["extract_text", "extract_first_sentence"]

def extract_text(file_path: str) -> str:
    try:
        with open(file_path, encoding="utf-8") as f:
            return f.read()
    except:
        return ""

def extract_first_sentence(file_path: str) -> str:
    full = extract_text(file_path)
    parts = re.split(r"(?<=[.?!])\s+|\n", full)
    return parts[0].strip() if parts else ""