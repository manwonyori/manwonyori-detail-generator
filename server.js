const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Claude API 초기화
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

app.use(express.json());
app.use(express.static('public'));

// Root route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Template loading
let templateHTML = '';
async function loadTemplate() {
  try {
    templateHTML = await fs.readFile(path.join(__dirname, 'public', 'template-final.html'), 'utf-8');
    console.log('Template loaded successfully');
  } catch (error) {
    console.error('Failed to load template:', error);
  }
}
loadTemplate();

// API endpoint
app.post('/api/generate', async (req, res) => {
  try {
    const requestData = req.body;
    
    // JSON 데이터만 생성하도록 프롬프트 작성
    const prompt = generateDataPrompt(requestData);
    
    // Claude API 호출
    const message = await anthropic.messages.create({
      model: "claude-3-opus-20240229",
      max_tokens: 2000, // JSON이므로 작아도 충분
      messages: [{
        role: "user",
        content: prompt
      }]
    });
    
    // JSON 파싱
    let productData;
    try {
      const jsonText = message.content[0].text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      productData = JSON.parse(jsonText);
    } catch (e) {
      console.error('JSON parse error:', e);
      productData = generateFallbackData(requestData);
    }
    
    // 템플릿에 데이터 바인딩
    const finalHTML = bindDataToTemplate(templateHTML, productData, requestData);
    
    // SEO 데이터 생성 (50개 이상 키워드)
    const seoData = generateEnhancedSEO(requestData.productName, requestData.category);
    
    res.json({
      success: true,
      html: finalHTML,
      seo: seoData
    });
    
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      success: false,
      error: 'API 호출 실패: ' + error.message
    });
  }
});

// JSON 데이터만 생성하는 프롬프트
function generateDataPrompt(data) {
  const isDetailedMode = data.composition || data.ingredients;
  
  return `당신은 "만원요리 최씨남매" 브랜드의 콘텐츠 전문가입니다.
다음 제품 정보를 바탕으로 JSON 데이터만 생성해주세요.

제품 정보:
- 제품명: ${data.productName}
- 카테고리: ${data.category || '미지정'}
${isDetailedMode ? `- 구성: ${data.composition}
- 소비기한: ${data.expiry}
- 보관방법: ${data.storageType}
- 성분: ${data.ingredients}
- 특성: ${data.characteristics}` : ''}
- HACCP: ${data.haccp ? '인증' : '미인증'}
- 주의사항: ${data.caution || '없음'}

다음 JSON 형식으로만 응답하세요:
{
  "heroTitle": "MZ세대가 주목하는 역사적 스토리를 담은 제목",
  "heroSubtitle": "제품의 매력을 2줄로 설명",
  "badge1": "핵심 장점 1",
  "badge2": "핵심 장점 2", 
  "badge3": "핵심 장점 3",
  "productCleanName": "브랜드 제거한 깨끗한 제품명",
  "why1Title": "장점 제목 1",
  "why1Text": "장점 설명 1",
  "why2Title": "장점 제목 2",
  "why2Text": "장점 설명 2",
  "why3Title": "장점 제목 3",
  "why3Text": "장점 설명 3",
  "why4Title": "장점 제목 4",
  "why4Text": "장점 설명 4",
  "how1Title": "활용법 1",
  "how1Text": "자세한 활용 방법 설명 1",
  "how2Title": "활용법 2",
  "how2Text": "자세한 활용 방법 설명 2",
  "storageType": "${data.storageType || '냉동'}",
  "footerTitle": "제품의 핵심 메시지 (예: 집에서 만나는 함흥의 그 맛!)",
  "footerSubtitle": "만원요리 최씨남매가 검증한 [제품명]을<br>이제 간편하게 집에서 만나보세요!",
  "footerBadge1": "제품 특징 1",
  "footerBadge2": "제품 특징 2",
  "footerBadge3": "제품 특징 3"
}

중요: 반드시 유효한 JSON만 반환하고, 설명이나 주석 없이 JSON만 출력하세요.`;
}

