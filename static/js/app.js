// static/js/app.js (app.html의 모든 JavaScript 코드)

// --- 1. 전역 상수 및 변수 ---
const API_BASE_URL = "/api"; 
const OTP_DURATION = 90; // OTP 유효 시간 (초)

// 요소 선택
const loginTab = document.getElementById('login-tab');
const registerTab = document.getElementById('register-tab');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const dashboard = document.getElementById('dashboard');
const messageBox = document.getElementById('message-box');
const loginOtpSection = document.getElementById('login-otp-section');
const dashboardUserName = document.getElementById('dashboard-user-name'); 
const otpCountdownDisplay = document.getElementById('otp-countdown-display'); // HTML ID에 맞게 통일 (기존: otp-countdown)
const resendOtpButton = document.getElementById('resend-otp-button');
const otpInput = document.getElementById('login-otp-code');

let countdownTimer; 
let timeRemaining = OTP_DURATION;
let currentTab = 'login';


// --- 2. 유틸리티 함수 (UI/메시지 관리) ---

/**
 * 사용자에게 메시지를 표시합니다.
 * @param {('error'|'success'|'info'|'warning')} type 메시지 유형
 * @param {string} text 표시할 메시지 텍스트
 */
function showMessage(type, text) { 
    messageBox.textContent = text;
    // 기존 스타일 클래스 제거
    messageBox.classList.remove('hidden', 'bg-red-50', 'text-red-600', 'border-red-300', 
                                 'bg-green-50', 'text-green-600', 'border-green-300', 
                                 'bg-indigo-50', 'text-indigo-600', 'border-indigo-300', 
                                 'bg-yellow-50', 'text-yellow-600', 'border-yellow-300', 
                                 'font-semibold', 'shadow-md');
    
    // 텍스트 굵게 및 그림자 추가
    messageBox.classList.add('font-semibold', 'shadow-md', 'border'); 
    
    // 새로운 스타일 클래스 추가
    if (type === 'error') {
        messageBox.classList.add('bg-red-50', 'text-red-600', 'border-red-300');
    } else if (type === 'success') {
        messageBox.classList.add('bg-green-50', 'text-green-600', 'border-green-300');
    } else if (type === 'info') {
        messageBox.classList.add('bg-indigo-50', 'text-indigo-600', 'border-indigo-300'); // 인디고 테마 색상 사용
    } else if (type === 'warning') {
        messageBox.classList.add('bg-yellow-50', 'text-yellow-600', 'border-yellow-300');
    }
    
    messageBox.classList.remove('hidden');
}

/**
 * 메시지 상자를 숨깁니다.
 */
function hideMessage() {
    messageBox.classList.add('hidden');
}

/**
 * 탭 버튼의 활성화/비활성화 상태를 업데이트하고 폼을 전환합니다.
 */
function updateTabs() {
    loginTab.classList.toggle('tab-active', currentTab === 'login');
    loginTab.classList.toggle('tab-inactive', currentTab !== 'login');
    registerTab.classList.toggle('tab-active', currentTab === 'register');
    registerTab.classList.toggle('tab-inactive', currentTab !== 'register');

    loginForm.classList.toggle('hidden', currentTab !== 'login');
    registerForm.classList.toggle('hidden', currentTab !== 'register');
    dashboard.classList.add('hidden');
    hideMessage();
}

/**
 * 특정 탭을 표시하고 URL을 업데이트합니다.
 * @param {('login'|'register')} tabName 표시할 탭 이름
 * @param {boolean} updateURL URL 변경 여부
 */
function showTab(tabName, updateURL = true) {
    currentTab = tabName;
    updateTabs();
    
    if (updateURL) {
        const newPath = (tabName === 'register') ? '/register' : '/home';
        window.history.pushState({}, '', newPath);
    }

    if (tabName === 'login') {
        // 로그인 탭으로 돌아가면 OTP 섹션을 숨깁니다.
        loginOtpSection.classList.add('hidden');
        if (countdownTimer) clearInterval(countdownTimer); // 타이머 중지
    }
}

/**
 * 현재 URL 경로에 따라 초기 탭을 설정합니다.
 */
function initializeTab() {
    const path = window.location.pathname;
    if (path.includes('/register')) {
        showTab('register', false);
    } else {
        showTab('login', false);
    }
}

/**
 * 대시보드를 표시하고 사용자 이름을 설정합니다.
 * @param {string} userName 표시할 사용자 이름
 */
function showDashboard(userName) {
    const userNameElement = document.getElementById('dashboard-user-name'); 
    userNameElement.textContent = userName;
    
    loginForm.classList.add('hidden');
    registerForm.classList.add('hidden');
    loginOtpSection.classList.add('hidden'); // OTP 섹션도 숨김
    
    dashboard.classList.remove('hidden');
    
    // 탭을 숨겨서 대시보드가 주 화면이 되게 합니다.
    loginTab.classList.add('hidden');
    registerTab.classList.add('hidden');
    
    if (countdownTimer) clearInterval(countdownTimer); // 타이머 중지
}

