// ConfirmModal.jsx
import React from 'react';
import ReactDOM from 'react-dom';
import '../styles/ConfirmModal.css';

const ConfirmModal = ({ message, onConfirm, onCancel, isLoading }) => {
  return ReactDOM.createPortal(
    <div className="modal-backdrop">
      <div className="modal-box">
        <p>{message}</p>
        <div className="modal-buttons">
          <button className="confirm-btn" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? '처리 중...' : '확인'}
          </button>
          <button className="cancel-btn" onClick={onCancel} disabled={isLoading}>취소</button>
        </div>
      </div>
    </div>,
    document.body // 🔥 이게 핵심입니다
  );
};

export default ConfirmModal;