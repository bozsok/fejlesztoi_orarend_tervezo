import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, User, Users, X } from 'lucide-react';
import styles from './AutoScheduleChoiceModal.module.css';

export default function AutoScheduleChoiceModal({ 
  isOpen, 
  onClose, 
  activePedagogueName, 
  onScheduleSingle, 
  onScheduleAll 
}) {
  const mouseDownTargetRef = useRef(null);
  const [resetExisting, setResetExisting] = React.useState(true);

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
            <Sparkles size={22} /> Automata tervezés indítása
          </h2>
          <button className="btn-close" onClick={onClose} aria-label="Bezárás">
            <X size={20} />
          </button>
        </div>

        <div className={`modal-body ${styles.body}`}>
          <p className={styles.description}>
            Válaszd ki az automatikus beosztás módját:
          </p>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem', cursor: 'pointer', padding: '0.5rem 0.25rem', userSelect: 'none' }}>
            <input 
              type="checkbox" 
              checked={resetExisting} 
              onChange={(e) => setResetExisting(e.target.checked)} 
              style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
            />
            <span>Meglévő beosztások törlése és tiszta újratervezés (ajánlott)</span>
          </label>

          <div className={styles.optionsList}>
            <button
              type="button"
              className={styles.optionCard}
              onClick={() => {
                onScheduleSingle(resetExisting);
                onClose();
              }}
            >
              <div className={styles.optionIconArea}>
                <User size={24} className="icon-blue" />
              </div>
              <div className={styles.optionTextArea}>
                <span className={styles.optionTitle}>Csak {activePedagogueName} órarendjének tervezése</span>
                <span className={styles.optionSubtitle}>
                  Kizárólag az ő hozzárendelt diákjait osztja be a naptárába
                </span>
              </div>
            </button>

            <button
              type="button"
              className={styles.optionCard}
              onClick={() => {
                onScheduleAll(resetExisting);
                onClose();
              }}
            >
              <div className={styles.optionIconArea}>
                <Users size={24} className="icon-green" />
              </div>
              <div className={styles.optionTextArea}>
                <span className={styles.optionTitle}>Minden pedagógus órarendjének tervezése</span>
                <span className={styles.optionSubtitle}>
                  Az összes kolléga órarendjét sorra veszi és optimalizálja
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
