import os
import json
import joblib
from collections import defaultdict
from utils.s3_utils import (
    save_models_to_s3,
    load_models_from_s3,
    load_clustering_results_from_s3,
    save_merged_results_to_s3
)
from utils import file_manager_utils
from utils.clustering_utils import (
    encode_documents,
    apply_pca_and_normalize,
    cluster_documents_kmeans,
    extract_representative_keywords,
    visualize_clusters,
)
from utils.file_manager_utils import extract_first_sentence_from_file
from utils.category_utils import derive_doc_category, hybrid_cluster_label


def retrain_all_documents(file_info_list, user_id, s3_prefix, shared_id=None):
    """
    전체 재학습 수행 및 S3에 모델과 결과(JSON) 저장
    """
    file_paths = [item["path"] for item in file_info_list]
    filenames = [item["filename"] for item in file_info_list]
    texts = [item["text"] for item in file_info_list]

    vectors = encode_documents(texts)
    normalized_vectors, pca_model, scaler_model = apply_pca_and_normalize(vectors)
    kmeans_model, labels, selected_k = cluster_documents_kmeans(normalized_vectors, auto_k=True)
    cluster_keywords = extract_representative_keywords(texts, labels)

    results = []
    for i, item in enumerate(file_info_list):
        label = int(labels[i])
        keywords = cluster_keywords.get(label, [])
        first_sentence = extract_first_sentence_from_file(item["path"])
        category = derive_doc_category(keywords, first_sentence, item["text"])
        results.append({
            "filename": item["filename"],
            "cluster": label,
            "vector_2d": normalized_vectors[i].tolist(),
            "representative_keywords": keywords,
            "first_sentence": first_sentence,
            "category": category,
        })

    cluster_groups = defaultdict(list)
    for doc in results:
        cluster_groups[doc['cluster']].append(doc)
    cluster_labels = {
        cid: hybrid_cluster_label(docs, detail_boost=2.0)
        for cid, docs in cluster_groups.items()
    }
    for doc in results:
        doc['super_category'] = cluster_labels[doc['cluster']]

    save_models_to_s3(s3_prefix, kmeans_model, pca_model, scaler_model)
    save_merged_results_to_s3(s3_prefix, results)

    print(f"[INFO] 전체 재학습 완료: {selected_k}개 클러스터, 문서 {len(file_info_list)}건. S3 저장됨: {s3_prefix}")
    visualize_clusters(normalized_vectors, labels, file_paths, user_id=user_id, shared_id=shared_id)


def analyze_new_documents_incrementally(file_info_list, user_id, shared_id=None):
    """
    증분 문서 분석 수행 및 기존 결과와 병합하여 S3 저장
    """
    from utils.clustering_utils import extract_representative_keywords

    # 유효 텍스트 필터링
    file_info_list = [item for item in file_info_list if item["text"].strip()]
    if not file_info_list:
        print("[WARN] 유효한 텍스트 문서 없음. 분석 중단됨.")
        return

    s3_prefix = f"shared_{shared_id}/" if shared_id else f"user_{user_id}/"
    file_paths = [item["path"] for item in file_info_list]
    filenames = [item["filename"] for item in file_info_list]
    new_texts = [item["text"] for item in file_info_list]

    kmeans_model, pca_model, scaler_model = load_models_from_s3(s3_prefix)
    existing_results = load_clustering_results_from_s3(s3_prefix)

    new_vectors = encode_documents(new_texts)
    new_reduced = pca_model.transform(new_vectors)
    new_normalized = scaler_model.transform(new_reduced)
    new_labels = kmeans_model.predict(new_normalized)
    new_keywords = extract_representative_keywords(new_texts, new_labels)

    new_results = []
    for i, item in enumerate(file_info_list):
        label = int(new_labels[i])
        keywords = new_keywords.get(label, [])
        first_sentence = extract_first_sentence_from_file(item["path"])
        category = derive_doc_category(keywords, first_sentence, item["text"])
        new_results.append({
            "filename": item["filename"],
            "cluster": label,
            "vector_2d": new_normalized[i].tolist(),
            "representative_keywords": keywords,
            "first_sentence": first_sentence,
            "category": category,
        })

    existing_dict = {item["filename"]: item for item in existing_results}
    for item in new_results:
        existing_dict[item["filename"]] = item
    merged_results = list(existing_dict.values())

    cluster_groups = defaultdict(list)
    for doc in merged_results:
        cluster_groups[doc['cluster']].append(doc)
    cluster_labels = {
        cid: hybrid_cluster_label(docs, detail_boost=2.0)
        for cid, docs in cluster_groups.items()
    }
    for doc in merged_results:
        doc['super_category'] = cluster_labels[doc['cluster']]

    save_merged_results_to_s3(s3_prefix, merged_results)

    print(f"[INFO] 증분 분석 완료: 신규 {len(new_results)}건, 병합 총 {len(merged_results)}건. S3 저장됨: {s3_prefix}")
    visualize_clusters(new_normalized, new_labels, file_paths, user_id=user_id, shared_id=shared_id)
