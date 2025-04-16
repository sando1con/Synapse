import os
from config.config import config
from models.document_model import retrain_all_documents, analyze_new_documents_incrementally
from utils.file_manager_utils import get_filename_set, get_raw_docx_paths
from utils.retrain_manager import handle_analysis_logic

def main():
    base_dir = config["RAW_DATA_DIR"]
    os.makedirs(base_dir, exist_ok=True)

    file_paths = get_raw_docx_paths(base_dir)
    current_filenames = get_filename_set(file_paths)

    handle_analysis_logic(file_paths, current_filenames)

if __name__ == "__main__":
    main()
