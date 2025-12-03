from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
import httpx # API 프록시를 위해 필수!
from datetime import datetime
from zoneinfo import ZoneInfo
from starlette.routing import Mount, Route # Route 객체를 명시적으로 사용

# Docker Compose 네트워크에서 백엔드 서비스의 이름과 포트를 사용합니다.
# 이 주소(otpi_backend:8000)는 Docker 내부에서만 유효합니다.
BACKEND_URL = "http://otpi_backend:8000"

# 템플릿 폴더 지정
templates = Jinja2Templates(directory="templates")

app = FastAPI(title="OTPi Python Frontend")

# 정적 파일 마운트
app.mount("/static", StaticFiles(directory="static"), name="static")

KST = ZoneInfo("Asia/Seoul")

# 유저 정보를 KST로 변환하는 유틸리티 함수
def convert_to_kst(dt: str | None) -> str:
    if not dt:
        return "N/A"
    # ISO 8601 문자열을 datetime 객체로 변환
    dt_obj = datetime.fromisoformat(dt.replace('Z', '+00:00')) 
    return dt_obj.astimezone(KST).strftime("%Y-%m-%d %H:%M:%S")

# 🌟 1. 유저 정보 상세 페이지 제공 라우트 🌟
@app.get("/main", response_class=HTMLResponse)
async def get_user_info_page(request: Request):
    token = request.cookies.get("token")
    if not token:
        # 로그인 쿠키가 없으면 홈으로 리다이렉트 (로그인 필요)
        return Response(status_code=302, headers={"Location": "/home"}) 
    
    # 백엔드에 사용자 정보를 요청
    try:
        async with httpx.AsyncClient() as client:
            # 쿠키를 포함하여 요청 (인증 과정)
            proxy_response = await client.get(
                f"{BACKEND_URL}/me", 
                cookies={"token": token},
                timeout=10.0
            )

        if proxy_response.status_code != 200:
            # 인증 실패 또는 유효하지 않은 세션
            # 토큰이 유효하지 않으면 /home으로 리다이렉트
            return Response(status_code=302, headers={"Location": "/home"}) 
        
        user_info = proxy_response.json()

        # KST 시간으로 변환
        user_info['created_at_kst'] = convert_to_kst(user_info.get('created_at'))
        user_info['last_login_at_kst'] = convert_to_kst(user_info.get('last_login_at'))

        # user_info.html 템플릿 렌더링
        return templates.TemplateResponse(
            "user_info.html",
            {
                "request": request,
                "title": f"{user_info.get('name', '사용자')} 정보",
                "user": user_info
            }
        )
    except httpx.RequestError:
        raise HTTPException(status_code=503, detail="백엔드 서버 연결 오류")

# 🌟 2. 루트 경로 라우트 (루트 / 에서만 welcome.html 제공) 🌟
@app.get("/", response_class=HTMLResponse)
def serve_welcome_page(request: Request):
    """
    루트 경로 (http://localhost:3000/)에 접속하면 환영 페이지를 보여줍니다.
    """
    return templates.TemplateResponse(
        "welcome.html",
        {
            "request": request,
            "title": "OTPi 인증 시스템 시작",
            "message": "OTPi 인증 시스템 프런트엔드 시작",
        }
    )

# 🌟 3. /home 및 /register 경로 라우트 (로그인/회원가입 페이지) 🌟
@app.get("/{path:str}", response_class=HTMLResponse)
def serve_app_page(request: Request, path: str):
    """
    /home, /register 등 메인 앱 관련 경로 요청에 대해 app.html 템플릿을 제공합니다.
    """
    # /home 또는 /register 외의 다른 경로에 대해서는 404를 반환하거나 
    # SPA처럼 app.html을 반환하는 것이 일반적이나, 여기서는 명시적으로 처리
    if path not in ["home", "register"]:
        # /main은 위에서 처리했으므로, 여기서는 다른 알려지지 않은 경로만 처리
        raise HTTPException(status_code=404, detail="페이지를 찾을 수 없습니다.")

    return templates.TemplateResponse(
        "app.html",
        {
            "request": request,
            "title": "OTPi 인증 시스템",
        }
    )

# 4. API 프록시 라우팅 (핵심: 브라우저 요청을 백엔드로 전달)
@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def api_proxy(request: Request, path: str):
    """
    /api/ 로 시작하는 모든 요청을 Docker 내부 네트워크의 백엔드 서버로 프록시합니다.
    """
    method = request.method
    body = await request.body()
    
    # 요청 헤더 복사 (JWT 쿠키 전달 필수)
    headers = dict(request.headers)
    
    # httpx 클라이언트를 사용하여 요청을 백엔드로 포워딩
    async with httpx.AsyncClient(base_url=BACKEND_URL) as client:
        try:
            # 백엔드 API 경로 구성 (path 변수 사용)
            url_path = f"/{path}"
            
            # 요청을 백엔드로 전송
            proxy_response = await client.request(
                method, 
                url_path, 
                headers=headers, 
                content=body, 
                params=request.query_params,
                timeout=30.0 
            )

            # 백엔드의 응답 상태 코드, 헤더 및 본문을 프런트엔트로 다시 전달
            response_headers = {
                k: v for k, v in proxy_response.headers.items() 
                if k.lower() not in ["content-encoding", "content-length", "transfer-encoding", "connection"]
            }
            
            response = Response(
                content=proxy_response.content,
                status_code=proxy_response.status_code,
                headers=response_headers,
                media_type=proxy_response.headers.get("content-type")
            )
            
            # Set-Cookie 헤더 복사 (백엔드가 설정한 인증 쿠키를 브라우저에 전달)
            if 'set-cookie' in proxy_response.headers:
                response.headers['Set-Cookie'] = proxy_response.headers['set-cookie']
                
            return response

        except httpx.RequestError as exc:
            # 백엔드 서버 연결 오류 처리
            print(f"Proxy Error: Could not connect to backend at {BACKEND_URL}{url_path}: {exc}")
            raise HTTPException(status_code=503, detail="백엔드 서버에 연결할 수 없습니다. 서버 상태를 확인하세요.")
        except Exception as exc:
            print(f"Unexpected Proxy Error: {exc}")
            raise HTTPException(status_code=500, detail="프록시 내부 오류 발생")