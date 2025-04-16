# utils/file_manager/txt.py

def extract_text(file_path):
    """
    TXT 파일의 내용을 읽어 텍스트로 반환합니다.
    
    인자:
        file_path (str): TXT 파일의 전체 경로
    반환:
        str: 파일 내의 텍스트 (읽기 실패 시 빈 문자열)
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        print(f"Error reading TXT file {file_path}: {e}")
        return ""