import re
from collections import Counter
import numpy as np
from konlpy.tag import Okt
from sklearn.feature_extraction.text import TfidfVectorizer
from utils.file_manager_utils import sanitize_filename

# 불필요한 토큰 제거용 불용어 리스트
STOPWORDS = {
    "안녕하세요", "되었습니다", "됐습니다", "합니다", "하였다", "안녕하십니까",
    "이", "가", "은", "는", "을", "를", "에", "의", "와", "과", "도", "만", "으로", "로", "께",
    "에서", "에게", "보다", "부터", "까지", "만큼", "까지도", "까지는", "께서",
    "그리고", "하지만", "또한", "그러나", "또", "더", "더욱", "즉", "바로", "또는",
    "것", "수", "등", "정도", "약", "약간", "전체", "부분", "아래", "위", "및", "결과",
    "그", "저", "어떤", "모든", "각", "관련", "이후", "이전", "현재", "기준", "대해", "때문",
    "때문에", "위해", "위하여", "위해서", "대한", "될", "돼", "되어"
}

okt = Okt()

def tokenize(text: str) -> list[str]:
    return re.findall(r"[가-힣A-Za-z0-9]+", text)

def extract_noun_phrases(text: str) -> list[str]:
    phrases, current = [], []
    for word, tag in okt.pos(text):
        if tag in ("NNG", "NNP"):
            current.append(word)
        else:
            if len(current) > 1:
                phrases.append("".join(current))
            current = []
    if len(current) > 1:
        phrases.append("".join(current))
    return phrases

def extract_ngrams(tokens: list[str], n: int = 2) -> list[str]:
    return [" ".join(tokens[i:i+n]) for i in range(len(tokens) - n + 1)]

def compute_idf_weights(doc_texts: list[str]) -> dict[str, float]:
    tfidf = TfidfVectorizer(token_pattern=r"[가-힣A-Za-z0-9]+", stop_words=list(STOPWORDS))
    tfidf.fit(doc_texts)
    return {word: idf for word, idf in zip(tfidf.get_feature_names_out(), tfidf.idf_)}

def derive_doc_category(
    keywords: list[str],
    filename: str,
    first_sentence: str,
    remaining_text: str,
    weights: dict[str,int] = None,
    idf_weights: dict[str,float] = None
) -> str:
    """
    키워드, 파일명, 첫문장, 본문 텍스트를 결합해
    (1) 첫문장 전처리, (2) 고/저 빈도 percentile 필터, (3) 동적 가중치 적용
    최적 카테고리 토큰 또는 구를 반환

    기본 가중치:
      title:5, keywords:1, first_sentence:2, remaining_text:1, noun_phrases:1
    """
    try:
        # 첫문장 전처리
        fs = first_sentence.split("\n")[0]
        fs = re.sub(r"\d{1,2}/\d{1,2}/\d{2,4}", "", fs)
        # 기본 가중치
        base_weights = weights or {"title":5, "keywords":1, "first_sentence":2, "remaining_text":1, "noun_phrases":1}
        # 토큰 및 명사구 추출 (한 글자 제외)
        clean_title = sanitize_filename(filename)
        title_tokens = [tok for tok in tokenize(clean_title) if tok not in STOPWORDS and len(tok)>1]
        kw_tokens = [tok for tok in keywords if tok not in STOPWORDS and len(tok)>1]
        first_tokens = [tok for tok in okt.nouns(fs) if tok not in STOPWORDS and len(tok)>1]
        remain_tokens = [tok for tok in okt.nouns(remaining_text) if tok not in STOPWORDS and len(tok)>1]
        noun_phrases = [p for p in extract_noun_phrases(fs + " " + remaining_text) if len(p)>1]
        # IDF 필터링
        if idf_weights:
            vals = np.array(list(idf_weights.values()))
            low, high = np.percentile(vals, 10), np.percentile(vals, 90)
            def freq_filter(tok):
                if tok in title_tokens or tok in first_tokens:
                    return True
                v = idf_weights.get(tok, np.median(vals))
                return low <= v <= high
            title_tokens = [t for t in title_tokens if freq_filter(t)]
            kw_tokens = [t for t in kw_tokens if freq_filter(t)]
            first_tokens = [t for t in first_tokens if freq_filter(t)]
            remain_tokens = [t for t in remain_tokens if freq_filter(t)]
            noun_phrases = [p for p in noun_phrases if all(freq_filter(w) for w in p.split())]
        # 동적 가중치
        counts = {k: len(v) for k,v in {
            "title": title_tokens,
            "keywords": kw_tokens,
            "first_sentence": first_tokens,
            "remaining_text": remain_tokens,
            "noun_phrases": noun_phrases
        }.items()}
        total = sum(counts.values()) or 1
        dyn_w = {k: base_weights[k] * (counts[k]/total) for k in base_weights}
        # 제목 클리핑
        if counts.get("title",0)/total > 0.8 and title_tokens:
            return title_tokens[0]
        # 후보 및 스코어링
        candidates = set(title_tokens + kw_tokens + first_tokens + remain_tokens + noun_phrases)
        scores = Counter()
        for tok in candidates:
            score = 0
            if tok in title_tokens: score += dyn_w["title"]
            if tok in kw_tokens: score += dyn_w["keywords"]
            if tok in first_tokens: score += dyn_w["first_sentence"]
            if tok in remain_tokens: score += dyn_w["remaining_text"]
            if tok in noun_phrases: score += dyn_w["noun_phrases"]
            if tok in title_tokens and tok in first_tokens:
                score += dyn_w["title"] + dyn_w["first_sentence"]
            scores[tok] = score
        # unigram vs bigram
        if not scores:
            return title_tokens[0] if title_tokens else sanitize_filename(filename).split()[0]
        best_tok, best_score = scores.most_common(1)[0]
        bigrams = extract_ngrams(tokenize(fs + " " + remaining_text), 2)
        # bigram 생성 및 중복 단어 제외
        bigram_scores = {}
        for bg in bigrams:
            parts = bg.split()
            # skip invalid or identical
            if len(parts) != 2 or parts[0] == parts[1]:
                continue
            bigram_scores[bg] = scores.get(parts[0], 0) + scores.get(parts[1], 0)
        if bigram_scores:
            bg, bg_score = max(bigram_scores.items(), key=lambda x: x[1])
            if bg_score >= best_score * 1.2:
                return bg
        return best_tok
    except Exception:
        # 안정성: 예외 시 파일명 기반 반환
        clean = sanitize_filename(filename).split()
        return clean[0] if clean else ""


def hybrid_cluster_label(
    docs: list[dict],
    detail_boost: float = 0.5
) -> str:
    """
    클러스터 내 문서별 카테고리와 대표 키워드를 결합해
    derive_doc_category 로 Super Category를 도출합니다.
    """
    try:
        keywords = docs[0].get('representative_keywords', []) if docs else []
        vecs = np.array([d['vector_2d'] for d in docs])
        cent = vecs.mean(axis=0)
        idx = int(np.argmin(np.linalg.norm(vecs - cent, axis=1)))
        medoid = docs[idx]
        fn, fs = medoid['filename'], medoid['first_sentence']
        rem_text = " ".join(d.get('category','') for d in docs)
        return derive_doc_category(
            keywords=keywords,
            filename=fn,
            first_sentence=fs,
            remaining_text=rem_text
        )
    except Exception:
        return ""
