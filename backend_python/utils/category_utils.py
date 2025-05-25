# utils/category_utils.py
import re
from collections import Counter
import numpy as np
from konlpy.tag import Okt
from sklearn.feature_extraction.text import TfidfVectorizer

# 불필요한 토큰 제거용 불용어 리스트 (확장됨)
STOPWORDS = {
    # 기본 인사 및 형용사
    "안녕하세요", "되었습니다", "됐습니다", "되었습니다", "합니다", "하였다", "합니다", "되었습니다", "안녕하십니까"
    # 조사 및 어미
    "이", "가", "은", "는", "을", "를", "에", "의", "와", "과", "도", "만", "으로", "로", "께",
    "에서", "에게", "보다", "부터", "까지", "만큼", "까지도", "까지는", "께서",
    # 접속사 및 부사
    "그리고", "하지만", "또한", "그러나", "또", "더", "더욱", "즉", "바로", "또는",
    # 의미 없는 단어
    "것", "수", "등", "정도", "약", "약간", "전체", "부분", "아래", "위", "및", "결과",
    # 기타
    "그", "저", "어떤", "모든", "각", "관련", "이후", "이전", "현재", "기준", "대해", "때문",
    "때문에", "위해", "위하여", "위해서", "대한", "될", "돼", "되어", "중"
}

# 형태소 분석기 초기화 (Okt)
okt = Okt()


def tokenize(text: str) -> list[str]:
    """
    간단한 토큰화: 한글, 영문, 숫자를 단위로 분리
    """
    return re.findall(r"[가-힣A-Za-z0-9]+", text)


def compute_idf_weights(doc_texts: list[str]) -> dict[str, float]:
    """
    주어진 문서 리스트에서 TF-IDF 벡터라이저를 학습하고,
    각 단어의 IDF 값을 반환합니다.
    """
    tfidf = TfidfVectorizer(token_pattern=r"[가-힣A-Za-z0-9]+", stop_words=list(STOPWORDS))
    tfidf.fit(doc_texts)
    idf_dict = {word: idf for word, idf in zip(tfidf.get_feature_names_out(), tfidf.idf_)}
    return idf_dict


def derive_doc_category(
    keywords: list[str],
    first_sentence: str,
    remaining_text: str,
    weights: dict[str,int] = None,
    idf_weights: dict[str,float] = None
) -> str:
    """
    대표 키워드, 첫 문장, 본문(나머지 텍스트)을 조합해 가중치 기반으로
    가장 적합한 카테고리를 선택합니다.

    TF-IDF의 IDF 값을 활용해 흔한 단어의 영향력을 줄일 수 있습니다.
    기본 가중치:
      - keywords:        1
      - first_sentence:  3
      - remaining_text:  2
    """
    # 기본 가중치 설정
    if weights is None:
        weights = {"keywords": 1, "first_sentence": 3, "remaining_text": 2}

    # 1) 키워드에서 불용어 제거
    kw_tokens = [tok for tok in keywords if tok not in STOPWORDS]

    # 2) 형태소 분석으로 명사만 추출하고, 불용어 제거
    first_tokens = [tok for tok in okt.nouns(first_sentence) if tok not in STOPWORDS]
    remain_tokens = [tok for tok in okt.nouns(remaining_text) if tok not in STOPWORDS]

    # 토큰 후보 집합
    candidates = set(kw_tokens + first_tokens + remain_tokens)
    scores = Counter()
    for tok in candidates:
        # 기본 가중치 합산
        base_score = 0
        if tok in kw_tokens:
            base_score += weights["keywords"]
        if tok in first_tokens:
            base_score += weights["first_sentence"]
        if tok in remain_tokens:
            base_score += weights["remaining_text"]
        # IDF 가중치 적용 (있으면 곱셈)
        if idf_weights and tok in idf_weights:
            base_score *= idf_weights[tok]
        scores[tok] = base_score

    # 가장 높은 점수의 토큰 반환
    return scores.most_common(1)[0][0] if scores else ""


def hybrid_cluster_label(
    docs: list[dict],
    epsilon: float = 1e-6,
    lambda_factor: float = None,
    detail_boost: float = 1.0
) -> str:
    """
    Medoid + distance-weighted voting 기반으로 클러스터 카테고리를 결정합니다.
    detail_boost를 통해 문서별 카테고리 빈도의 우선순위를 조정할 수 있습니다.

    docs: 각 문서에 'vector_2d'와 'category' 키가 포함된 dict 리스트
    epsilon: 거리 0 회피를 위한 작은 값
    lambda_factor: medoid 보너스 점수 (None이면 최대 가중치 사용)
    detail_boost: 각 카테고리별 문서 수(count)에 곱해 더해질 가중치
    """
    vectors = np.array([d['vector_2d'] for d in docs])
    categories = [d['category'] for d in docs]

    # Centroid와 거리 기반 가중 투표
    centroid = vectors.mean(axis=0)
    dists = np.linalg.norm(vectors - centroid, axis=1)
    weights_arr = 1.0 / (dists + epsilon)
    vote_scores = Counter()
    for cat, w in zip(categories, weights_arr):
        vote_scores[cat] += w

    # Medoid 보너스
    medoid_idx = int(np.argmin(dists))
    medoid_cat = categories[medoid_idx]
    if lambda_factor is None:
        lambda_factor = weights_arr.max()
    vote_scores[medoid_cat] += lambda_factor

    # 문서 빈도 기반 보너스 (detail_boost)
    counts = Counter(categories)
    for cat, cnt in counts.items():
        vote_scores[cat] += detail_boost * cnt

    return vote_scores.most_common(1)[0][0]
