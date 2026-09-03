import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Settings } from 'lucide-react';
import useStore from '../store/useStore';
import styles from './SettingsModal.module.css';

export default function SettingsModal({ isOpen, onClose }) {
  const { settings, updateSettings } = useStore();
  const [maxGroupSize, setMaxGroupSize] = useState(5);
  const [allowManualGroupSizeOverride, setAllowManualGroupSizeOverride] = useState(false);
  const [maxTeacherHours, setMaxTeacherHours] = useState(24);
  const [teacherCode, setTeacherCode] = useState('2');
  const [groupNamingOrder, setGroupNamingOrder] = useState('vertical');
  const mouseDownTargetRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setMaxGroupSize(settings.maxGroupSize || 5);
      setAllowManualGroupSizeOverride(settings.allowManualGroupSizeOverride || false);
      setMaxTeacherHours(settings.maxTeacherHours || 24);
      setTeacherCode(settings.teacherCode || '2');
      setGroupNamingOrder(settings.groupNamingOrder || 'vertical');
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    updateSettings({
      maxGroupSize: parseInt(maxGroupSize, 10) || 5,
      allowManualGroupSizeOverride,
      maxTeacherHours: Math.min(26, Math.max(1, parseInt(maxTeacherHours, 10) || 24)),
      teacherCode: teacherCode.trim() || '2',
      groupNamingOrder: groupNamingOrder || 'vertical',
    });
    onClose();
  };

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
            <Settings size={24} /> Beállítások
          </h2>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className={`modal-body ${styles.body}`}>
          {/* Max csoportlétszám */}
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="maxGroupSizeInput">
              Maximális csoportlétszám óránként:
            </label>
            <input
              type="number"
              id="maxGroupSizeInput"
              min="1"
              max="10"
              className={styles.inputNumber}
              value={maxGroupSize}
              onChange={(e) => setMaxGroupSize(e.target.value)}
            />
            <small className={styles.helpText}>
              A heti automatikus és manuális tervezésnél figyelembe vett csoportlétszám-korlát (alapértelmezetten 5 fő).
            </small>
          </div>

          {/* Max pedagógus óraszám */}
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="maxTeacherHoursInput">
              Maximális heti óraszám (pedagógus kapacitás):
            </label>
            <input
              type="number"
              id="maxTeacherHoursInput"
              min="1"
              max="26"
              className={styles.inputNumber}
              value={maxTeacherHours}
              onChange={(e) => setMaxTeacherHours(e.target.value)}
            />
            <small className={styles.helpText}>
              A fejlesztőpedagógus heti maximális megtartott óraszáma. Az új idősávokban tartott órák száma (beosztott idősávok) nem haladhatja meg ezt a korlátot.
            </small>
          </div>

          {/* Manuális felülbírálás */}
          <div className={styles.formGroup}>
            <label className={styles.checkboxContainer}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={allowManualGroupSizeOverride}
                onChange={(e) => setAllowManualGroupSizeOverride(e.target.checked)}
              />
              <span className={styles.checkboxLabel}>
                Maximális létszám manuális felülbírálása kártyahúzáskor
              </span>
            </label>
            <small className={styles.helpText}>
              Ha be van kapcsolva, a manuális diák-beosztásnál (Drag & Drop) a rendszer átengedi a limit feletti diákokat is (pl. 6. tanuló), amennyiben az adott óra a tantárgyi elhozhatósági szabályoknak egyébként megfelel.
            </small>
          </div>

          {/* Pedagógus KRÉTA kód / előtag */}
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="teacherCodeInput">
              Csoport megjelölés előtagja:
            </label>
            <input
              type="text"
              id="teacherCodeInput"
              className={styles.inputNumber}
              style={{ width: '80px', textAlign: 'center' }}
              value={teacherCode}
              onChange={(e) => setTeacherCode(e.target.value)}
              placeholder="2"
            />
            <small className={styles.helpText}>
              A KRÉTA rendszerben rögzített számod (pl. "2" esetén a csoportok elnevezése 2/1, 2/2, 2/3... lesz).
            </small>
          </div>

          {/* Számozási irány */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Csoportok automatikus számozási iránya:
            </label>
            <div style={{ display: 'flex', gap: '16px', marginTop: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="groupNamingOrder"
                  value="vertical"
                  checked={groupNamingOrder === 'vertical'}
                  onChange={() => setGroupNamingOrder('vertical')}
                />
                Függőleges (napok)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="groupNamingOrder"
                  value="horizontal"
                  checked={groupNamingOrder === 'horizontal'}
                  onChange={() => setGroupNamingOrder('horizontal')}
                />
                Vízszintes (órák)
              </label>
            </div>
            <small className={styles.helpText}>
              Meghatározza, hogy a csoportok generált sorszámai a napokat lefelé haladva (Hétfő 1. óra = 2/1, Hétfő 2. óra = 2/2) vagy óránként jobbra sorszámozódjanak.
            </small>
          </div>
        </div>

        <div className={`modal-footer ${styles.footer}`}>
          <button className="btn btn-secondary" onClick={onClose}>Mégsem</button>
          <button className="btn btn-primary" onClick={handleSave}>
            Mentés
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
