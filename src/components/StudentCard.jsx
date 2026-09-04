import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { UserPlus, UserX } from 'lucide-react';
import styles from './StudentCard.module.css';
import useStore from '../store/useStore';

export default function StudentCard({ student, isOverlay }) {
  const { 
    pedagogues, 
    activePedagogueId, 
    getStudentConstraints, 
    assignStudentToPedagogue, 
    unassignStudentFromPedagogue 
  } = useStore();
  
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `student-${student.id}`,
    data: {
      type: 'Student',
      student: student,
    },
  });

  const assignedPedagogue = student.pedagogueId 
    ? pedagogues.find(p => p.id === student.pedagogueId)
    : null;
  const activePedagogue = pedagogues.find(p => p.id === activePedagogueId);

  const constraints = getStudentConstraints(student.id, student.pedagogueId || activePedagogueId);

  const cardClasses = [
    styles.card,
    'glass-panel',
    isDragging && !isOverlay ? styles.cardDragging : '',
    isOverlay ? styles.cardOverlay : '',
    !student.pedagogueId ? styles.cardUnassigned : '',
  ].filter(Boolean).join(' ');

  const handleAssignToActivePedagogue = (e) => {
    e.stopPropagation();
    if (activePedagogueId) {
      assignStudentToPedagogue(student.id, activePedagogueId);
    }
  };

  const handleUnassign = (e) => {
    e.stopPropagation();
    unassignStudentFromPedagogue(student.id);
  };

  return (
    <div 
      ref={!isOverlay ? setNodeRef : undefined} 
      className={cardClasses}
      {...(!isOverlay ? listeners : {})} 
      {...(!isOverlay ? attributes : {})}
    >
      {assignedPedagogue ? (
        <div 
          className={styles.pedagogueBar} 
          style={{ backgroundColor: assignedPedagogue.color }}
          title={`Hozzárendelve: ${assignedPedagogue.name}`}
        />
      ) : (
        <div 
          className={styles.unassignedBar} 
          title="Nincs pedagógushoz rendelve"
        />
      )}

      <div className={styles.nameContainer}>
        <div className={styles.name} title={student.name}>{student.name}</div>
        {constraints <= 2 && !isOverlay && (
          <span 
            className={styles.warningIcon} 
            title={`Kritikus órarendi korlát! Mindössze ${constraints} alkalmas időpont van a héten.`}
          >
            ⚠️
          </span>
        )}
      </div>

      <div className={styles.meta}>
        <span className={`${styles.classLabel} ${/\.[ab]$/i.test(student.classId) ? styles.classLabelTag : styles.classLabelNonTag}`}>
          {student.classId}
        </span>
        <span className={styles.needs}>{student.needs || 1}. óra</span>

        {!isOverlay && (
          <>
            {!student.pedagogueId && activePedagogue && (
              <button
                type="button"
                className={styles.actionBtn}
                onClick={handleAssignToActivePedagogue}
                title={`Hozzárendelés hozzá: ${activePedagogue.name}`}
              >
                <UserPlus size={14} />
              </button>
            )}

            {student.pedagogueId && (
              <button
                type="button"
                className={styles.actionBtn}
                onClick={handleUnassign}
                title="Hozzárendelés megszüntetése (vissza a közös listába)"
              >
                <UserX size={14} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
