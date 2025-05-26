import React, { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const SharedAcceptPage = () => {
  const { url } = useParams();
  const navigate = useNavigate();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const checkLoginAndAccept = async () => {
      try {
        const meRes = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/users/me`, {
          credentials: "include"
        });

        if (meRes.status === 401) {
          navigate(`/login?redirect=/shared/${url}`);
          return;
        }

        const acceptRes = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/shared-folders/accept/${url}`, {
          method: "POST",
          credentials: "include"
        });

        if (acceptRes.ok) {
          toast.success("📥 공유 폴더 초대가 수락되었습니다!");
        } else {
          toast.error("❌ 공유 폴더 수락 실패");
        }

        navigate("/home");

      } catch (error) {
        console.error("오류 발생:", error);
        toast.error("❗ 예기치 않은 오류가 발생했습니다.");
        navigate("/home");
      }
    };

    checkLoginAndAccept();
  }, [url, navigate]);

  return null;
};

export default SharedAcceptPage;