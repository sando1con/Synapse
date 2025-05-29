# utils/retrain_manager.py

import os
import json
from config.config import config, RETRAIN_THRESHOLD
from utils.file_manager_utils import get_filename_set
from utils.s3_utils import load_file_count_from_s3
from utils.s3_utils import load_clustering_results_from_s3
from utils.s3_utils import upload_cache_to_s3
from utils.s3_utils import save_clustering_results_to_s3
from utils.file_manager_utils import update_file_count
from utils.s3_utils import download_cache_from_s3

# 경로 설정
def get_processed_data_path(filename, user_id=None, shared_id=None):
    base_path = os.path.expanduser("~/Synapse_code/processed_data")
    if shared_id:
        subdir = f"shared_{shared_id}"
    elif user_id:
        subdir = f"user_{user_id}"
    else:
        raise ValueError("user_id 또는 shared_id 중 하나는 반드시 필요합니다.")
    full_path = os.path.join(base_path, subdir)
    os.makedirs(full_path, exist_ok=True)
    return os.path.join(full_path, filename)

# 이전 클러스터 결과
def load_previous_filenames(user_id=None, shared_id=None):
    try:
        s3_prefix = f"shared_{shared_id}/" if shared_id else f"user_{user_id}/"
        data = load_clustering_results_from_s3(s3_prefix)
        return set(item["filename"] for item in data)
    except Exception as e:
        print(f"[WARN] 이전 클러스터 결과 로딩 실패: {e}")
        return set()

# 캐시 로드
def load_cache(user_id=None, shared_id=None):
    cache_path = get_processed_data_path("new_files_cache.json", user_id, shared_id)

    # 1. S3에서 캐시 먼저 다운로드 시도
    s3_prefix = f"shared_{shared_id}/" if shared_id else f"user_{user_id}/"
    try:
        download_cache_from_s3(s3_prefix, cache_path)
        print(f"[S3] 캐시 파일 다운로드 완료 ← {s3_prefix}new_files_cache.json")
    except Exception as e:
        print(f"[S3] 캐시 파일 다운로드 실패 (처음 실행이면 정상): {e}")

    # 2. 로컬에서 읽기
    if os.path.exists(cache_path):
        try:
            with open(cache_path, "r", encoding="utf-8") as f:
                return set(json.load(f))
        except Exception as e:
            print(f" 캐시 불러오기 실패: {e}")
    return set()

# 캐시 저장
def save_cache(cached_filenames, user_id=None, shared_id=None):
    cache_file = get_processed_data_path("new_files_cache.json", user_id, shared_id)
    try:
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(sorted(list(cached_filenames)), f, ensure_ascii=False, indent=4)
        print(f" 캐시 저장 완료 → {os.path.abspath(cache_file)}")
        s3_prefix = f"shared_{shared_id}/" if shared_id else f"user_{user_id}/"
        upload_cache_to_s3(cache_file, s3_prefix)
    except Exception as e:
        print(f" 캐시 저장 실패: {e}")

# 재학습 여부 판단
def should_retrain(current_filenames, user_id, s3_prefix, shared_id=None):
    previous = load_previous_filenames(user_id, shared_id)
    cache = load_cache(user_id, shared_id)
    new_files = current_filenames - previous - cache
    total_new = len(cache | new_files)
    prev_count = load_file_count_from_s3(user_id, shared_id)

    if len(current_filenames) <= 2:
        print(f"현재 문서 수가 {len(current_filenames)}개이므로 k=1로 분석만 수행")
        return {
            "retrain": False,
            "new_files": new_files,
            "previous_filenames": set(),
            "cached_filenames": set(),
            "all_new_count": total_new,
            "initial_analysis": True
        }
    if not previous:
        print(" 클러스터 결과 없음 → 전체 재학습 수행")
        return {
            "retrain": True,
            "new_files": current_filenames,
            "previous_filenames": set(),
            "cached_filenames": set(),
            "all_new_count": len(current_filenames),
            "initial_analysis": False
        }

    if len(previous) < 10:
        print(f"초기 학습 문서 수({len(previous)}개)가 너무 적음 → 전체 재학습 수행")
        return {
            "retrain": True,
            "new_files": current_filenames - previous,
            "previous_filenames": previous,
            "cached_filenames": cache,
            "all_new_count": total_new,
            "initial_analysis": False
         }
    retrain = total_new >= RETRAIN_THRESHOLD
    return {
        "retrain": retrain,
        "new_files": new_files,
        "previous_filenames": previous,
        "cached_filenames": cache,
        "all_new_count": total_new,
        "initial_analysis": False
    }

# 분석 진입점
def handle_analysis_logic(file_info_list, current_filenames, user_id, shared_id=None):
    from models.document_model import retrain_all_documents, analyze_new_documents_incrementally

    s3_prefix = f"shared_{shared_id}/" if shared_id else f"user_{user_id}/"
    result = should_retrain(current_filenames, user_id, s3_prefix, shared_id)

    print(f"\n 현재 문서 수: {len(file_info_list)}")
    print(f" 새 문서: {sorted(result['new_files'])}")
    print(f" 누적 새 문서 수: {result['all_new_count']}")

    if result.get("initial_analysis", False):
       print(" 초기 문서 (1~2개) → k=1 클러스터 json 생성")

       filenames = [item["filename"] for item in file_info_list]
       labels = [0] * len(filenames)  # 모두 cluster 0
       vectors_2d = []

       if len(filenames) == 1:
           vectors_2d = [[0.0, 0.0]]
       elif len(filenames) == 2:
           vectors_2d = [[-0.5, 0.0], [0.5, 0.0]]

       # 모든 문서에 동일 키워드 부여
       keywords = {0: ["임시"]}

       # 호출
       s3_prefix = f"shared_{shared_id}/" if shared_id else f"user_{user_id}/"
       save_clustering_results_to_s3(s3_prefix, filenames, labels, keywords, vectors_2d)
       return

    if result["retrain"]:
        print("\n전체 학습 수행")
        all_filenames = result["previous_filenames"] | result["cached_filenames"] | result["new_files"]
        retrain_files = [item for item in file_info_list if item["filename"] in all_filenames]
        retrain_all_documents(retrain_files, user_id, s3_prefix, shared_id)
        save_cache(set(), user_id, shared_id)  # 캐시 초기화

    elif result["new_files"]:
        print("\n증분 분석 수행")
        new_files = [item for item in file_info_list if item["filename"] in result["new_files"]]
        analyze_new_documents_incrementally(new_files, user_id, shared_id)
        updated_cache = result["cached_filenames"] | result["new_files"]
        save_cache(updated_cache, user_id, shared_id)  # 캐시 갱신

    else:
        print("\n분석 필요 없음")

