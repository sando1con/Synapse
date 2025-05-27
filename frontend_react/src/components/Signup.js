import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import "../styles/SignupPage.css";

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

const Signup = () => {
  const [role, setRole] = useState("student");
  const [name, setName] = useState("");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showText, setShowText] = useState(true);

  const [userIdError, setUserIdError] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setShowText(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % panelContents.length);
        setShowText(true);
      }, 300);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const goToPanel = (index) => {
    if (index !== currentIndex) {
      setShowText(false);
      setTimeout(() => {
        setCurrentIndex(index);
        setShowText(true);
      }, 300);
    }
  };

  const handleSignup = async () => {
    setUserIdError("");
    setUsernameError("");
    setConfirmPasswordError("");

    if (password !== confirmPassword) {
      setConfirmPasswordError("비밀번호가 일치하지 않습니다.");
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/users/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: name,
          userId: userId,
          password: password,
          role: role,
        }),
      });

      if (response.ok) {
        toast.success("🎉 회원가입이 완료되었습니다!");
      } else {
        const errorData = await response.json();
        if (errorData.field === "userId") {
          setUserIdError(errorData.message);
        } else if (errorData.field === "username") {
          setUsernameError(errorData.message);
        } else {
          toast.error("회원가입 실패: " + errorData.message);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("🚨 서버 연결에 실패했습니다.");
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
          position: "relative",
          cursor: "pointer",
        }}
      >
        <h1 className={`fade ${showText ? "show" : ""}`}>{panelContents[currentIndex].title}</h1>
        <p className={`fade ${showText ? "show" : ""}`}>{panelContents[currentIndex].description}</p>

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
        <div className="form-container" onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleSignup();
          }
        }}>
          <h2>Sign Up</h2>
          <p>이미 계정이 있으신가요? <Link to="/login">로그인</Link></p>

          <div className="role-buttons">
            <button className={`role-button ${role === "student" ? "active" : ""}`} onClick={() => setRole("student")}>As a Student</button>
            <button className={`role-button ${role === "worker" ? "active" : ""}`} onClick={() => setRole("worker")}>As a Worker</button>
          </div>

          <input type="text" className="input-field" placeholder="Full Name" value={name} onChange={(e) => { setName(e.target.value); setUsernameError(""); }} />
          {usernameError && <p className="error-text">{usernameError}</p>}

          <input type="text" className="input-field" placeholder="User ID" value={userId} onChange={(e) => { setUserId(e.target.value); setUserIdError(""); }} />
          {userIdError && <p className="error-text">{userIdError}</p>}

          <input type="password" className="input-field" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />

          <input type="password" className="input-field" placeholder="Check Password" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setConfirmPasswordError(""); }} />
          {confirmPasswordError && <p className="error-text">{confirmPasswordError}</p>}

          <button className="button" onClick={handleSignup}>Create Account</button>
        </div>
      </div>
    </div>
  );
};

export default Signup;