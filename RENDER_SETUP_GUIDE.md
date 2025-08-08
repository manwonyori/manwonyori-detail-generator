# 🚀 Render 배포 세팅 가이드

## 📋 Step 1: Render 계정 생성
1. https://render.com 접속
2. "Get Started for Free" 클릭
3. GitHub 계정으로 가입 (권장) 또는 이메일로 가입

---

## 🔗 Step 2: GitHub 연결
1. Render 대시보드에서 "New +" 클릭
2. "Web Service" 선택
3. "Connect GitHub" 클릭
4. GitHub 권한 승인
5. "manwonyori-detail-generator" 레포지토리 선택

---

## ⚙️ Step 3: Web Service 설정

### 기본 설정:
- **Name**: `manwonyori-detail`
- **Region**: `Singapore (Southeast Asia)` (한국과 가장 가까움)
- **Branch**: `main`
- **Root Directory**: 비워두기
- **Runtime**: `Node`

### 빌드 & 시작 명령:
- **Build Command**: `npm install`
- **Start Command**: `npm start`

### 환경 변수 (중요!):
"Environment Variables" 섹션에서 "Add Environment Variable" 클릭:

| Key | Value |
|-----|-------|
| CLAUDE_API_KEY | sk-ant-api03a7P7zhmLSLXJY2YSY0S-3oRsml6l_PFirWBc9I_xwEdWy13y1p_z_CxgOpmTp9IE391pwwgP8xitpRQFjHMSXA-_zi6WAAA |
| PORT | 3000 |
| NODE_ENV | production |

### 인스턴스 타입:
- **Free** 선택 (테스트용)
- 나중에 필요시 업그레이드 가능

---

## 🚀 Step 4: 배포
1. 모든 설정 확인
2. "Create Web Service" 클릭
3. 배포 진행 (2-5분 소요)
4. 배포 완료 후 URL 확인

---

## ✅ Step 5: 테스트

### 배포된 URL:
```
https://manwonyori-detail.onrender.com
```

### 테스트 시나리오:
1. **간단 입력 테스트**:
   - 제품명: [인생]옛날치킨700g
   - 카테고리: 냉동식품

2. **상세 입력 테스트**:
   - 함흥 물냉면 데이터 입력
   - 모든 필드 작성

---

## ⚠️ 주의사항

### Free Tier 제한:
- 15분 비활성 시 자동 슬립
- 첫 요청 시 30-60초 지연 (콜드 스타트)
- 월 750시간 무료 사용

### 트러블슈팅:

**1. 배포 실패 시:**
- Logs 탭에서 에러 확인
- package.json 의존성 확인
- Node 버전 호환성 확인

**2. API 키 오류:**
- Environment Variables 재확인
- 값에 따옴표나 공백 없는지 확인

**3. 서버 시작 안됨:**
- Start Command 확인: `npm start`
- package.json의 scripts 섹션 확인

---

## 📊 모니터링

### Render Dashboard 기능:
- **Logs**: 실시간 로그 확인
- **Metrics**: CPU, 메모리 사용량
- **Events**: 배포 이벤트 기록
- **Settings**: 환경변수, 도메인 설정

### 로그 확인 방법:
1. Render Dashboard → Your Service
2. "Logs" 탭 클릭
3. 실시간 로그 스트림 확인

---

## 🔧 업데이트 방법

### 자동 배포 (권장):
1. 코드 수정
2. GitHub에 푸시:
```bash
git add .
git commit -m "Update: 설명"
git push
```
3. Render가 자동으로 재배포

### 수동 배포:
1. Render Dashboard
2. "Manual Deploy" → "Deploy latest commit"

---

## 🎯 다음 단계

### 프로덕션 준비:
1. **Custom Domain**: 자체 도메인 연결
2. **Paid Plan**: 더 나은 성능
3. **Auto-scaling**: 트래픽 대응
4. **Monitoring**: 외부 모니터링 툴 연동

### 보안 강화:
1. Rate limiting 구현
2. CORS 설정 강화
3. API 키 로테이션
4. 접근 로그 모니터링

---

## 📞 지원

### Render 문서:
- https://render.com/docs
- https://community.render.com

### 문제 발생 시:
1. Render Logs 확인
2. GitHub Issues 생성
3. 로컬에서 재현 테스트

---

**준비 완료!** 위 가이드를 따라 Render 배포를 진행하세요.