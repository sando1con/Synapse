# Synapse

**Synapse**는 사용자 문서를 자동으로 분석하고 의미 기반으로 분류하여 시각화하는 문서 클러스터링 플랫폼입니다.  
React 기반의 프론트엔드, Spring Boot 기반의 백엔드, FastAPI 기반의 Python 분석 서버가 통합되어 사용자에게 실시간 문서 클러스터링 및 시각화 기능을 제공합니다.

---

## 🚀 주요 기능

- 사용자 로그인 및 파일 업로드/다운로드 (Spring Boot)
- 공유 폴더 생성 및 초대 기반 파일 공유 기능
- 업로드된 문서의 의미 분석 및 클러스터링 (FastAPI + Sentence-BERT)
- 클러스터 결과 시각화 및 미리보기 (React + ForceGraph2D)
- S3를 이용한 파일 저장 및 분석 결과 관리

---

## 🧰 기술 스택

- **Frontend**: React.js, react-router-dom, ForceGraph2D, styled-components
- **Backend**: Spring Boot, JPA, MySQL, S3 SDK
- **Analysis Server**: Python, FastAPI, Sentence-BERT, KMeans, Matplotlib
- **Infra**: AWS EC2, S3, Docker

---

## 📁 폴더 구조

```
Synapse/
├── backend_python/                # 🔍 문서 분석 서버 (FastAPI 기반)
│   ├── main.py                   # FastAPI 엔트리포인트 (analyze API)
│   ├── config/                   # 설정 파일 (예: 경로 설정 등)
│   ├── models/                   # 문서 모델 정의 (DocumentModel 등)
│   ├── utils/                    # 전처리 및 분석 유틸리티 모듈
│   │   ├── file_manager/        # 파일 포맷별 텍스트 추출 (docx, pdf, hwp 등)
│   │   ├── clustering_utils.py  # 클러스터링 및 임베딩 처리 로직
│   │   ├── retrain_manager.py   # 클러스터 재학습 관련 로직
│   │   └── s3_utils.py          # S3 파일 다운로드 등 처리
│   └── processed_data/          # 분석 결과 캐시(json), 시각화 이미지 저장(png)

├── backend_spring/               # 🧩 API 서버 및 파일/사용자 관리 (Spring Boot)
│   ├── build.gradle              # Gradle 설정
│   └── src/
│       ├── main/java/com/example/synapse/
│       │   ├── controller/       # 업로드/다운로드/공유폴더 관련 API
│       │   ├── entity/           # User, FileEntity, SharedFolder 등의 DB 모델
│       │   ├── repository/       # JPA Repository
│       │   ├── service/          # Python 분석 연동, 파일 처리, 유저 관리 서비스
│       │   └── SynapseApplication.java  # SpringBoot 시작점
│       └── resources/static/     # 빌드된 React 정적 파일들 (.png, .html 등 포함)

├── frontend_react/               # 🖥️ 사용자 인터페이스 (React)
│   ├── public/                   # 정적 자원 (로고, 이미지, index.html 등)
│   ├── src/
│   │   ├── components/           # 주요 컴포넌트: 로그인, 홈, 파일 미리보기 등
│   │   ├── styles/               # 각 컴포넌트별 CSS 파일
│   │   ├── App.js                # 라우터 및 전체 페이지 구성
│   │   └── index.js              # 앱 렌더링 진입점
│   └── package.json              # React 의존성 설정

└── data/                         # 📂 로컬 테스트용 원본 문서 및 모델 데이터
    ├── raw/                      # 원본 문서(docx 등)
    └── processed/                # 학습된 KMeans, PCA 모델 및 캐시
```

---

## ⚙️ 실행 방법

### 1. Python 분석 서버 실행

```bash
cd backend_python
pip install -r requirements.txt
uvicorn main:app --reload
```

- POST /analyze 요청 예시:
```json
{
  "user_id": "testuser",
  "shared_id": "optional_shared_id"
}
```

### 2. Spring Boot 서버 실행

```bash
cd backend_spring
./gradlew build
java -jar build/libs/synapse-0.0.1-SNAPSHOT.jar
```

### 3. React 앱 실행

```bash
cd frontend_react
npm install
npm start
```

---

## 📡 주요 API

### FastAPI
- POST `/analyze`: S3 문서 다운로드 및 클러스터링 분석 실행

### Spring Boot
- POST `/upload`: 파일 업로드
- GET `/download`: 파일 다운로드
- GET `/shared-folders`: 공유 폴더 목록
- POST `/shared-folders`: 공유 폴더 생성 및 초대
- GET `/files/clustered`: 클러스터링 결과 반환

### React
- `/`: 파일 업로드, 군집 시각화
- `/preview`: 미리보기
- `/shared/:token`: 공유폴더 접속

---

## 🌟 기대 효과

- 문서 탐색 시간 절약 (클러스터 자동 분류 및 시각화)
- 협업 시 문서의 흐름과 유사도 파악 가능
- 개인/공유 문서의 통합 관리 시스템 제공
