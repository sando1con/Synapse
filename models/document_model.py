# models/document_model.py

import os
import json
import joblib

from config.config import config
from utils import file_manager_utils
from utils.clustering_utils import (
    encode_documents,
    apply_pca_and_normalize,
    cluster_documents_kmeans,
    extract_representative_keywords,
    visualize_clusters,
)

def retrain_all_documents(file_paths):
    """
    주어진 파일 경로 목록을 기반으로 전체 문서를 대상으로 재학습을 수행합니다.
    
    단계:
      1. file_manager의 read_texts_from_files()를 이용하여 각 파일에서 전처리된 텍스트 추출
      2. 텍스트를 벡터로 인코딩
      3. PCA 적용 및 벡터 정규화
      4. KMeans 클러스터링 (auto_k=True)
      5. 클러스터별 대표 키워드 추출
      6. 결과를 JSON 및 모델 파일(joblib)로 저장 (processed 폴더 사용)
      7. 클러스터링 결과 시각화
    """
    texts = file_manager_utils.read_texts_from_files(file_paths)
    vectors = encode_documents(texts)
    normalized_vectors, pca_model, scaler_model = apply_pca_and_normalize(vectors)
    kmeans_model, labels, selected_k = cluster_documents_kmeans(normalized_vectors, auto_k=True)
    cluster_keywords = extract_representative_keywords(texts, labels)
    
    results = []
    for i, file in enumerate(file_paths):
        label = int(labels[i])
        results.append({
            "filename": os.path.basename(file),
            "cluster": label,
            "vector_2d": normalized_vectors[i].tolist(),
            "representative_keywords": cluster_keywords.get(label, [])
        })
    
    clusters_json_path = file_manager_utils.get_processed_data_path("document_clusters_kmeans.json")
    meta_json_path = file_manager_utils.get_processed_data_path("document_meta.json")
    
    with open(clusters_json_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=4)
    
    with open(meta_json_path, "w", encoding="utf-8") as f:
        json.dump({"n_clusters": selected_k, "total_documents": len(file_paths)},
                  f, ensure_ascii=False, indent=4)
    
    kmeans_model_path = file_manager_utils.get_processed_data_path("kmeans_model.pkl")
    pca_model_path = file_manager_utils.get_processed_data_path("pca_model.pkl")
    scaler_model_path = file_manager_utils.get_processed_data_path("scaler_model.pkl")
    joblib.dump(kmeans_model, kmeans_model_path)
    joblib.dump(pca_model, pca_model_path)
    joblib.dump(scaler_model, scaler_model_path)
    
    print("✅ 전체 재학습 완료 및 결과 저장")
    visualize_clusters(normalized_vectors, labels, file_paths)


def analyze_new_documents_incrementally(new_file_paths):
    """
    새 파일들을 대상으로 기존 클러스터링 모델과 결과를 활용하여 증분 분석을 진행합니다.
    
    단계:
      1. 저장된 모델 및 기존 클러스터 결과 로드
      2. 새 파일에서 전처리된 텍스트 추출
      3. 텍스트 인코딩 후 PCA, 정규화 변환 및 클러스터 라벨 예측
      4. 대표 키워드 추출
      5. 기존 결과와 병합 (중복 제거)
      6. 병합 결과를 JSON 파일로 저장
      7. 전체 문서를 대상으로 시각화 수행
    """
    from utils.clustering_utils import encode_documents, extract_representative_keywords
    
    kmeans_model_path = file_manager_utils.get_processed_data_path("kmeans_model.pkl")
    pca_model_path = file_manager_utils.get_processed_data_path("pca_model.pkl")
    scaler_model_path = file_manager_utils.get_processed_data_path("scaler_model.pkl")
    
    kmeans_model = joblib.load(kmeans_model_path)
    pca_model = joblib.load(pca_model_path)
    scaler_model = joblib.load(scaler_model_path)
    
    clusters_json_path = file_manager_utils.get_processed_data_path("document_clusters_kmeans.json")
    try:
        with open(clusters_json_path, "r", encoding="utf-8") as f:
            existing_results = json.load(f)
    except FileNotFoundError:
        existing_results = []
    
    new_texts = file_manager_utils.read_texts_from_files(new_file_paths)
    new_vectors = encode_documents(new_texts)
    new_reduced = pca_model.transform(new_vectors)
    new_normalized = scaler_model.transform(new_reduced)
    new_labels = kmeans_model.predict(new_normalized)
    new_keywords = extract_representative_keywords(new_texts, new_labels)
    
    for i, file in enumerate(new_file_paths):
        existing_results.append({
            "filename": os.path.basename(file),
            "cluster": int(new_labels[i]),
            "vector_2d": new_normalized[i].tolist(),
            "representative_keywords": new_keywords.get(int(new_labels[i]), [])
        })
    
    deduped = {item["filename"]: item for item in existing_results}
    merged_results = list(deduped.values())
    
    with open(clusters_json_path, "w", encoding="utf-8") as f:
        json.dump(merged_results, f, ensure_ascii=False, indent=4)
    
    print("✅ 새 문서 분석 완료 및 기존 결과 병합 저장됨")
    
    raw_dir = config.RAW_DATA_DIR
    all_file_paths = [
        os.path.join(raw_dir, item["filename"])
        for item in merged_results
        if os.path.exists(os.path.join(raw_dir, item["filename"]))
    ]
    all_texts = file_manager_utils.read_texts_from_files(all_file_paths)
    all_vectors = encode_documents(all_texts)
    all_reduced = pca_model.transform(all_vectors)
    all_normalized = scaler_model.transform(all_reduced)
    all_labels = kmeans_model.predict(all_normalized)
    
    visualize_clusters(all_normalized, all_labels, all_file_paths)