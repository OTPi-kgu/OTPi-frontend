import os

import requests
import streamlit as st
from dotenv import load_dotenv

load_dotenv()
API_BASE = os.getenv("API_BASE", "http://localhost:8000")

st.set_page_config(page_title="OTPi Demo", page_icon="🔐", layout="centered")

if "page" not in st.session_state:
    st.session_state.page = "main"
if "is_logged_in" not in st.session_state:
    st.session_state.is_logged_in = False
if "email" not in st.session_state:
    st.session_state.email = ""
if "name" not in st.session_state:
    st.session_state.name = ""

def goto(page: str):
    st.session_state.page = page
    st.rerun()

def render_main_page():
    if not st.session_state.is_logged_in:
        goto("login")
        return

    st.title("🏠 메인 페이지")
    st.success(f"로그인 상태입니다. ({st.session_state.email})")

    st.markdown(f"""
    ### 👋 반갑습니다 **{st.session_state.name}**님!

    여기는 OTP 기반 로그인 데모 서비스의 메인 페이지입니다.
    """)

    if st.button("🚪 로그아웃"):
        st.session_state.is_logged_in = False
        st.session_state.email = ""
        st.session_state.name = ""
        goto("login")

def render_login_page():
    st.title("🔐 로그인")

    email = st.text_input(
        "이메일",
        value=st.session_state.email,
        placeholder="you@example.com",
        key="login_email",
    )
    code = st.text_input(
        "OTP 코드",
        placeholder="메일로 받은 6자리 코드",
        type="password",
        key="login_code",
    )

    col1, col2, col3 = st.columns([1, 1, 1])

    # OTP 보내기
    with col1:
        if st.button("📨 OTP 보내기"):
            if not email:
                st.warning("이메일을 입력해 주세요.")
            else:
                try:
                    res = requests.post(
                        f"{API_BASE}/request-otp",
                        json={"email": email},
                        timeout=5,
                    )
                    if res.status_code == 200:
                        st.session_state.email = email
                        st.success("OTP가 이메일로 발송되었습니다.")
                    else:
                        detail = res.json().get("detail", res.text)
                        st.error(f"OTP 요청 실패: {detail}")
                except Exception as e:
                    st.error(f"서버에 연결할 수 없습니다: {e}")

    with col2:
        if st.button("✅ 로그인"):
            if not email or not code:
                st.warning("이메일과 OTP 코드를 모두 입력해 주세요.")
            else:
                try:
                    res = requests.post(
                        f"{API_BASE}/verify-otp",
                        json={"email": email, "code": code},
                        timeout=5,
                    )
                    data = res.json()

                    if res.status_code == 200 and data.get("login"):
                        st.session_state.is_logged_in = True
                        st.session_state.email = data.get("email")
                        st.session_state.name = data.get("name")

                        st.success("로그인 성공! 메인 페이지로 이동합니다. 🎉")
                        goto("main")
                    else:
                        st.error(data.get("message", "OTP 인증 실패"))
                except Exception as e:
                    st.error(f"서버에 연결할 수 없습니다: {e}")

    # 회원가입 이동
    with col3:
        if st.button("📝 회원가입"):
            goto("signup")

def render_signup_page():
    st.title("📝 회원가입")

    name = st.text_input("이름", value=st.session_state.name, key="signup_name")
    email = st.text_input(
        "이메일",
        value=st.session_state.email,
        placeholder="you@example.com",
        key="signup_email",
    )

    if st.button("✅ 회원가입 완료"):
        if not name or not email:
            st.warning("이름과 이메일을 모두 입력해 주세요.")
        else:
            try:
                res = requests.post(
                    f"{API_BASE}/register",
                    json={"name": name, "email": email},
                    timeout=5,
                )
                if res.status_code == 200:
                    data = res.json()
                    st.session_state.name = data.get("name", name)
                    st.session_state.email = data.get("email", email)
                    st.success("회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.")
                    goto("login")
                else:
                    detail = res.json().get("detail", res.text)
                    st.error(f"회원가입 실패: {detail}")
            except Exception as e:
                st.error(f"서버에 연결할 수 없습니다: {e}")

    if st.button("↩️ 로그인 페이지로 돌아가기"):
        goto("login")

page = st.session_state.page

if page == "main":
    render_main_page()
elif page == "login":
    render_login_page()
elif page == "signup":
    render_signup_page()
else:
    goto("login")
    goto("login")
