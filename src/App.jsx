import React, { useState, useRef } from 'react';
import { Calendar, Users, Settings, Save, Upload, FileText, HelpCircle, Trash2, CheckCircle } from 'lucide-react';
import { DndContext, pointerWithin, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import styles from './App.module.css';
import useStore, { cleanStudentId } from './store/useStore';
import TimetableGrid from './components/TimetableGrid';
import StudentCard from './components/StudentCard';
import RulesModal from './components/RulesModal';
import StudentSelectionModal from './components/StudentSelectionModal';
import ConfirmClearModal from './components/ConfirmClearModal';
import SettingsModal from './components/SettingsModal';
import { parseKretaRTF } from './utils/kretaParser';
import { parseStudentsExcel } from './utils/excelParser';
import { runAutoScheduler } from './utils/scheduler';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

function App() {
  const { students, classes, timetable, timetableTitle, blockedPeriods, settings, assignStudent, importKretaData, importExcelStudents, importData, setActiveStudentId, canAssignStudent, getStudentConstraints, clearTimetable, moveStudent } = useStore();
  const [activeId, setActiveId] = useState(null);

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
  const [schedulerResult, setSchedulerResult] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [pendingExcelStudents, setPendingExcelStudents] = useState([]);
  const [isLockMode, setIsLockMode] = useState(false);
  const fileInputRef = useRef(null);

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
  };

  const handleDragEnd = (event) => {
    setActiveId(null);
    setActiveStudentId(null);
    const { active, over } = event;
    if (!over) return;

    const targetDay = over.data.current?.day;
    const targetPeriod = over.data.current?.period;
    if (!targetDay || !targetPeriod) return;

    if (active.data.current?.type === 'Student') {
      const studentId = active.id.replace('student-', '');
      if (canAssignStudent(active.id, targetDay, targetPeriod)) {
        assignStudent(studentId, targetDay, targetPeriod);
      }
    }
    else if (active.data.current?.type === 'EnrolledStudent') {
      const { student, sourceDay, sourcePeriod } = active.data.current;

      // Ha ugyanoda ejtjük vissza, no-op
      if (sourceDay === targetDay && sourcePeriod === targetPeriod) return;

      if (canAssignStudent(student.id, targetDay, targetPeriod, false, { sourceDay, sourcePeriod })) {
        moveStudent(student.id, sourceDay, sourcePeriod, targetDay, targetPeriod);
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

        if (file.name.endsWith('.json')) {
          try {
            const parsedData = JSON.parse(content);
            if (parsedData && parsedData.students && parsedData.classes && parsedData.timetable) {
              importData(parsedData);
              setImportResult({ type: 'success_json' });
            } else {
              setImportResult({ type: 'error', message: 'A JSON fájl formátuma érvénytelen vagy nem ettől az alkalmazástól származik.' });
            }
          } catch (err) {
            console.error("Hiba a JSON betöltésekor:", err);
            setImportResult({ type: 'error', message: 'A JSON fájl sérült vagy nem olvasható.' });
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
    const dataToSave = {
      timetableTitle,
      students,
      classes,
      timetable,
      blockedPeriods
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

  const handleExportPDF = async () => {
    const DAYS = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek'];
    const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];
    const groupLabels = useStore.getState().getGroupLabels();

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

    // Fejléc: Cím és óraszám
    doc.setFontSize(14);
    doc.setFont('Roboto', 'bold');
    doc.text(timetableTitle || 'Órarend terv', 14, 15);

    const currentHours = Object.values(timetable).reduce((sum, day) =>
      sum + Object.values(day).filter(ids => ids.length > 0).length, 0
    );
    doc.setFontSize(9);
    doc.setFont('Roboto', 'normal');
    doc.text(`Heti órák: ${currentHours} / ${settings.maxTeacherHours || 24}`, 283, 15, { align: 'right' });

    // Táblázat adatainak összeállítása
    const tableBody = PERIODS.map(period => {
      const periodCell = `${period}. óra\n${period + 7}:00 - ${period + 7}:45`;

      const dayCells = DAYS.map(day => {
        const blockedReason = blockedPeriods[day]?.[period];
        if (blockedReason) {
          return blockedReason;
        }

        const enrolledIds = timetable[day]?.[period] || [];
        if (enrolledIds.length === 0) return '';

        const cellKey = `${day}-${period}`;
        const groupLabel = groupLabels[cellKey];
        const lines = [];

        if (groupLabel) {
          lines.push(groupLabel);
        }

        enrolledIds.forEach(id => {
          const student = students.find(s => String(s.id) === String(id));
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
        // Zárolt cellák szaggatott kerettel és központi szöveggel
        if (data.section === 'body' && data.column.index > 0) {
          const period = PERIODS[data.row.index];
          const day = DAYS[data.column.index - 1];
          const blockedReason = blockedPeriods[day]?.[period];
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

    doc.save('Orarend_terv.pdf');
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
    const { successCount, failedCount } = runAutoScheduler();
    setSchedulerResult({ success: successCount, failed: failedCount });
  };

  const triggerImport = () => {
    fileInputRef.current?.click();
  };

  const activeStudent = activeId
    ? students.find(s => String(s.id) === cleanStudentId(activeId))
    : null;

  // Kiszámoljuk, ki van már teljesen beosztva
  const getAssignedCount = (studentId) => {
    let count = 0;
    Object.values(timetable || {}).forEach(dayObj => {
      Object.values(dayObj).forEach(periodArr => {
        if (periodArr.includes(studentId)) count++;
      });
    });
    return count;
  };

  const pendingStudents = students
    .filter(student => getAssignedCount(student.id) < (student.needs || 1))
    .sort((a, b) => {
      const constraintA = getStudentConstraints(a.id);
      const constraintB = getStudentConstraints(b.id);
      if (constraintA !== constraintB) {
        return constraintA - constraintB; // szűkösebb előre
      }
      return a.name.localeCompare(b.name); // ABC sorrend másodlagosan
    });

  const completedStudents = students
    .filter(student => getAssignedCount(student.id) >= (student.needs || 1))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Kapacitás kalkuláció
  let totalBlocked = 0;
  Object.values(blockedPeriods || {}).forEach(dayObj => {
    totalBlocked += Object.keys(dayObj).length;
  });
  const totalSlots = 40; // 5 nap * 8 óra
  const freeSlots = totalSlots - totalBlocked;
  const effectiveSlots = Math.min(freeSlots, settings.maxTeacherHours || 24);
  const maxCapacity = Math.floor((effectiveSlots * settings.maxGroupSize) / 2); // 2 az átlagos heti igény
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
                accept=".rtf,.doc,.json,.xlsx"
                className={styles.hiddenInput}
              />
              <button className="btn btn-help" onClick={() => setIsRulesModalOpen(true)}>
                <HelpCircle size={18} /> Súgó
              </button>
              <button className={`btn btn-primary ${styles.btnAutoSchedule}`} onClick={handleAutoSchedule} disabled={isLockMode} data-tooltip="A tanulók automatikus beosztása a szabad idősávokba">
                ⭐ Automata tervezés
              </button>
              <button className={`btn ${styles.btnReset}`} onClick={handleClearTimetable} disabled={isLockMode} data-tooltip="Az összes beosztott tanuló törlése a naptárból">
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
              <button className="btn btn-icon" onClick={() => setIsSettingsModalOpen(true)} disabled={isLockMode} data-tooltip="Csoportlétszám, heti óraszám és felülbírálás beállításai">
                <Settings size={20} />
              </button>
            </div>
          </header>

          {/* Fő tartalom */}
          <main className={styles.mainContent}>
            {/* Oldalsáv - Diákok listája */}
            <aside className={`glass-panel fade-in ${styles.sidebar}`}>
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
                      ? `Vigyázat! A beállított heti ${settings.maxTeacherHours} órás korlátod miatt fizikailag nem fog beférni mindenki.`
                      : 'Vigyázat! A zárolt óráid miatt fizikailag nem fog beférni mindenki.'}
                  </div>
                )}
              </div>

              <div className={styles.studentList}>
                {pendingStudents.map((student) => (
                  <StudentCard key={student.id} student={student} />
                ))}
                {pendingStudents.length === 0 && students.length > 0 && (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyStateIcon}>✅</div>
                    <p className={styles.emptyStateText}>Minden diák sikeresen beosztva!</p>
                  </div>
                )}
              </div>

              {completedStudents.length > 0 && (
                <div className={styles.completedSection}>
                  <h3 className={styles.completedHeader}>
                    <CheckCircle size={16} className={styles.completedIcon} /> Kész tanulók ({completedStudents.length} fő)
                  </h3>
                  <div className={styles.completedList}>
                    {completedStudents.map((student) => (
                      <StudentCard key={student.id} student={student} isCompleted />
                    ))}
                  </div>
                </div>
              )}
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
    </>
  );
}

export default App;
