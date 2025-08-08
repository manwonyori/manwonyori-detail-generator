const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Claude API 초기화 (환경변수에서 키 읽기)
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

app.use(express.json());
app.use(express.static('public'));

// Root route - serve the main page
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// API 엔드포인트
app.post('/api/generate', async (req, res) => {
  try {
    const requestData = req.body;
    
    // 프롬프트 생성
    const prompt = generateFullPrompt(requestData);
    
    // Claude API 호출
    const message = await anthropic.messages.create({
      model: "claude-3-opus-20240229",
      max_tokens: 8000,
      messages: [{
        role: "user",
        content: prompt
      }]
    });
    
    res.json({
      success: true,
      html: message.content[0].text,
      seo: generateSEO(requestData.productName, requestData.category)
    });
    
  } catch (error) {
    console.error('Claude API Error:', error);
    res.status(500).json({
      success: false,
      error: 'API 호출 실패: ' + error.message
    });
  }
});

// 완전한 프롬프트 생성 함수
function generateFullPrompt(data) {
  const isDetailedMode = data.composition || data.ingredients || data.characteristics;
  
  if (isDetailedMode) {
    // 상세 입력 모드
    return `
당신은 "만원요리 최씨남매" 브랜드의 전문 상세페이지 작성자이자 모바일 UI/UX 전문가입니다.

**제품 상세 정보:**
- 제품명: ${data.productName}
- 구성 및 규격: ${data.composition || '정보 없음'}
- 소비기한: ${data.expiry || '정보 없음'}
- 제품종류: ${data.productType || '정보 없음'}
- 유형: ${data.storageType || '정보 없음'}
- 성분: ${data.ingredients || '정보 없음'}
- 제품특성: ${data.characteristics || '정보 없음'}
- 주의사항: ${data.caution || '없음'}
- HACCP 인증: ${data.haccp ? '있음' : '없음'}
- 이미지 URL: ${data.images ? data.images.join(', ') : '없음'}

**중요 규칙:**
1. 품목제조보고서 성분 정보는 절대 변경하지 말고 그대로 사용
2. 입력된 정보를 우선 사용하되, MZ 친화적으로 다듬기
3. 판매자 정보는 항상 ㈜값진한끼 (고정)

**8개 고정 섹션 구조:**
1. Strategic Header (MZ 스토리 포함)
2. Why Section (4가지 핵심 장점)
3. 상세 이미지 섹션 (Why 다음 배치)
4. Wow Section (배송비 절약 고정 메시지)
5. How Section (활용법 2가지)
6. Trust Section (신뢰도 요소 - HACCP 선택적)
7. Company Info (판매자 고정)
8. Footer CTA`;
  } else {
    // 간단 입력 모드
    return `
당신은 "만원요리 최씨남매" 브랜드의 전문 상세페이지 작성자입니다.

**제품 정보:**
- 제품명: ${data.productName}
- 카테고리: ${data.category || '미지정'}
- 주의사항: ${data.caution || '없음'}
- HACCP 인증: ${data.haccp ? '있음' : '없음'}
- 이미지 URL: ${data.images ? data.images.join(', ') : '없음'}
- 참조 사이트: ${data.reference || '없음'}

**미션:**
1. 이 제품의 역사적 배경/스토리를 MZ 세대가 흥미로워할 한 줄로 요약
2. 만원요리 최씨남매 브랜드 통일성에 맞는 8개 섹션 구조로 완전한 HTML 생성`;
  }
  
  const commonRequirements = `

**모바일 반응형 요구사항:**
- clamp() 함수로 유연한 크기 조절
- 터치 타겟 최소 44px
- 줄간격 1.6~1.7
- mobile-first 접근

**출력:** 
완전한 HTML 코드만 생성 (<!DOCTYPE html>부터 </html>까지, 설명 없이)
반드시 8개 섹션 모두 포함, 판매자 정보는 ㈜값진한끼 고정`;
  
  return (isDetailedMode ? 
    generateFullPrompt(data) : 
    generateFullPrompt(data)) + commonRequirements;
}

// SEO 데이터 생성 (개선)
function generateSEO(productName, category) {
  const year = new Date().getFullYear();
  
  // 제품명에서 브랜드 추출
  const brandMatch = productName.match(/\[(.+?)\]/);
  const brand = brandMatch ? brandMatch[1] : '';
  const cleanProductName = productName.replace(/\[.+?\]/, '').trim();
  
  // 20자 이내 요약/간략설명 생성
  const summary = cleanProductName.length > 20 ? 
    cleanProductName.substring(0, 17) + '...' : 
    cleanProductName;
  
  const brief = category ? 
    `${category} ${brand} 제품`.substring(0, 20) : 
    '만원요리 추천 상품';
  
  // 브랜드 기반 키워드 생성
  const keywords = [
    '만원요리', '최씨남매',
    `만원요리${cleanProductName}`, `최씨남매${cleanProductName}`,
    brand && `${brand}`, brand && `만원요리${brand}`,
    cleanProductName, category,
    '만원요리추천', '최씨남매추천'
  ].filter(k => k).join(',');
  
  return {
    title: `${productName} | 만원요리 최씨남매`,
    description: `${productName} - 만원요리 최씨남매 검증 제품. ${category || ''}`,
    keywords: keywords,
    author: '만원요리 최씨남매',
    copyright: `© ${year} 만원요리 최씨남매. All rights reserved.`,
    summary: summary,
    brief: brief
  };
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Claude API Key:', process.env.CLAUDE_API_KEY ? '✅ Loaded' : '❌ Missing');
});