/**
 * 대시보드를 숨기고 로그인 탭으로 돌아갑니다.
 */
function hideDashboard() {
    dashboard.classList.add('hidden');
    
    // 탭을 다시 표시합니다.
    loginTab.classList.remove('hidden');
    registerTab.classList.remove('hidden');
    
    showTab('login'); // 로그인 탭으로 전환
}

/**
 * OTP 재전송 버튼을 표시하거나 숨깁니다.
 * @param {boolean} show true면 표시, false면 숨김
 */
function showResendButton(show) {
    if (show) {
        resendOtpButton.classList.remove('hidden'); 
        otpCountdownDisplay.classList.add('hidden'); // 카운트다운 숨김
    } else {
        // 카운트다운 시작 시: 재요청 버튼을 숨기고, 카운트다운 표시를 다시 보이게 함
        resendOtpButton.classList.add('hidden'); 
        otpCountdownDisplay.classList.remove('hidden', 'text-red-500', 'text-orange-500', 'text-green-500', 'animate-pulse'); // 스타일 초기화
        otpCountdownDisplay.textContent = '유효 시간: 01:30'; // 초기 텍스트로 복원
    }
}

// --- 3. 타이머 함수 ---

/**
 * OTP 유효 시간 카운트다운을 시작합니다.
 */
function startCountdown() {
    if (countdownTimer) {
        clearInterval(countdownTimer);
    }
    
    timeRemaining = OTP_DURATION;
    
    // 카운트다운 시작 시 재요청 버튼 숨김
    showResendButton(false);

    updateCountdownDisplay();

    countdownTimer = setInterval(() => {
        timeRemaining--;
        
        if (timeRemaining <= 0) {
            clearInterval(countdownTimer);
            otpCountdownDisplay.textContent = '유효 시간 만료!';
            // 만료 시 색상 설정
            otpCountdownDisplay.classList.remove('text-red-500', 'text-orange-500', 'text-green-500', 'animate-pulse');
            otpCountdownDisplay.classList.add('text-red-600', 'font-bold'); 
            
            showResendButton(true); // 재전송 버튼 표시
            return;
        }

        updateCountdownDisplay();
    }, 1000);
}

/**
 * 카운트다운 디스플레이를 업데이트하고 남은 시간에 따라 UI 스타일을 변경합니다.
 */
function updateCountdownDisplay() {
    const minutes = String(Math.floor(timeRemaining / 60)).padStart(2, '0');
    const seconds = String(timeRemaining % 60).padStart(2, '0');
    
    if (otpCountdownDisplay) {
        otpCountdownDisplay.textContent = `유효 시간: ${minutes}:${seconds}`;

        // 스타일 초기화
        otpCountdownDisplay.classList.remove('text-red-500', 'text-orange-500', 'text-green-500', 'animate-pulse', 'font-bold', 'text-red-600'); 
        
        // 남은 시간에 따른 색상 변화 및 깜빡임 효과 추가
        if (timeRemaining <= 10) {
            otpCountdownDisplay.classList.add('text-red-500', 'animate-pulse'); // 10초 미만은 깜빡이며 빨간색
        } else if (timeRemaining <= 30) {
            otpCountdownDisplay.classList.add('text-orange-500'); // 30초 미만은 주황색
        } else {
            otpCountdownDisplay.classList.add('text-green-500'); // 그 외는 초록색
        }
    }
}

// --- 4. API 통신 함수 ---

/**
 * OTP 코드 요청을 처리합니다.
 */
async function handleRequestOtp(event) {
    event.preventDefault();
    hideMessage();
    
    const email = document.getElementById('login-email').value;
    if (!email) { showMessage('error', '이메일을 입력해 주세요.'); return; }

    otpInput.value = ''; // 요청 시 OTP 입력 필드 비우기
    
    try {
        const response = await fetch(`${API_BASE_URL}/request-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const result = await response.json();

        if (response.ok) {
            loginOtpSection.classList.remove('hidden');
            showMessage('success', result.message);
            startCountdown(); // OTP 요청 성공 시 타이머 시작
        } else {
            showMessage('error', `OTP 요청 실패: ${result.detail || '알 수 없는 오류'}`);
        }
    } catch (error) {
        console.error('Request OTP Error:', error);
        showMessage('error', '서버 통신 오류가 발생했습니다. 백엔드 서버 상태를 확인해 주세요.');
    }
}

/**
 * OTP 코드 인증을 처리하고 로그인합니다.
 */
async function handleVerifyOtp(event) {
    event.preventDefault();
    hideMessage();
    
    const email = document.getElementById('login-email').value;
    const code = document.getElementById('login-otp-code').value;
    if (!email || !code) { showMessage('error', '이메일과 OTP 코드를 모두 입력해 주세요.'); return; }

    try {
        const response = await fetch(`${API_BASE_URL}/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code }),
            credentials: 'include' 
        });

        const result = await response.json();

        if (response.ok && result.login) {
            // 성공 시 타이머 중지
            if (countdownTimer) clearInterval(countdownTimer); 
            showMessage('success', `${result.name}님, 로그인 성공!`);
            showDashboard(result.name);
        } else if (response.ok && !result.login) {
            showMessage('error', result.message || 'OTP 인증 코드가 올바르지 않습니다.');
        } else {
            showMessage('error', `인증 오류: ${result.detail || '알 수 없는 오류'}`);
        }
    } catch (error) {
        console.error('Verify OTP Error:', error);
        showMessage('error', '서버 통신 오류가 발생했습니다. 백엔드 서버 상태를 확인해 주세요.');
    }
}

