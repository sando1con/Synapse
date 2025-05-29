# utils/clustering_utils.py

import os
import re
import json
import numpy as np
from collections import defaultdict
from utils.retrain_manager import get_processed_data_path
# 머신러닝 관련 패키지
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.feature_extraction.text import TfidfVectorizer

# 텍스트 관련 패키지
from konlpy.tag import Okt
from sentence_transformers import SentenceTransformer

# 시각화 패키지
import platform
import matplotlib.pyplot as plt

# Okt 객체 생성 (키워드 추출을 위해)
okt = Okt()
# =================== 임베딩 관련 함수 ===================
MODEL = SentenceTransformer("snunlp/KR-SBERT-V40K-klueNLI-augSTS")

import time

def encode_documents(texts):
    alpha = 0.7  # SBERT 가중치
    beta = 0.3  # TF-IDF 가중치

    start_total = time.time()

    print(" [1] SBERT 임베딩 시작...")
    start = time.time()
    sbert_vectors = MODEL.encode(texts, normalize_embeddings=True)
    print(f" SBERT 완료: {time.time() - start:.2f}초")

    print(" [2] 명사 추출 시작...")
    start = time.time()
    noun_texts = extract_nouns_from_texts(texts)
    print(f" 명사 추출 완료: {time.time() - start:.2f}초")

    print(" [3] TF-IDF 벡터화 시작...")
    start = time.time()
    max_features = 300
    tfidf_vectorizer = TfidfVectorizer(
        max_features=max_features,
        ngram_range=(1, 2)  # ✅ bigram까지 고려
    )
    tfidf_matrix = tfidf_vectorizer.fit_transform(noun_texts).toarray()
    print(f" TF-IDF 완료: {time.time() - start:.2f}초")

    print(" [4] 벡터 결합 시작...")
    start = time.time()
    sbert_scaled = StandardScaler().fit_transform(sbert_vectors)
    tfidf_scaled = StandardScaler().fit_transform(tfidf_matrix)

    combined_vectors = np.hstack([
        sbert_scaled * alpha,
        tfidf_scaled * beta
    ])
    print(f" 벡터 결합 완료: {time.time() - start:.2f}초")
    print(f" 전체 소요 시간: {time.time() - start_total:.2f}초\n")

    return combined_vectors

# =================== 차원 축소 및 정규화 함수 ===================

def apply_pca_and_normalize(vectors, n_components=2, random_state=42):
    """
    고차원 벡터에 PCA를 적용하여 차원을 축소한 후, 표준화합니다.
    
    인자:
        vectors (np.array): 입력 벡터
        n_components (int): 축소할 차원 수 (기본 2)
        random_state (int): 랜덤 시드
    반환:
        tuple: (정규화된 벡터, PCA 모델, Scaler 모델)
    """
    if len(vectors) < 2:
        print("문서가 1개이므로 PCA를 건너뜁니다.")
        vectors = np.array(vectors)
        return vectors[:, :2] if vectors.shape[1] >= 2 else np.hstack([vectors, np.zeros((vectors.shape[0], 2 - vectors.shape[1]))]), None, None

    pca = PCA(n_components=n_components, random_state=random_state)
    reduced = pca.fit_transform(vectors)
    scaler = StandardScaler()
    normalized = scaler.fit_transform(reduced)
    return normalized, pca, scaler

def get_dynamic_k_min(n_docs):
    if n_docs < 30:
        return 2
    elif n_docs < 60:
        return 3
    elif n_docs < 100:
        return 4
    elif n_docs < 200:
        return 5
    elif n_docs < 300:
        return 6
    elif n_docs < 500:
        return 7
    elif n_docs < 700:
        return 8
    elif n_docs < 1000:
        return 9
    else:
        return 10

# =================== 클러스터링 함수 ===================

