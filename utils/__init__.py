# utils/__init__.py

from .file_manager.docx import extract_text as extract_docx_text
from .file_manager.txt import extract_text as extract_txt_text
from .file_manager.pdf import extract_text as extract_pdf_text
from .file_manager.hwp import extract_text as extract_hwp_text

# 필요에 따라 file_manager의 다른 함수들도 함께 re-export할 수 있습니다.
from .file_manager_utils import (
    preprocess_text,
    extract_text_from_file,
    read_texts_from_files,
    get_all_raw_files,
    get_processed_data_path,
    load_previous_file_count,
    update_file_count,
)