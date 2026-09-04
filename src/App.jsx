import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Users, Settings, Save, Upload, FileText, HelpCircle, Trash2 } from 'lucide-react';
import { DndContext, pointerWithin, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import styles from './App.module.css';
import useStore, { cleanStudentId } from './store/useStore';
import TimetableGrid from './components/TimetableGrid';
import StudentCard from './components/StudentCard';
import RulesModal from './components/RulesModal';
import StudentSelectionModal from './components/StudentSelectionModal';
import ConfirmClearModal from './components/ConfirmClearModal';
import SettingsModal from './components/SettingsModal';
import PedagogueSelector from './components/PedagogueSelector';
import PedagogueSetupWizard from './components/PedagogueSetupWizard';
import ExportPdfModal from './components/ExportPdfModal';
import AutoScheduleChoiceModal from './components/AutoScheduleChoiceModal';
import { parseKretaRTF } from './utils/kretaParser';
import { parseStudentsExcel } from './utils/excelParser';
import { runAutoScheduler } from './utils/scheduler';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

function App() {
  const { 
    pedagogues, 
    activePedagogueId, 
    students, 
    classes, 
    blockedPeriods, 
    settings, 
    assignStudent, 
    assignStudentToPedagogue,
    reassignStudentToPedagogue,
    importKretaData, 
    importExcelStudents, 
    importData, 
    setActiveStudentId, 
    canAssignStudent, 
    getStudentConstraints, 
    clearTimetable, 
    moveStudentAcrossPedagogues,
    removeStudent 
  } = useStore();
  const [activeId, setActiveId] = useState(null);
  const dragDataRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isAutoScheduleChoiceOpen, setIsAutoScheduleChoiceOpen] = useState(false);
  const [schedulerResult, setSchedulerResult] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [pendingExcelStudents, setPendingExcelStudents] = useState([]);
  const [isLockMode, setIsLockMode] = useState(false);
  const fileInputRef = useRef(null);

  // Első indításkor megjelenítjük a beállító varázslót, ha még nincsenek pedagógusok
  useEffect(() => {
    if (pedagogues.length === 0) {
      setIsWizardOpen(true);
    } else {
      setIsWizardOpen(false);
    }
  }, [pedagogues.length]);

  const handleClearTimetable = () => {
    setIsClearModalOpen(true);
  };

  const handleClearTimetableConfirm = () => {
    clearTimetable();
    setIsClearModalOpen(false);
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
    setActiveStudentId(event.active.id);

    const isEnrolled = String(event.active.id).startsWith('enrolled-');
    const cleanId = cleanStudentId(event.active.id);
    const parts = String(event.active.id).split('-');
    const N = parts.length;
    const sourceDay = isEnrolled ? parts[N - 2] : null;
    const sourcePeriod = isEnrolled ? parseInt(parts[N - 1], 10) : null;

    let sourcePedId = event.active.data.current?.sourcePedagogueId;
    if (!sourcePedId && isEnrolled && sourceDay && sourcePeriod) {
      const foundPed = (pedagogues || []).find(p =>
        p.timetable?.[sourceDay]?.[sourcePeriod]?.some(id => cleanStudentId(id) === cleanId)
      );
      sourcePedId = foundPed ? foundPed.id : activePedagogueId;
    }

    const studentObj = event.active.data.current?.student || students.find(s => String(s.id) === cleanId);

    dragDataRef.current = {
      id: event.active.id,
      cleanId,
      student: studentObj,
      isEnrolled,
      type: event.active.data.current?.type || (isEnrolled ? 'EnrolledStudent' : 'Student'),
      sourceDay,
      sourcePeriod,
      sourcePedagogueId: sourcePedId,
    };
  };

  const handleDragEnd = (event) => {
    setActiveId(null);
    setActiveStudentId(null);
    const { active, over } = event;
    const dragData = dragDataRef.current;
    dragDataRef.current = null;

    if (!over) return;

    const dragType = dragData?.type || active.data.current?.type || (String(active.id).startsWith('enrolled-') ? 'EnrolledStudent' : 'Student');
    const studentId = dragData?.cleanId || cleanStudentId(active.id);

    // 1. ESET: Pedagógusválasztó gombra ejtjük a diákot (átrendelés a pedagógushoz)
    if (over.data.current?.type === 'PedagogueDrop') {
      const targetPedId = over.data.current.pedagogueId;
      if (studentId && targetPedId) {
        reassignStudentToPedagogue(studentId, targetPedId);
      }
      return;
    }

    // 2. ESET: Naptárcellára ejtjük a diákot
    const targetDay = over.data.current?.day;
    const targetPeriod = over.data.current?.period;
    if (!targetDay || !targetPeriod) return;

    if (dragType === 'Student') {
      if (canAssignStudent(studentId, targetDay, targetPeriod)) {
        // Ha a diák egy másik pedagógusnál volt beosztva ebbe az órába, onnan töröljük
        pedagogues.forEach(p => {
          if (p.id !== activePedagogueId) {
            const enrolled = p.timetable?.[targetDay]?.[targetPeriod] || [];
            if (enrolled.some(id => cleanStudentId(id) === studentId)) {
              removeStudent(studentId, targetDay, targetPeriod, p.id);
            }
          }
        });
        assignStudent(studentId, targetDay, targetPeriod);
        if (activePedagogueId) {
          assignStudentToPedagogue(studentId, activePedagogueId);
        }
      }
    }
    else if (dragType === 'EnrolledStudent') {
      const isEnrolled = String(active.id).startsWith('enrolled-');
      const parts = String(active.id).split('-');
      const N = parts.length;
      const sourceDay = dragData?.sourceDay || active.data.current?.sourceDay || (isEnrolled ? parts[N - 2] : null);
      const sourcePeriod = dragData?.sourcePeriod || active.data.current?.sourcePeriod || (isEnrolled ? parseInt(parts[N - 1], 10) : null);

      let fromPedId = dragData?.sourcePedagogueId || active.data.current?.sourcePedagogueId;
      if (!fromPedId && sourceDay && sourcePeriod) {
        const foundPed = (pedagogues || []).find(p =>
          p.timetable?.[sourceDay]?.[sourcePeriod]?.some(id => cleanStudentId(id) === studentId)
        );
        fromPedId = foundPed ? foundPed.id : null;
      }
      if (!fromPedId) {
        const st = students.find(s => String(s.id) === studentId);
        fromPedId = st?.pedagogueId || activePedagogueId;
      }

      // Ha ugyanannál a pedagógusnál ugyanoda ejtjük vissza, no-op
      if (fromPedId === activePedagogueId && sourceDay === targetDay && sourcePeriod === targetPeriod) {
        return;
      }

      const options = {
        sourceDay,
        sourcePeriod,
        sourcePedagogueId: fromPedId,
        targetPedagogueId: activePedagogueId,
      };

      if (canAssignStudent(studentId, targetDay, targetPeriod, false, options)) {
        moveStudentAcrossPedagogues(
          studentId,
          sourceDay,
          sourcePeriod,
          fromPedId,
          targetDay,
          targetPeriod,
          activePedagogueId
        );
      }
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.name.endsWith('.xlsx')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const newStudents = parseStudentsExcel(e.target.result);
          if (newStudents && newStudents.length > 0) {
            setPendingExcelStudents(newStudents);
            setIsSelectionModalOpen(true);
          } else {
            setImportResult({ type: 'error', message: 'Az Excel fájl nem tartalmaz érvényes tanulói adatokat. Kérjük, győződj meg róla, hogy a megfelelő tanulói Excel listát választottad ki.' });
          }
        } catch (err) {
          console.error("Hiba az Excel betöltésekor:", err);
          setImportResult({ type: 'error', message: 'Az Excel fájl hibás vagy nem olvasható.' });
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;

        if (file.name.endsWith('.json') || file.name.endsWith('.txt')) {
          try {
            const parsedData = JSON.parse(content);
            if (parsedData && (parsedData.pedagogues || (parsedData.students && parsedData.classes))) {
              importData(parsedData);
              setImportResult({ type: 'success_json' });
              return;
            }
          } catch {
            // Ha a .txt fájl nem JSON formátumú, megpróbáljuk RTF/Word formátumként értelmezni
          }
        } else {
          try {
            const { classes: newClasses } = parseKretaRTF(content);
            const classCount = Object.keys(newClasses || {}).length;
            if (classCount > 0) {
              importKretaData(newClasses);
              setImportResult({ type: 'success_kreta', count: classCount });
            } else {
              setImportResult({ type: 'error', message: 'A fájl nem tartalmaz érvényes osztályórarendeket. Győződj meg róla, hogy a KRÉTA-ból letöltött "Osztályok órarendje" Word (RTF) fájlt választottad ki.' });
            }
          } catch (err) {
            console.error("Hiba az RTF betöltésekor:", err);
            setImportResult({ type: 'error', message: 'Az órarend fájl beolvasása sikertelen. Kérjük, győződj meg róla, hogy a fájl nem sérült.' });
          }
        }
      };
      reader.readAsText(file);
    }

    // Reseteljük az inputot, hogy újra ki lehessen választani ugyanazt a fájlt
    event.target.value = null;
  };

  const handleStudentSelectionConfirm = (selectedStudents) => {
    importExcelStudents(selectedStudents);
    setIsSelectionModalOpen(false);
    setPendingExcelStudents([]);
  };

  const handleSave = () => {
    const state = useStore.getState();
    const activePed = state.pedagogues.find(p => p.id === state.activePedagogueId);
    const dataToSave = {
      pedagogues: state.pedagogues,
      activePedagogueId: state.activePedagogueId,
      students: state.students,
      classes: state.classes,
      settings: state.settings,
      timetableTitle: activePed?.timetableTitle || state.timetableTitle,
      timetable: activePed?.timetable || state.timetable,
      blockedPeriods: activePed?.blockedPeriods || state.blockedPeriods,
      customGroupLabels: activePed?.customGroupLabels || state.customGroupLabels,
    };
    const jsonStr = JSON.stringify(dataToSave, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `orarend-terv-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generatePdf = async (targetPedagogues = []) => {
    const DAYS = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek'];
    const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Unicode-támogatású Roboto betűtípus betöltése
    const toBase64 = async (url) => {
      const res = await fetch(url);
      const buf = await res.arrayBuffer();
      let binary = '';
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    };

    const [regularB64, boldB64] = await Promise.all([
      toBase64(`${import.meta.env.BASE_URL}fonts/Roboto-Regular.ttf`),
      toBase64(`${import.meta.env.BASE_URL}fonts/Roboto-Bold.ttf`),
    ]);

    doc.addFileToVFS('Roboto-Regular.ttf', regularB64);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.addFileToVFS('Roboto-Bold.ttf', boldB64);
    doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');

    targetPedagogues.forEach((ped, pageIdx) => {
      if (pageIdx > 0) {
        doc.addPage('a4', 'landscape');
      }

      const pedTimetable = ped.timetable || {};
      const pedBlocked = ped.blockedPeriods || {};
      const groupLabels = useStore.getState().getGroupLabels(ped.id);
      const title = ped.timetableTitle || `${ped.name}, fejlesztőpedagógus`;
      const currentHours = useStore.getState().getTeacherHoursCount(null, null, ped.id);
      const maxHours = ped.maxTeacherHours || 24;

      // Fejléc: Cím és óraszám
      doc.setFontSize(14);
      doc.setFont('Roboto', 'bold');
      doc.text(title, 14, 15);

      doc.setFontSize(9);
      doc.setFont('Roboto', 'normal');
      doc.text(`Heti órák: ${currentHours} / ${maxHours}`, 283, 15, { align: 'right' });

      // Táblázat adatainak összeállítása
      const tableBody = PERIODS.map(period => {
        const periodCell = `${period}. óra\n${period + 7}:00 - ${period + 7}:45`;

        const dayCells = DAYS.map(day => {
          const blockedReason = pedBlocked[day]?.[period];
          if (blockedReason) {
            return blockedReason;
          }

          const enrolledIds = pedTimetable[day]?.[period] || [];
          if (enrolledIds.length === 0) return '';

          const cellKey = `${day}-${period}`;
          const groupLabel = groupLabels[cellKey];
          const lines = [];

          if (groupLabel) {
            lines.push(groupLabel);
          }

          enrolledIds.forEach(id => {
            const student = students.find(s => String(s.id) === cleanStudentId(id));
            if (student) {
              lines.push(`${student.name}  ${student.classId}`);
            }
          });

          return lines.join('\n');
        });

        return [periodCell, ...dayCells];
      });

      // Táblázat generálása
      autoTable(doc, {
        startY: 20,
        head: [['', ...DAYS]],
        body: tableBody,
        theme: 'grid',
        styles: {
          font: 'Roboto',
          fontSize: 7,
          cellPadding: 1.5,
          lineColor: [51, 65, 85],
          lineWidth: 0.3,
          textColor: [0, 0, 0],
          overflow: 'linebreak',
          valign: 'top',
          minCellHeight: 20,
        },
        headStyles: {
          fillColor: [241, 245, 249],
          textColor: [15, 23, 42],
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'center',
          cellPadding: 3,
        },
        columnStyles: {
          0: { cellWidth: 22, fontStyle: 'bold', fontSize: 7.5, halign: 'left' },
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index > 0) {
            const period = PERIODS[data.row.index];
            const day = DAYS[data.column.index - 1];
            const blockedReason = pedBlocked[day]?.[period];
            if (blockedReason) {
              data.cell.styles.halign = 'center';
              data.cell.styles.valign = 'middle';
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fontSize = 8;
              data.cell.styles.textColor = [71, 85, 105];
              data.cell.styles.fillColor = [248, 250, 252];
            }
          }
        },
        margin: { top: 20, right: 7, bottom: 7, left: 7 },
        tableWidth: 'auto',
      });
    });

    const fileName = targetPedagogues.length === 1 
      ? `Orarend_${(targetPedagogues[0].name || 'terv').replace(/\s+/g, '_')}.pdf`
      : 'Osszesitett_fejlesztoi_orarend.pdf';

    doc.save(fileName);
  };

  const handleExportPDF = () => {
    if (pedagogues.length > 1) {
      setIsPdfModalOpen(true);
    } else if (activePed) {
      generatePdf([activePed]);
    } else if (pedagogues.length === 1) {
      generatePdf([pedagogues[0]]);
    }
  };

  const handleAutoSchedule = () => {
    if (students.length === 0) {
      setSchedulerResult({ error: 'no_students' });
      return;
    }
    if (Object.keys(classes).length === 0) {
      setSchedulerResult({ error: 'no_classes' });
      return;
    }

    if (pedagogues.length > 1) {
      setIsAutoScheduleChoiceOpen(true);
    } else {
      executeAutoSchedule({ all: false });
    }
  };

  const executeAutoSchedule = (opts = {}) => {
    const res = runAutoScheduler(opts);
    if (res.error) {
      setSchedulerResult({ error: res.error });
    } else {
      setSchedulerResult({ success: res.successCount, failed: res.failedCount });
    }
  };

  const triggerImport = () => {
    fileInputRef.current?.click();
  };

  const activeStudent = activeId
    ? students.find(s => String(s.id) === cleanStudentId(activeId))
    : null;

  const activePed = pedagogues.find(p => p.id === activePedagogueId) || null;
  const maxTeacherHours = activePed?.maxTeacherHours || settings.maxTeacherHours || 24;

  // Kiszámoljuk, ki van már teljesen beosztva a naptárakban
  const getAssignedCount = (studentId) => {
    let count = 0;
    const cleanId = cleanStudentId(studentId);
    pedagogues.forEach(p => {
      Object.values(p.timetable || {}).forEach(dayObj => {
        Object.values(dayObj).forEach(periodArr => {
          if (periodArr.some(id => cleanStudentId(id) === cleanId)) count++;
        });
      });
    });
    return count;
  };

  // 1. Az aktív pedagógushoz rendelt diákok (akiknek még van beosztandó órájuk)
  const activePedagogueStudents = students.filter(s => s.pedagogueId === activePedagogueId);
  const pendingStudents = activePedagogueStudents
    .filter(student => getAssignedCount(student.id) < (student.needs || 1))
    .sort((a, b) => {
      const constraintA = getStudentConstraints(a.id, activePedagogueId);
      const constraintB = getStudentConstraints(b.id, activePedagogueId);
      if (constraintA !== constraintB) {
        return constraintA - constraintB; // szűkösebb előre
      }
      return a.name.localeCompare(b.name);
    });

  // 2. Még pedagógushoz nem rendelt diákok (közös pool)
  const unassignedStudents = students
    .filter(s => !s.pedagogueId)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Kapacitás kalkuláció az aktív pedagógusra
  let totalBlocked = 0;
  const activeBlocked = activePed ? (activePed.blockedPeriods || {}) : blockedPeriods;
  Object.values(activeBlocked || {}).forEach(dayObj => {
    totalBlocked += Object.keys(dayObj).length;
  });
  const totalSlots = 40; // 5 nap * 8 óra
  const freeSlots = Math.max(0, totalSlots - totalBlocked);
  const effectiveSlots = Math.min(freeSlots, maxTeacherHours);
  const maxCapacity = Math.floor((effectiveSlots * (settings.maxGroupSize || 5)) / 2);
  const currentStudentCount = pendingStudents.length;
  const isOverloaded = currentStudentCount > maxCapacity;
  const capacityPercent = Math.min(100, Math.max(0, (currentStudentCount / (maxCapacity || 1)) * 100));

  return (
    <>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={pointerWithin}>
        <div className={styles.appContainer}>
          {/* Eredmény ablak (Automata Tervező) */}
          {schedulerResult && (
            <div
              className={`modal-overlay fade-in ${styles.schedulerOverlay}`}
              onClick={(e) => {
                if (e.target === e.currentTarget) setSchedulerResult(null);
              }}
            >
              <div
                className={`modal-content glass-panel ${styles.schedulerContent}`}
                onMouseDown={e => e.stopPropagation()}
                onClick={e => e.stopPropagation()}
              >
                <div className={styles.schedulerIcon}>
                  {schedulerResult.error ? '❌' : schedulerResult.success === 0 && schedulerResult.failed === 0 ? '✅' : schedulerResult.failed > 0 ? '⚠️' : '🎉'}
                </div>
                <h3 className={styles.schedulerTitle}>
                  {schedulerResult.error ? 'Hiba a tervezés indításakor' : 'Automata tervezés kész!'}
                </h3>
                <p className={styles.schedulerBody}>
                  {schedulerResult.error === 'no_students' ? (
                    'Nincs betöltve egyetlen tanuló sem! Az automata tervezés futtatása előtt kérjük, importálj egy tanulói Excel listát.'
                  ) : schedulerResult.error === 'no_classes' ? (
                    'Nincs feltöltve KRÉTA órarend! Az automata tervezés futtatása előtt kérjük, importáld a KRÉTA osztályórarendeket.'
                  ) : schedulerResult.success === 0 && schedulerResult.failed === 0 ? (
                    'Minden diák órája hibátlanul be van osztva a naptárba. Jelenleg nincs új feladat az automata számára!'
                  ) : (
                    <>
                      <strong className={styles.schedulerSuccess}>{schedulerResult.success}</strong> db alkalom sikeresen beosztva a naptárba.<br /><br />
                      <strong className={`${styles.schedulerFailed} ${schedulerResult.failed > 0 ? styles.schedulerFailedHighlight : ''}`}>{schedulerResult.failed}</strong> db alkalom maradt a listán (helyhiány vagy órarendi ütközés miatt).
                    </>
                  )}
                </p>
                <button className={`btn btn-primary ${styles.schedulerButton}`} onClick={() => setSchedulerResult(null)}>
                  Rendben, értettem
                </button>
              </div>
            </div>
          )}

          {/* Importálás eredmény visszajelző */}
          {importResult && (
            <div
              className={`modal-overlay fade-in ${styles.schedulerOverlay}`}
              onClick={(e) => {
                if (e.target === e.currentTarget) setImportResult(null);
              }}
            >
              <div
                className={`modal-content glass-panel ${styles.schedulerContent}`}
                onMouseDown={e => e.stopPropagation()}
                onClick={e => e.stopPropagation()}
              >
                <div className={styles.schedulerIcon}>
                  {importResult.type === 'error' ? '❌' : '🎉'}
                </div>
                <h3 className={styles.schedulerTitle}>
                  {importResult.type === 'error' ? 'Importálási hiba!' : 'Importálás sikeres!'}
                </h3>
                <p className={styles.schedulerBody}>
                  {importResult.type === 'success_kreta' ? (
                    <>
                      A KRÉTA osztályórarendek sikeresen beolvasásra kerültek.<br /><br />
                      Talált osztályok száma: <strong>{importResult.count}</strong>. A naptár készen áll a tanulók beosztására!
                    </>
                  ) : importResult.type === 'success_json' ? (
                    'Az elmentett órarendterv állapota (tanulók, órák és zárolások) sikeresen visszaállításra került!'
                  ) : (
                    importResult.message
                  )}
                </p>
                <button className={`btn btn-primary ${styles.schedulerButton}`} onClick={() => setImportResult(null)}>
                  Rendben, értettem
                </button>
              </div>
            </div>
          )}

          {/* Súgó Modal */}
          <header className={`glass-panel ${styles.header}`}>
            <div className={styles.logoArea}>
              <Calendar className={styles.iconLogo} />
              <h1>Órarend tervező</h1>
            </div>

            <div className={styles.actionsArea}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".rtf,.doc,.json,.txt,.xlsx"
                className={styles.hiddenInput}
              />
              <button className="btn btn-help" onClick={() => setIsRulesModalOpen(true)}>
                <HelpCircle size={18} /> Súgó
              </button>
              <button className={`btn btn-primary ${styles.btnAutoSchedule}`} onClick={handleAutoSchedule} disabled={isLockMode} data-tooltip="A tanulók automatikus beosztása a szabad idősávokba">
                ⭐ Automata tervezés
              </button>
              <button className={`btn ${styles.btnReset}`} onClick={handleClearTimetable} disabled={isLockMode} data-tooltip="Az aktuális pedagógus naptárának kiürítése">
                <Trash2 size={18} /> Naptár kiürítése
              </button>
              <button className="btn btn-secondary" onClick={triggerImport} disabled={isLockMode} data-tooltip="KRÉTA órarend, mentett terv vagy Excel tanulólista betöltése">
                <Upload size={18} /> Importálás
              </button>
              <button className="btn btn-secondary" onClick={handleSave} disabled={isLockMode} data-tooltip="Az aktuális órarendterv mentése JSON fájlba">
                <Save size={18} /> Mentés
              </button>
              <button className="btn btn-primary" onClick={handleExportPDF} disabled={isLockMode} data-tooltip="Az órarend nyomtatása vagy mentése PDF-ként">
                <FileText size={18} /> Export (PDF)
              </button>
              <button className="btn btn-icon" onClick={() => setIsSettingsModalOpen(true)} disabled={isLockMode} data-tooltip="Beállítások és pedagógusok kezelése">
                <Settings size={20} />
              </button>
            </div>
          </header>

          {/* Fő tartalom */}
          <main className={styles.mainContent}>
            {/* Oldalsáv - Diákok listája */}
            <aside className={`glass-panel fade-in ${styles.sidebar}`}>
              {/* Pedagógus választó sáv */}
              <PedagogueSelector />

              <div className={styles.sidebarHeader}>
                <h2><Users size={20} /> Beosztandó diákok</h2>
                <div className="badge">{pendingStudents.length} fő</div>
              </div>

              <div className={styles.capacityIndicator}>
                <div className={`${styles.capacityInfo} ${isOverloaded ? styles.capacityInfoOverloaded : ''}`}>
                  <span>Kapacitás: {currentStudentCount} / {maxCapacity}</span>
                  <span className={styles.capacityPercent}>{Math.round(capacityPercent)}%</span>
                </div>
                <div className={styles.capacityBarTrack}>
                  <div
                    className={`${styles.capacityBarFill} ${isOverloaded ? styles.capacityBarFillOverloaded : ''}`}
                    style={{ '--progress': `${capacityPercent}%` }}
                  ></div>
                </div>
                {isOverloaded && (
                  <div className={styles.capacityWarning}>
                    {effectiveSlots < freeSlots
                      ? `Vigyázat! A beállított heti ${maxTeacherHours} órás korlát miatt fizikailag nem fog beférni mindenki.`
                      : 'Vigyázat! A zárolt órák miatt fizikailag nem fog beférni mindenki.'}
                  </div>
                )}
              </div>

              <div className={styles.studentList}>
                {pendingStudents.map((student) => (
                  <StudentCard key={student.id} student={student} />
                ))}
                {pendingStudents.length === 0 && (
                  activePedagogueStudents.length > 0 ? (
                    <div className={styles.emptyState}>
                      <div className={styles.emptyStateIcon}>✅</div>
                      <p className={styles.emptyStateText}>
                        {activePed ? `${activePed.name} minden diákja beosztva!` : 'Minden diák beosztva!'}
                      </p>
                    </div>
                  ) : (
                    <div className={styles.emptyState}>
                      <div className={styles.emptyStateIcon}>ℹ️</div>
                      <p className={styles.emptyStateText}>
                        {unassignedStudents.length > 0 
                          ? `${activePed ? activePed.name : 'A kolléga'} számára még nincs diák hozzárendelve. Húzz ide diákot az alábbi listából!`
                          : 'Nincs beosztandó diák.'}
                      </p>
                    </div>
                  )
                )}

                {/* Hozzárendelésre váró diákok szekció */}
                {unassignedStudents.length > 0 && (
                  <div className={styles.unassignedSection}>
                    <div className={styles.unassignedTitle}>
                      <span>Hozzárendelésre vár ({unassignedStudents.length} fő)</span>
                    </div>
                    {unassignedStudents.map((student) => (
                      <StudentCard key={student.id} student={student} />
                    ))}
                  </div>
                )}
              </div>
            </aside>

            {/* Naptár rács */}
            <TimetableGrid isLockMode={isLockMode} setIsLockMode={setIsLockMode} />
          </main>
        </div>
        <DragOverlay dropAnimation={null}>
          {activeStudent ? <StudentCard student={activeStudent} isOverlay /> : null}
        </DragOverlay>
      </DndContext>

      <RulesModal isOpen={isRulesModalOpen} onClose={() => setIsRulesModalOpen(false)} />
      <StudentSelectionModal
        isOpen={isSelectionModalOpen}
        onClose={() => setIsSelectionModalOpen(false)}
        students={pendingExcelStudents}
        onConfirm={handleStudentSelectionConfirm}
      />
      <ConfirmClearModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={handleClearTimetableConfirm}
      />
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
      <PedagogueSetupWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
      />
      <ExportPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        activePedagogueName={activePed?.name || 'Aktuális pedagógus'}
        onExportSingle={() => (activePed ? generatePdf([activePed]) : generatePdf(pedagogues.slice(0, 1)))}
        onExportAll={() => generatePdf(pedagogues)}
      />
      <AutoScheduleChoiceModal
        isOpen={isAutoScheduleChoiceOpen}
        onClose={() => setIsAutoScheduleChoiceOpen(false)}
        activePedagogueName={activePed?.name || 'Aktuális pedagógus'}
        onScheduleSingle={(resetExisting) => executeAutoSchedule({ pedagogueId: activePedagogueId, resetTimetables: resetExisting })}
        onScheduleAll={(resetExisting) => executeAutoSchedule({ all: true, resetTimetables: resetExisting })}
      />
    </>
  );
}

export default App;
