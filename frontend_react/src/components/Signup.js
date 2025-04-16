import React, { useState } from "react";
import { Link } from "react-router-dom";
import "../styles/SignupPage.css"; // CSS 파일 불러오기

// 왼쪽 패널의 콘텐츠 데이터 (배경 이미지 + 텍스트)
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

const Signup = () => {
  const [role, setRole] = useState("student");
  const [name, setName] = useState("");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0); // 현재 콘텐츠 인덱스

  // 특정 패널로 이동하는 함수
  const goToPanel = (index) => {
    setCurrentIndex(index);
  };

  const handleSignup = async () => {
    if (password !== confirmPassword) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    try {
      const response = await fetch("http://localhost:8080/api/users/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: name,
          userId: userId, // User 엔티티에 있다면 반영
          password: password,
          role: role,   // User 엔티티에 있다면 반영
        }),
      });

      if (response.ok) {
        alert("회원가입이 완료되었습니다!");
      } else {
        const errorData = await response.json();
        alert("회원가입 실패: " + (errorData.message || "서버 오류"));
      }
    } catch (err) {
      console.error(err);
      alert("서버 연결에 실패했습니다.");
    }
  };

  return (
    <div className="signup-container">
      {/* 왼쪽 패널 (클릭하면 이미지 + 텍스트 변경) */}
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
              className={`role-button ${role === "student" ? "active" : ""}`}
              onClick={() => setRole("student")}
            >
              As a Student
            </button>
            <button
              className={`role-button ${role === "worker" ? "active" : ""}`}
              onClick={() => setRole("worker")}
            >
              As a Worker
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
            type="text"
            className="input-field"
            placeholder="User ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
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
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {/* 회원가입 버튼 */}
          <button className="button" onClick={handleSignup}>Create Account</button>
        </div>
      </div>
    </div>
  );
};

export default Signup;
