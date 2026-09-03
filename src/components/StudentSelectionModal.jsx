import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Users, Search, ArrowUpDown } from 'lucide-react';
import styles from './StudentSelectionModal.module.css';

export default function StudentSelectionModal({ isOpen, onClose, students, onConfirm }) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [activeClassFilter, setActiveClassFilter] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [localStudents, setLocalStudents] = useState([]);
  const mouseDownTargetRef = useRef(null);

  // Dinamikusan kigyűjtjük a betöltött diákok osztályait a gyorsszűréshez
  const availableClasses = useMemo(() => {
    if (!students) return [];
    const classesSet = new Set(students.map(s => s.classId.toLowerCase()));
    return Array.from(classesSet).sort();
  }, [students]);

  // Amikor a modal megnyílik, alapból senki sincs kijelölve
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set());
      setSearchTerm('');
      setActiveClassFilter('');
      setSortConfig({ key: 'name', direction: 'asc' });
      setLocalStudents(students ? JSON.parse(JSON.stringify(students)) : []);
    }
  }, [isOpen, students]);

  const sortedAndFilteredStudents = useMemo(() => {
    if (!localStudents) return [];
    
    let filtered = localStudents.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            s.classId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClass = activeClassFilter ? s.classId.toLowerCase() === activeClassFilter : true;
      return matchesSearch && matchesClass;
    });

    filtered.sort((a, b) => {
      const aValue = a[sortConfig.key] || '';
      const bValue = b[sortConfig.key] || '';
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [localStudents, searchTerm, activeClassFilter, sortConfig]);

  const updateNeeds = (id, delta) => {
    setLocalStudents(prev => prev.map(s => {
      if (s.id === id) {
        const newNeeds = Math.max(1, Math.min(5, (s.needs || 1) + delta));
        return { ...s, needs: newNeeds };
      }
      return s;
    }));
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const toggleSelection = (id) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const selectAll = () => {
    // Csak a SZŰRT listát jelöli ki (ami épp látszik)
    const newSelection = new Set(selectedIds);
    sortedAndFilteredStudents.forEach(s => newSelection.add(s.id));
    setSelectedIds(newSelection);
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleConfirm = () => {
    const selectedStudents = localStudents.filter(s => selectedIds.has(s.id));
    onConfirm(selectedStudents);
  };

  if (!isOpen) return null;

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
          <h2><Users size={24} className="icon-blue" /> Diákok Kiválasztása</h2>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className={`modal-body ${styles.body}`}>
          {availableClasses.length > 0 && (
            <div className={styles.classFilters}>
              <span className={styles.filterLabel}>Gyorsszűrés osztályra:</span>
              <div className={styles.filterTags}>
                {availableClasses.map(classId => (
                  <button
                    key={classId}
                    onClick={() => setActiveClassFilter(prev => prev === classId ? '' : classId)}
                    className={`${styles.filterTag} ${activeClassFilter === classId ? styles.filterTagActive : ''}`}
                  >
                    {classId.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={styles.toolbar}>
            <div className={styles.searchWrapper}>
              <Search size={16} className={styles.searchIcon} />
              <input 
                type="text" 
                placeholder="Keresés név vagy osztály alapján..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            <button className={`btn btn-secondary ${styles.toolbarBtn}`} onClick={selectAll}>Mind (szűrt) kijelölése</button>
            <button className={`btn btn-secondary ${styles.toolbarBtn}`} onClick={deselectAll}>Kijelölés törlése</button>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead className={styles.tableHead}>
                <tr>
                  <th className={`${styles.cellPadding} ${styles.cellCenter} ${styles.cellCheckbox}`}>Pipa</th>
                  <th className={`${styles.cellPadding} ${styles.sortableHeader}`} onClick={() => handleSort('name')}>
                    <div className={styles.sortLabel}>
                      Név {sortConfig.key === 'name' && <ArrowUpDown size={14} />}
                    </div>
                  </th>
                  <th className={`${styles.cellPadding} ${styles.sortableHeader}`} onClick={() => handleSort('classId')}>
                    <div className={styles.sortLabel}>
                      Osztály {sortConfig.key === 'classId' && <ArrowUpDown size={14} />}
                    </div>
                  </th>
                  <th className={`${styles.cellPadding} ${styles.cellCenter}`}>Heti Óraszám</th>
                </tr>
              </thead>
              <tbody>
                {sortedAndFilteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="4" className={styles.emptyRow}>Nincs a keresésnek megfelelő diák.</td>
                  </tr>
                ) : (
                  sortedAndFilteredStudents.map(student => (
                    <tr 
                      key={student.id} 
                      onClick={() => toggleSelection(student.id)}
                      className={`${styles.tableRow} ${selectedIds.has(student.id) ? styles.tableRowSelected : ''}`}
                    >
                      <td className={`${styles.cellPadding} ${styles.cellCenter}`}>
                        <div className={`${styles.checkbox} ${selectedIds.has(student.id) ? styles.checkboxChecked : ''}`}>
                          {selectedIds.has(student.id) && <Check size={14} color="white" />}
                        </div>
                      </td>
                      <td className={`${styles.cellPadding} ${styles.studentName}`}>{student.name}</td>
                      <td className={styles.cellPadding}>
                        <span className={`badge ${styles.classBadge}`}>{student.classId.toUpperCase()}</span>
                      </td>
                      <td className={`${styles.cellPadding} ${styles.cellCenter}`}>
                        <div className={styles.needsControl}>
                          <button 
                            className={`btn btn-icon ${styles.needsBtn}`}
                            onClick={(e) => { e.stopPropagation(); updateNeeds(student.id, -1); }}
                          >
                            -
                          </button>
                          <span className={styles.needsValue}>{student.needs || 1}</span>
                          <button 
                            className={`btn btn-icon ${styles.needsBtn}`}
                            onClick={(e) => { e.stopPropagation(); updateNeeds(student.id, 1); }}
                          >
                            +
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
        </div>
        
        <div className={`modal-footer ${styles.footer}`}>
          <div className={styles.footerInfo}>
            Kijelölve: <strong className={styles.footerCount}>{selectedIds.size}</strong> tanuló
          </div>
          <div className={styles.footerActions}>
            <button className="btn btn-secondary" onClick={onClose}>Mégsem</button>
            <button className={`${styles.submitBtn} btn btn-primary`} onClick={handleConfirm} disabled={selectedIds.size === 0}>
              Kijelöltek hozzáadása a listához
            </button>
            <div className={styles.tipTooltipContainer}>
              <span className={styles.tipIcon}>💡</span>
              <div className={styles.tipTooltip}>
                <strong>Tipp:</strong> <em>Az importálás folyamatosan bővíti a beosztandó diákok listáját, a korábbiak megmaradnak. Nyugodtan jelöld ki és add hozzá a tanulókat osztályonként, lépésről lépésre!</em>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
