import logging
import os
from ultralytics import YOLO

# YOLO 모델 로드
try:
    model = YOLO('yolov8n.pt')  # 필요에 따라 경로/모델 변경
except Exception as e:
    logging.error(f"[YOLO] 모델 로드 실패: {e}")
    model = None


def detect_image_objects(file_path: str) -> list[str]:
    """
    이미지 파일에서 YOLO를 통해 검출된 객체 클래스명을 반환합니다.
    """
    if model is None:
        return []
    try:
        results = model(file_path)
        # 첫 번째 결과 프레임 사용
        frame = results[0]
        class_indices = frame.boxes.cls
        names = frame.names
        return [names[int(idx)] for idx in class_indices]
    except Exception as e:
        logging.error(f"[YOLO] 객체 감지 실패 ({file_path}): {e}")
        return []


def extract_text(file_path: str) -> str:
    """
    이미지 파일의 객체명을 결합한 문자열을 반환합니다.
    
    예: ['person', 'dog'] -> 'person dog'
    """
    _, ext = os.path.splitext(file_path)
    ext = ext.lower()
    if ext not in ('.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff'):
        logging.warning(f"[IMAGE] 지원하지 않는 확장자: {file_path}")
        return ''

    objects = detect_image_objects(file_path)
    return ' '.join(objects) if objects else ''


def extract_first_sentence(file_path: str) -> str:
    """
    이미지 파일의 첫 번째 감지 객체명을 반환합니다.
    """
    text = extract_text(file_path)
    if not text:
        return ''
    # 공백 기준으로 첫 토큰을 첫 문장으로 간주
    return text.split()[0]
