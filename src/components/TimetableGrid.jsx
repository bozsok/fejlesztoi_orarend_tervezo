import React, { useState, useRef } from 'react';
import { Pencil, Lock, Unlock } from 'lucide-react';
import useStore from '../store/useStore';
import DropZoneCell from './DropZoneCell';
import styles from './TimetableGrid.module.css';

const DAYS = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8]; // 1-8. óra

export default function TimetableGrid({ isLockMode, setIsLockMode }) {
  const { timetable, timetableTitle, setTimetableTitle, toggleBlockedPeriod, getTeacherHoursCount, settings } = useStore();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(timetableTitle || 'Írd be a neved, beosztásodat...');
  const [lockPromptData, setLockPromptData] = useState(null);
  const lockMouseDownTargetRef = useRef(null);

  const currentHours = getTeacherHoursCount();

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    setTimetableTitle(tempTitle || 'Írd be a neved, beosztásodat...');
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleTitleBlur();
    }
  };

  return (
    <section id="printable-timetable-area" className={`glass-panel fade-in ${styles.timetableArea}`}>
      
      {/* Zárolás Modal (prompt helyett) */}
      {lockPromptData && (
        <div 
          className={`modal-overlay fade-in ${styles.lockModal}`} 
          onMouseDown={(e) => { lockMouseDownTargetRef.current = e.target; }}
          onClick={(e) => {
            if (e.target === e.currentTarget && lockMouseDownTargetRef.current === e.currentTarget) {
              setLockPromptData(null);
            }
          }}
        >
          <div 
            className={`modal-content glass-panel ${styles.lockContent}`} 
            onMouseDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
          >
            <h3 className={styles.lockTitle}>
              <Lock size={20} /> Zárolás oka
            </h3>
            <p className={styles.lockDescription}>
              Mivel indokolod a zárolást erre az időpontra?<br/>
              <strong>{lockPromptData.day} {lockPromptData.period}. óra</strong>
            </p>
            <input 
              type="text" 
              autoFocus
              className={`${styles.titleInput} ${styles.lockInput}`}
              placeholder="pl. Értekezlet, Napközi..."
              defaultValue="Napközi"
              id="lockReasonInput"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  toggleBlockedPeriod(lockPromptData.day, lockPromptData.period, e.target.value);
                  setLockPromptData(null);
                }
              }}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '1.5rem', justifyContent: 'center' }}>
              {['Napközi', 'Ebédeltetés', 'Értekezlet', 'Ügyelet', 'Helyettesítés'].map(reason => (
                <button 
                  key={reason}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                  onClick={() => {
                    toggleBlockedPeriod(lockPromptData.day, lockPromptData.period, reason);
                    setLockPromptData(null);
                  }}
                >
                  {reason}
                </button>
              ))}
            </div>
            <div className={styles.lockActions}>
              <button className={`btn btn-secondary ${styles.lockActionBtn}`} onClick={() => setLockPromptData(null)}>Mégsem</button>
              <button className={`btn btn-primary ${styles.lockActionBtn}`} onClick={() => {
                const val = document.getElementById('lockReasonInput').value;
                toggleBlockedPeriod(lockPromptData.day, lockPromptData.period, val);
                setLockPromptData(null);
              }}>Zárolás</button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.timetableHeader}>
        {isEditingTitle ? (
          <input
            type="text"
            className={styles.titleInput}
            value={tempTitle}
            onChange={(e) => setTempTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            autoFocus
          />
        ) : (
          <h2 onClick={() => setIsEditingTitle(true)} className={styles.editableTitle}>
            {timetableTitle}
            <Pencil size={18} className={styles.editIcon} />
          </h2>
        )}

        <div className={styles.teacherHoursBadge}>
          Heti órák: <strong>{currentHours} / {settings.maxTeacherHours || 24}</strong>
        </div>

        <div className={styles.legendArea}>
          <button 
            className={`btn ${isLockMode ? 'btn-primary' : 'btn-secondary'} ${styles.lockBtn}`}
            onClick={() => setIsLockMode(!isLockMode)}
            data-tooltip="Idősávok zárolása, ahol nem lehet fejleszteni"
          >
            {isLockMode ? <Unlock size={16} /> : <Lock size={16} />}
            {isLockMode ? 'Zárolás befejezése' : 'Zárolás Mód'}
          </button>
          <span className={styles.legendItem}><div className={`${styles.dot} ${styles.dotGreen}`}></div> Elhozható</span>
          <span className={styles.legendItem}><div className={`${styles.dot} ${styles.dotRed}`}></div> Nem elhozható</span>
        </div>
      </div>

      <div className={styles.timetableGrid}>
        <div className={styles.tableResponsive}>
          <table className={styles.timetable}>
            <thead>
              <tr>
                <th className={styles.emptyCorner}></th>
                {DAYS.map(day => (
                  <th key={day}>{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERIODS.map(period => (
                <tr key={period}>
                  <td className={styles.periodLabel}>{period}. óra<br /><span className={styles.time}>{period + 7}:00 - {period + 7}:45</span></td>
                  {DAYS.map(day => {
                    const enrolled = timetable[day]?.[period] || [];
                    return (
                      <DropZoneCell
                        key={`${day}-${period}`}
                        day={day}
                        period={period}
                        enrolledIds={enrolled}
                        isLockMode={isLockMode}
                        onLockRequest={(d, p) => setLockPromptData({ day: d, period: p })}
                      />
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
