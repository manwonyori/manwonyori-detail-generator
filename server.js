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
          content: "너는 10년차 퍼포먼스 마케터이자 소비 심리학 전문가다. '만원요리 최씨남매' (유튜브 38만 구독자) 브랜드의 제품을 판매하는 텍스트 파싱 전문가다. 반드시 JSON 형식으로만 응답하라."
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
            content: "너는 10년차 퍼포먼스 마케터이자 소비 심리학 전문가다. '만원요리 최씨남매' (유튜브 38만 구독자) 브랜드의 제품을 판매하는 카피를 작성한다. 반드시 JSON 형식으로만 응답하라."
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
  
  return `**너는 10년차 퍼포먼스 마케터이자, 소비 심리학에 기반한 카피라이팅 전문가 + 브랜드 스토리텔러 + UX/UI 디자이너이다.**

너의 임무는 아래 제품 정보를 분석하여, 잠재고객을 실제 구매고객으로 전환시키는 가장 효율적인 유튜브 쇼핑 상세페이지를 기획하고, **제품의 깊은 역사와 스토리를 발굴하여** 모든 텍스트 콘텐츠를 완성하는 것이다.

"만원요리 최씨남매" 브랜드 아이덴티티:
- 유튜브 구독자 38만명의 신뢰
- MZ세대가 사랑하는 가성비 맛집 큐레이터
- 정직한 리뷰와 진짜 맛있는 것만 소개

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

**[GUIDELINES v5.0 - 퍼포먼스 마케팅 기반]**

다음 JSON 형식으로만 응답하세요:
{
  "heroTitle": "🔥구매욕구를 자극하는 강력한 헤드라인 (이모지 포함, 희소성/긴급성 강조)",
  "heroSubtitle": "제품의 핵심 가치를 2줄로 전달 (감성적 혜택 + 기능적 혜택)",
  "badge1": "${data.badge1 || '판매 1위'}",
  "badge2": "${data.badge2 || '한정수량'}",
  "productCleanName": "브랜드 제거한 깨끗한 제품명",
  "storyContent": "깊이 있는 제품 스토리 발굴 (3-4문장): 1)역사적 기원과 전통 2)현대적 재해석 3)만원요리가 선택한 이유 4)구매자가 얻을 특별한 경험. 스토리텔링으로 감성을 자극하고 제품 가치를 극대화하세요.",
  "why1Title": "가장 강력한 구매 이유 (고객 페인포인트 해결)",
  "why1Text": "구체적인 혜택과 차별점 설명 (숫자/데이터 포함시 신뢰도 UP)",
  "why2Title": "두번째 구매 이유 (경쟁제품 대비 우위)",
  "why2Text": "왜 다른 제품이 아닌 이 제품인지 명확히",
  "why3Title": "세번째 구매 이유 (사회적 증명/권위)",
  "why3Text": "38만 구독자의 선택, 리뷰, 인증 등 신뢰 요소",
  "how1Title": "기본 활용법 (즉시 실행 가능)",
  "how1Text": "누구나 쉽게 따라할 수 있는 구체적 방법",
  "how2Title": "프로 활용법 (특별한 경험)",
  "how2Text": "제품 가치를 200% 끌어올리는 꿀팁",
  "storageType": "${data.storageType || '냉동'}",
  "shippingTitle": "무료배송 혜택!",
  "shippingContent": "${data.shippingInfo ? data.shippingInfo.replace(/\n/g, '<br>') : '3만원 이상 구매시 전국 무료배송<br>만원요리 최씨남매와 함께라면<br>배송비 걱정 없이 장보기 완성!'}",
  "ingredientTable": "${data.ingredients ? '성분을 테이블 HTML <tr> 태그로 파싱' : ''}",
  "nutritionTable": "영양정보 테이블 HTML",
  "allergyInfo": "알레르기 정보"
}

**카피라이팅 원칙:**
1. AIDA 공식 적용 (Attention-Interest-Desire-Action)
2. 손실회피 심리 활용 ("놓치면 후회하는...")
3. 사회적 증명 강조 (38만 구독자, 베스트셀러)
4. 구체적 숫자와 데이터로 신뢰도 구축
5. 감성(스토리) + 이성(스펙) 균형있게 배치

반드시 유효한 JSON만 반환하고, 설명이나 주석 없이 JSON만 출력하세요.`;
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
  
  // HACCP와 YouTube 카드 토글
  if (requestData.haccp === true) {
    // HACCP 체크시: YouTube 카드 숨기고 HACCP 카드 표시
    html = html.replace('id="youtubeCard"', 'id="youtubeCard" style="display: none;"');
    html = html.replace('id="haccpCard" style="display: none;"', 'id="haccpCard"');
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
  
  // 품목제조보고서 섹션 (이미지 또는 테이블)
  if (requestData.ingredientsImage || data.ingredientTable || requestData.ingredients) {
    let ingredientsHTML = '';
    
    // 이미지가 있으면 우선 표시
    if (requestData.ingredientsImage) {
      ingredientsHTML += `
        <div class="mb-6">
          <img src="${requestData.ingredientsImage}" alt="품목제조보고서" class="w-full rounded-lg shadow-lg">
        </div>`;
    }
    
    // 텍스트 데이터가 있으면 추가로 표시
    if (data.ingredientTable || requestData.ingredients) {
      // 원재료 테이블
      if (data.ingredientTable) {
        ingredientsHTML += `
          <h4 class="font-bold mb-3 text-lg">🍜 원재료명 및 함량</h4>
          <table class="ingredient-table">
            <thead>
              <tr>
                <th>원재료명</th>
                <th>함량</th>
                <th>원산지</th>
              </tr>
            </thead>
            <tbody>
              ${data.ingredientTable}
            </tbody>
          </table>`;
      } else if (requestData.ingredients) {
        ingredientsHTML += `
          <h4 class="font-bold mb-3 text-lg">🍜 원재료 및 성분</h4>
          <div class="p-4 bg-gray-50 rounded">${requestData.ingredients}</div>`;
      }
      
      // 영양정보 테이블
      if (data.nutritionTable) {
        ingredientsHTML += `
          <div class="mt-6">
            <h4 class="font-bold mb-3 text-lg">📈 영양정보</h4>
            <table class="ingredient-table">
              ${data.nutritionTable}
            </table>
          </div>`;
      }
      
      // 알레르기 정보
      if (data.allergyInfo || requestData.allergyInfo) {
        ingredientsHTML += `
          <div class="mt-6 p-4 bg-red-50 border-2 border-red-400 rounded-lg">
            <h4 class="font-bold mb-2 text-lg text-red-700">⚠️ 알레르기 정보</h4>
            <p class="text-red-600">${data.allergyInfo || requestData.allergyInfo}</p>
          </div>`;
      }
    }
    
    html = html.replace('<!-- 원재료 테이블이 여기에 삽입됩니다 -->', ingredientsHTML);
  } else {
    html = html.replace('id="ingredientsSection"', 'id="ingredientsSection" style="display: none;"');
  }
  
  // 주의사항 처리 (두 곳에 표시)
  if (requestData.caution) {
    // Hero 섹션에 표시
    const heroCautionHTML = `
      <div class="mt-6 p-3 bg-white bg-opacity-20 border-2 border-white rounded-lg">
        <p class="text-white font-bold">
          ⚠️ ${requestData.caution}
        </p>
      </div>`;
    html = html.replace('<div id="heroCaution"></div>', heroCautionHTML);
    
    // Trust 섹션에도 표시
    const warningHTML = `
      <div class="mt-6 p-4 bg-red-50 border-2 border-red-400 rounded-lg">
        <p class="text-red-700 font-bold">
          <i class="fas fa-exclamation-triangle mr-2"></i>${requestData.caution}
        </p>
      </div>`;
    html = html.replace('<div id="warningSection"></div>', warningHTML);
  } else {
    html = html.replace('<div id="heroCaution"></div>', '');
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
    badge1: requestData.badge1 || "최고 품질",
    badge2: requestData.badge2 || "빠른 배송",
    productCleanName: cleanName,
    storyContent: `${cleanName}은(는) 오랜 전통과 노하우를 바탕으로 만들어진 특별한 제품입니다. 만원요리 최씨남매가 엄선한 이 제품은 최고의 재료와 정성으로 만들어져 특별한 맛을 자랑합니다.`,
    why1Title: "엄선된 재료",
    why1Text: "최고급 원재료만을 사용하여 만든 프리미엄 제품입니다.",
    why2Title: "전문가 검증",
    why2Text: "식품 전문가들이 직접 검증한 안전한 제품입니다.",
    why3Title: "신선도 보장",
    why3Text: "철저한 온도관리로 신선함을 그대로 전달합니다.",
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