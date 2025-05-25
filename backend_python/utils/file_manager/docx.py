# utils/file_manager/docx.py

from docx import Document
import re

__all__ = ["extract_text", "extract_first_sentence"]

def extract_first_sentence(file_path):
    """
    DOCX 파일로부터 첫 문장을 추출합니다. 

    인자:
        file_path (str): DOCX 파일의 전체 경로
    반환:
        str: 문서의 첫 문장 (추출 실패 시 빈 문자열)
    """
    try:
        from docx import Document
        import re
        doc = Document(file_path)
        full_text = "\n".join([para.text for para in doc.paragraphs]).strip()
        if not full_text:
            return ""
        # 문장 단위 분리 또는 newline 기준 분리
        parts = re.split(r'(?<=[\!?])\s+|\n', full_text)
        return parts[0].strip() if parts else full_text
    except Exception as e:
        print(f"Error extracting first sentence from {file_path}: {e}")
        return ""


def extract_text(file_path):
    """
    DOCX 파일로부터 전체 텍스트(문단 + 표)를 추출합니다.
    """
    try:
        from docx import Document
        doc = Document(file_path)

        text_parts = []

        # 일반 문단 추출
        for para in doc.paragraphs:
            if para.text.strip():
                text_parts.append(para.text.strip())

        # 표 안 텍스트도 추출
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    cell_text = cell.text.strip()
                    if cell_text:
                        text_parts.append(cell_text)

        return "\n".join(text_parts)

    except Exception as e:
        print(f"[ERROR] DOCX 텍스트 추출 실패 - {file_path}: {e}")
        return ""

