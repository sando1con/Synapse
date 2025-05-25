from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional

from utils.s3_utils import download_s3_files_to_temp
from utils.file_manager_utils import get_filename_set
from utils.file_manager_utils import read_valid_file_texts
from utils.retrain_manager import handle_analysis_logic

app = FastAPI()

class AnalyzeRequest(BaseModel):
    user_id: str
    shared_id: Optional[str] = None

@app.post("/analyze")
async def analyze_documents(request: AnalyzeRequest):
    # 1. S3 prefix 설정
    s3_prefix = f"shared_{request.shared_id}/" if request.shared_id else f"user_{request.user_id}/"

    # 2. S3에서 파일 다운로드
    raw_file_info_list = download_s3_files_to_temp(s3_prefix)
    file_info_list = read_valid_file_texts(raw_file_info_list)
    if not file_info_list:
        return {"status": "no_files", "message": "처리할 문서가 없습니다."}

    # 3. 현재 파일명 추출
    current_filenames = get_filename_set([item["path"] for item in file_info_list])
    # 4. 분석 수행
    handle_analysis_logic(file_info_list, current_filenames, request.user_id, request.shared_id)

    return {"status": "success", "user_id": request.user_id, "shared_id": request.shared_id}
