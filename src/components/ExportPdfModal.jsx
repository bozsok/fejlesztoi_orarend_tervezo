import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { FileText, User, Users, X } from 'lucide-react';
import styles from './ExportPdfModal.module.css';

export default function ExportPdfModal({ 
  isOpen, 
  onClose, 
  activePedagogueName, 
  onExportSingle, 
  onExportAll 
}) {
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
            <FileText size={22} /> PDF exportálás kiválasztása
          </h2>
          <button className="btn-close" onClick={onClose} aria-label="Bezárás">
            <X size={20} />
          </button>
        </div>

        <div className={`modal-body ${styles.body}`}>
          <p className={styles.description}>
            Válaszd ki, hogy melyik órarendet szeretnéd nyomtatásra alkalmas PDF dokumentumba exportálni:
          </p>

          <div className={styles.optionsList}>
            <button
              type="button"
              className={styles.optionCard}
              onClick={() => {
                onExportSingle();
                onClose();
              }}
            >
              <div className={styles.optionIconArea}>
                <User size={24} className="icon-blue" />
              </div>
              <div className={styles.optionTextArea}>
                <span className={styles.optionTitle}>Aktuális pedagógus órarendje</span>
                <span className={styles.optionSubtitle}>
                  Csak <strong>{activePedagogueName}</strong> egyoldalas heti órarendje
                </span>
              </div>
            </button>

            <button
              type="button"
              className={styles.optionCard}
              onClick={() => {
                onExportAll();
                onClose();
              }}
            >
              <div className={styles.optionIconArea}>
                <Users size={24} className="icon-green" />
              </div>
              <div className={styles.optionTextArea}>
                <span className={styles.optionTitle}>Összesített órarend (Minden kolléga)</span>
                <span className={styles.optionSubtitle}>
                  Minden fejlesztőpedagógus külön oldalon, egyetlen közös PDF fájlban
                </span>
              </div>
            </button>
          </div>
        </div>

        <div className={`modal-footer ${styles.footer}`}>
          <button className="btn btn-secondary" onClick={onClose}>Mégsem</button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
