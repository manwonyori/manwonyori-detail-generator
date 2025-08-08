# 만원요리 최씨남매 상세페이지 생성 시스템

## 🚀 설치 및 실행

### 1. 로컬 개발 환경

```bash
# 1. 의존성 설치
npm install

# 2. .env 파일에 API 키 입력
# CLAUDE_API_KEY=sk-ant-api03-실제키입력

# 3. 개발 서버 실행
npm run dev

# 4. 브라우저에서 접속
http://localhost:3000
```

### 2. Render 배포

#### Render 대시보드 설정:

1. **New Web Service** 생성
2. **GitHub 연결** (이 레포지토리)
3. **Build Command**: `npm install`
4. **Start Command**: `npm start`
5. **Environment Variables 추가**:
   - `CLAUDE_API_KEY`: 실제 Claude API 키
   - `NODE_ENV`: production
   - `PORT`: (Render가 자동 설정)

#### 환경변수 설정 위치:
- Render Dashboard → Your Service → Environment → Add Environment Variable
- Key: `CLAUDE_API_KEY`
- Value: `sk-ant-api03-xxxxx` (실제 키)

## 📁 프로젝트 구조

```
web-system/
├── server.js           # Express 서버 (API 엔드포인트)
├── public/
│   └── index.html     # 프론트엔드 UI
├── package.json       # 의존성 관리
├── .env              # 로컬 환경변수 (Git 제외)
├── .env.example      # 환경변수 예시
└── .gitignore        # Git 제외 파일
```

## 🔐 보안 주의사항

⚠️ **절대 하지 마세요:**
- `.env` 파일을 GitHub에 커밋
- API 키를 코드에 하드코딩
- 클라이언트 사이드에서 API 키 노출

✅ **반드시 하세요:**
- Render 대시보드에서 환경변수 설정
- `.gitignore`에 `.env` 포함 확인
- 정기적으로 API 키 갱신

## 🎯 주요 기능

1. **간단 입력 모드**
   - 제품명만으로 상세페이지 생성
   - AI 스토리 크롤링
   - 자동 SEO 최적화

2. **상세 입력 모드**
   - 모든 정보 직접 입력
   - 품목제조보고서 반영
   - 정확한 데이터 기반 생성

3. **다운로드 기능**
   - HTML 상세페이지
   - 카페24 SEO 텍스트 파일

## 📝 API 엔드포인트

### POST `/api/generate`

**Request Body:**
```json
{
  "productName": "[인생]옛날치킨700g",
  "category": "냉동식품",
  "caution": "매운맛 주의",
  "haccp": true,
  "images": ["url1", "url2"],
  "reference": "https://example.com"
}
```

**Response:**
```json
{
  "success": true,
  "html": "<html>...</html>",
  "seo": {
    "title": "제품명 | 만원요리",
    "keywords": "...",
    "description": "..."
  }
}
```

## 🛠️ 기술 스택

- **Backend**: Node.js, Express
- **AI**: Claude API (Anthropic)
- **Frontend**: Vanilla JS, TailwindCSS
- **Deployment**: Render
- **Version Control**: GitHub

## 📞 문의

- 이메일: we@manwonyori.com
- 전화: 070-8835-2885

---

© 2025 만원요리 최씨남매. All rights reserved.