// 템플릿에 데이터 바인딩
function bindDataToTemplate(template, data, requestData) {
  let html = template;
  
  // 기본 데이터 바인딩
  Object.keys(data).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    html = html.replace(regex, data[key] || '');
  });
  
  // 제품명 바인딩
  html = html.replace(/{{productName}}/g, requestData.productName);
  
  // 이미지 섹션 처리
  if (requestData.images && requestData.images.length > 0) {
    const imagesHTML = requestData.images.map(url => 
      `<img src="${url}" alt="${requestData.productName}" class="w-full rounded-lg shadow-lg mb-6">`
    ).join('\n');
    html = html.replace('<!-- 이미지가 여기에 삽입됩니다 -->', imagesHTML);
  }
  
  // HACCP 카드 표시/숨김
  if (!requestData.haccp) {
    html = html.replace('id="haccpCard"', 'id="haccpCard" style="display: none;"');
  }
  
  // 제품 정보 섹션 (Company Info 섹션의 제품 정보)
  let productInfoHTML = '';
  if (requestData.composition) {
    productInfoHTML += `<span class="font-bold">구성:</span><span>${requestData.composition}</span>`;
  }
  if (requestData.expiry) {
    productInfoHTML += `<span class="font-bold">소비기한:</span><span>${requestData.expiry}</span>`;
  }
  if (requestData.productType) {
    productInfoHTML += `<span class="font-bold">제품종류:</span><span>${requestData.productType}</span>`;
  }
  if (requestData.storageType) {
    productInfoHTML += `<span class="font-bold">유형:</span><span>${requestData.storageType}</span>`;
  }
  productInfoHTML += `<span class="font-bold">포장방식:</span><span>스킨포장</span>`;
  productInfoHTML += `<span class="font-bold">합배송:</span><span>7세트까지 가능</span>`;
  
  html = html.replace('<!-- 제품 정보가 여기에 삽입됩니다 -->', productInfoHTML);
  
  // 품목제조보고서 섹션 (성분 정보)
  if (requestData.ingredients) {
    const ingredientsHTML = `
      <h4 class="font-bold mb-3 text-lg">🍜 원재료 및 성분</h4>
      <p class="mb-4">${requestData.ingredients}</p>
      ${requestData.allergyInfo ? `
      <h4 class="font-bold mb-3 text-lg">⚠️ 알레르기 정보</h4>
      <p class="text-red-600">${requestData.allergyInfo}</p>` : ''}
    `;
    html = html.replace('<!-- 성분 정보가 여기에 삽입됩니다 -->', ingredientsHTML);
  } else {
    // 성분 정보가 없으면 섹션 숨기기
    html = html.replace('id="ingredientsSection"', 'id="ingredientsSection" style="display: none;"');
  }
  
  // 주의사항 처리
  if (requestData.caution) {
    const warningHTML = `
      <div class="mt-6 p-4 bg-red-50 border-2 border-red-400 rounded-lg">
        <p class="text-red-700 font-bold">
          <i class="fas fa-exclamation-triangle mr-2"></i>${requestData.caution}
        </p>
      </div>`;
    html = html.replace('<div id="warningSection"></div>', warningHTML);
  }
  
  return html;
}

