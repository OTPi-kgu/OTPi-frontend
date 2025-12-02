# OTPi-frontend/Dockerfile
# Python 공식 슬림 이미지를 기반으로 사용합니다.
FROM python:3.13-slim

# 작업 디렉토리를 /app으로 설정
WORKDIR /app

# requirements.txt 파일을 복사하고 의존성 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 나머지 코드 복사 (main.py, templates 폴더)
COPY . .

# Uvicorn이 리스닝할 포트 노출
EXPOSE 80

# Uvicorn을 사용하여 FastAPI 앱 실행
# main.py 파일의 app 객체를 0.0.0.0 호스트의 80번 포트에서 실행
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "80"]