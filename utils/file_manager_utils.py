# utils/file_manager_utils.py
import os
import re
from config import config
from utils.file_manager.docx import extract_text as extract_docx_text
from utils.file_manager.txt import extract_text as extract_txt_text
from utils.file_manager.pdf import extract_text as extract_pdf_text
from utils.file_manager.hwp import extract_text as extract_hwp_text

def preprocess_text(text):
    text = text.lower()
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'[^\w\s]', '', text)
    text = re.sub(r'\d+', '', text)
    return text.strip()

def extract_text_from_file(file_path):
    ext = os.path.splitext(file_path)[1].lower()
    text = ""
    if ext == '.docx':
        text = extract_docx_text(file_path)
    elif ext == '.txt':
        text = extract_txt_text(file_path)
    elif ext == '.pdf':
        text = extract_pdf_text(file_path)
    elif ext == '.hwp':
        text = extract_hwp_text(file_path)
    else:
        print(f"Unsupported file extension for file: {file_path}")
    return preprocess_text(text) if text else ""

def read_texts_from_files(file_paths):
    texts = []
    for file in file_paths:
        text = extract_text_from_file(file)
        if text:
            texts.append(text)
    return texts

def get_all_raw_files():
    raw_dir = config.RAW_DATA_DIR
    return [os.path.join(raw_dir, f) for f in os.listdir(raw_dir)
            if os.path.isfile(os.path.join(raw_dir, f))]

def get_raw_docx_paths(base_dir):
    return [
        os.path.join(base_dir, f"{i}.docx")
        for i in range(0, 50)
        if os.path.exists(os.path.join(base_dir, f"{i}.docx"))
    ]

def get_filename_set(file_paths):
    return set(os.path.basename(f) for f in file_paths)

def get_processed_data_path(filename):
    return os.path.join(config.PROCESSED_DATA_DIR, filename)

def load_previous_file_count():
    count_file = os.path.join(config.PROCESSED_DATA_DIR, "file_count.txt")
    if os.path.exists(count_file):
        try:
            with open(count_file, "r", encoding="utf-8") as f:
                count_str = f.read().strip()
                return int(count_str) if count_str else 0
        except Exception:
            return 0
    return 0

def update_file_count(new_count):
    count_file = os.path.join(config.PROCESSED_DATA_DIR, "file_count.txt")
    with open(count_file, "w", encoding="utf-8") as f:
        f.write(str(new_count))
