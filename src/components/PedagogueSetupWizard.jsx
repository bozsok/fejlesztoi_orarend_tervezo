import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Users, Plus, Trash2, Upload, Check, AlertCircle } from 'lucide-react';
import useStore, { PEDAGOGUE_COLORS } from '../store/useStore';
import styles from './PedagogueSetupWizard.module.css';

export default function PedagogueSetupWizard({ isOpen, onClose }) {
  const { addPedagogue } = useStore();
  const [pedagogueRows, setPedagogueRows] = useState([
    {
      tempId: 'row-1',
      name: '',
      teacherCode: '1',
      maxTeacherHours: 24,
      color: PEDAGOGUE_COLORS[0],
      importedData: null,
      importFileName: '',
    },
  ]);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRefs = useRef({});
  const mouseDownTargetRef = useRef(null);

  if (!isOpen) return null;

  const handleAddRow = () => {
    const nextIdx = pedagogueRows.length;
    setPedagogueRows((prev) => [
      ...prev,
      {
        tempId: `row-${Date.now()}-${nextIdx}`,
        name: '',
        teacherCode: String(nextIdx + 1),
        maxTeacherHours: 24,
        color: PEDAGOGUE_COLORS[nextIdx % PEDAGOGUE_COLORS.length],
        importedData: null,
        importFileName: '',
      },
    ]);
  };

  const handleRemoveRow = (tempId) => {
    if (pedagogueRows.length <= 1) {
      setErrorMessage('Legalább egy pedagógus megadása kötelező!');
      return;
    }
    setPedagogueRows((prev) => prev.filter((r) => r.tempId !== tempId));
    setErrorMessage('');
  };

  const handleRowChange = (tempId, field, value) => {
    setPedagogueRows((prev) =>
      prev.map((r) => (r.tempId === tempId ? { ...r, [field]: value } : r))
    );
    if (errorMessage) setErrorMessage('');
  };

  const handleTriggerImport = (tempId) => {
    if (fileInputRefs.current[tempId]) {
      fileInputRefs.current[tempId].click();
    }
  };

  const handleFileChange = (tempId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);

        // Támogatjuk mind a többpedagógusos ({ pedagogues: [...] }), mind a hagyományos ({ blockedPeriods: ... }) formátumot
        let targetPed = null;
        if (parsed.pedagogues && Array.isArray(parsed.pedagogues) && parsed.pedagogues.length > 0) {
          targetPed = (parsed.activePedagogueId && parsed.pedagogues.find(p => p.id === parsed.activePedagogueId)) || parsed.pedagogues[0];
        }

        const blockedPeriods = targetPed ? targetPed.blockedPeriods : parsed.blockedPeriods;
        const timetable = targetPed ? targetPed.timetable : parsed.timetable;
        const customGroupLabels = targetPed ? targetPed.customGroupLabels : parsed.customGroupLabels;
        const timetableTitle = targetPed ? targetPed.timetableTitle : parsed.timetableTitle;
        const name = targetPed ? targetPed.name : (timetableTitle ? timetableTitle.split(',')[0].trim() : '');
        const teacherCode = targetPed ? targetPed.teacherCode : parsed.settings?.teacherCode;
        const maxTeacherHours = targetPed ? targetPed.maxTeacherHours : parsed.settings?.maxTeacherHours;

        if (blockedPeriods || timetable) {
          const blockedCount = Object.values(blockedPeriods || {}).reduce(
            (sum, dayObj) => sum + Object.keys(dayObj).length,
            0
          );
          setPedagogueRows((prev) =>
            prev.map((r) =>
              r.tempId === tempId
                ? {
                    ...r,
                    name: r.name || name || '',
                    teacherCode: r.teacherCode || (teacherCode ?? r.teacherCode),
                    maxTeacherHours: maxTeacherHours ? Math.min(26, Math.max(1, maxTeacherHours)) : r.maxTeacherHours,
                    importedData: {
                      blockedPeriods: blockedPeriods || {},
                      timetable: timetable || {},
                      customGroupLabels: customGroupLabels || {},
                      timetableTitle: timetableTitle || '',
                    },
                    importFileName: `${file.name} (${blockedCount} zárolás)`,
                  }
                : r
            )
          );
          setErrorMessage('');
        } else {
          setErrorMessage('A kiválasztott fájl nem tartalmaz érvényes órarendi vagy zárolási adatokat!');
        }
      } catch (err) {
        console.error('Hiba a JSON betöltésekor:', err);
        setErrorMessage('A JSON fájl beolvasása sikertelen vagy a formátuma hibás.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Validáció: minden pedagógusnak legyen neve
    const emptyNames = pedagogueRows.some((r) => !r.name.trim());
    if (emptyNames) {
      setErrorMessage('Kérjük, minden pedagógus nevét add meg az induláshoz!');
      return;
    }

    // Pedagógusok mentése a store-ba
    pedagogueRows.forEach((row, idx) => {
      const nameTrimmed = row.name.trim();
      addPedagogue({
        name: nameTrimmed,
        teacherCode: String(row.teacherCode).trim() || String(idx + 1),
        maxTeacherHours: Math.min(26, Math.max(1, parseInt(row.maxTeacherHours, 10) || 24)),
        groupNamingOrder: 'vertical',
        timetableTitle: row.importedData?.timetableTitle || `${nameTrimmed}, fejlesztőpedagógus`,
        timetable: row.importedData?.timetable || {},
        blockedPeriods: row.importedData?.blockedPeriods || {},
        customGroupLabels: row.importedData?.customGroupLabels || {},
        color: row.color,
      });
    });

    onClose();
  };

  const handleOverlayMouseDown = (e) => {
    mouseDownTargetRef.current = e.target;
  };

  const handleOverlayClick = (e) => {
    // A kezdő varázsló nem zárható be a háttérre kattintással, hogy ne maradjon üres a pedagóguslista
    if (e.target === e.currentTarget && mouseDownTargetRef.current === e.currentTarget) {
      // no-op
    }
  };

  const modalContent = (
    <div className="modal-overlay fade-in" onMouseDown={handleOverlayMouseDown} onClick={handleOverlayClick}>
      <div 
        className={`modal-content glass-panel ${styles.wizardContent}`}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>
            <Users size={24} className="icon-blue" /> Üdvözlünk! Fejlesztőpedagógusok beállítása
          </h2>
        </div>

        <form onSubmit={handleSubmit} className={styles.wizardForm}>
          <div className={`modal-body ${styles.wizardBody}`}>
            <p className="modal-subtitle">
              Add meg a munkaközösség fejlesztőpedagógusait! Bármennyi kolléga rögzíthető.
              Ha valamelyik pedagógusnak már elmentetted korábban a zárolásait vagy órarendjét (pl. más tantárgy oktatása miatt), az <strong>Importálás</strong> gombbal azonnal hozzárendelheted.
            </p>

            {errorMessage && (
              <div className={styles.errorBanner}>
                <AlertCircle size={18} />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className={styles.rowsContainer}>
              {pedagogueRows.map((row, index) => (
                <div key={row.tempId} className={styles.pedagogueRow}>
                  <div 
                    className={styles.colorIndicator} 
                    style={{ backgroundColor: row.color }}
                    title={`Színkód: ${row.color}`}
                  />

                  <div className={styles.fieldGroup}>
                    <label className={styles.inputLabel} htmlFor={`name-${row.tempId}`}>
                      Pedagógus neve:
                    </label>
                    <input
                      id={`name-${row.tempId}`}
                      type="text"
                      className={styles.textInput}
                      placeholder="pl. Kiss Katalin"
                      value={row.name}
                      onChange={(e) => handleRowChange(row.tempId, 'name', e.target.value)}
                      autoFocus={index === 0}
                      required
                    />
                  </div>

                  <div className={styles.smallFieldGroup}>
                    <label className={styles.inputLabel} htmlFor={`code-${row.tempId}`}>
                      KRÉTA kód:
                    </label>
                    <input
                      id={`code-${row.tempId}`}
                      type="text"
                      className={styles.smallInput}
                      placeholder="pl. 2"
                      value={row.teacherCode}
                      onChange={(e) => handleRowChange(row.tempId, 'teacherCode', e.target.value)}
                      required
                    />
                  </div>

                  <div className={styles.smallFieldGroup}>
                    <label className={styles.inputLabel} htmlFor={`hours-${row.tempId}`}>
                      Max heti óra:
                    </label>
                    <input
                      id={`hours-${row.tempId}`}
                      type="number"
                      min="1"
                      max="26"
                      className={styles.smallInput}
                      value={row.maxTeacherHours}
                      onChange={(e) => handleRowChange(row.tempId, 'maxTeacherHours', e.target.value)}
                      required
                    />
                  </div>

                  <div className={styles.importGroup}>
                    <input
                      type="file"
                      ref={(el) => (fileInputRefs.current[row.tempId] = el)}
                      style={{ display: 'none' }}
                      accept=".json"
                      onChange={(e) => handleFileChange(row.tempId, e)}
                    />
                    <button
                      type="button"
                      className={`btn btn-secondary ${styles.importBtn} ${row.importedData ? styles.importedSuccess : ''}`}
                      onClick={() => handleTriggerImport(row.tempId)}
                      title="Korábban mentett JSON órarend vagy zárolások betöltése ehhez a pedagógushoz"
                    >
                      {row.importedData ? <Check size={16} /> : <Upload size={16} />}
                      <span>{row.importedData ? 'Zárolások betöltve' : 'Importálás'}</span>
                    </button>
                    {row.importFileName && (
                      <span className={styles.fileNameText} title={row.importFileName}>
                        {row.importFileName}
                      </span>
                    )}
                  </div>

                  {pedagogueRows.length > 1 && (
                    <button
                      type="button"
                      className={styles.deleteRowBtn}
                      onClick={() => handleRemoveRow(row.tempId)}
                      title="Pedagógus eltávolítása a listából"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className={styles.addRowContainer}>
              <button type="button" className="btn btn-secondary" onClick={handleAddRow}>
                <Plus size={18} /> Új pedagógus hozzáadása
              </button>
            </div>
          </div>

          <div className={`modal-footer ${styles.wizardFooter}`}>
            <button type="submit" className="btn btn-primary">
              Beállítások mentése és tervező indítása
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
