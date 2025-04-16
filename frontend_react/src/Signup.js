import React, { useState } from "react";
import { Link } from "react-router-dom";
import "../styles.css"; // CSS 파일 불러오기

// 왼쪽 패널의 콘텐츠 데이터 (배경 이미지 + 텍스트)
const panelContents = [
  {
    image: "https://source.unsplash.com/random/600x800?nature",
    title: "Connecting Talent to Opportunities",
    description: "Join a network of professionals and get started today!",
  },
  {
    image: "https://source.unsplash.com/random/600x800?tech",
    title: "Work with Top Clients",
    description: "Find the best projects that match your skills and passion.",
  },
  {
    image: "https://source.unsplash.com/random/600x800?city",
    title: "Build Your Career",
    description: "Create a strong portfolio and unlock new opportunities.",
  },
];

const Signup = () => {
  const [role, setRole] = useState("designer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0); // 현재 콘텐츠 인덱스

  // 클릭하면 다음 콘텐츠로 변경
  const changePanelContent = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % panelContents.length);
  };

  // 특정 패널로 이동하는 함수
  const goToPanel = (index) => {
    setCurrentIndex(index);
  };

  return (
    <div className="signup-container">
      {/* 왼쪽 패널 (클릭하면 이미지 + 텍스트 변경) */}
      <div
        className="left-panel"
        onClick={changePanelContent}
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

        {/* 인디케이터 (원형) */}
        <div className="indicator-container">
          {panelContents.map((_, index) => (
            <span
              key={index}
              className={`indicator-dot ${currentIndex === index ? "active" : ""}`}
              onClick={(e) => {
                e.stopPropagation(); // 부모 요소 클릭 방지
                goToPanel(index);
              }}
            ></span>
          ))}
        </div>
      </div>

      {/* 오른쪽 패널 */}
      <div className="right-panel">
        <div className="form-container">
          <h2>Sign Up</h2>
          <p>
            이미 계정이 있으신가요? <Link to="/login">로그인</Link>
          </p>

          {/* 역할 선택 버튼 */}
          <div className="role-buttons">
            <button
              className={`role-button ${role === "designer" ? "active" : ""}`}
              onClick={() => setRole("designer")}
            >
              As a Designer
            </button>
            <button
              className={`role-button ${role === "developer" ? "active" : ""}`}
              onClick={() => setRole("developer")}
            >
              As a Developer
            </button>
          </div>

          {/* 입력 필드 */}
          <input
            type="text"
            className="input-field"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="email"
            className="input-field"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            className="input-field"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        <input
            type="password"
            className="input-field"
            placeholder="Check Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {/* 회원가입 버튼 */}
          <button className="button">Create Account</button>
        </div>
      </div>
    </div>
  );
};

export default Signup;
