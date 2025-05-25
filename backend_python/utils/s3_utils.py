import boto3
import tempfile
import os
import joblib
import json
import logging

s3 = boto3.client("s3")
BUCKET_NAME = "synapsebucket2"


from botocore.exceptions import ClientError

def download_s3_files_to_temp(s3_prefix):
    paginator = s3.get_paginator("list_objects_v2")
    temp_files = []
    try:
        for page in paginator.paginate(Bucket=BUCKET_NAME, Prefix=s3_prefix):
            for obj in page.get("Contents", []):
                key = obj["Key"]
                if key.lower().endswith((".docx", ".pdf", ".hwp", ".txt", ".pptx", ".xlsx", ".jpg", ".png", ".jpeg", ".gif", ".bmp", ".tiff", ".md")):
                    filename = os.path.basename(key)
                    tmp = os.path.join(tempfile.gettempdir(), filename)
                    s3.download_file(BUCKET_NAME, key, tmp)
                    temp_files.append((filename, tmp))
    except ClientError as e:
        logging.error(f"[S3] 파일 목록 조회 실패: {e}")
        return []
    print(f"[S3] 다운로드 완료: {len(temp_files)}개 파일")
    return temp_files

def download_cache_from_s3(s3_prefix, local_cache_path):
    """
    S3에 저장된 new_files_cache.json 캐시 파일을 로컬 경로로 다운로드합니다.
    파일이 존재하지 않으면 boto3에서 예외가 발생합니다.
    """
    s3_key = s3_prefix + "new_files_cache.json"
    s3.download_file(BUCKET_NAME, s3_key, local_cache_path)

def save_models_to_s3(s3_prefix, kmeans_model, pca_model, scaler_model):
    # 임시 파일 저장
    with tempfile.TemporaryDirectory() as tmpdir:
        kmeans_path = os.path.join(tmpdir, "kmeans_model.pkl")
        pca_path = os.path.join(tmpdir, "pca_model.pkl")
        scaler_path = os.path.join(tmpdir, "scaler_model.pkl")

        joblib.dump(kmeans_model, kmeans_path)
        joblib.dump(pca_model, pca_path)
        joblib.dump(scaler_model, scaler_path)

        s3.upload_file(kmeans_path, BUCKET_NAME, s3_prefix + "kmeans_model.pkl")
        s3.upload_file(pca_path, BUCKET_NAME, s3_prefix + "pca_model.pkl")
        s3.upload_file(scaler_path, BUCKET_NAME, s3_prefix + "scaler_model.pkl")
        print(f"[S3] 모델 3종 저장 완료 → {s3_prefix}")


def load_file_count_from_s3(user_id, shared_id=None):
    s3_prefix = f"shared_{shared_id}/" if shared_id else f"user_{user_id}/"
    paginator = s3.get_paginator("list_objects_v2")
    count = 0
    
    for page in paginator.paginate(Bucket=BUCKET_NAME, Prefix=s3_prefix):
        for obj in page.get("Contents", []):
            if obj["Key"].lower().endswith((".docx", ".pdf", ".hwp", ".txt")):
                count += 1
    return count

def load_models_from_s3(s3_prefix):
    with tempfile.TemporaryDirectory() as tmpdir:
        kmeans_path = os.path.join(tmpdir, "kmeans_model.pkl")
        pca_path = os.path.join(tmpdir, "pca_model.pkl")
        scaler_path = os.path.join(tmpdir, "scaler_model.pkl")

        s3.download_file(BUCKET_NAME, s3_prefix + "kmeans_model.pkl", kmeans_path)
        s3.download_file(BUCKET_NAME, s3_prefix + "pca_model.pkl", pca_path)
        s3.download_file(BUCKET_NAME, s3_prefix + "scaler_model.pkl", scaler_path)

        kmeans_model = joblib.load(kmeans_path)
        pca_model = joblib.load(pca_path)
        scaler_model = joblib.load(scaler_path)

        print(f"[S3] 모델 3종 로드 완료 ← {s3_prefix}")
        return kmeans_model, pca_model, scaler_model

def save_clustering_results_to_s3(s3_prefix, filenames, labels, keywords,vectors_2d):
    data = []
    for i, fname in enumerate(filenames):
        data.append({
            "filename": fname,
            "cluster": int(labels[i]),
	    "vector_2d": vectors_2d[i].tolist() if hasattr(vectors_2d[i], 'tolist') else vectors_2d[i],
            "representative_keywords": keywords.get(int(labels[i]), [])
        })

    with tempfile.NamedTemporaryFile(mode='w+', delete=False, suffix=".json", encoding='utf-8') as tmpfile:
        json.dump(data, tmpfile, ensure_ascii=False, indent=2)
        tmpfile_path = tmpfile.name

    s3.upload_file(tmpfile_path, BUCKET_NAME, s3_prefix + "document_clusters_kmeans.json")
    print(f"[S3] 클러스터 결과 저장 완료 → {s3_prefix}document_clusters_kmeans.json")
    os.remove(tmpfile_path)

def load_clustering_results_from_s3(s3_prefix):
    with tempfile.NamedTemporaryFile(mode='w+b', delete=False, suffix=".json") as tmpfile:
        s3.download_file(BUCKET_NAME, s3_prefix + "document_clusters_kmeans.json", tmpfile.name)
        with open(tmpfile.name, "r", encoding='utf-8') as f:
            data = json.load(f)
        os.remove(tmpfile.name)
        print(f"[S3] 클러스터 결과 로드 완료 ← {s3_prefix}document_clusters_kmeans.json")
        return data

def upload_cache_to_s3(local_cache_path, s3_prefix):
    """
    new_files_cache.json을 S3에 업로드합니다.
    """
    s3_key = s3_prefix + "new_files_cache.json"
    s3.upload_file(local_cache_path, BUCKET_NAME, s3_key)
    print(f"[S3] 캐시 파일 업로드 완료 → {s3_key}")

def save_merged_results_to_s3(s3_prefix, merged_results):
    with tempfile.NamedTemporaryFile(mode='w+', delete=False, suffix=".json", encoding='utf-8') as tmpfile:
        json.dump(merged_results, tmpfile, ensure_ascii=False, indent=2)
        tmpfile_path = tmpfile.name

    s3.upload_file(tmpfile_path, BUCKET_NAME, s3_prefix + "document_clusters_kmeans.json")
    os.remove(tmpfile_path)

    print(f"[S3] 병합 결과 저장 완료 → {s3_prefix}document_clusters_kmeans.json")
