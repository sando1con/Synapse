# utils/file_manager/pdf.py

def extract_text(file_path):
    """
    PDF 파일로부터 텍스트를 추출합니다.
    
    인자:
        file_path (str): PDF 파일의 전체 경로
    반환:
        str: 추출한 텍스트 (추출 실패 시 빈 문자열)
    
    주의: PDF 텍스트 추출에는 PyPDF2 (또는 pdfminer 등) 패키지가 필요합니다.
    """
    text = ""
    try:
        import PyPDF2
        with open(file_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                extracted = page.extract_text()
                text += extracted if extracted is not None else ""
    except Exception as e:
        print(f"Error reading PDF file {file_path}: {e}")
    return text