/**
 * 로그아웃을 처리합니다.
 */
async function handleLogout() {
    hideMessage();
    // 로그아웃 시 타이머 중지
    if (countdownTimer) clearInterval(countdownTimer); 

    try {
        const response = await fetch(`${API_BASE_URL}/logout`, {
            method: 'POST',
            credentials: 'include' 
        });

        if (response.ok) {
            showMessage('info', '로그아웃 되었습니다.');
        } else {
            // 서버에서 오류가 났더라도 (예: 이미 로그아웃된 상태) 클라이언트에서 로그아웃 처리는 진행
            showMessage('info', '로그아웃 되었습니다. (서버 통신 문제 가능성)');
        }
        hideDashboard(); 
    } catch (error) {
        console.error('Logout Error:', error);
        showMessage('error', '서버 통신 오류가 발생했습니다. 로그인 폼으로 돌아갑니다.');
        hideDashboard(); 
    }
}

/**
 * 초기 로그인 상태를 확인하고 대시보드를 표시할지 결정합니다.
 */
async function checkLoginStatus() {
    hideMessage();
    try {
        const response = await fetch(`${API_BASE_URL}/me`, {
            method: 'GET',
            credentials: 'include' 
        });

        if (response.ok) {
            const user = await response.json();
            showDashboard(user.name); 
        } else {
            hideDashboard(); 
        }
    } catch (error) {
        console.error('Check Status Error:', error);
        showMessage('error', '초기 로그인 상태 확인 중 서버 통신 오류가 발생했습니다.');
        hideDashboard(); 
    }
}

/**
 * 회원가입 요청을 처리합니다.
 */
async function handleRegister(event) {
    event.preventDefault(); 
    hideMessage();
    
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;

    if (!email) {
        showMessage('error', '이메일을 입력해 주세요.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email })
        });

        const result = await response.json();

        if (response.ok || response.status === 200) {
            showMessage('success', `${result.name || result.email}님, 성공적으로 등록되었습니다. 로그인 탭으로 이동하세요.`);
            showTab('login');
            // 등록된 이메일을 로그인 폼에 미리 채워넣음
            document.getElementById('login-email').value = email;
        } else {
            let errorMessage = result.detail || '알 수 없는 오류';
            
            if (response.status === 400 && errorMessage.includes('이미 등록된 이메일입니다.')) {
                errorMessage = '이미 등록된 이메일입니다. 로그인 탭을 이용해 주세요.';
            } 
            
            showMessage('error', `등록 오류: ${errorMessage}`);
        }
    } catch (error) {
        console.error('Registration Error:', error);
        showMessage('error', '서버 통신 오류가 발생했습니다. 백엔드 서버 상태를 확인해 주세요.');
    }
}

/**
 * 대시보드의 사용자 이름을 클릭했을 때 호출됩니다.
 * /main 경로로 이동하여 상세 정보를 보여줍니다.
 */
function fetchUserInfo() {
    window.location.href = "/main"; 
    // 실제 API 호출 및 데이터 로딩은 /main 경로의 서버 라우트(FastAPI)가 처리
}
// window.fetchUserInfo를 전역에 노출하여 app.html의 onclick이 작동하도록 합니다.
window.fetchUserInfo = fetchUserInfo;
// window.showTab를 전역에 노출하여 app.html의 onclick이 작동하도록 합니다.
window.showTab = showTab;

// --- 5. 초기화 및 이벤트 리스너 설정 ---

document.addEventListener('DOMContentLoaded', () => {
    // 폼 제출 이벤트
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    document.getElementById('login-form').addEventListener('submit', handleVerifyOtp); 
    
    // 버튼 클릭 이벤트
    document.getElementById('request-otp-button').addEventListener('click', handleRequestOtp);
    document.getElementById('resend-otp-button').addEventListener('click', handleRequestOtp);
    document.getElementById('logout-button').addEventListener('click', handleLogout);

    // 탭 초기화 및 로그인 상태 확인
    initializeTab();
    checkLoginStatus(); 
});