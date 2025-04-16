import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const SharedAcceptPage = () => {
  const { url } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const checkLoginAndAccept = async () => {
      try {
        const meRes = await fetch("http://localhost:8080/api/users/me", {
          credentials: "include"
        });

        if (meRes.status === 401) {
          // 로그인 안된 상태면 로그인으로 이동 (리디렉트 경로 포함)
          navigate(`/login?redirect=/shared/${url}`);
          return;
        }

        const acceptRes = await fetch(`http://localhost:8080/api/shared-folders/accept/${url}`, {
          method: "POST",
          credentials: "include"
        });

        if (acceptRes.ok) {
          alert("공유 폴더 초대 수락 완료!");
        } else {
          alert("공유 폴더 수락 실패");
        }

        navigate("/home");
      } catch (error) {
        console.error("오류 발생:", error);
      }
    };

    checkLoginAndAccept();
  }, [url, navigate]);

  return <div>공유 초대 수락 중입니다...</div>;
};

export default SharedAcceptPage;