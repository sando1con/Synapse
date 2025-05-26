import React, { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import '../styles/FilePreview.css'; // 아래 스타일 분리 추천

// 가장 안전한 방식
pdfjs.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

const FilePreview = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [numPages, setNumPages] = useState(null);
  const pageRefs = useRef([]); // 페이지 DOM 접근용

  const searchParams = new URLSearchParams(location.search);
  const filename = searchParams.get('filename');
  const userId = searchParams.get('userId');
  const folderId = searchParams.get('folderId');

  const fileUrl = `${process.env.REACT_APP_API_BASE_URL}/api/preview/full-pdf?${folderId
    ? `folderId=${folderId}`
    : `userId=${userId}`}&filename=${encodeURIComponent(filename)}`;

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    pageRefs.current = Array(numPages).fill().map(() => React.createRef());
  };

  const scrollToPage = (pageIndex) => {
    pageRefs.current[pageIndex]?.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="preview-wrapper">
      {/* 썸네일 네비게이션 */}
      <div className="sidebar-thumbnails">
        {Array.from(new Array(numPages), (_, index) => (
          <div key={index} className="thumbnail" onClick={() => scrollToPage(index)}>
            <span>{index + 1}쪽</span>
          </div>
        ))}
      </div>

      {/* 본문 */}
      <div className="preview-content">
        <div className="preview-header">
          <button
            onClick={() => navigate(`/edit?${folderId
              ? `folderId=${folderId}`
              : `userId=${userId}`}&filename=${encodeURIComponent(filename)}`)}
          >
            ✏️ 편집하기
          </button>
          <button onClick={() => navigate(-1)}>🔙 뒤로</button>
        </div>

        <div className="pdf-container">
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={(err) => console.error('PDF 로드 실패:', err)}
          >
            {Array.from(new Array(numPages), (_, index) => (
              <div
                key={`page_${index + 1}`}
                ref={pageRefs.current[index]}
                className="page-wrapper"
              >
                <Page
                  pageNumber={index + 1}
                  width={800}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              </div>
            ))}
          </Document>
        </div>
      </div>
    </div>
  );
};

export default FilePreview;