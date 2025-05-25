# utils/file_manager_utils.py

import os
import re
from config import config

# 각 모듈에서 extract_text, extract_first_sentence를 가져옵니다.
from utils.file_manager.docx import (
    extract_text as extract_docx_text,
    extract_first_sentence as extract_docx_first,
)
from utils.file_manager.txt import (
    extract_text as extract_txt_text,
    extract_first_sentence as extract_txt_first,
)
from utils.file_manager.pdf import (
    extract_text as extract_pdf_text,
    extract_first_sentence as extract_pdf_first,
)
from utils.file_manager.hwp import (
    extract_text as extract_hwp_text,
    extract_first_sentence as extract_hwp_first,
)

from utils.file_manager.pptx import (
    extract_text as extract_pptx_text,
    extract_first_sentence as extract_pptx_first,
)

from utils.file_manager.xlsx import (
    extract_text as extract_xlsx_text,
    extract_first_sentence as extract_xlsx_first,
)

from utils.file_manager.md import (
    extract_text as extract_md_text,
    extract_first_sentence as extract_md_first,
)

from utils.file_manager.imgae import (
    detect_image_objects,
    extract_text as extract_image_text,
    extract_first_sentence as extract_image_first,
)


def preprocess_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'[^\w\s]', '', text)
    text = re.sub(r'\d+', '', text)
    return text.strip()


def extract_text_from_file(file_path: str) -> str:
    ext = os.path.splitext(file_path)[1].lower()
    if ext == '.docx':
        raw = extract_docx_text(file_path)
    elif ext == '.txt':
        raw = extract_txt_text(file_path)
    elif ext == '.pdf':
        raw = extract_pdf_text(file_path)
    elif ext == '.hwp':
        raw = extract_hwp_text(file_path)
    elif ext == '.pptx':
        raw = extract_pptx_text(file_path)
    elif ext == '.xlsx':
        raw = extract_xlsx_text(file_path)
    elif ext in ('.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff'):
        raw = extract_image_text
    elif ext == '.md':
        raw = extract_md_text
    else:
        print(f"Unsupported file extension: {file_path}")
        return ""

    return preprocess_text(raw) if raw else ""


def extract_first_sentence_from_file(file_path: str) -> str:
    """
    파일 확장자에 맞춰 각 모듈의 extract_first_sentence 함수를 호출합니다.
    """
    ext = os.path.splitext(file_path)[1].lower()
    if ext == '.docx':
        return extract_docx_first(file_path)
    elif ext == '.txt':
        return extract_txt_first(file_path)
    elif ext == '.pdf':
        return extract_pdf_first(file_path)
    elif ext == '.hwp':
        return extract_hwp_first(file_path)
    elif ext == '.pptx':
        return extract_pptx_first(file_path)
    elif ext == '.hwp':
        return extract_xlsx_first(file_path)
    elif ext in ('.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff'):
        return extract_image_first
    elif ext == '.md':
        return extract_md_first
    else:
        return ""


def read_texts_from_files(file_paths: list[str]) -> list[str]:
    texts = []
    for fp in file_paths:
        t = extract_text_from_file(fp)
        if t:
            texts.append(t)
    return texts


def get_all_raw_files() -> list[str]:
    raw_dir = config.RAW_DATA_DIR
    return [
        os.path.join(raw_dir, f)
        for f in os.listdir(raw_dir)
        if os.path.isfile(os.path.join(raw_dir, f))
    ]


def get_raw_document_paths(
    base_dir: str,
    extensions: tuple[str, ...] = (".docx", ".pdf", ".txt", ".hwp")
) -> list[str]:
    return [
        os.path.join(base_dir, fn)
        for fn in os.listdir(base_dir)
        if os.path.isfile(os.path.join(base_dir, fn))
        and os.path.splitext(fn)[1].lower() in extensions
    ]


def get_filename_set(file_paths: list[str]) -> set[str]:
    return {os.path.basename(fp) for fp in file_paths}


def get_processed_data_path(filename: str) -> str:
    return os.path.join(config.PROCESSED_DATA_DIR, filename)


def load_previous_file_count() -> int:
    count_file = os.path.join(config.PROCESSED_DATA_DIR, "file_count.txt")
    if os.path.exists(count_file):
        try:
            with open(count_file, "r", encoding="utf-8") as f:
                return int(f.read().strip() or "0")
        except:
            return 0
    return 0


def update_file_count(new_count: int) -> None:
    count_file = os.path.join(config.PROCESSED_DATA_DIR, "file_count.txt")
    with open(count_file, "w", encoding="utf-8") as f:
        f.write(str(new_count))

def get_filename_set(file_paths):
    return set(os.path.basename(f) for f in file_paths)

def read_valid_file_texts(file_info_tuples):
    valid_files = []
    for fname, path in file_info_tuples:
        text = extract_text_from_file(path)
        if text.strip():
            valid_files.append({
                "filename": fname,
                "path": path,
                "text": text
            })
        else:
            print(f"[SKIP] 빈 텍스트 파일 제외: {fname}")
    return valid_files

