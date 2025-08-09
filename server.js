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
          content: "너는 10년차 퍼포먼스 마케터이자 소비 심리학 전문가, 그리고 한국 음식문화 스토리텔링 전문가다. '만원요리 최씨남매' (유튜브 38만 구독자) 브랜드의 제품을 판매하는 텍스트 파싱 전문가다. 반드시 JSON 형식으로만 응답하라."
        },
        {
          role: "user",
          content: parsePrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    });
    
    // AI 응답 정제 (parse API용)
    let jsonText = completion.choices[0].message.content;
    
    // 기본 정제
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // JSON 추출
    const jsonStart = jsonText.indexOf('{');
    const jsonEnd = jsonText.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
    }
    
    // 문자 정제
    jsonText = jsonText
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
      .replace(/\r\n/g, '\\n')
      .replace(/\r/g, '\\n')
      .replace(/\n/g, '\\n')
      .replace(/\t/g, '\\t');
    
    try {
      const parsedData = JSON.parse(jsonText);
      res.json({ success: true, data: parsedData });
    } catch (e) {
      console.error('Parse JSON error:', e);
      console.error('실패한 JSON:', jsonText.substring(0, 200));
      
      // 복구 시도
      try {
        let fixedJson = jsonText
          .replace(/'/g, '"')
          .replace(/([{,]\s*)(\w+):/g, '$1"$2":');
          
        const parsedData = JSON.parse(fixedJson);
        res.json({ success: true, data: parsedData });
      } catch (e2) {
        console.error('Parse JSON 복구도 실패:', e2);
        res.json({ success: false, error: 'JSON 파싱 실패' });
      }
    }
    
  } catch (error) {
    console.error('Parse API Error:', error);
    res.json({ success: false, error: error.message });
  }
});

// 원재료 테이블 파싱 함수
async function parseIngredientsToTable(ingredientsText, apiClient) {
  try {
    const prompt = `다음 원재료 텍스트를 HTML 테이블 행으로 변환하세요.

입력: "${ingredientsText}"

출력 규칙:
1. 각 원재료를 <tr><td>원재료명</td><td>함량</td><td>원산지</td></tr> 형식으로 변환
2. 함량이 없으면 "함량 미표시"
3. 원산지가 없으면 "원산지 미표시"
4. 괄호 안의 내용은 원산지로 처리
5. %가 포함된 숫자는 함량으로 처리
6. 쉼표로 구분된 각 성분을 별도 행으로 처리

예시:
입력: "밀가루 45% (미국산, 호주산), 감자전분 35% (국산)"
출력: 
<tr><td>밀가루</td><td>45%</td><td>미국산, 호주산</td></tr>
<tr><td>감자전분</td><td>35%</td><td>국산</td></tr>

HTML 테이블 행 태그만 반환하세요:`;

    const completion = await apiClient.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "너는 식품 성분 파싱 전문가다. HTML 테이블 태그만 정확히 반환하라." },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 1000
    });

    return completion.choices[0].message.content.trim().replace(/```html\n?/g, '').replace(/```\n?/g, '');
  } catch (error) {
    console.error('AI 파싱 실패, 폴백 사용:', error);
    return fallbackIngredientParsing(ingredientsText);
  }
}

