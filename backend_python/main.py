# main.py

from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional

import time
import threading
from contextlib import contextmanager

from utils.s3_utils import download_s3_files_to_temp
from utils.file_manager_utils import get_filename_set
from utils.file_manager_utils import read_valid_file_texts
from utils.retrain_manager import handle_analysis_logic

# ──────────────── 로그 타이밍 유틸 ────────────────
@contextmanager
def log_time(task_name: str):
    start = time.time()
    print(f"[{task_name}] 시작...")
    yield
    elapsed = time.time() - start
    print(f"[{task_name}] 완료 (소요: {elapsed:.2f}초)")

# ──────────────── 헬스체크(Heartbeat) ────────────────
def heartbeat(interval: int = 10):
    while True:
        print("[Heartbeat] 아직 실행 중…")
        time.sleep(interval)

# 데몬 스레드로 백그라운드 헬스체크 시작
threading.Thread(target=heartbeat, args=(10,), daemon=True).start()

# ───────────────── FastAPI 앱 ─────────────────
app = FastAPI()

class AnalyzeRequest(BaseModel):
    user_id: str
    shared_id: Optional[str] = None

@app.post("/analyze")
async def analyze_documents(request: AnalyzeRequest):
    # 1. S3 prefix 설정
    s3_prefix = (
        f"shared_{request.shared_id}/"
        if request.shared_id
        else f"user_{request.user_id}/"
    )

    # 2. S3에서 파일 다운로드 및 텍스트 읽기
    with log_time("2. S3 파일 다운로드 및 텍스트 읽기"):
        raw_file_info_list = download_s3_files_to_temp(s3_prefix)

        if request.shared_id:
            file_info_list = read_valid_file_texts(raw_file_info_list, shared_id=request.shared_id)
        else:
            file_info_list = read_valid_file_texts(raw_file_info_list, user_id=request.user_id)

    if not file_info_list:
        return {"status": "no_files", "message": "처리할 문서가 없습니다."}

    # 3. 현재 파일명 추출
    with log_time("3. 현재 파일명 추출"):
        current_filenames = get_filename_set([item["path"] for item in file_info_list])

    # 4. 분석 수행
    with log_time("4. 분석 수행"):
        handle_analysis_logic(
            file_info_list,
            current_filenames,
            request.user_id,
            request.shared_id,
        )

    return {
        "status": "success",
        "user_id": request.user_id,
        "shared_id": request.shared_id,
    }
