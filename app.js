/**
 * 만원요리 최씨남매 상세페이지 생성 시스템
 * Claude AI API 연동 버전
 */

// 전역 변수
let currentMethod = '';
let generatedHTML = '';

// 입력 방식 선택
function selectMethod(method) {
    currentMethod = method;
    
    // 모든 폼 숨기기
    document.getElementById('simpleForm').classList.add('hidden');
    document.getElementById('detailedForm').classList.add('hidden');
    document.getElementById('results').classList.add('hidden');
    
    // 선택된 폼 보이기
    if (method === 'simple') {
        document.getElementById('simpleForm').classList.remove('hidden');
    } else if (method === 'detailed') {
        document.getElementById('detailedForm').classList.remove('hidden');
        setupDetailedForm();
    }
}

// 상세 입력 폼 설정
function setupDetailedForm() {
    const radioButtons = document.querySelectorAll('input[name="inputType"]');
    radioButtons.forEach(radio => {
        radio.addEventListener('change', function() {
            const formInput = document.getElementById('formInput');
            const textInput = document.getElementById('textInput');
            
            if (this.value === 'form') {
                formInput.classList.remove('hidden');
                textInput.classList.add('hidden');
            } else {
                formInput.classList.add('hidden');
                textInput.classList.remove('hidden');
            }
        });
    });
}

// 간단 입력으로 생성
async function generateSimple() {
    const productName = document.getElementById('simpleProductName').value;
    const category = document.getElementById('simpleCategory').value;
    
    if (!productName) {
        alert('제품명을 입력해주세요.');
        return;
    }
    
    showLoading();
    
    // Claude AI API 호출 (시뮬레이션)
    const prompt = createSimplePrompt(productName, category);
    const result = await callClaudeAPI(prompt);
    
    showResults(result);
}

// 상세 입력으로 생성
async function generateDetailed() {
    const inputType = document.querySelector('input[name="inputType"]:checked').value;
    let productData;
    
    if (inputType === 'form') {
        productData = collectFormData();
    } else {
        productData = parseBulkData();
    }
    
    if (!productData.productName) {
        alert('제품명은 필수입니다.');
        return;
    }
    
    showLoading();
    
    // Claude AI API 호출
    const prompt = createDetailedPrompt(productData);
    const result = await callClaudeAPI(prompt);
    
    showResults(result);
}

// 폼 데이터 수집
function collectFormData() {
    return {
        productName: document.getElementById('detailedProductName').value,
        composition: document.getElementById('composition').value,
        expiry: document.getElementById('expiry').value,
        productType: document.getElementById('productType').value,
        storageType: document.getElementById('storageType').value,
        ingredients: document.getElementById('ingredients').value,
        characteristics: document.getElementById('characteristics').value
    };
}

// 벌크 데이터 파싱
function parseBulkData() {
    const bulkData = document.getElementById('bulkData').value;
    
    // 함흥 물냉면 형식 파싱
    const lines = bulkData.split('\n');
    const data = { productName: '', composition: '', expiry: '', productType: '', storageType: '', ingredients: '', characteristics: '' };
    
    lines.forEach(line => {
        line = line.trim();
        if (line.includes('제품명')) data.productName = extractValue(line);
        else if (line.includes('구성 및 규격')) data.composition = extractValue(line);
        else if (line.includes('소비기한')) data.expiry = extractValue(line);
        else if (line.includes('제품종류')) data.productType = extractValue(line);
        else if (line.includes('유형')) data.storageType = extractValue(line);
        else if (line.includes('성분')) data.ingredients = extractValue(line);
        else if (line.includes('제품특성')) data.characteristics = extractValue(line);
    });
    
    return data;
}

