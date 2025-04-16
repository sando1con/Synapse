import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/LoginPage.css';

const LoginPage = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("http://localhost:8080/api/users/login", {
        method: "POST",
        credentials: 'include',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, password }),
      });

      if (response.ok) {
        alert("로그인 성공!");
        const redirectUrl = new URLSearchParams(window.location.search).get("redirect");
  navigate(redirectUrl || '/home');
      } else {
        const error = await response.text();
        alert(`로그인 실패: ${error}`);
      }
    } catch (err) {
      console.error(err);
      alert("서버와 연결할 수 없습니다.");
    }
  };

  const panelContents = [
    {
      image: "https://source.unsplash.com/random/600x800?nature",
      title: "제목1",
      description: "설명1",
    },
    {
      image: "https://source.unsplash.com/random/600x800?tech",
      title: "제목2",
      description: "설명2",
    },
    {
      image: "https://source.unsplash.com/random/600x800?city",
      title: "제목3",
      description: "설명3",
    },
  ];

  const goToPanel = (index) => setCurrentIndex(index);

  return (
    <div className="signup-container">
      <div
        className="left-panel"
        style={{
          backgroundImage: `url(${panelContents[currentIndex].image})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          cursor: "pointer",
          position: "relative",
        }}
      >
        <h1>{panelContents[currentIndex].title}</h1>
        <p>{panelContents[currentIndex].description}</p>

        <div className="indicator-container">
          {panelContents.map((_, index) => (
            <span
              key={index}
              className={`indicator-dot ${currentIndex === index ? "active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                goToPanel(index);
              }}
            ></span>
          ))}
        </div>
      </div>

      <div className="right-panel">
        <div className="form-container">
          <h2>Welcome to File System 👋</h2>
          <p>아이디와 비밀번호를 입력해주세요</p>
          <form onSubmit={handleLogin}>
            <input
              className="input-field"
              type="text"
              placeholder="User ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
            />
            <input
              className="input-field"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button className="button" type="submit">Login</button>
          </form>
          <p></p>
          <p>계정이 없으신가요? <Link to="/create-account">계정 생성하기</Link></p>

          <div className="social-login">
            <button className="social-btn google-btn">
              <img src="/images/google.png" alt="Google" />
              Google
            </button>
            <button className="social-btn kakao-btn">
              <img src="/images/kakao.png" alt="Kakao" />
              Kakao
            </button>
            <button className="social-btn naver-btn">
              <img src="/images/naver.png" alt="Naver" />
              Naver
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;