import React, { useState } from 'react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import useStore, { cleanStudentId } from '../store/useStore';
import { X, Pencil, Check, RotateCcw } from 'lucide-react';
import styles from './DropZoneCell.module.css';

function EnrolledStudentCard({ student, day, period, onRemove }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `enrolled-${student.id}-${day}-${period}`,
    data: {
      type: 'EnrolledStudent',
      student,
      sourceDay: day,
      sourcePeriod: period,
    }
  });

  const cardClasses = [
    styles.enrolledStudent,
    isDragging ? styles.enrolledStudentDragging : ''
  ].filter(Boolean).join(' ');

  return (
    <div 
      ref={setNodeRef} 
      className={cardClasses}
      {...listeners} 
      {...attributes}
    >
      <span className={styles.studentName} title={`${student.name} (${student.classId})`}>
        {student.name} <strong className={styles.classIdLabel}>{student.classId}</strong>
      </span>
      <button 
        className={styles.removeBtn} 
        onClick={(e) => onRemove(e, student.id)}
        title="Eltávolítás"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export default function DropZoneCell({ day, period, enrolledIds, isLockMode, onLockRequest }) {
  const {
    students,
    classes,
    removeStudent,
    activeStudentId,
    canAssignStudent,
    blockedPeriods,
    toggleBlockedPeriod,
    getAssignmentValidationError,
    getAssignmentWarning,
    getGroupLabels,
    setCustomGroupLabel,
    cleanAndValidateGroupLabel
  } = useStore();

  const [isEditingBadge, setIsEditingBadge] = useState(false);
  const [badgeInputValue, setBadgeInputValue] = useState('');
  const [badgeError, setBadgeError] = useState(null);

  const groupLabels = getGroupLabels();
  const cellKey = `${day}-${period}`;
  const currentGroupLabel = groupLabels[cellKey];

  const blockedReason = blockedPeriods[day]?.[period];
  const isBlocked = !!blockedReason;

  const { isOver, setNodeRef } = useDroppable({
    id: `${day}-${period}`,
    data: {
      type: 'TimetableCell',
      day,
      period,
    },
    disabled: isBlocked
  });

  const getStudent = (id) => students.find(s => s.id === id);

  const isEnrolled = activeStudentId ? String(activeStudentId).startsWith('enrolled-') : false;
  const parts = activeStudentId ? String(activeStudentId).split('-') : [];
  const N = parts.length;
  const sourceDay = isEnrolled ? parts[N - 2] : null;
  const sourcePeriod = isEnrolled ? parseInt(parts[N - 1], 10) : null;

  const isValid = activeStudentId ? canAssignStudent(activeStudentId, day, period, false, {
    sourceDay,
    sourcePeriod
  }) : false;
  
  const cellClasses = [styles.dropZone];
  let activeSubject = null;

  if (isBlocked) {
    cellClasses.push(styles.blockedCell);
    const reasonLower = blockedReason.toLowerCase();
    if (reasonLower.includes('ebéd')) {
      cellClasses.push(styles.blockedLunch);
    } else if (reasonLower.includes('értekezlet')) {
      cellClasses.push(styles.blockedMeeting);
    } else if (reasonLower.includes('ügyelet')) {
      cellClasses.push(styles.blockedDuty);
    } else if (reasonLower.includes('helyettesítés')) {
      cellClasses.push(styles.blockedSubstitute);
    }
  } else if (activeStudentId) {
    if (isValid) {
      cellClasses.push(styles.possibleTarget);
      if (isOver) {
        cellClasses.push(styles.dropValid);
      }
      const cleanActiveId = cleanStudentId(activeStudentId);
      const student = students.find(s => String(s.id) === cleanActiveId);
      if (student) {
        activeSubject = classes[student.classId]?.[day]?.[period];
      }
    } else {
      cellClasses.push(styles.notPossible);
      if (isOver) {
        cellClasses.push(styles.dropInvalid);
      }
    }
  }

  if (isLockMode) {
    cellClasses.push(styles.lockModeActive);
  }

  const handleRemove = (e, studentId) => {
    e.stopPropagation();
    removeStudent(studentId, day, period);
  };

  const handleCellClick = () => {
    if (isLockMode) {
      if (isBlocked) {
        toggleBlockedPeriod(day, period);
      } else {
        if (onLockRequest) {
          onLockRequest(day, period);
        }
      }
    }
  };

  const startBadgeEdit = (e) => {
    e.stopPropagation();
    setBadgeInputValue(currentGroupLabel || '');
    setBadgeError(null);
    setIsEditingBadge(true);
  };

  const handleBadgeInputChange = (e) => {
    const val = e.target.value;
    setBadgeInputValue(val);
    if (badgeError) {
      setBadgeError(null);
    }
  };

  const saveBadgeEdit = (e) => {
    if (e) e.stopPropagation();
    const { cleanedLabel, error } = cleanAndValidateGroupLabel(day, period, badgeInputValue);
    if (error) {
      setBadgeError(error);
      return;
    }
    setCustomGroupLabel(day, period, cleanedLabel);
    setIsEditingBadge(false);
    setBadgeError(null);
  };

  const resetBadgeEdit = (e) => {
    e.stopPropagation();
    setCustomGroupLabel(day, period, null);
    setIsEditingBadge(false);
  };

  const handleBadgeKeyDown = (e) => {
    if (e.key === 'Enter') {
      saveBadgeEdit(e);
    } else if (e.key === 'Escape') {
      setIsEditingBadge(false);
    }
  };

  const validationError = (activeStudentId && !isValid && isOver)
    ? getAssignmentValidationError(activeStudentId, day, period, {
        sourceDay,
        sourcePeriod
      })
    : null;

  const assignmentWarning = (activeStudentId && isValid && isOver)
    ? getAssignmentWarning(activeStudentId, day, period, {
        sourceDay,
        sourcePeriod
      })
    : null;

  return (
    <td ref={setNodeRef} className={cellClasses.join(' ')} onClick={handleCellClick} style={{ position: 'relative' }}>
      <div className={styles.cellContent}>
        {isBlocked ? (
          <div className={styles.blockedReason}>
            {blockedReason}
          </div>
        ) : (
          <>
            {/* Csoport megjelölés (ha van beosztott diák) */}
            {enrolledIds.length > 0 && currentGroupLabel && (
              isEditingBadge ? (
                <div className={styles.groupBadgeEditContainer} onClick={e => e.stopPropagation()}>
                  <div className={styles.groupBadgeInputWrapper}>
                    <input
                      type="text"
                      className={`${styles.groupBadgeInput} ${badgeError ? styles.groupBadgeInputError : ''}`}
                      value={badgeInputValue}
                      onChange={handleBadgeInputChange}
                      onKeyDown={handleBadgeKeyDown}
                      placeholder="2/1"
                      autoFocus
                    />
                    <button className={styles.badgeSaveBtn} onClick={saveBadgeEdit} title="Mentés">
                      <Check size={14} />
                    </button>
                    <button className={styles.badgeResetBtn} onClick={resetBadgeEdit} title="Alapértelmezés visszaállítása">
                      <RotateCcw size={12} />
                    </button>
                  </div>
                  {badgeError && (
                    <div className={styles.badgeErrorHint}>
                      {badgeError}
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.groupBadgeContainer}>
                  <span
                    className={styles.groupBadge}
                    onClick={startBadgeEdit}
                    title="Kattints a csoportmegjelölés átírásához"
                  >
                    {currentGroupLabel}
                    <Pencil size={10} />
                  </span>
                </div>
              )
            )}

            {activeSubject && (
              <div className={styles.subjectHint}>{activeSubject}</div>
            )}
            {enrolledIds.map(studentId => {
              const student = getStudent(studentId);
              return student ? (
                <EnrolledStudentCard 
                  key={studentId}
                  student={student}
                  day={day}
                  period={period}
                  onRemove={handleRemove}
                />
              ) : null;
            })}
            {enrolledIds.length === 0 && isOver && !validationError && (
              <div className={styles.placeholderHint}>Behúzás ide</div>
            )}
            {validationError && (
              <div className={styles.validationTooltip}>{validationError}</div>
            )}
            {assignmentWarning && (
              <div className={styles.warningTooltip}>{assignmentWarning}</div>
            )}
          </>
        )}
      </div>
    </td>
  );
}

