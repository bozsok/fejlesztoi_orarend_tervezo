import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Settings, Users, Plus, Trash2 } from 'lucide-react';
import useStore, { PEDAGOGUE_COLORS } from '../store/useStore';
import styles from './SettingsModal.module.css';

export default function SettingsModal({ isOpen, onClose }) {
  const { 
    settings, 
    updateSettings, 
    pedagogues, 
    addPedagogue, 
    updatePedagogue, 
    removePedagogue 
  } = useStore();

  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'pedagogues'
  const [maxGroupSize, setMaxGroupSize] = useState(5);
  const [allowManualGroupSizeOverride, setAllowManualGroupSizeOverride] = useState(false);

  // Helyi másolat a pedagógusok szerkesztéséhez
  const [localPedagogues, setLocalPedagogues] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const mouseDownTargetRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setMaxGroupSize(settings.maxGroupSize || 5);
      setAllowManualGroupSizeOverride(settings.allowManualGroupSizeOverride || false);
      setLocalPedagogues(pedagogues.map(p => ({ ...p })));
      setErrorMessage('');
    }
  }, [isOpen, settings, pedagogues]);

  if (!isOpen) return null;

  const handlePedagogueChange = (id, field, value) => {
    setLocalPedagogues(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleAddNewPedagogue = () => {
    const nextIdx = localPedagogues.length;
    const newId = `ped-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newPed = {
      id: newId,
      name: '',
      teacherCode: String(nextIdx + 1),
      maxTeacherHours: 24,
      groupNamingOrder: 'vertical',
      timetableTitle: 'Új pedagógus, fejlesztőpedagógus',
      timetable: {},
      blockedPeriods: {},
      customGroupLabels: {},
      color: PEDAGOGUE_COLORS[nextIdx % PEDAGOGUE_COLORS.length],
      isNew: true,
    };
    setLocalPedagogues(prev => [...prev, newPed]);
  };

  const handleRemoveLocalPedagogue = (id) => {
    if (localPedagogues.length <= 1) {
      setErrorMessage('Legalább egy pedagógusnak maradnia kell a rendszerben!');
      return;
    }
    setLocalPedagogues(prev => prev.filter(p => p.id !== id));
    setErrorMessage('');
  };

  const handleSave = () => {
    // Validáljuk a pedagógusok neveit
    const emptyNames = localPedagogues.some(p => !p.name.trim());
    if (emptyNames) {
      setActiveTab('pedagogues');
      setErrorMessage('Kérjük, minden pedagógus nevét töltsd ki!');
      return;
    }

    // 1. Általános beállítások mentése
    updateSettings({
      maxGroupSize: parseInt(maxGroupSize, 10) || 5,
      allowManualGroupSizeOverride,
    });

    // 2. Pedagógusok szinkronizálása
    // Megkeressük a törölt pedagógusokat
    pedagogues.forEach(existing => {
      if (!localPedagogues.some(local => local.id === existing.id)) {
        removePedagogue(existing.id);
      }
    });

    // Frissítjük a megmaradókat és hozzáadjuk az újakat
    localPedagogues.forEach((local, idx) => {
      const isExisting = pedagogues.some(existing => existing.id === local.id);
      if (isExisting) {
        updatePedagogue(local.id, {
          name: local.name.trim(),
          teacherCode: String(local.teacherCode).trim() || String(idx + 1),
          maxTeacherHours: Math.min(26, Math.max(1, parseInt(local.maxTeacherHours, 10) || 24)),
          groupNamingOrder: local.groupNamingOrder || 'vertical',
          timetableTitle: local.timetableTitle || `${local.name.trim()}, fejlesztőpedagógus`,
          color: local.color || PEDAGOGUE_COLORS[idx % PEDAGOGUE_COLORS.length],
        });
      } else {
        addPedagogue({
          id: local.id,
          name: local.name.trim(),
          teacherCode: String(local.teacherCode).trim() || String(idx + 1),
          maxTeacherHours: Math.min(26, Math.max(1, parseInt(local.maxTeacherHours, 10) || 24)),
          groupNamingOrder: local.groupNamingOrder || 'vertical',
          timetableTitle: local.timetableTitle || `${local.name.trim()}, fejlesztőpedagógus`,
          timetable: local.timetable || {},
          blockedPeriods: local.blockedPeriods || {},
          customGroupLabels: local.customGroupLabels || {},
          color: local.color || PEDAGOGUE_COLORS[idx % PEDAGOGUE_COLORS.length],
        });
      }
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
          <button className="btn-close" onClick={onClose} aria-label="Bezárás">
            <X size={20} />
          </button>
        </div>

        {/* Fülek */}
        <div className={styles.tabsHeader}>
          <button 
            type="button"
            className={`${styles.tabButton} ${activeTab === 'general' ? styles.tabButtonActive : ''}`}
            onClick={() => { setActiveTab('general'); setErrorMessage(''); }}
          >
            <Settings size={16} /> Általános
          </button>
          <button 
            type="button"
            className={`${styles.tabButton} ${activeTab === 'pedagogues' ? styles.tabButtonActive : ''}`}
            onClick={() => setActiveTab('pedagogues')}
          >
            <Users size={16} /> Pedagógusok ({localPedagogues.length})
          </button>
        </div>

        <div className={`modal-body ${styles.body}`}>
          {errorMessage && (
            <div className={styles.errorBanner}>
              {errorMessage}
            </div>
          )}

          {activeTab === 'general' && (
            <div className={styles.generalTab}>
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
            </div>
          )}

          {activeTab === 'pedagogues' && (
            <div className={styles.pedagoguesTab}>
              <p className={styles.tabIntroText}>
                Itt kezelheted és szerkesztheted a fejlesztőpedagógusok adatait (KRÉTA kód, heti kapacitás, számozási irány).
              </p>

              <div className={styles.pedagoguesList}>
                {localPedagogues.map((ped, idx) => (
                  <div key={ped.id} className={styles.pedagogueCard}>
                    <div className={styles.pedagogueCardHeader}>
                      <div className={styles.pedagogueHeaderLeft}>
                        <div 
                          className={styles.cardColorDot} 
                          style={{ backgroundColor: ped.color || PEDAGOGUE_COLORS[idx % PEDAGOGUE_COLORS.length] }}
                        />
                        <span className={styles.pedagogueIndexLabel}>{idx + 1}. pedagógus</span>
                      </div>
                      {localPedagogues.length > 1 && (
                        <button
                          type="button"
                          className={styles.deleteCardBtn}
                          onClick={() => handleRemoveLocalPedagogue(ped.id)}
                          title="Pedagógus törlése"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    <div className={styles.cardRow}>
                      <div className={styles.cardFieldFlex}>
                        <label className={styles.cardFieldLabel}>Név:</label>
                        <input
                          type="text"
                          className={styles.cardInput}
                          placeholder="pl. Kiss Katalin"
                          value={ped.name}
                          onChange={(e) => handlePedagogueChange(ped.id, 'name', e.target.value)}
                          required
                        />
                      </div>

                      <div className={styles.cardFieldSmall}>
                        <label className={styles.cardFieldLabel}>KRÉTA kód:</label>
                        <input
                          type="text"
                          className={styles.cardInputCenter}
                          placeholder="2"
                          value={ped.teacherCode}
                          onChange={(e) => handlePedagogueChange(ped.id, 'teacherCode', e.target.value)}
                          required
                        />
                      </div>

                      <div className={styles.cardFieldSmall}>
                        <label className={styles.cardFieldLabel}>Max óra:</label>
                        <input
                          type="number"
                          min="1"
                          max="26"
                          className={styles.cardInputCenter}
                          value={ped.maxTeacherHours}
                          onChange={(e) => handlePedagogueChange(ped.id, 'maxTeacherHours', e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className={styles.orderRadioRow}>
                      <span className={styles.orderRadioLabel}>Számozási irány:</span>
                      <label className={styles.radioOption}>
                        <input
                          type="radio"
                          name={`groupOrder-${ped.id}`}
                          value="vertical"
                          checked={ped.groupNamingOrder === 'vertical'}
                          onChange={() => handlePedagogueChange(ped.id, 'groupNamingOrder', 'vertical')}
                        />
                        Függőleges (napok)
                      </label>
                      <label className={styles.radioOption}>
                        <input
                          type="radio"
                          name={`groupOrder-${ped.id}`}
                          value="horizontal"
                          checked={ped.groupNamingOrder === 'horizontal'}
                          onChange={() => handlePedagogueChange(ped.id, 'groupNamingOrder', 'horizontal')}
                        />
                        Vízszintes (órák)
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                type="button" 
                className={`btn btn-secondary ${styles.addPedagogueBtn}`}
                onClick={handleAddNewPedagogue}
              >
                <Plus size={16} /> Új pedagógus hozzáadása
              </button>
            </div>
          )}
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

