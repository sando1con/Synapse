import logging
import re


def extract_text(file_path: str) -> str:
    """
    Markdown(.md) 파일의 모든 텍스트를 추출하여 마크다운 문법을 제거한 후 반환합니다.
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            raw = f.read()
        # 코드 블록 제거
        text = re.sub(r'```[\s\S]*?```', '', raw)
        # 인라인 코드 제거
        text = re.sub(r'`([^`]+)`', r'\1', text)
        # 이미지/링크 문법 제거: ![alt](url), [text](url)
        text = re.sub(r'!?\[([^\]]+)\]\([^\)]+\)', r'\1', text)
        # 헤딩(#) 제거
        text = re.sub(r'^#{1,6}\s*', '', text, flags=re.MULTILINE)
        # 리스트 기호(-, *, +) 제거
        text = re.sub(r'^[\-\*\+]\s+', '', text, flags=re.MULTILINE)
        # 기타 마크다운 특수문자 제거 (*, >)
        text = re.sub(r'[>*_]{1,2}', '', text)
        # 연속 공백 및 줄바꿈 축소
        text = re.sub(r'\s+', ' ', text)
        return text.strip()
    except Exception as e:
        logging.error(f"[MD] 텍스트 추출 실패: {e}")
        return ""


def extract_first_sentence(file_path: str) -> str:
    """
    Markdown(.md) 파일에서 첫 번째 문장을 반환합니다.
    """
    text = extract_text(file_path)
    # 첫 문장 추출: 마침표, 물음표, 느낌표 기준
    match = re.search(r'([^.!?]+[.!?])', text)
    return match.group(1).strip() if match else text.split(' ')[0] if text else ''
