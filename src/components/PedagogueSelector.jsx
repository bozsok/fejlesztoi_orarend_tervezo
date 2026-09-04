import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import useStore from '../store/useStore';
import styles from './PedagogueSelector.module.css';

function PedagogueItem({ ped, isActive, hours, maxHours, onSelect }) {
  const { activeStudentId } = useStore();
  const onSelectRef = React.useRef(onSelect);
  onSelectRef.current = onSelect;

  const { setNodeRef, isOver } = useDroppable({
    id: `ped-drop-${ped.id}`,
    data: {
      type: 'PedagogueDrop',
      pedagogueId: ped.id,
    },
  });

  // Spring-loaded váltás: ha egy diákot húzunk a gomb fölé, 300 ms után automatikusan átvált a naptár erre a pedagógusra
  React.useEffect(() => {
    if (isOver && !isActive && activeStudentId) {
      const timer = setTimeout(() => {
        onSelectRef.current();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOver, isActive, activeStudentId]);

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`${styles.pedagogueItem} ${isActive ? styles.active : ''} ${isOver ? styles.droppableOver : ''}`}
      onClick={onSelect}
      title={`${ped.name} – Heti órák: ${hours} / ${maxHours} (Húzz ide diákot a hozzárendeléshez)`}
    >
      <div 
        className={styles.colorDot} 
        style={{ backgroundColor: ped.color || 'var(--accent-color)' }} 
      />
      <div className={styles.nameArea}>
        <span className={styles.nameText}>{ped.name}</span>
        <span className={styles.hoursText}>
          {hours} / {maxHours} óra
        </span>
      </div>
    </button>
  );
}

export default function PedagogueSelector() {
  const { 
    pedagogues, 
    activePedagogueId, 
    setActivePedagogueId, 
    getTeacherHoursCount 
  } = useStore();

  if (!pedagogues || pedagogues.length === 0) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>Kolléga kiválasztása</span>
        <span className={styles.countBadge}>{pedagogues.length} fő</span>
      </div>
      <div className={styles.list}>
        {pedagogues.map((ped) => {
          const isActive = ped.id === activePedagogueId;
          const hours = getTeacherHoursCount(null, null, ped.id);
          const maxHours = ped.maxTeacherHours || 24;

          return (
            <PedagogueItem
              key={ped.id}
              ped={ped}
              isActive={isActive}
              hours={hours}
              maxHours={maxHours}
              onSelect={() => setActivePedagogueId(ped.id)}
            />
          );
        })}
      </div>
    </div>
  );
}