// 값 추출 헬퍼 함수
function extractValue(line) {
    const parts = line.split(/\s{2,}/); // 2개 이상의 공백으로 분할
    return parts.length > 1 ? parts[1].replace(/"/g, '').trim() : '';
}

// 간단 입력용 프롬프트 생성
function createSimplePrompt(productName, category) {
    return `
당신은 "만원요리 최씨남매" 브랜드의 전문 상세페이지 작성자입니다.

**제품 정보:**
- 제품명: ${productName}
- 카테고리: ${category || '미지정'}

**미션:**
1. 이 제품의 역사적 배경/스토리를 크롤링하여 MZ 세대가 흥미로워할 한 줄로 요약
2. 만원요리 최씨남매 브랜드 통일성에 맞는 8개 섹션 구조로 완전한 HTML 생성

**8개 고정 섹션:**
1. Strategic Header (36만 구독자, 검증 등 브랜딩)
2. YouTube Showcase (검증 영상 3개)
3. Why Section (4가지 핵심 장점)
4. Wow Section (배송비 절약 고정 메시지)
5. How Section (활용법 2가지)
6. Trust Section (신뢰도 3요소)
7. Company Info (㈜값진한끼 고정 + 제조사)
8. Footer CTA (브랜드 마무리)

**톤앤매너:**
- MZ 세대 친화적
- 간결하고 임팩트 있게
- "만원요리 최씨남매" 브랜드 일관성 유지

**출력:** 완전한 HTML 코드만 생성 (설명 없이)
`;
}

// 상세 입력용 프롬프트 생성
function createDetailedPrompt(productData) {
    return `
당신은 "만원요리 최씨남매" 브랜드의 전문 상세페이지 작성자입니다.

**제품 상세 정보:**
- 제품명: ${productData.productName}
- 구성 및 규격: ${productData.composition}
- 소비기한: ${productData.expiry}
- 제품종류: ${productData.productType}
- 유형: ${productData.storageType}
- 성분: ${productData.ingredients}
- 제품특성: ${productData.characteristics}

**중요 규칙:**
1. 품목제조보고서 성분 정보는 절대 변경하지 말고 그대로 사용
2. 입력된 정보를 우선 사용하되, MZ 친화적으로 다듬기
3. 부족한 부분만 AI로 보완

**미션:**
- 제품 역사/스토리를 간단히 조사하여 한 줄 추가
- 입력된 상세 정보를 8개 섹션에 적절히 배치
- 만원요리 최씨남매 브랜드 통일성 유지

**8개 고정 섹션 구조는 동일하게 적용**

**출력:** 완전한 HTML 코드만 생성 (설명 없이)
`;
}

// Claude AI API 호출 (현재는 시뮬레이션)
async function callClaudeAPI(prompt) {
    // TODO: 실제 Claude API 연동
    // 현재는 시뮬레이션으로 테스트용 HTML 반환
    
    return new Promise((resolve) => {
        setTimeout(() => {
            const testHTML = generateTestHTML(prompt);
            resolve(testHTML);
        }, 2000);
    });
}

// 테스트용 HTML 생성 (실제 Claude API 연동 전 시뮬레이션)
function generateTestHTML(prompt) {
    // 프롬프트에서 제품명 추출
    const productNameMatch = prompt.match(/제품명: (.+)/);
    const productName = productNameMatch ? productNameMatch[1] : '테스트 제품';
    
    return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${productName} - 만원요리 최씨남매</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <style>
        body { font-family: 'Noto Sans KR', sans-serif; }
        .red-gradient { background: linear-gradient(135deg, #C53030 0%, #B91C1C 100%); }
    </style>
</head>
<body class="bg-gray-50">
    <div class="max-w-6xl mx-auto p-4">
        
        <!-- 1. Strategic Header -->
        <div class="red-gradient text-white rounded-3xl p-8 mb-8 text-center">
            <div class="flex items-center justify-center mb-4">
                <i class="fas fa-star text-yellow-400 text-4xl mr-3"></i>
                <span class="text-lg font-bold">만원요리 최씨남매 공식 인증</span>
                <i class="fas fa-star text-yellow-400 text-4xl ml-3"></i>
            </div>
            <h1 class="text-3xl md:text-5xl font-black mb-4">
                ${productName}
            </h1>
            <div class="text-xl md:text-2xl font-bold mb-6">
                🔥 MZ가 주목하는 그 맛! - 검증된 만원요리 레시피
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="bg-white bg-opacity-20 rounded-lg p-4">
                    <div class="text-2xl font-bold">36만</div>
                    <div class="text-sm">구독자 수</div>
                </div>
                <div class="bg-white bg-opacity-20 rounded-lg p-4">
                    <div class="text-2xl font-bold">검증</div>
                    <div class="text-sm">유튜브 인증</div>
                </div>
                <div class="bg-white bg-opacity-20 rounded-lg p-4">
                    <div class="text-2xl font-bold">프리미엄</div>
                    <div class="text-sm">품질 보장</div>
                </div>
            </div>
        </div>

        <!-- 나머지 섹션들... -->
        
    </div>
</body>
</html>`;
}

// 로딩 표시
function showLoading() {
    const resultsDiv = document.getElementById('results');
    resultsDiv.classList.remove('hidden');
    
    document.getElementById('generatedContent').innerHTML = `
        <div class="text-center py-8">
            <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p class="text-lg">AI가 상세페이지를 생성 중입니다...</p>
            <div class="mt-4 space-y-2 text-sm text-gray-600">
                <p>🔍 제품 스토리 크롤링...</p>
                <p>🎨 MZ 친화적 콘텐츠 생성...</p>
                <p>📱 8개 섹션 구조 적용...</p>
                <p>✨ 브랜드 통일성 검증...</p>
            </div>
        </div>
    `;
}

// 결과 표시
function showResults(html) {
    generatedHTML = html;
    document.getElementById('generatedContent').innerHTML = `<pre><code>${escapeHtml(html)}</code></pre>`;
    
    // 결과 섹션으로 스크롤
    document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
}

// HTML 이스케이프
function escapeHtml(html) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
}

// 결과 복사
function copyResult() {
    navigator.clipboard.writeText(generatedHTML).then(() => {
        alert('HTML 코드가 클립보드에 복사되었습니다!');
    });
}

// 결과 다운로드
function downloadResult() {
    const blob = new Blob([generatedHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `manwonyori_detail_${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 결과 미리보기
function previewResult() {
    const newWindow = window.open('', '_blank');
    newWindow.document.write(generatedHTML);
    newWindow.document.close();
}

// 초기화
document.addEventListener('DOMContentLoaded', function() {
    // 라디오 버튼 변경 이벤트 설정
    setupDetailedForm();
});