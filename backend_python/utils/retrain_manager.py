import os
import json
from config.config import config, RETRAIN_THRESHOLD
from utils.file_manager_utils import get_processed_data_path, get_filename_set

def load_previous_filenames():
    try:
        with open(get_processed_data_path("document_clusters_kmeans.json"), "r", encoding="utf-8") as f:
            data = json.load(f)
            return set(item["filename"] for item in data)
    except FileNotFoundError:
        return set()

def load_cache():
    cache_path = get_processed_data_path("new_files_cache.json")
    if os.path.exists(cache_path):
        try:
            with open(cache_path, "r", encoding="utf-8") as f:
                return set(json.load(f))
        except Exception as e:
            print(f"⚠️ 캐시 불러오기 실패: {e}")
    return set()

def save_cache(cached_filenames):
    cache_file = get_processed_data_path("new_files_cache.json")
    try:
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(sorted(list(cached_filenames)), f, ensure_ascii=False, indent=4)
        print(f"💾 캐시 저장 완료 → {os.path.abspath(cache_file)}")
    except Exception as e:
        print(f"💾 캐시 저장 실패: {e}")

def should_retrain(current_filenames):
    previous = load_previous_filenames()
    cache = load_cache()
    new_files = current_filenames - previous - cache
    total_new = len(cache | new_files)
    return {
        "retrain": len(previous) == 0 or total_new >= RETRAIN_THRESHOLD,
        "new_files": new_files,
        "all_new_count": total_new,
        "cached_filenames": cache,
        "previous_filenames": previous
    }

def handle_analysis_logic(file_paths, current_filenames):
    from models.document_model import retrain_all_documents, analyze_new_documents_incrementally
    result = should_retrain(current_filenames)

    print(f"\n📁 현재 문서 수: {len(file_paths)}")
    print(f"🆕 새 문서: {sorted(result['new_files'])}")
    print(f"📦 누적 새 문서 수: {result['all_new_count']}")

    if result["retrain"]:
        print("\n🚀 전체 재학습 수행")
        all_filenames = result["previous_filenames"] | result["cached_filenames"] | result["new_files"]
        retrain_paths = [
            os.path.join(config["RAW_DATA_DIR"], name)
            for name in all_filenames
            if os.path.exists(os.path.join(config["RAW_DATA_DIR"], name))
        ]
        retrain_all_documents(retrain_paths)
        save_cache(set())  # 캐시 초기화
    elif result["new_files"]:
        print("\n➕ 증분 분석 수행")
        new_paths = [f for f in file_paths if os.path.basename(f) in result["new_files"]]
        analyze_new_documents_incrementally(new_paths)
        updated_cache = result["cached_filenames"] | result["new_files"]
        save_cache(updated_cache)
    else:
        print("\n✅ 분석 필요 없음")
