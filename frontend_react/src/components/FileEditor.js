import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import '../styles/FileEditor.css';

const FileEditor = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const filename = searchParams.get('filename');
  const userId = searchParams.get('userId');
  const folderId = searchParams.get('folderId');

  const initializeEditor = async () => {
    try {
      // ✅ presigned URL을 백엔드에서 받아옴
      const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/files/public-presigned-url`, {
        params: {
          filename,
          userId,
          folderId
        }
      });

      const fileUrl = res.data;

      if (!window.DocsAPI) {
        console.error("❌ DocsAPI 로드 실패 - 전역에 없음");
        return;
      }

      new window.DocsAPI.DocEditor('onlyoffice-editor', {
        documentType: 'word',
        height: '800px',
        width: '100%',
        document: {
          fileType: 'docx',
          key: `${userId}-${filename}-${Date.now()}`,
          title: filename,
          url: fileUrl // ✅ 여기가 presigned URL
        },

        editorConfig: {
          mode: 'edit',
          user: {
            id: userId,
            name: userId
          },
          callbackUrl: `http://host.docker.internal:8080/api/files/callback?filename=${filename}&userId=${userId}`
        }

      });

    } catch (err) {
      console.error("❌ presigned URL 요청 실패", err);
    }
  };

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'http://localhost:8082/web-apps/apps/api/documents/api.js';
    script.onload = initializeEditor;
    script.onerror = () => {
      console.error("❌ DocsAPI 스크립트 로딩 실패");
    };
    document.body.appendChild(script);
  }, [filename, userId, folderId]);

  return (
    <div className="editor-wrapper">
      <h2 className="editor-title">✏️ 문서 편집기</h2>
      <div id="onlyoffice-editor" />
    </div>
  );
};

export default FileEditor;
