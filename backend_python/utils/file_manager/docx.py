# utils/file_manager/docx.py

def extract_text(file_path):
    """
    DOCX 파일로부터 텍스트를 추출합니다.
    
    인자:
        file_path (str): DOCX 파일의 전체 경로
    반환:
        str: 파일 내의 텍스트 (추출 실패 시 빈 문자열)
    """
    try:
        from docx import Document
        doc = Document(file_path)
        text = "\n".join([para.text for para in doc.paragraphs])
        return text
    except Exception as e:
        print(f"Error extracting DOCX text from {file_path}: {e}")
        return ""