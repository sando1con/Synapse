import React, { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import { ToastContainer, toast } from 'react-toastify';
import ConfirmModal from '../components/ConfirmModal';
import 'react-toastify/dist/ReactToastify.css';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import '../styles/FilePreview.css';

// 가장 안전한 방식
pdfjs.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

const FilePreview = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // 상태 복원
  const {
    activeTab,
    activeCluster,
    activeSharedCluster,
    isCollapsed,
    zoomLevel,
    graphCenter,
  } = location.state || {};

  const [numPages, setNumPages] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const pageRefs = useRef([]);

  // 쿼리 파라미터 추출
  const searchParams = new URLSearchParams(location.search);
  const filename = searchParams.get('filename');
  const userId = searchParams.get('userId');
  const folderId = searchParams.get('folderId');

  const fileUrl = `${process.env.REACT_APP_API_BASE_URL}/api/preview/full-pdf?${folderId
    ? `folderId=${folderId}`
    : `userId=${userId}`}&filename=${encodeURIComponent(filename)}`;

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    pageRefs.current = Array(numPages)
      .fill()
      .map(() => React.createRef());
  };

  const scrollToPage = (pageIndex) => {
    pageRefs.current[pageIndex]?.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDownload = () => {
    if (!filename) return;
    const base = `${process.env.REACT_APP_API_BASE_URL}/api/files/download-by-name`;
    const param = folderId ? `folderId=${folderId}` : `userId=${userId}`;
    const url = `${base}?${param}&filename=${encodeURIComponent(filename)}`;
    window.location.href = url;
  };

  const handleDelete = () => {
    setConfirmModal({
      message: `정말로 "${filename}" 파일을 삭제하시겠습니까?`,
      onConfirm: () => {
        setIsModalLoading(true);
        const base = folderId
          ? `${process.env.REACT_APP_API_BASE_URL}/api/files/shared-folder/delete-by-name?folderId=${folderId}`
          : `${process.env.REACT_APP_API_BASE_URL}/api/files/delete-by-name?userId=${userId}`;
        const url = `${base}&filename=${encodeURIComponent(filename)}`;

        fetch(url, {
          method: 'DELETE',
          credentials: 'include',
        })
          .then((res) => {
            if (!res.ok) throw new Error('삭제 실패');
            toast.success('🗑️ 삭제 완료');
            navigate('/home', {
              state: {
                activeTab,
                activeCluster,
                activeSharedCluster,
                isCollapsed,
                zoomLevel,
                graphCenter,
              },
            });
          })
          .catch((err) => {
            toast.error('❌ 삭제 실패');
            console.error(err);
          })
          .finally(() => {
            setIsModalLoading(false);
            setConfirmModal(null);
          });
      },
      onCancel: () => {
        setConfirmModal(null);
        setIsModalLoading(false);
      },
    });
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
          <button onClick={handleDownload}>📥 다운로드</button>
          <button onClick={handleDelete}>🗑️ 삭제</button>
          <button
            onClick={() =>
              navigate('/home', {
                state: {
                  activeTab,
                  activeCluster,
                  activeSharedCluster,
                  isCollapsed,
                  zoomLevel,
                  graphCenter,
                },
              })
            }
          >
            🔙 뒤로
          </button>
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

      {/* 확인 모달 */}
      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={confirmModal.onCancel}
          isLoading={isModalLoading}
        />
      )}

      <ToastContainer
        position="top-center"
        autoClose={1000}
        hideProgressBar={false}
        closeOnClick
        pauseOnHover
        draggable
      />
    </div>
  );
};

export default FilePreview;
