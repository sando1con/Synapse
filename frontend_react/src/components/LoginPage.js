import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/LoginPage.css';

const LoginPage = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showText, setShowText] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();


  useEffect(() => {
    const interval = setInterval(() => {
      setShowText(false); // 사라짐
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % panelContents.length);
        setShowText(true); // 다시 나타남
      }, 300); // 텍스트가 완전히 사라지고 나서 바뀌도록
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage("");
  
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/users/login`, {
        method: "POST",
        credentials: 'include',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, password }),
      });
  
      if (response.ok) {
        const redirectUrl = new URLSearchParams(window.location.search).get("redirect");
        navigate(redirectUrl || '/home');
      } else {
        const error = await response.json(); // <-- 중요!
        setErrorMessage(error.message || "로그인 실패");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("서버와 연결할 수 없습니다.");
    }
  };  

  const panelContents = [
    {
      image: "/images/img1.png",
      title: "파일을 더 쉽게",
      description: "클라우드 기반 파일 시스템으로 어디서든 안전하게 접근하고 관리하세요.",
    },
    {
      image: "/images/img2.png",
      title: "AI 자동 분류",
      description: "문서 내용을 분석해 자동으로 그룹화하고, 시각화하여 보여드립니다.",
    },
    {
      image: "/images/img3.png",
      title: "효율적인 공유",
      description: "팀원과 공유폴더를 생성하고 실시간으로 파일을 주고받아 보세요.",
    },
  ];

  const goToPanel = (index) => {
    if (index !== currentIndex) {
      setShowText(false);
      setTimeout(() => {
        setCurrentIndex(index);
        setShowText(true);
      }, 300);
    }
  };

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
        <h1 className={`fade ${showText ? 'show' : ''}`}>
          {panelContents[currentIndex].title}
        </h1>
        <p className={`fade ${showText ? 'show' : ''}`}>
          {panelContents[currentIndex].description}
        </p>

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
             {errorMessage && <p className="error-text">{errorMessage}</p>}
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