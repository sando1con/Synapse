# utils/file_manager/pdf.py

from PyPDF2 import PdfReader
from PyPDF2.errors import PdfReadError
import re

__all__ = ["extract_text", "extract_first_sentence"]

def extract_text(file_path: str) -> str:
    try:
        reader = PdfReader(file_path)
        out = []
        for page in reader.pages:
            txt = page.extract_text() or ""
            out.append(txt)
        return "\n".join(out)
    except PdfReadError as e:
        print(f"[PDF Error] {file_path} → {e}")
        return ""
    except Exception as e:
        print(f"[Unknown PDF Error] {file_path} → {e}")
        return ""

def extract_first_sentence(file_path: str) -> str:
    full = extract_text(file_path)
    parts = re.split(r"(?<=[.?!])\s+|\n", full)
    return parts[0].strip() if parts else ""