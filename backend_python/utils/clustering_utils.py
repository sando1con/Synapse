import os
import json
import numpy as np
from collections import defaultdict

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
import matplotlib.pyplot as plt

# Okt 객체 생성 (키워드 추출을 위해)
okt = Okt()

# =================== 임베딩 관련 함수 ===================

def encode_documents(texts, model_name="snunlp/KR-SBERT-V40K-klueNLI-augSTS"):
    """
    주어진 텍스트 리스트를 SentenceTransformer를 이용하여 벡터로 인코딩합니다.
    
    인자:
        texts (list): 문서 텍스트 리스트
        model_name (str): 사용할 pre-trained 모델 이름 (기본값 제공)
    반환:
        np.array: 각 텍스트의 벡터 표현 (정규화 포함)
    """
    model = SentenceTransformer(model_name)
    vectors = model.encode(texts, normalize_embeddings=True)
    return vectors

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
    pca = PCA(n_components=n_components, random_state=random_state)
    reduced = pca.fit_transform(vectors)
    scaler = StandardScaler()
    normalized = scaler.fit_transform(reduced)
    return normalized, pca, scaler

# =================== 클러스터링 함수 ===================

def find_best_k(vectors, k_min=2, max_ratio=0.15, random_state=42):
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
    print("📌 [DEBUG] find_best_k() 호출됨!")
    n_docs = len(vectors)
    k_max = max(k_min + 1, int(n_docs * max_ratio))
    k_max = min(k_max, n_docs - 1)

    scores = []
    for k in range(k_min, k_max + 1):
        kmeans = KMeans(n_clusters=k, random_state=random_state)
        labels = kmeans.fit_predict(vectors)
        score = silhouette_score(vectors, labels)
        print(f"K={k} → Silhouette Score: {score:.3f}")
        scores.append((k, score))

    best_score = max(score for _, score in scores)

    # best_score보다 0.05 이상 떨어지지 않는 후보 중 가장 큰 K 선택
    candidates = [k for k, s in scores if s >= best_score - 0.05]
    best_k = max(candidates)
    
    print(f"\n[선택된 클러스터 수: {best_k} (유사 점수 중 최대 K)]\n")
    return best_k

def cluster_documents_kmeans(vectors, auto_k=True, default_k=5, random_state=42):
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
        best_k = find_best_k(vectors, k_min=3, max_ratio=0.15, random_state=random_state)
    else:
        best_k = default_k

    kmeans = KMeans(n_clusters=best_k, random_state=random_state)
    labels = kmeans.fit_predict(vectors)
    return kmeans, labels, best_k

# =================== 키워드 추출 함수 ===================

def extract_nouns_from_texts(texts):
    """
    주어진 텍스트 리스트에서 각 문서에 대해 명사만 추출하여 문자열로 변환합니다.
    
    인자:
        texts (list): 문서 텍스트 리스트
    반환:
        list: 각 문서에서 추출한 명사들의 문자열 목록
    """
    return [" ".join(okt.nouns(text)) for text in texts]

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
        vectorizer = TfidfVectorizer(max_features=top_n)
        tfidf_matrix = vectorizer.fit_transform(noun_docs)
        keywords = vectorizer.get_feature_names_out()
        cluster_keywords[label] = list(keywords)
    return cluster_keywords

# =================== 시각화 함수 ===================

def visualize_clusters(reduced_vectors, labels, file_paths):
    """
    2차원으로 축소된 벡터와 클러스터 라벨을 이용하여 산점도 형태로 클러스터링 결과를 시각화합니다.
    
    인자:
        reduced_vectors (np.array): 2차원으로 축소되고 정규화된 벡터 (n_documents x 2)
        labels (list or np.array): 각 문서에 대한 클러스터 라벨
        file_paths (list): 문서 파일 경로 리스트 (파일 이름 표시용)
    """
    plt.figure(figsize=(8, 6))
    scatter = plt.scatter(reduced_vectors[:, 0], reduced_vectors[:, 1], c=labels, cmap='tab10', alpha=0.7)
    for i, file in enumerate(file_paths):
        plt.text(reduced_vectors[i, 0], reduced_vectors[i, 1], os.path.basename(file), fontsize=8, ha='right')
    plt.xlabel("PCA1")
    plt.ylabel("PCA2")
    plt.title("KMeans Clustering with Sentence-BERT")
    plt.colorbar(scatter, label="Cluster")
    plt.tight_layout()
    plt.show(block=False)