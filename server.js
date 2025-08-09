const express = require('express');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// API 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

// AI Provider 선택 (기본: OpenAI)
const AI_PROVIDER = process.env.AI_PROVIDER || 'openai';

app.use(express.json());
app.use(express.static('public'));

// Root route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    openai: process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Missing',
    claude: process.env.CLAUDE_API_KEY ? '✅ Configured' : '❌ Missing',
    provider: AI_PROVIDER,
    timestamp: new Date().toISOString()
  });
});

// AI 파싱 엔드포인트
app.post('/api/parse', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.json({ success: false, error: '텍스트가 없습니다' });
    }
    
    const parsePrompt = `
Parse the following Korean product information text and structure it into JSON format.
Extract product name, composition, expiry date, product type, storage type, ingredients, characteristics, cautions, and shipping info.

Text:
${text}

Return ONLY this JSON format (values in Korean):
{
  "productName": "product name from text",
  "composition": "composition and specifications",
  "expiry": "expiry date",
  "productType": "product type",
  "storageType": "storage type (냉동/냉장/실온)",
  "ingredients": "ingredients/raw materials",
  "characteristics": "product characteristics",
  "caution": "cautions",
  "shippingInfo": "shipping information",
  "haccp": false
}

For missing fields, use empty string. Return only JSON without any explanation.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert at structuring Korean product information. Return only valid JSON format. All values should be in Korean."
        },
        {
          role: "user",
          content: parsePrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    });
    
    const jsonText = completion.choices[0].message.content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    try {
      const parsedData = JSON.parse(jsonText);
      res.json({ success: true, data: parsedData });
    } catch (e) {
      console.error('JSON parse error:', e);
      res.json({ success: false, error: 'JSON 파싱 실패' });
    }
    
  } catch (error) {
    console.error('Parse API Error:', error);
    res.json({ success: false, error: error.message });
  }
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
    
    // 프롬프트 생성
    const prompt = generateDataPrompt(requestData);
    
    let productData;
    
    // AI Provider에 따라 다른 API 호출
    try {
      if (AI_PROVIDER === 'claude' && process.env.CLAUDE_API_KEY) {
        // Claude API 시도
        const message = await anthropic.messages.create({
          model: "claude-3-opus-20240229",
          max_tokens: 2000,
          messages: [{
            role: "user",
            content: prompt
          }]
        });
        const jsonText = message.content[0].text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        productData = JSON.parse(jsonText);
      } else {
        throw new Error('Use OpenAI');
      }
    } catch (claudeError) {
      // OpenAI로 폴백 또는 기본 사용
      console.log('Using OpenAI API...');
      
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key is not configured. Please add OPENAI_API_KEY to environment variables.');
      }
      
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-16k", // 16K 토큰 버전
        messages: [
          {
            role: "system",
            content: "당신은 '만원요리 최씨남매' 브랜드의 전문 콘텐츠 작성자입니다. JSON 형식으로만 응답하세요."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });
      
      const jsonText = completion.choices[0].message.content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      try {
        productData = JSON.parse(jsonText);
      } catch (e) {
        console.error('JSON parse error:', e);
        productData = generateFallbackData(requestData);
      }
    }
    
    // 템플릿에 데이터 바인딩
    const finalHTML = bindDataToTemplate(templateHTML, productData, requestData);
    
    // SEO 데이터 생성
    const seoData = generateEnhancedSEO(requestData.productName, requestData.category);
    
    res.json({
      success: true,
      html: finalHTML,
      seo: seoData,
      aiProvider: AI_PROVIDER === 'claude' ? 'Claude' : 'OpenAI'
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
  "shippingTitle": "무료배송 혜택!",
  "shippingContent": "${data.shippingInfo ? data.shippingInfo.replace(/\n/g, '<br>') : '3만원 이상 구매시 전국 무료배송<br>만원요리 최씨남매와 함께라면<br>배송비 걱정 없이 장보기 완성!'}",
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
  
  // 제품 정보 섹션
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
  
  // 품목제조보고서 섹션
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

// 강화된 SEO 생성
function generateEnhancedSEO(productName, category) {
  const year = new Date().getFullYear();
  const brandMatch = productName.match(/\[(.+?)\]/);
  const brand = brandMatch ? brandMatch[1] : '';
  const cleanName = productName.replace(/\[.+?\]/, '').trim();
  
  const keywords = [];
  
  // 브랜드 조합
  keywords.push(
    '만원요리', '최씨남매', '만원요리최씨남매',
    `만원요리${cleanName}`, `최씨남매${cleanName}`,
    '만원요리추천', '최씨남매추천', '만원요리배송',
    '최씨남매쇼핑', '만원요리할인', '최씨남매이벤트',
    '만원요리신제품', '최씨남매베스트', '만원요리세일',
    '최씨남매특가'
  );
  
  // 제품명 변형
  const nameVariations = generateNameVariations(cleanName);
  keywords.push(...nameVariations);
  
  // 카테고리 관련
  if (category) {
    keywords.push(
      category, `${category}추천`, `${category}베스트`,
      `${category}쇼핑`, `${category}배송`, `${category}할인`,
      `${category}인기`, `${category}맛집`, `${category}판매`,
      `${category}구매`
    );
  }
  
  // 브랜드별 키워드
  if (brand) {
    keywords.push(
      brand, `${brand}제품`, `${brand}추천`,
      `${brand}${cleanName}`, `인생도매`, `인생${cleanName}`,
      `${brand}맛집`, `${brand}베스트`, `${brand}할인`,
      `${brand}구매`
    );
  }
  
  // 일반 키워드
  keywords.push(
    '냉동식품', '간편식', '밀키트', '집밥', '혼밥',
    '배달음식', '온라인장보기', '식료품쇼핑', '푸드마켓',
    '먹거리쇼핑'
  );
  
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

// 제품명 변형 생성
function generateNameVariations(name) {
  const variations = [name];
  variations.push(name.replace(/\d+g/g, '').replace(/\d+ml/g, '').trim());
  variations.push(name.replace(/\s/g, ''));
  variations.push(
    `${name}추천`, `${name}구매`, `${name}배송`,
    `${name}할인`, `${name}가격`, `${name}리뷰`,
    `${name}후기`, `${name}베스트`, `${name}인기`,
    `${name}판매`, `${name}쇼핑`, `${name}온라인`
  );
  return variations;
}

// Fallback 데이터
function generateFallbackData(requestData) {
  const cleanName = requestData.productName.replace(/\[.+?\]/, '').trim();
  
  return {
    heroTitle: requestData.productName,
    heroSubtitle: "만원요리 최씨남매가 엄선한 프리미엄 상품",
    badge1: "최고 품질",
    badge2: "빠른 배송",
    badge3: "안전 포장",
    productCleanName: cleanName,
    storyContent: `${cleanName}은(는) 오랜 전통과 노하우를 바탕으로 만들어진 특별한 제품입니다. 만원요리 최씨남매가 엄선한 이 제품은 최고의 재료와 정성으로 만들어져 특별한 맛을 자랑합니다.`,
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
    shippingTitle: "무료배송 혜택!",
    shippingContent: requestData.shippingInfo ? requestData.shippingInfo.replace(/\n/g, '<br>') : '3만원 이상 구매시 전국 무료배송<br>만원요리 최씨남매와 함께라면<br>배송비 걱정 없이 장보기 완성!',
    ingredientTable: '',
    nutritionTable: '',
    allergyInfo: ''
  };
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('OpenAI API Key:', process.env.OPENAI_API_KEY ? '✅ Loaded' : '❌ Missing');
  console.log('Claude API Key:', process.env.CLAUDE_API_KEY ? '✅ Loaded' : '❌ Missing');
  console.log('Using AI Provider:', AI_PROVIDER === 'claude' ? 'Claude' : 'OpenAI (Default)');
});