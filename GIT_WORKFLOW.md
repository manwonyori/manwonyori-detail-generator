# 📚 Git 기반 작업 관리 가이드

## 🚀 세션 시작 명령어
```bash
# 새 세션 시작 시 한 줄 명령
cd C:\Users\8899y\SuperClaude\Projects\manwonyori_detail && git log --oneline -10 && git status
```

## 📊 오늘의 주요 작업 내역 (2025-08-09)

### ✅ 완료된 작업들
1. **SEO 메타태그 정리** 
   - 검색어와 메타태그 분리 표시
   - 메타태그1-4 순서대로 정리
   - 커밋: `56b78aa`, `54c372b`

2. **제품특성 처리 개선**
   - AI 통합 제거, 별도 섹션 구현  
   - 사용자 입력 그대로 표시
   - 커밋: `d085902`, `cb5180d`, `5c5ba67`

3. **모바일 UX 개선**
   - 하이브리드 텍스트 정렬 적용
   - JSON 파싱 안정화
   - 커밋: `0f966d4`

4. **배송정보 커스터마이징**
   - 하드코딩 제거, 사용자 입력 반영
   - 커밋: `40e06e0`, `ea713a4`

## 🧪 주요 테스트 명령어
```bash
# 전체 시스템 테스트
node complete_system_test.js

# 제품특성 테스트
node simple_characteristics_test.js

# 텍스트 파싱 API 테스트
node test_parse_api.js

# 모바일 정렬 테스트
node test_mobile_alignment.js
```

## 🔄 일반 작업 흐름
```bash
# 1. 상태 확인
git status
git diff

# 2. 작업 수행
# (코드 수정)

# 3. 테스트
node complete_system_test.js

# 4. 커밋
git add -A
git commit -m "Fix: 문제 설명"

# 5. 배포
git push origin main
```

## 🎯 프로젝트 현황
- **프로덕션 URL**: https://manwonyori-detail-generator.onrender.com
- **GitHub**: https://github.com/manwonyori/manwonyori-detail-generator
- **현재 성공률**: 80% (5개 중 4개 테스트 통과)

## 🔍 문제 해결 히스토리
| 문제 | 해결 | 커밋 |
|------|------|------|
| JSON 파싱 오류 | 템플릿 리터럴 제거, 정제 강화 | `0f966d4` |
| 제품특성 AI 통합 문제 | 별도 섹션으로 분리 | `d085902` |
| 모바일 텍스트 정렬 | 하이브리드 방식 적용 | `0f966d4` |
| SEO 메타태그 누락 | formatSEO 함수 수정 | `56b78aa` |

## 💡 다음 세션 시작 방법
```bash
# 이 파일 읽고 상태 확인
cat GIT_WORKFLOW.md

# Git 상태로 현재 진행상황 파악  
git log --oneline -5
git status

# 마지막 테스트 재실행
node complete_system_test.js
```

## 📝 커밋 메시지 규칙
- `Fix:` 버그 수정
- `Feat:` 새 기능
- `Test:` 테스트 추가
- `Docs:` 문서 수정
- `✨` 주요 기능 개선
- `🔧` 설정/구조 변경
- `🎯` 중요 수정사항

---
*마지막 업데이트: 2025-08-09*