// 폴백 파싱 함수
function fallbackIngredientParsing(text) {
  try {
    const ingredients = text.split(',');
    let tableRows = '';
    
    ingredients.forEach(ingredient => {
      const trimmed = ingredient.trim();
      const percentMatch = trimmed.match(/(\d+\.?\d*%)/);
      const originMatch = trimmed.match(/\(([^)]+)\)/);
      
      let name = trimmed.replace(/\d+\.?\d*%/, '').replace(/\([^)]+\)/, '').trim();
      const percent = percentMatch ? percentMatch[1] : '함량 미표시';
      const origin = originMatch ? originMatch[1] : '원산지 미표시';
      
      if (name) {
        tableRows += `<tr><td>${name}</td><td>${percent}</td><td>${origin}</td></tr>\n`;
      }
    });
    
    return tableRows;
  } catch (error) {
    console.error('폴백 파싱 실패:', error);
    return '<tr><td>파싱 오류</td><td>-</td><td>-</td></tr>';
  }
}

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
            content: "너는 10년차 퍼포먼스 마케터이자 소비 심리학 전문가, 그리고 한국 음식문화 스토리텔링 전문가다. '만원요리 최씨남매' (유튜브 38만 구독자) 브랜드의 제품 스토리를 깊이 있게 발굴하여 감성적 구매를 유도하는 카피를 작성한다. 특히 제품의 역사적 배경과 문화적 가치를 통해 고객의 마음을 움직이는 스토리를 창조한다. 반드시 JSON 형식으로만 응답하라."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });
      
      // AI 응답 정제 강화
      let jsonText = completion.choices[0].message.content;
      
      // 코드블록 제거
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      // 추가 정제: 앞뒤 공백, 줄바꿈, 탭 제거
      jsonText = jsonText.trim();
      
      // JSON 시작과 끝 찾기
      const jsonStart = jsonText.indexOf('{');
      const jsonEnd = jsonText.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
      }
      
      // 잘못된 문자 정제
      jsonText = jsonText
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '') // 제어 문자 제거 (탭과 줄바꿈은 보존)
        .replace(/\r\n/g, '\\n') // Windows 줄바꿈
        .replace(/\r/g, '\\n') // Mac 줄바꿈  
        .replace(/\n/g, '\\n') // Unix 줄바꿈
        .replace(/\t/g, '\\t'); // 탭 이스케이프
      
      console.log('정제된 JSON 길이:', jsonText.length, '처음 100자:', jsonText.substring(0, 100));
      
      try {
        productData = JSON.parse(jsonText);
      } catch (e) {
        console.error('JSON parse error:', e);
        console.error('실패한 JSON (처음 500자):', jsonText.substring(0, 500));
        
        // 추가 복구 시도: 잘못된 JSON 구조 수정
        try {
          // 쌍따옴표 문제 수정 시도
          let fixedJson = jsonText
            .replace(/'/g, '"') // 단일 따옴표를 쌍따옴표로
            .replace(/([{,]\s*)(\w+):/g, '$1"$2":'); // 키를 따옴표로 감쌈
            
          productData = JSON.parse(fixedJson);
          console.log('JSON 복구 성공!');
        } catch (e2) {
          console.error('JSON 복구도 실패:', e2);
          productData = generateFallbackData(requestData);
        }
      }
    }
    
    // 원재료 테이블 파싱 (AI 개선)
    if (requestData.ingredients && !productData.ingredientTable) {
      console.log('원재료 AI 파싱 시작...');
      productData.ingredientTable = await parseIngredientsToTable(requestData.ingredients, openai);
      console.log('원재료 파싱 완료');
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
  "storyContent": "해당 제품의 역사적 기원과 문화적 배경을 바탕으로 3-4문장의 깊이 있는 스토리를 작성하세요. 제품 카테고리의 역사적 기원이나 지역 전통을 언급하고, 그 전통이 현대에 어떻게 재해석되었는지 설명하며, 만원요리가 이 제품을 선택한 특별한 이유를 포함하고, 고객이 이 제품을 통해 경험할 수 있는 감정적 가치를 담아 완성하세요.",
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
  "shippingTitle": "배송 정보",
  "shippingContent": "배송 정보를 입력해주세요",
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
  
  // 배송 정보 바인딩 (사용자 입력값으로 교체) - AI 생성값을 덮어씀
  if (requestData.shippingTitle) {
    // AI가 생성한 제목을 사용자 입력으로 직접 교체
    html = html.replace(/<h2 class="text-3xl font-black mb-4">[^<]*<\/h2>/, 
                       `<h2 class="text-3xl font-black mb-4">${requestData.shippingTitle}</h2>`);
  }
  if (requestData.shippingInfo) {
    // AI가 생성한 내용을 사용자 입력으로 직접 교체
    html = html.replace(/<p class="text-xl leading-relaxed mb-6">[^<]*<\/p>/, 
                       `<p class="text-xl leading-relaxed mb-6">${requestData.shippingInfo.replace(/\n/g, '<br>')}</p>`);
  }
  
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
  } else {
    // HACCP 미체크시: 기본 상태 유지 (YouTube 표시, HACCP 숨김)
    // 템플릿 기본값이 YouTube 표시, HACCP 숨김이므로 별도 처리 불필요
  }
  
  // 제품 사양 섹션 준비
  
  // 제품 사양을 스토리 섹션에 표시
  const specsCards = [];
  
  // 제품 사양 카드
  const specItems = [];
  if (requestData.composition) {
    specItems.push(`<div><span class="font-semibold">구성:</span> ${requestData.composition}</div>`);
  }
  if (requestData.expiry) {
    specItems.push(`<div><span class="font-semibold">소비기한:</span> ${requestData.expiry}</div>`);
  }
  if (requestData.productType) {
    specItems.push(`<div><span class="font-semibold">제품종류:</span> ${requestData.productType}</div>`);
  }
  if (requestData.storageType) {
    specItems.push(`<div><span class="font-semibold">보관방법:</span> ${requestData.storageType}</div>`);
  }
  
  if (specItems.length > 0) {
    specsCards.push(`
      <div class="card">
        <h4 class="font-bold mb-3">📦 제품 사양</h4>
        <div class="space-y-2 text-sm">
          ${specItems.join('\n          ')}
        </div>
      </div>`);
  }
  
  // 배송 정보 카드 (배송정보가 있을 때만 표시)
  if (requestData.shippingInfo) {
    specsCards.push(`
      <div class="card">
        <h4 class="font-bold mb-3">🚚 배송 정보</h4>
        <div class="space-y-2 text-sm">
          <div>${requestData.shippingInfo.replace(/\n/g, '<br>')}</div>
        </div>
      </div>`);
  }
  
  if (specsCards.length > 0) {
    html = html.replace('<!-- 제품 사양이 여기에 표시됩니다 -->', specsCards.join('\n'));
  }
  
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

// 강화된 SEO 생성 (카페24 최적화)
function generateEnhancedSEO(productName, category) {
  const year = new Date().getFullYear();
  const brandMatch = productName.match(/\[(.+?)\]/);
  const brand = brandMatch ? brandMatch[1] : '';
  const cleanName = productName.replace(/\[.+?\]/, '').trim();
  
  const keywords = [];
  
  // 1. 브랜드 조합 (10개)
  keywords.push(
    '만원요리', '최씨남매', '만원요리최씨남매',
    `만원요리${cleanName}`, `최씨남매${cleanName}`,
    '만원요리추천', '최씨남매추천', '만원요리직구',
    '최씨남매정품', '만원요리공식'
  );
  
  // 2. 제품명 변형 (10개)
  const nameVariations = generateNameVariations(cleanName);
  keywords.push(...nameVariations.slice(0, 10));
  
  // 3. 카테고리 연관 (10개)
  if (category) {
    keywords.push(
      category, `${category}추천`, `${category}베스트`,
      `${category}1위`, `${category}인기`, `${category}맛집`,
      `${category}신상`, `${category}할인`, `${category}특가`,
      `${category}무료배송`
    );
  }
  
  // 4. 구매 의도 키워드 (10개)
  keywords.push(
    `${cleanName}구매`, `${cleanName}주문`, `${cleanName}배송`,
    `${cleanName}가격`, `${cleanName}최저가`, `${cleanName}할인`,
    `${cleanName}쿠폰`, `${cleanName}이벤트`, `${cleanName}후기`,
    `${cleanName}리뷰`
  );
  
  // 5. 롱테일 키워드 (10개)
  keywords.push(
    `${cleanName} 어디서 파나요`, `${cleanName} 맛있나요`,
    `${cleanName} 조리법`, `${cleanName} 보관법`,
    `${cleanName} 유통기한`, `집에서 ${cleanName}`,
    `간편하게 ${cleanName}`, `${cleanName} 대용량`,
    `${cleanName} 선물용`, `${cleanName} 가성비`
  );
  
  // 6. 브랜드별 키워드
  if (brand) {
    keywords.push(
      brand, `${brand}정품`, `${brand}직구`,
      `${brand}${cleanName}`, `${brand}공식`
    );
  }
  
  // 7. 시즌/트렌드 키워드
  keywords.push(
    '2025신상', '유튜브추천', '인플루언서픽',
    'SNS화제', '품절대란', '재입고'
  );
  
  // 중복 제거 및 50개 제한
  const uniqueKeywords = [...new Set(keywords.filter(k => k))].slice(0, 50);
  
  // 상품 요약/간략 설명 (20자 이내)
  const shortName = cleanName.length > 20 ? cleanName.substring(0, 17) + '...' : cleanName;
  const summary = `${shortName} 특가`;
  const brief = `만원요리 ${category || '추천'}상품`;
  
  // 다국어 번역
  const translations = {
    english: `${cleanName} - Korean Premium Food by Manwonyori`,
    chinese: `${cleanName} - 韩国正品美食 万元料理`,
    japanese: `${cleanName} - 韓国グルメ マンウォンヨリ`
  };
  
  // Alt 텍스트
  const altText = `만원요리 최씨남매 ${cleanName} ${category || ''} 상품 이미지`;
  
  return {
    // 기본 정보
    title: `${productName} 최저가 | 만원요리 최씨남매 공식`,
    author: '만원요리 최씨남매',
    copyright: `© ${year} 만원요리 최씨남매. All rights reserved.`,
    
    // 카페24 필수 SEO
    summary: summary,  // 상품 요약설명 (20자)
    brief: brief,      // 상품 간략설명 (20자)
    
    // 메타태그
    description: `${productName} 구매는 만원요리 최씨남매! 유튜브 38만 구독자가 인정한 ${category || '맛집'} 상품. ✓정품보장 ✓무료배송 ✓최저가보상`,
    keywords: uniqueKeywords.join(','),
    
    // 다국어 지원
    translations: translations,
    
    // 이미지 Alt
    altText: altText,
    
    // 통계
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
    shippingTitle: requestData.shippingTitle || "배송 정보",
    shippingContent: requestData.shippingInfo ? requestData.shippingInfo.replace(/\n/g, '<br>') : '배송 정보를 입력해주세요',
    ingredientTable: ''
  };
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('OpenAI API Key:', process.env.OPENAI_API_KEY ? '✅ Loaded' : '❌ Missing');
  console.log('Claude API Key:', process.env.CLAUDE_API_KEY ? '✅ Loaded' : '❌ Missing');
  console.log('Using AI Provider:', AI_PROVIDER === 'claude' ? 'Claude' : 'OpenAI (Default)');
});