def find_best_k(vectors, max_ratio=0.2, random_state=42):
    """
    Silhouette 점수를 기반으로 최적의 클러스터 수(K)를 찾습니다.

    인자:
        vectors (np.array): 클러스터링 대상 벡터
        k_min (int): 최소 클러스터 수
        max_ratio (float): 전체 문서 수 대비 최대 클러스터 수 비율
        random_state (int): 랜덤 시드
        
    반환:
        int: 선택된 최적의 클러스터 수 (best K)
    """
    print(" [DEBUG] find_best_k() 호출됨!")
    n_docs = len(vectors)
    k_min = get_dynamic_k_min(n_docs)
    k_max = max(k_min + 4, int(n_docs * max_ratio))
    k_max = min(k_max, n_docs - 1)
    if k_max < k_min:
        print(f"[경고] 유효한 K 범위가 없습니다. (k_min={k_min}, k_max={k_max}) → 기본 k=1 반환")
        return 1
    scores = []
    for k in range(k_min, k_max + 1):
        kmeans = KMeans(n_clusters=k, random_state=random_state)
        labels = kmeans.fit_predict(vectors)
        score = silhouette_score(vectors, labels)
        print(f"K={k} → Silhouette Score: {score:.3f}")
        scores.append((k, score))
    if not scores:
        print("silhouette score 계산 실패. 기본 k=1 반환.")
        return 1
    best_score = max(score for _, score in scores)

    # best_score보다 0.05 이상 떨어지지 않는 후보 중 가장 큰 K 선택
    candidates = [k for k, s in scores if s >= best_score - 0.02]
    best_k = max(candidates)

    print(f"\n[선택된 클러스터 수: {best_k} (유사 점수 중 최대 K)]\n")
    return best_k

def cluster_documents_kmeans(vectors, auto_k=True, default_k=3, random_state=42):
    """
    KMeans 클러스터링을 수행합니다.
      - auto_k가 True면 find_best_k()를 통해 최적의 K를 결정합니다.
      - 그렇지 않으면 default_k 값을 사용합니다.
    인자:
        vectors (np.array): 클러스터링 대상 벡터
        auto_k (bool): 자동으로 K를 결정할지 여부 (기본 True)
        default_k (int): 자동 결정 미사용 시 클러스터 수
        random_state (int): 랜덤 시드
    반환:
        tuple: (KMeans 모델, 각 벡터에 대한 클러스터 라벨, 선택된 클러스터 수)
    """
    if auto_k:
        best_k = find_best_k(vectors, max_ratio=0.2, random_state=random_state)
    else:
        best_k = default_k
    print(f"[5] KMeans(n_clusters={best_k}) 학습 시작...")
    start = time.time()
    kmeans = KMeans(n_clusters=best_k, random_state=random_state)
    labels = kmeans.fit_predict(vectors)
    end = time.time()
    print(f"✅ KMeans 완료: {end - start:.2f}초")

    return kmeans, labels, best_k


# =================== 키워드 추출 함수 ===================

def extract_nouns_from_texts(texts):
    """
    텍스트에서 명사를 추출하되, 명사가 없으면 영단어를 추출해 fallback 처리합니다.
    """
    noun_texts = []
    for text in texts:
        # 1. 한국어 명사 추출
        nouns = okt.nouns(text)
        if nouns:
            noun_texts.append(" ".join(nouns))
        else:
            # 2. 명사가 없다면, 영어 단어 추출 (길이 2 이상)
            words = re.findall(r'\b[a-zA-Z]{2,}\b', text)
            noun_texts.append(" ".join(words) if words else "")
    return noun_texts

def extract_representative_keywords(texts, labels, top_n=5):
    """
    클러스터별로 대표 키워드를 추출합니다.
      - 각 클러스터에 속한 문서들의 명사 추출 후 TF-IDF 기반으로 상위 top_n 키워드를 선택합니다.

    인자:
        texts (list): 전처리된 문서 텍스트 리스트
        labels (list or np.array): 각 문서에 할당된 클러스터 라벨
        top_n (int): 각 클러스터에서 추출할 키워드 수 (기본 5)
    반환:
        dict: 클러스터 라벨을 키로, 대표 키워드 리스트를 값으로 갖는 딕셔너리
    """
    cluster_texts = defaultdict(list)
    for i, label in enumerate(labels):
        cluster_texts[label].append(texts[i])

    cluster_keywords = {}
    for label, docs in cluster_texts.items():
        noun_docs = extract_nouns_from_texts(docs)
        
        # 🔽 예외 처리: 빈 문자열 제거
        noun_docs = [doc for doc in noun_docs if doc.strip()]
        if not noun_docs:
            print(f"[경고] 클러스터 {label}에 유효한 텍스트가 없습니다. → 빈 키워드 반환")
            cluster_keywords[label] = []
            continue

        vectorizer = TfidfVectorizer(max_features=top_n)
        try:
            tfidf_matrix = vectorizer.fit_transform(noun_docs)
            keywords = vectorizer.get_feature_names_out()
            cluster_keywords[label] = list(keywords)
        except ValueError:
            print(f"[경고] 클러스터 {label}에서 TF-IDF 키워드 추출 실패 → 빈 키워드 반환")
            cluster_keywords[label] = []

    return cluster_keywords


# =================== 시각화 함수 ===================
