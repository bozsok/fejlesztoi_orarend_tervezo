import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Trash2 } from 'lucide-react';
import styles from './StudentCard.module.css';
import useStore from '../store/useStore';

export default function StudentCard({ student, isOverlay, isCompleted }) {
  const { getStudentConstraints, clearStudentAssignments } = useStore();
  
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `student-${student.id}`,
    data: {
      type: 'Student',
      student: student,
    },
    disabled: !!isCompleted // Kész kártya nem húzható
  });

  const constraints = getStudentConstraints(student.id);

  const cardClasses = [
    styles.card,
    'glass-panel',
    isDragging && !isOverlay ? styles.cardDragging : '',
    isOverlay ? styles.cardOverlay : '',
    isCompleted ? styles.cardCompleted : '',
  ].filter(Boolean).join(' ');

  const handleClearAssignments = (e) => {
    e.stopPropagation();
    clearStudentAssignments(student.id);
  };

  return (
    <div 
      ref={(!isOverlay && !isCompleted) ? setNodeRef : undefined} 
      className={cardClasses}
      {...((!isOverlay && !isCompleted) ? listeners : {})} 
      {...((!isOverlay && !isCompleted) ? attributes : {})}
    >
      <div className={styles.nameContainer}>
        <div className={styles.name}>{student.name}</div>
        {constraints <= 2 && !isOverlay && !isCompleted && (
          <span 
            className={styles.warningIcon} 
            title={`Kritikus órarendi korlát! Mindössze ${constraints} alkalmas időpont van a héten.`}
          >
            ⚠️
          </span>
        )}
      </div>
      <div className={styles.meta}>
        <span className={`${styles.classLabel} ${/\.[ab]$/i.test(student.classId) ? styles.classLabelTag : styles.classLabelNonTag}`}>{student.classId}</span>
        {isCompleted ? (
          <button 
            className={styles.completedTrashBtn} 
            onClick={handleClearAssignments}
            title="Összes órarendi beosztás törlése"
          >
            <Trash2 size={16} />
          </button>
        ) : (
          <span className={styles.needs}>{student.needs || 1}. óra</span>
        )}
      </div>
    </div>
  );
}
