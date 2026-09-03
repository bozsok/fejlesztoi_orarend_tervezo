import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2 } from 'lucide-react';
import styles from './ConfirmClearModal.module.css';

export default function ConfirmClearModal({ isOpen, onClose, onConfirm }) {
  const mouseDownTargetRef = useRef(null);

  if (!isOpen) return null;

  const handleOverlayMouseDown = (e) => {
    mouseDownTargetRef.current = e.target;
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && mouseDownTargetRef.current === e.currentTarget) {
      onClose();
    }
  };

  const modalContent = (
    <div className="modal-overlay fade-in" onMouseDown={handleOverlayMouseDown} onClick={handleOverlayClick}>
      <div 
        className={`modal-content glass-panel ${styles.content}`} 
        onMouseDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className={styles.title}>
            <Trash2 size={24} /> Naptár kiürítése
          </h2>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className={`modal-body ${styles.body}`}>
          <p className={styles.message}>
            Biztosan ki szeretnéd üríteni a teljes naptárat?
          </p>
          <p className={styles.subMessage}>
            A zárolt időpontok megmaradnak, de minden tanuló beosztása törlődik.
          </p>
        </div>

        <div className={`modal-footer ${styles.footer}`}>
          <button className="btn btn-secondary" onClick={onClose}>Mégsem</button>
          <button className={`btn ${styles.btnDanger}`} onClick={onConfirm}>
            Igen, kiürítés
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
