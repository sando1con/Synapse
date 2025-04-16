# utils/file_manager/hwp.py

def extract_text(file_path):
    """
    HWP 파일로부터 텍스트를 추출합니다.
    
    인자:
        file_path (str): HWP 파일의 전체 경로
    반환:
        str: 추출한 텍스트 (추출 실패 시 빈 문자열)
    
    주의: HWP 파일 추출은 별도 라이브러리(예: pyhwp 또는 external tool 연동)를 요구합니다.
          여기서는 간단한 예시로 placeholder 문구를 반환합니다.
    """
    try:
        # 실제 구현 시 외부 라이브러리를 사용하여 텍스트 추출 구현
        return "HWP text extraction not implemented."
    except Exception as e:
        print(f"Error reading HWP file {file_path}: {e}")
        return ""