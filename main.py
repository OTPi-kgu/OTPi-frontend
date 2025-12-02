# OTPi-frontend/main.py
from fastapi import FastAPI, Request
from fastapi.templating import Jinja2Templates

# 템플릿 폴더 지정 (main.py가 실행되는 위치 기준)
templates = Jinja2Templates(directory="templates")

app = FastAPI(title="OTPi Python Frontend")

@app.get("/")
def home(request: Request):
    # templates.TemplateResponse를 사용하여 index.html 파일을 렌더링합니다.
    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "title": "Python OTPi 프런트엔드",
            "message": "OTPi Python Frontend 서버 성공!",
        }
    )