// 강화된 SEO 생성 (50개 이상 키워드)
function generateEnhancedSEO(productName, category) {
  const year = new Date().getFullYear();
  
  // 브랜드 추출
  const brandMatch = productName.match(/\[(.+?)\]/);
  const brand = brandMatch ? brandMatch[1] : '';
  const cleanName = productName.replace(/\[.+?\]/, '').trim();
  
  // 키워드 생성 (50개 이상)
  const keywords = [];
  
  // 1. 브랜드 조합 (15개)
  keywords.push(
    '만원요리', '최씨남매', '만원요리최씨남매',
    `만원요리${cleanName}`, `최씨남매${cleanName}`,
    '만원요리추천', '최씨남매추천', '만원요리배송',
    '최씨남매쇼핑', '만원요리할인', '최씨남매이벤트',
    '만원요리신제품', '최씨남매베스트', '만원요리세일',
    '최씨남매특가'
  );
  
  // 2. 제품명 변형 (15개)
  const nameVariations = generateNameVariations(cleanName);
  keywords.push(...nameVariations);
  
  // 3. 카테고리 관련 (10개)
  if (category) {
    keywords.push(
      category, `${category}추천`, `${category}베스트`,
      `${category}쇼핑`, `${category}배송`, `${category}할인`,
      `${category}인기`, `${category}맛집`, `${category}판매`,
      `${category}구매`
    );
  }
  
  // 4. 브랜드별 키워드 (10개)
  if (brand) {
    keywords.push(
      brand, `${brand}제품`, `${brand}추천`,
      `${brand}${cleanName}`, `인생도매`, `인생${cleanName}`,
      `${brand}맛집`, `${brand}베스트`, `${brand}할인`,
      `${brand}구매`
    );
  }
  
  // 5. 일반 키워드 (10개)
  keywords.push(
    '냉동식품', '간편식', '밀키트', '집밥', '혼밥',
    '배달음식', '온라인장보기', '식료품쇼핑', '푸드마켓',
    '먹거리쇼핑'
  );
  
  // 중복 제거 및 빈 값 제거
  const uniqueKeywords = [...new Set(keywords.filter(k => k))];
  
  return {
    title: `${productName} | 만원요리 최씨남매`,
    description: `${productName} - 만원요리 최씨남매 검증 상품. ${category || ''} 카테고리 베스트셀러. 전국 배송, 신선도 보장`,
    keywords: uniqueKeywords.join(','),
    author: '만원요리 최씨남매',
    copyright: `© ${year} 만원요리 최씨남매. All rights reserved.`,
    summary: cleanName.substring(0, 20),
    brief: `${category || '추천'} ${brand || ''} 상품`,
    keywordCount: uniqueKeywords.length
  };
}

// 제품명 변형 생성 헬퍼
function generateNameVariations(name) {
  const variations = [name];
  
  // 숫자 제거 버전
  variations.push(name.replace(/\d+g/g, '').replace(/\d+ml/g, '').trim());
  
  // 띄어쓰기 제거 버전
  variations.push(name.replace(/\s/g, ''));
  
  // 조합 키워드
  variations.push(
    `${name}추천`, `${name}구매`, `${name}배송`,
    `${name}할인`, `${name}가격`, `${name}리뷰`,
    `${name}후기`, `${name}베스트`, `${name}인기`,
    `${name}판매`, `${name}쇼핑`, `${name}온라인`
  );
  
  return variations;
}

// Fallback 데이터 (API 실패 시)
function generateFallbackData(requestData) {
  const cleanName = requestData.productName.replace(/\[.+?\]/, '').trim();
  
  return {
    heroTitle: requestData.productName,
    heroSubtitle: "만원요리 최씨남매가 엄선한 프리미엄 상품",
    badge1: "최고 품질",
    badge2: "빠른 배송",
    badge3: "안전 포장",
    productCleanName: cleanName,
    why1Title: "엄선된 재료",
    why1Text: "최고급 원재료만을 사용하여 만든 프리미엄 제품입니다.",
    why2Title: "전문가 검증",
    why2Text: "식품 전문가들이 직접 검증한 안전한 제품입니다.",
    why3Title: "합리적 가격",
    why3Text: "최상의 품질을 합리적인 가격으로 제공합니다.",
    why4Title: "신선도 보장",
    why4Text: "철저한 온도관리로 신선함을 그대로 전달합니다.",
    how1Title: "간편 조리",
    how1Text: "포장을 뜯고 간단한 조리만으로 맛있게 즐기실 수 있습니다.",
    how2Title: "다양한 활용",
    how2Text: "여러 요리에 활용 가능한 만능 식재료입니다.",
    storageType: requestData.storageType || "냉동",
    footerTitle: `집에서 만나는 ${cleanName}의 맛!`,
    footerSubtitle: `만원요리 최씨남매가 검증한 ${cleanName}을<br>이제 간편하게 집에서 만나보세요!`,
    footerBadge1: "대용량 구성",
    footerBadge2: requestData.haccp ? "HACCP 인증" : "안전 인증",
    footerBadge3: "합배송 가능"
  };
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Claude API Key:', process.env.CLAUDE_API_KEY ? '✅ Loaded' : '❌ Missing');
});