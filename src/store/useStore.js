import { create } from 'zustand';

// Segédfüggvény az ID-k prefixes darabolásának robusztus kezelésére (pl. excel-1 támogatása)
export const cleanStudentId = (studentId) => {
  if (!studentId) return '';
  const idStr = String(studentId);
  if (idStr.startsWith('enrolled-')) {
    const parts = idStr.split('-');
    // Levágjuk a 'enrolled-' előtagot (index 0) és az utolsó két elemet (nap, óra)
    return parts.slice(1, parts.length - 2).join('-');
  }
  return idStr.replace('student-', '');
};

// Elérhető színpaletta pedagógusokhoz
export const PEDAGOGUE_COLORS = [
  '#6366f1', // Indigo
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#3b82f6', // Blue
  '#14b8a6', // Teal
];

export const createDefaultPedagogue = (name = 'Fejlesztőpedagógus', teacherCode = '2', maxHours = 24, index = 0) => {
  return {
    id: `ped-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    name: name.trim(),
    teacherCode: String(teacherCode).trim() || '2',
    maxTeacherHours: Math.min(26, Math.max(1, parseInt(maxHours, 10) || 24)),
    groupNamingOrder: 'vertical',
    timetableTitle: `${name.trim()}, fejlesztőpedagógus`,
    timetable: {},
    blockedPeriods: {},
    customGroupLabels: {},
    color: PEDAGOGUE_COLORS[index % PEDAGOGUE_COLORS.length],
  };
};

// Példa kezdőadatok a fejlesztéshez
const INITIAL_STUDENTS = [];

const useStore = create((set, get) => ({
  // Állapotok
  pedagogues: [], // Pedagógusok tömbje
  activePedagogueId: null, // Az aktívan kiválasztott pedagógus azonosítója
  settings: {
    maxGroupSize: 5,
    allowManualGroupSizeOverride: false,
    maxTeacherHours: 24,
    teacherCode: '2',
    groupNamingOrder: 'vertical',
  },
  students: INITIAL_STUDENTS,
  classes: {}, // {'3.a': { 'Hétfő': { 1: 'Matek', 2: 'Rajz' } } }
  timetable: {}, // { 'Hétfő': { 1: ['s1', 's2'] } } // idősávokhoz rendelt diák ID-k listája az aktív pedagógusnál
  blockedPeriods: {}, // { 'Hétfő': { 1: 'Napközi' } } // Zárolt idősávok indoklással az aktív pedagógusnál
  customGroupLabels: {}, // { 'Hétfő-1': '2/1' } // Egyedi csoport felülbírálások az aktív pedagógusnál
  activeStudentId: null, // Az éppen húzott diák azonosítója
  timetableTitle: 'Fejlesztőpedagógus neve, beosztása...', // A naptár szerkeszthető címe az aktív pedagógusnál

  // Műveletek
  updateSettings: (newSettings) => set((state) => ({
    settings: { ...state.settings, ...newSettings }
  })),

  // Pedagógus kezelő műveletek
  addPedagogue: (pedagogueData = {}) => set((state) => {
    const count = state.pedagogues.length;
    const newPedagogue = {
      id: pedagogueData.id || `ped-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: (pedagogueData.name || 'Új pedagógus').trim(),
      teacherCode: String(pedagogueData.teacherCode || `${count + 1}`).trim(),
      maxTeacherHours: Math.min(26, Math.max(1, parseInt(pedagogueData.maxTeacherHours, 10) || 24)),
      groupNamingOrder: pedagogueData.groupNamingOrder || 'vertical',
      timetableTitle: (pedagogueData.timetableTitle || `${(pedagogueData.name || 'Pedagógus').trim()}, fejlesztőpedagógus`).trim(),
      timetable: pedagogueData.timetable || {},
      blockedPeriods: pedagogueData.blockedPeriods || {},
      customGroupLabels: pedagogueData.customGroupLabels || {},
      color: pedagogueData.color || PEDAGOGUE_COLORS[count % PEDAGOGUE_COLORS.length],
    };

    const updatedPedagogues = [...state.pedagogues, newPedagogue];
    const isFirst = state.pedagogues.length === 0;

    return {
      pedagogues: updatedPedagogues,
      activePedagogueId: isFirst ? newPedagogue.id : state.activePedagogueId,
      timetable: isFirst ? newPedagogue.timetable : state.timetable,
      blockedPeriods: isFirst ? newPedagogue.blockedPeriods : state.blockedPeriods,
      customGroupLabels: isFirst ? newPedagogue.customGroupLabels : state.customGroupLabels,
      timetableTitle: isFirst ? newPedagogue.timetableTitle : state.timetableTitle,
    };
  }),

  removePedagogue: (pedagogueId) => set((state) => {
    const updatedPedagogues = state.pedagogues.filter(p => p.id !== pedagogueId);
    const updatedStudents = state.students.map(s => 
      s.pedagogueId === pedagogueId ? { ...s, pedagogueId: null } : s
    );

    let nextActiveId = state.activePedagogueId;
    let nextTimetable = state.timetable;
    let nextBlocked = state.blockedPeriods;
    let nextLabels = state.customGroupLabels;
    let nextTitle = state.timetableTitle;

    if (state.activePedagogueId === pedagogueId) {
      if (updatedPedagogues.length > 0) {
        const nextPed = updatedPedagogues[0];
        nextActiveId = nextPed.id;
        nextTimetable = nextPed.timetable || {};
        nextBlocked = nextPed.blockedPeriods || {};
        nextLabels = nextPed.customGroupLabels || {};
        nextTitle = nextPed.timetableTitle || '';
      } else {
        nextActiveId = null;
        nextTimetable = {};
        nextBlocked = {};
        nextLabels = {};
        nextTitle = '';
      }
    }

    return {
      pedagogues: updatedPedagogues,
      students: updatedStudents,
      activePedagogueId: nextActiveId,
      timetable: nextTimetable,
      blockedPeriods: nextBlocked,
      customGroupLabels: nextLabels,
      timetableTitle: nextTitle,
    };
  }),

  updatePedagogue: (pedagogueId, updates) => set((state) => {
    const updatedPedagogues = state.pedagogues.map(p => {
      if (p.id === pedagogueId) {
        return { ...p, ...updates };
      }
      return p;
    });

    const isCurrentActive = state.activePedagogueId === pedagogueId;
    const currentPed = updatedPedagogues.find(p => p.id === pedagogueId);

    return {
      pedagogues: updatedPedagogues,
      timetable: (isCurrentActive && currentPed?.timetable) ? currentPed.timetable : state.timetable,
      blockedPeriods: (isCurrentActive && currentPed?.blockedPeriods) ? currentPed.blockedPeriods : state.blockedPeriods,
      customGroupLabels: (isCurrentActive && currentPed?.customGroupLabels) ? currentPed.customGroupLabels : state.customGroupLabels,
      timetableTitle: (isCurrentActive && currentPed?.timetableTitle !== undefined) ? currentPed.timetableTitle : state.timetableTitle,
    };
  }),

  setActivePedagogueId: (pedagogueId) => set((state) => {
    if (state.activePedagogueId === pedagogueId) return {};
    const targetPed = state.pedagogues.find(p => p.id === pedagogueId);
    if (!targetPed) return {};

    return {
      activePedagogueId: pedagogueId,
      timetable: targetPed.timetable || {},
      blockedPeriods: targetPed.blockedPeriods || {},
      customGroupLabels: targetPed.customGroupLabels || {},
      timetableTitle: targetPed.timetableTitle || '',
    };
  }),

  getActivePedagogue: () => {
    const state = get();
    return state.pedagogues.find(p => p.id === state.activePedagogueId) || null;
  },

  assignStudentToPedagogue: (studentId, pedagogueId) => set((state) => {
    const cleanedId = cleanStudentId(studentId);
    const updatedStudents = state.students.map(s => {
      if (String(s.id) === cleanedId) {
        return { ...s, pedagogueId };
      }
      return s;
    });
    return { students: updatedStudents };
  }),

  // Diák teljes áthelyezése egy másik pedagógushoz (korábbi naptárakból való törléssel)
  reassignStudentToPedagogue: (studentId, pedagogueId) => set((state) => {
    const cleanedId = cleanStudentId(studentId);
    const updatedStudents = state.students.map(s => {
      if (String(s.id) === cleanedId) {
        return { ...s, pedagogueId };
      }
      return s;
    });

    const updatedPedagogues = state.pedagogues.map(ped => {
      let changed = false;
      const newTimetable = {};
      Object.keys(ped.timetable || {}).forEach(day => {
        newTimetable[day] = {};
        Object.keys(ped.timetable[day] || {}).forEach(period => {
          const enrolled = ped.timetable[day][period] || [];
          if (enrolled.some(id => cleanStudentId(id) === cleanedId)) {
            const remaining = enrolled.filter(id => cleanStudentId(id) !== cleanedId);
            if (remaining.length > 0) {
              newTimetable[day][period] = remaining;
            }
            changed = true;
          } else {
            newTimetable[day][period] = enrolled;
          }
        });
        if (Object.keys(newTimetable[day]).length === 0) {
          delete newTimetable[day];
        }
      });
      return changed ? { ...ped, timetable: newTimetable } : ped;
    });

    const nextActiveId = pedagogueId || state.activePedagogueId;
    const activePed = updatedPedagogues.find(p => p.id === nextActiveId);

    return {
      students: updatedStudents,
      pedagogues: updatedPedagogues,
      activePedagogueId: nextActiveId,
      timetable: activePed ? activePed.timetable : state.timetable,
    };
  }),

  unassignStudentFromPedagogue: (studentId) => set((state) => {
    const cleanedId = cleanStudentId(studentId);
    const updatedStudents = state.students.map(s => {
      if (String(s.id) === cleanedId) {
        return { ...s, pedagogueId: null };
      }
      return s;
    });

    const updatedPedagogues = state.pedagogues.map(ped => {
      let changed = false;
      const newTimetable = {};
      Object.keys(ped.timetable || {}).forEach(day => {
        newTimetable[day] = {};
        Object.keys(ped.timetable[day] || {}).forEach(period => {
          const enrolled = ped.timetable[day][period] || [];
          if (enrolled.some(id => cleanStudentId(id) === cleanedId)) {
            newTimetable[day][period] = enrolled.filter(id => cleanStudentId(id) !== cleanedId);
            changed = true;
          } else {
            newTimetable[day][period] = enrolled;
          }
        });
      });
      return changed ? { ...ped, timetable: newTimetable } : ped;
    });

    const activePed = updatedPedagogues.find(p => p.id === state.activePedagogueId);

    return {
      students: updatedStudents,
      pedagogues: updatedPedagogues,
      timetable: activePed ? activePed.timetable : state.timetable,
    };
  }),

  importPedagogueData: (pedagogueId, data) => set((state) => {
    const targetPed = state.pedagogues.find(p => p.id === pedagogueId);
    if (!targetPed) return {};

    const updatedPed = {
      ...targetPed,
      timetable: data.timetable || targetPed.timetable,
      blockedPeriods: data.blockedPeriods || targetPed.blockedPeriods,
      customGroupLabels: data.customGroupLabels || targetPed.customGroupLabels,
      timetableTitle: data.timetableTitle || targetPed.timetableTitle,
    };

    const updatedPedagogues = state.pedagogues.map(p => p.id === pedagogueId ? updatedPed : p);
    const isCurrentActive = state.activePedagogueId === pedagogueId;

    return {
      pedagogues: updatedPedagogues,
      timetable: isCurrentActive ? updatedPed.timetable : state.timetable,
      blockedPeriods: isCurrentActive ? updatedPed.blockedPeriods : state.blockedPeriods,
      customGroupLabels: isCurrentActive ? updatedPed.customGroupLabels : state.customGroupLabels,
      timetableTitle: isCurrentActive ? updatedPed.timetableTitle : state.timetableTitle,
    };
  }),

  setCustomGroupLabel: (day, period, label) => set((state) => {
    const key = `${day}-${period}`;
    const updated = { ...state.customGroupLabels };
    if (label && label.trim() !== '') {
      updated[key] = label.trim();
    } else {
      delete updated[key];
    }

    const updatedPedagogues = state.pedagogues.map(p => {
      if (p.id === state.activePedagogueId) {
        return { ...p, customGroupLabels: updated };
      }
      return p;
    });

    return { customGroupLabels: updated, pedagogues: updatedPedagogues };
  }),

  getGroupLabels: (targetPedagogueId = null) => {
    const state = get();
    const pedId = targetPedagogueId || state.activePedagogueId;
    const currentPed = state.pedagogues.find(p => p.id === pedId);
    const teacherCode = currentPed?.teacherCode || state.settings.teacherCode || '2';
    const order = currentPed?.groupNamingOrder || state.settings.groupNamingOrder || 'vertical';
    const activeTimetable = currentPed ? (currentPed.timetable || {}) : state.timetable;
    const activeCustomLabels = currentPed ? (currentPed.customGroupLabels || {}) : state.customGroupLabels;

    const DAYS = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek'];
    const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];
    const labels = {};
    let counter = 1;

    if (order === 'vertical') {
      DAYS.forEach(day => {
        PERIODS.forEach(period => {
          const enrolled = activeTimetable[day]?.[period] || [];
          if (enrolled.length > 0) {
            const key = `${day}-${period}`;
            if (activeCustomLabels[key]) {
              labels[key] = activeCustomLabels[key];
            } else {
              labels[key] = `${teacherCode}/${counter}`;
            }
            counter++;
          }
        });
      });
    } else {
      PERIODS.forEach(period => {
        DAYS.forEach(day => {
          const enrolled = activeTimetable[day]?.[period] || [];
          if (enrolled.length > 0) {
            const key = `${day}-${period}`;
            if (activeCustomLabels[key]) {
              labels[key] = activeCustomLabels[key];
            } else {
              labels[key] = `${teacherCode}/${counter}`;
            }
            counter++;
          }
        });
      });
    }

    return labels;
  },

  cleanAndValidateGroupLabel: (day, period, inputLabel, targetPedagogueId = null) => {
    const state = get();
    if (!inputLabel) return { cleanedLabel: '', error: null };

    let cleaned = inputLabel.trim();
    const regexMatch = cleaned.match(/^(\d+)[\s/\\.,-]+(\d+)$/);
    if (regexMatch) {
      cleaned = `${regexMatch[1]}/${regexMatch[2]}`;
    }

    const allLabels = state.getGroupLabels(targetPedagogueId);
    const currentKey = `${day}-${period}`;
    let duplicateLocation = null;

    Object.entries(allLabels).forEach(([key, label]) => {
      if (key !== currentKey && label.toLowerCase() === cleaned.toLowerCase()) {
        const [d, p] = key.split('-');
        duplicateLocation = `${d} ${p}. óra`;
      }
    });

    if (duplicateLocation) {
      return {
        cleanedLabel: cleaned,
        error: `A(z) "${cleaned}" csoportnév már használatban van nála: ${duplicateLocation}!`
      };
    }

    return {
      cleanedLabel: cleaned,
      error: null
    };
  },

  getTeacherHoursCount: (excludeDay = null, excludePeriod = null, targetPedagogueId = null) => {
    const state = get();
    const pedId = targetPedagogueId || state.activePedagogueId;
    const currentPed = state.pedagogues.find(p => p.id === pedId);
    const timetableToCount = currentPed ? (currentPed.timetable || {}) : state.timetable;

    let count = 0;
    Object.keys(timetableToCount).forEach(day => {
      Object.keys(timetableToCount[day] || {}).forEach(period => {
        if (day === excludeDay && String(period) === String(excludePeriod)) {
          return;
        }
        const enrolled = timetableToCount[day][period] || [];
        if (enrolled.length > 0) {
          count++;
        }
      });
    });
    return count;
  },

  setActiveStudentId: (id) => set(() => ({ activeStudentId: id })),
  setTimetableTitle: (title) => set((state) => {
    const updatedPedagogues = state.pedagogues.map(p => {
      if (p.id === state.activePedagogueId) {
        return { ...p, timetableTitle: title };
      }
      return p;
    });
    return { timetableTitle: title, pedagogues: updatedPedagogues };
  }),

  /**
   * Központi validátor: meghatározza, hogy egy diák beosztható-e az adott idősávba.
   * Mind az automata tervező (scheduler.js), mind a manuális drag-and-drop ezen keresztül fut.
   *
   * Automatikus és manuális beosztás eltérései:
   * ┌─────────────────────────────────────┬────────────┬─────────────┐
   * │ Szabály                             │ Automatikus│ Manuális    │
   * ├─────────────────────────────────────┼────────────┼─────────────┤
   * │ Napi egyszeri részvétel             │ Szigorú    │ Engedékeny  │
   * │ Csoportlétszám-limit               │ Szigorú    │ Felülbírálh.│
   * │ Évfolyam-keveredés                  │ Tiltott    │ Engedélyezv.│
   * │ Felsős lyukas 5–6. óra             │ Tiltott    │ Engedélyezv.│
   * │ Alsós napközis 5–6. óra            │ Fallback   │ Engedélyezv.│
   * │ Tantárgyi szabályok (alsó/felső)   │ Azonos     │ Azonos      │
   * │ Blokkolt sávok                     │ Azonos     │ Azonos      │
   * │ Pedagógus heti óraszám             │ Azonos     │ Azonos      │
   * └─────────────────────────────────────┴────────────┴─────────────┘
   *
   * Kapcsolódó függvények:
   * - getAssignmentValidationError(): piros tooltip szöveg (hibaüzenet)
   * - getAssignmentWarning(): sárga tooltip szöveg (figyelmeztetés, nem blokkoló)
   * - getStudentConstraints(): szűkösségszámolás (a scheduler is ezt hívja)
   */
  canAssignStudent: (studentId, day, period, isAutoScheduler = false, options = {}) => {
    const state = get();
    if (!studentId) return false;

    // Célpedagógus feloldása
    const targetPedId = options.targetPedagogueId || state.activePedagogueId;
    const targetPed = state.pedagogues.find(p => p.id === targetPedId) || null;
    const targetTimetable = targetPed ? (targetPed.timetable || {}) : state.timetable;
    const targetBlocked = targetPed ? (targetPed.blockedPeriods || {}) : state.blockedPeriods;
    const maxTeacherHours = targetPed?.maxTeacherHours || state.settings.maxTeacherHours || 24;

    // 7–8. órára nem osztható be tanuló
    if (period >= 7) {
      return false;
    }

    // Pedagógus maximális óraszámának ellenőrzése
    const currentEnrolled = targetTimetable[day]?.[period] || [];
    const isTargetSlotEmpty = currentEnrolled.length === 0;
    if (isTargetSlotEmpty) {
      let currentHours = state.getTeacherHoursCount(null, null, targetPedId);
      
      if (options.sourceDay && options.sourcePeriod) {
        const sourceEnrolled = targetTimetable[options.sourceDay]?.[options.sourcePeriod] || [];
        const isCleanedSourceId = cleanStudentId(studentId);
        const sourceWithoutStudent = sourceEnrolled.filter(id => cleanStudentId(id) !== isCleanedSourceId);
        if (sourceWithoutStudent.length === 0) {
          currentHours = state.getTeacherHoursCount(options.sourceDay, options.sourcePeriod, targetPedId);
        }
      }

      if (isAutoScheduler && currentHours >= maxTeacherHours) {
        return false;
      }
    }

    const cleanedId = cleanStudentId(studentId);
    const student = state.students.find(s => String(s.id) === cleanedId);
    if (!student) return false;

    // Ha a diák már hozzá van rendelve egy másik pedagógushoz:
    // Automata tervezőnél szigorú tiltás, manuális húzásnál engedélyezzük (a drop át is rendeli a diákot)
    if (student.pedagogueId && targetPed && student.pedagogueId !== targetPed.id) {
      if (isAutoScheduler) {
        return false;
      }
    }

    // Kereszt-ellenőrzés 1: szerepel-e a diák ugyanezen a napon és idősávban egy MÁSIK pedagógus naptárában?
    const isAssignedInOtherPedSlot = state.pedagogues.some(p => {
      if (targetPed && p.id === targetPed.id) return false;
      // Ha ez a forrás pedagógus forrásórája, azt figyelmen kívül hagyjuk (onnan épp elhúzzuk)
      if (options.sourcePedagogueId && p.id === options.sourcePedagogueId && options.sourceDay === day && options.sourcePeriod === period) {
        return false;
      }
      const slotEnrolled = p.timetable?.[day]?.[period] || [];
      return slotEnrolled.some(id => cleanStudentId(id) === cleanedId);
    });
    if (isAssignedInOtherPedSlot && isAutoScheduler) {
      return false;
    }

    // Kereszt-ellenőrzés 2: szerepel-e a diák ugyanezen a napon bármely MÁSIK pedagógusnál (napi max 1 részvétel)?
    const isAssignedInOtherPedDay = state.pedagogues.some(p => {
      if (targetPed && p.id === targetPed.id) return false;
      const daySchedule = p.timetable?.[day] || {};
      return Object.keys(daySchedule).some(pKey => {
        // Ha a forrás pedagógus forrásórája, azt figyelmen kívül hagyjuk
        if (options.sourcePedagogueId && p.id === options.sourcePedagogueId && options.sourceDay === day && String(options.sourcePeriod) === pKey) {
          return false;
        }
        const enrolled = daySchedule[pKey] || [];
        return enrolled.some(id => cleanStudentId(id) === cleanedId);
      });
    });
    if (isAssignedInOtherPedDay && isAutoScheduler) {
      return false;
    }

    // Csoportlétszám-limit ellenőrzése
    if (currentEnrolled.length >= state.settings.maxGroupSize) {
      if (isAutoScheduler || !state.settings.allowManualGroupSizeOverride) {
        return false; // A csoport megtelt és nem bírálható felül
      }
    }

    // Napi egyszeri részvétel ellenőrzése a célpedagógus naptárában
    const daySchedule = targetTimetable[day];
    if (daySchedule) {
      const alreadyAssignedPeriods = Object.keys(daySchedule).filter(p => {
        // Áthelyezésnél a forrás idősávot figyelmen kívül hagyjuk a napi ellenőrzésnél
        if (options.sourceDay === day && p === String(options.sourcePeriod)) {
          return false;
        }
        const enrolled = daySchedule[p] || [];
        return enrolled.some(id => cleanStudentId(id) === cleanedId);
      });
      
      if (alreadyAssignedPeriods.length > 0) {
        if (isAutoScheduler) {
          return false; // Szigorú tiltás az Automatának: ha már van a napon, TILOS!
        }
        // Kivéve (csak manuális húzásnál!) ha éppen a saját aktuális sávjába húznánk vissza véletlenül
        if (!(alreadyAssignedPeriods.length === 1 && alreadyAssignedPeriods[0] === String(period))) {
          return false; // Már be van osztva erre a napra
        }
      }
    }

    // Blokkolt sáv ellenőrzése a célpedagógusnál
    if (targetBlocked[day] && targetBlocked[day][period]) {
      return false; // Zárolt sávba nem lehet beosztani
    }

    // Évfolyam (Grade) ellenőrzése
    // Csak azonos számú osztályok kerülhetnek egy csoportba (pl. 4.a és 4.c)
    if (currentEnrolled.length > 0) {
      const studentGrade = student.classId.match(/\d+/)?.[0];
      // Megkeressük az első már bent lévő diák évfolyamát
      const firstEnrolledStudent = state.students.find(s => String(s.id) === String(cleanStudentId(currentEnrolled[0])));
      if (firstEnrolledStudent) {
        const firstGrade = firstEnrolledStudent.classId.match(/\d+/)?.[0];
        if (studentGrade !== firstGrade) {
          if (isAutoScheduler) {
            return false; // Az automata számára szigorú tiltás!
          }
        }
      }
    }

    // Ha a diák osztályának nincs órarendje a Krétából (ez előfordulhat ha még nem töltötték fel)
    const classId = student.classId;
    if (!state.classes[classId] || !state.classes[classId][day]) return false;

    // Az adott óra tantárgya
    const subject = state.classes[classId][day][period];
    
    // Speciális szabály alsó tagozaton (1-4. osztály) az 5–6. órára (napközi/ebédeltetés)
    const gradeMatch = classId.match(/\d+/);
    const grade = gradeMatch ? parseInt(gradeMatch[0], 10) : 0;
    const isLowerGrade = grade >= 1 && grade <= 4;
    const isUpperGrade = grade >= 5 && grade <= 8;
    
    const isLunchOrNapkozi = subject && (
      subject.toLowerCase().includes('napközi') || 
      subject.toLowerCase().includes('ebéd') ||
      subject.toLowerCase().includes('szabadid')
    );

    if (isLowerGrade && (period === 5 || period === 6) && (!subject || isLunchOrNapkozi)) {
      return true; // Az 5–6. órai napközi/ebédről alsóban elhozható a diák fejlesztésre
    }

    // Felső tagozat: lyukas 5–6. óra manuálisan engedélyezett (automatánál tiltott)
    if (isUpperGrade && (period === 5 || period === 6) && !subject && !isAutoScheduler) {
      return true;
    }

    if (!subject) return false; // Lyukasóráról egyébként nem hozható el!

    const subjLower = subject.toLowerCase();
    const isPE = subjLower.includes('testnevel');

    // Felső tagozat: kizárólag testnevelés óráról hozható el (bármely óra)
    if (isUpperGrade) {
      return isPE;
    }

    // Alsó tagozat: tagozatos/nem tagozatos megkülönböztetés
    const isTag = /\.[ab]$/i.test(classId);
    const isArt = subjLower.includes('rajz') || subjLower.includes('vizuális');
    const isMusic = subjLower.includes('ének');

    if (isTag) {
      // Tagozatosok CSAK Rajz és Testnevelés óráról hozhatók el
      return isArt || isPE;
    } else {
      // Nem tagozatosok Rajz, Testnevelés ÉS Ének óráról is elhozhatók
      return isArt || isPE || isMusic;
    }
  },

  // Diák beosztása egy adott napra és idősávra
  assignStudent: (studentId, day, period) => set((state) => {
    const currentTimetable = { ...state.timetable };
    if (!currentTimetable[day]) currentTimetable[day] = {};
    if (!currentTimetable[day][period]) currentTimetable[day][period] = [];

    const cleanId = cleanStudentId(studentId);

    if (!currentTimetable[day][period].includes(cleanId)) {
      currentTimetable[day][period] = [...currentTimetable[day][period], cleanId];
    }

    // Frissítjük a diák pedagógus hozzárendelését is, ha még nem volt hozzárendelve
    const updatedStudents = state.students.map(s => {
      if (String(s.id) === cleanId && !s.pedagogueId && state.activePedagogueId) {
        return { ...s, pedagogueId: state.activePedagogueId };
      }
      return s;
    });

    const updatedPedagogues = state.pedagogues.map(p => {
      if (p.id === state.activePedagogueId) {
        return { ...p, timetable: currentTimetable };
      }
      return p;
    });

    return { 
      timetable: currentTimetable, 
      pedagogues: updatedPedagogues,
      students: updatedStudents
    };
  }),

  // Diák eltávolítása egy sávból (opcionálisan megadott pedagógustól)
  removeStudent: (studentId, day, period, targetPedId = null) => set((state) => {
    const pedIdToModify = targetPedId || state.activePedagogueId;
    const cleanId = cleanStudentId(studentId);

    const updatedPedagogues = state.pedagogues.map(p => {
      if (p.id === pedIdToModify) {
        const pedTimetable = { ...p.timetable };
        if (pedTimetable[day] && pedTimetable[day][period]) {
          const remaining = pedTimetable[day][period].filter(id => cleanStudentId(id) !== cleanId);
          pedTimetable[day] = { ...pedTimetable[day] };
          if (remaining.length === 0) {
            delete pedTimetable[day][period];
            if (Object.keys(pedTimetable[day]).length === 0) {
              delete pedTimetable[day];
            }
          } else {
            pedTimetable[day][period] = remaining;
          }
        }
        return { ...p, timetable: pedTimetable };
      }
      return p;
    });

    const activePed = updatedPedagogues.find(p => p.id === state.activePedagogueId);

    return { 
      timetable: activePed ? activePed.timetable : state.timetable, 
      pedagogues: updatedPedagogues 
    };
  }),

  // JSON adat betöltése (új többpedagógusos és régi egypedagógusos formátum automatikus kezelésével)
  importData: (data) => set(() => {
    if (!data) return {};

    // Ha van pedagógus lista az importban
    if (data.pedagogues && Array.isArray(data.pedagogues) && data.pedagogues.length > 0) {
      const activeId = data.activePedagogueId && data.pedagogues.some(p => p.id === data.activePedagogueId)
        ? data.activePedagogueId
        : data.pedagogues[0].id;
      const activePed = data.pedagogues.find(p => p.id === activeId);

      return {
        ...data,
        activePedagogueId: activeId,
        timetable: activePed?.timetable || {},
        blockedPeriods: activePed?.blockedPeriods || {},
        customGroupLabels: activePed?.customGroupLabels || {},
        timetableTitle: activePed?.timetableTitle || data.timetableTitle || 'Órarend terv',
      };
    }

    // Régi egypedagógusos JSON migrációja
    const migratedPedagogue = {
      id: 'ped-migrated-1',
      name: data.timetableTitle ? data.timetableTitle.split(',')[0].trim() : 'Fejlesztőpedagógus',
      teacherCode: (data.settings && data.settings.teacherCode) || '2',
      maxTeacherHours: (data.settings && data.settings.maxTeacherHours) || 24,
      groupNamingOrder: (data.settings && data.settings.groupNamingOrder) || 'vertical',
      timetableTitle: data.timetableTitle || 'Fejlesztőpedagógus neve, beosztása...',
      timetable: data.timetable || {},
      blockedPeriods: data.blockedPeriods || {},
      customGroupLabels: data.customGroupLabels || {},
      color: PEDAGOGUE_COLORS[0],
    };

    const migratedStudents = (data.students || []).map(s => ({
      ...s,
      pedagogueId: 'ped-migrated-1'
    }));

    return {
      ...data,
      pedagogues: [migratedPedagogue],
      activePedagogueId: 'ped-migrated-1',
      students: migratedStudents,
      timetable: migratedPedagogue.timetable,
      blockedPeriods: migratedPedagogue.blockedPeriods,
      customGroupLabels: migratedPedagogue.customGroupLabels,
      timetableTitle: migratedPedagogue.timetableTitle,
    };
  }),

  // Excel tanuló lista betöltése hozzáfűző (merge) logikával
  importExcelStudents: (newStudents) => set((state) => {
    const mergedStudents = [...state.students];
    
    newStudents.forEach(newS => {
      const existingIdx = mergedStudents.findIndex(s => 
        s.name.toLowerCase() === newS.name.toLowerCase() && 
        s.classId.toLowerCase() === newS.classId.toLowerCase()
      );
      
      if (existingIdx !== -1) {
        // Ha létezik, a heti igényt és a megadott pedagógust frissítjük
        mergedStudents[existingIdx] = { 
          ...mergedStudents[existingIdx], 
          needs: newS.needs || mergedStudents[existingIdx].needs || 1,
          pedagogueId: newS.pedagogueId !== undefined ? newS.pedagogueId : mergedStudents[existingIdx].pedagogueId
        };
      } else {
        // Ha új, hozzáadjuk a megadott pedagógussal (ha nincs, null = Közös pool)
        mergedStudents.push({
          ...newS,
          needs: newS.needs || 1,
          pedagogueId: newS.pedagogueId || null
        });
      }
    });
    
    return { students: mergedStudents };
  }),

  // KRÉTA adat betöltése
  importKretaData: (classesData) => set((state) => {
    // Töröljük a pedagógusok korábbi naptárait, mert megváltozott az órarend
    const updatedPedagogues = state.pedagogues.map(p => ({
      ...p,
      timetable: {}
    }));

    return {
      classes: classesData,
      pedagogues: updatedPedagogues,
      timetable: {}
    };
  }),

  // Idősáv zárolása vagy feloldása
  toggleBlockedPeriod: (day, period, reason = '') => set((state) => {
    const currentBlocked = { ...state.blockedPeriods };
    if (!currentBlocked[day]) currentBlocked[day] = {};

    let updatedTimetable = { ...state.timetable };

    if (currentBlocked[day][period]) {
      // Feloldás
      delete currentBlocked[day][period];
    } else {
      // Zárolás – az idősávból a beosztott tanulókat is eltávolítjuk
      currentBlocked[day][period] = reason || 'Zárolva';
      if (updatedTimetable[day]) {
        updatedTimetable[day] = { ...updatedTimetable[day] };
        delete updatedTimetable[day][period];
      }
    }

    const updatedPedagogues = state.pedagogues.map(p => {
      if (p.id === state.activePedagogueId) {
        return { 
          ...p, 
          blockedPeriods: currentBlocked,
          timetable: updatedTimetable
        };
      }
      return p;
    });

    return { 
      blockedPeriods: currentBlocked, 
      timetable: updatedTimetable,
      pedagogues: updatedPedagogues
    };
  }),

  // Validációs hiba lekérdezése magyar indoklással
  getAssignmentValidationError: (studentId, day, period, options = {}) => {
    const state = get();
    if (!studentId) return "Nincs diák kiválasztva";

    // Célpedagógus feloldása
    const targetPedId = options.targetPedagogueId || state.activePedagogueId;
    const targetPed = state.pedagogues.find(p => p.id === targetPedId) || null;
    const targetTimetable = targetPed ? (targetPed.timetable || {}) : state.timetable;
    const targetBlocked = targetPed ? (targetPed.blockedPeriods || {}) : state.blockedPeriods;
    const maxTeacherHours = targetPed?.maxTeacherHours || state.settings.maxTeacherHours || 24;

    // 7–8. órára nem osztható be tanuló
    if (period >= 7) {
      return "7–8. órára nem osztható be tanuló";
    }

    // Pedagógus maximális óraszámának ellenőrzése
    const currentEnrolled = targetTimetable[day]?.[period] || [];
    const isTargetSlotEmpty = currentEnrolled.length === 0;
    if (isTargetSlotEmpty) {
      let currentHours = state.getTeacherHoursCount(null, null, targetPedId);
      
      if (options.sourceDay && options.sourcePeriod) {
        const sourceEnrolled = targetTimetable[options.sourceDay]?.[options.sourcePeriod] || [];
        const isCleanedSourceId = cleanStudentId(studentId);
        const sourceWithoutStudent = sourceEnrolled.filter(id => cleanStudentId(id) !== isCleanedSourceId);
        if (sourceWithoutStudent.length === 0) {
          currentHours = state.getTeacherHoursCount(options.sourceDay, options.sourcePeriod, targetPedId);
        }
      }

      if (options.isAutoScheduler && currentHours >= maxTeacherHours) {
        return `Elérted a pedagógus heti max óraszámát (${maxTeacherHours} óra)`;
      }
    }

    const cleanedId = cleanStudentId(studentId);
    const student = state.students.find(s => String(s.id) === cleanedId);
    if (!student) return "Diák nem található";

    // Ha a diák már hozzá van rendelve egy másik pedagógushoz (automata ütemezőnél)
    if (student.pedagogueId && targetPed && student.pedagogueId !== targetPed.id) {
      if (options.isAutoScheduler) {
        const assignedPed = state.pedagogues.find(p => p.id === student.pedagogueId);
        return `A diák ${assignedPed ? assignedPed.name : 'másik pedagógus'}hoz van hozzárendelve`;
      }
    }

    // Kereszt-ellenőrzés: másik pedagógusnál ugyanekkor
    const otherPedWithSameSlot = state.pedagogues.find(p => {
      if (targetPed && p.id === targetPed.id) return false;
      if (options.sourcePedagogueId && p.id === options.sourcePedagogueId && options.sourceDay === day && options.sourcePeriod === period) {
        return false;
      }
      const slotEnrolled = p.timetable?.[day]?.[period] || [];
      return slotEnrolled.some(id => cleanStudentId(id) === cleanedId);
    });
    if (otherPedWithSameSlot && options.isAutoScheduler) {
      return `A diák ebben az időpontban már be van osztva nála: ${otherPedWithSameSlot.name}`;
    }

    // Kereszt-ellenőrzés: másik pedagógusnál ugyanezen a napon
    const otherPedWithSameDay = state.pedagogues.find(p => {
      if (targetPed && p.id === targetPed.id) return false;
      const daySchedule = p.timetable?.[day] || {};
      return Object.keys(daySchedule).some(pKey => {
        if (options.sourcePedagogueId && p.id === options.sourcePedagogueId && options.sourceDay === day && String(options.sourcePeriod) === pKey) {
          return false;
        }
        const enrolled = daySchedule[pKey] || [];
        return enrolled.some(id => cleanStudentId(id) === cleanedId);
      });
    });
    if (otherPedWithSameDay && options.isAutoScheduler) {
      return `A diák ezen a napon már be van osztva nála: ${otherPedWithSameDay.name}`;
    }

    // Csoportlétszám-limit ellenőrzése
    if (currentEnrolled.length >= state.settings.maxGroupSize) {
      const isAuto = options.isAutoScheduler || false;
      if (isAuto || !state.settings.allowManualGroupSizeOverride) {
        return `Megtelt a csoport (max ${state.settings.maxGroupSize} fő)`;
      }
    }

    // Napi egyszeri részvétel ellenőrzése
    const daySchedule = targetTimetable[day];
    if (daySchedule) {
      const alreadyAssignedPeriods = Object.keys(daySchedule).filter(p => {
        // Áthelyezésnél a forrás idősávot figyelmen kívül hagyjuk a napi ellenőrzésnél
        if (options.sourceDay === day && p === String(options.sourcePeriod)) {
          return false;
        }
        const enrolled = daySchedule[p] || [];
        return enrolled.some(id => cleanStudentId(id) === cleanedId);
      });
      
      if (alreadyAssignedPeriods.length > 0) {
        if (!(alreadyAssignedPeriods.length === 1 && alreadyAssignedPeriods[0] === String(period))) {
          return "Már be van osztva egy órára ezen a napon";
        }
      }
    }

    // Blokkolt sáv ellenőrzése
    if (targetBlocked[day] && targetBlocked[day][period]) {
      return `Zárolt időpont: ${targetBlocked[day][period]}`;
    }

    // Évfolyam (Grade) ellenőrzése — manuális drag esetén az évfolyam-keveredés
    // nem hibaként, hanem figyelmeztetésként jelenik meg (ld. getAssignmentWarning)
    if (currentEnrolled.length > 0) {
      const studentGrade = student.classId.match(/\d+/)?.[0];
      const firstEnrolledStudent = state.students.find(s => String(s.id) === String(cleanStudentId(currentEnrolled[0])));
      if (firstEnrolledStudent) {
        const firstGrade = firstEnrolledStudent.classId.match(/\d+/)?.[0];
        if (studentGrade !== firstGrade) {
          // Manuálisnál nem tiltjuk, csak figyelmeztetünk (ld. getAssignmentWarning)
        }
      }
    }

    // Ha a diák osztályának nincs órarendje a Krétából
    const classId = student.classId;
    if (!state.classes[classId] || !state.classes[classId][day]) {
      return "Nincs feltöltve KRÉTA órarend ehhez az osztályhoz";
    }

    // Az adott óra tantárgya
    const subject = state.classes[classId][day][period];
    
    // Speciális szabály alsó tagozaton (1-4. osztály) az 5–6. órára (napközi/ebédeltetés)
    const gradeMatch = classId.match(/\d+/);
    const grade = gradeMatch ? parseInt(gradeMatch[0], 10) : 0;
    const isLowerGrade = grade >= 1 && grade <= 4;
    const isUpperGrade = grade >= 5 && grade <= 8;
    
    const isLunchOrNapkozi = subject && (
      subject.toLowerCase().includes('napközi') || 
      subject.toLowerCase().includes('ebéd') ||
      subject.toLowerCase().includes('szabadid')
    );

    if (isLowerGrade && (period === 5 || period === 6) && (!subject || isLunchOrNapkozi)) {
      return null; // Nincs hiba, az 5–6. óra engedélyezett alsósoknak
    }

    // Felső tagozat: lyukas 5–6. óra manuálisan engedélyezett (figyelmeztetéssel)
    if (isUpperGrade && (period === 5 || period === 6) && !subject) {
      return null; // Nem hiba, de figyelmeztetést kap (ld. getAssignmentWarning)
    }

    if (!subject) {
      return "Lyukasóra (nem hozható el)";
    }

    const subjLower = subject.toLowerCase();
    const isPE = subjLower.includes('testnevel');

    // Felső tagozat: kizárólag testnevelés óráról hozható el (bármely óra)
    if (isUpperGrade) {
      if (!isPE) {
        return `Felsős diák csak testnevelésről hozható el (jelenlegi: ${subject})`;
      }
      return null;
    }

    // Alsó tagozat: tagozatos/nem tagozatos megkülönböztetés
    const isTag = /\.[ab]$/i.test(classId);
    const isArt = subjLower.includes('rajz') || subjLower.includes('vizuális');
    const isMusic = subjLower.includes('ének');

    if (isTag) {
      if (!(isArt || isPE)) {
        return `Tagozatos diák nem hozható el ${subject} óráról (csak Rajz vagy Tesi)`;
      }
    } else {
      if (!(isArt || isPE || isMusic)) {
        return `Nem tagozatos diák nem hozható el ${subject} óráról (csak Rajz, Tesi, Ének)`;
      }
    }

    return null; // Nincs hiba
  },

  // Nem blokkoló figyelmeztetés lekérdezése (sárga tooltip, manuális drag)
  getAssignmentWarning: (studentId, day, period, options = {}) => {
    const state = get();
    if (!studentId) return null;

    const cleanedId = cleanStudentId(studentId);
    const student = state.students.find(s => String(s.id) === cleanedId);
    if (!student) return null;

    const targetPedId = options.targetPedagogueId || state.activePedagogueId;
    const targetPed = state.pedagogues.find(p => p.id === targetPedId) || null;
    const targetTimetable = targetPed ? (targetPed.timetable || {}) : state.timetable;
    const currentEnrolled = targetTimetable[day]?.[period] || [];

    // Pedagógus órakeret túllépés figyelmeztetése manuális húzáskor
    const maxTeacherHours = targetPed?.maxTeacherHours || state.settings.maxTeacherHours || 24;
    const isTargetSlotEmpty = currentEnrolled.length === 0;
    if (isTargetSlotEmpty) {
      let currentHours = state.getTeacherHoursCount(null, null, targetPedId);
      if (options.sourceDay && options.sourcePeriod) {
        const sourceEnrolled = targetTimetable[options.sourceDay]?.[options.sourcePeriod] || [];
        const isCleanedSourceId = cleanStudentId(studentId);
        const sourceWithoutStudent = sourceEnrolled.filter(id => cleanStudentId(id) !== isCleanedSourceId);
        if (sourceWithoutStudent.length === 0) {
          currentHours = state.getTeacherHoursCount(options.sourceDay, options.sourcePeriod, targetPedId);
        }
      }
      if (currentHours >= maxTeacherHours) {
        return `Figyelem: A pedagógus ezzel az órával túllépi a heti órakeretét (${maxTeacherHours} óra).`;
      }
    }

    // Másik pedagógusnál lévő meglévő beosztás figyelmeztetése manuális áthelyezéskor
    const otherPedWithSlot = state.pedagogues.find(p => {
      if (targetPed && p.id === targetPed.id) return false;
      if (options.sourcePedagogueId && p.id === options.sourcePedagogueId && options.sourceDay === day && options.sourcePeriod === period) {
        return false;
      }
      const slotEnrolled = p.timetable?.[day]?.[period] || [];
      return slotEnrolled.some(id => cleanStudentId(id) === cleanedId);
    });
    if (otherPedWithSlot) {
      return `Figyelem: A diák már be van osztva ebben az órában nála: ${otherPedWithSlot.name} (áthelyezésre kerül).`;
    }

    // Évfolyam-keveredés figyelmeztetés
    if (currentEnrolled.length > 0) {
      const studentGrade = student.classId.match(/\d+/)?.[0];
      const firstEnrolledStudent = state.students.find(s => String(s.id) === String(cleanStudentId(currentEnrolled[0])));
      if (firstEnrolledStudent) {
        const firstGrade = firstEnrolledStudent.classId.match(/\d+/)?.[0];
        if (studentGrade !== firstGrade) {
          return `Eltérő évfolyam! A csoportban ${firstGrade}. osztályos diák van, te ${studentGrade}. osztályost helyezel ide.`;
        }
      }
    }

    // Lyukasóra figyelmeztetés (felső tagozat, 5–6. óra, manuálisan engedélyezett)
    const classId = student.classId;
    const gradeMatch = classId.match(/\d+/);
    const gradeNum = gradeMatch ? parseInt(gradeMatch[0], 10) : 0;
    if (gradeNum >= 5 && gradeNum <= 8 && (period === 5 || period === 6)) {
      const subject = state.classes[classId]?.[day]?.[period];
      if (!subject) {
        return 'Lyukasóra – a diák nem rendes tanóráról kerül elhozásra.';
      }
    }

    return null;
  },

  // Diák szűkösségének (elhozható órasávjainak száma) lekérdezése
  getStudentConstraints: (studentId, targetPedagogueId = null) => {
    const state = get();
    const cleanedId = cleanStudentId(studentId);
    const student = state.students.find(s => String(s.id) === cleanedId);
    if (!student) return 0;

    const pedId = targetPedagogueId || student.pedagogueId || state.activePedagogueId;
    const targetPed = state.pedagogues.find(p => p.id === pedId);
    const blocked = targetPed ? (targetPed.blockedPeriods || {}) : state.blockedPeriods;

    const classId = student.classId;
    let possibleSlotsCount = 0;
    const DAYS = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek'];
    const PERIODS = [1, 2, 3, 4, 5, 6]; // 7-8. órára nem osztható be tanuló

    DAYS.forEach(day => {
      PERIODS.forEach(period => {
        const hasTimetable = state.classes[classId] && state.classes[classId][day];
        if (hasTimetable) {
          const subject = state.classes[classId][day][period];
          const isBlocked = blocked[day] && blocked[day][period];
          
          if (!isBlocked) {
            // Speciális szabály alsó tagozaton (1-4. osztály) az 5–6. órára (napközi/ebédeltetés)
            const gradeMatch = classId.match(/\d+/);
            const grade = gradeMatch ? parseInt(gradeMatch[0], 10) : 0;
            const isLowerGrade = grade >= 1 && grade <= 4;
            const isUpperGrade = grade >= 5 && grade <= 8;
            
            const isLunchOrNapkozi = subject && (
              subject.toLowerCase().includes('napközi') || 
              subject.toLowerCase().includes('ebéd') ||
              subject.toLowerCase().includes('szabadid')
            );

            // Alsó tagozat: 5–6. óra napközi/ebéd/üres → elhozható
            if (isLowerGrade && (period === 5 || period === 6) && (!subject || isLunchOrNapkozi)) {
              possibleSlotsCount++;
            } else if (subject) {
              const subjLower = subject.toLowerCase();
              const isTag = /\.[ab]$/i.test(classId);
              const isArt = subjLower.includes('rajz') || subjLower.includes('vizuális');
              const isPE = subjLower.includes('testnevel');
              const isMusic = subjLower.includes('ének');
              
              // Felső tagozat: kizárólag testnevelésről (bármely óra)
              if (isUpperGrade) {
                if (isPE) possibleSlotsCount++;
              } else {
                // Alsó tagozat: tagozatos/nem tagozatos megkülönböztetés
                const isEligible = isTag ? (isArt || isPE) : (isArt || isPE || isMusic);
                if (isEligible) {
                  possibleSlotsCount++;
                }
              }
            }
          }
        }
      });
    });
    return possibleSlotsCount;
  },

  // Tanuló áthelyezése egyik idősávból a másikba (atomi művelet)
  moveStudent: (studentId, sourceDay, sourcePeriod, targetDay, targetPeriod) => set((state) => {
    const currentTimetable = { ...state.timetable };
    const cleanedId = cleanStudentId(studentId);

    // 1. Eltávolítás a forrásból
    if (currentTimetable[sourceDay] && currentTimetable[sourceDay][sourcePeriod]) {
      currentTimetable[sourceDay][sourcePeriod] = 
        currentTimetable[sourceDay][sourcePeriod].filter(id => cleanStudentId(id) !== cleanedId);
    }

    // 2. Hozzáadás a célhoz
    if (!currentTimetable[targetDay]) currentTimetable[targetDay] = {};
    if (!currentTimetable[targetDay][targetPeriod]) currentTimetable[targetDay][targetPeriod] = [];
    
    if (!currentTimetable[targetDay][targetPeriod].includes(cleanedId)) {
      currentTimetable[targetDay][targetPeriod] = [...currentTimetable[targetDay][targetPeriod], cleanedId];
    }

    const updatedPedagogues = state.pedagogues.map(p => {
      if (p.id === state.activePedagogueId) {
        return { ...p, timetable: currentTimetable };
      }
      return p;
    });

    return { timetable: currentTimetable, pedagogues: updatedPedagogues };
  }),

  // Tanuló áthelyezése naptárak között vagy naptáron belül (teljesen atomi művelet)
  moveStudentAcrossPedagogues: (studentId, sourceDay, sourcePeriod, sourcePedId, targetDay, targetPeriod, targetPedId) => set((state) => {
    const cleanedId = cleanStudentId(studentId);
    const fromPedId = sourcePedId || state.activePedagogueId;
    const toPedId = targetPedId || state.activePedagogueId;

    const updatedPedagogues = state.pedagogues.map(p => {
      // 1. Eset: Ugyanazon a pedagóguson belüli mozgatás
      if (fromPedId === toPedId && p.id === fromPedId) {
        const pedTimetable = { ...p.timetable };
        if (pedTimetable[sourceDay] && pedTimetable[sourceDay][sourcePeriod]) {
          const rem = pedTimetable[sourceDay][sourcePeriod].filter(id => cleanStudentId(id) !== cleanedId);
          pedTimetable[sourceDay] = { ...pedTimetable[sourceDay] };
          if (rem.length === 0) {
            delete pedTimetable[sourceDay][sourcePeriod];
            if (Object.keys(pedTimetable[sourceDay]).length === 0) {
              delete pedTimetable[sourceDay];
            }
          } else {
            pedTimetable[sourceDay][sourcePeriod] = rem;
          }
        }
        if (!pedTimetable[targetDay]) pedTimetable[targetDay] = {};
        if (!pedTimetable[targetDay][targetPeriod]) pedTimetable[targetDay][targetPeriod] = [];
        if (!pedTimetable[targetDay][targetPeriod].includes(cleanedId)) {
          pedTimetable[targetDay][targetPeriod] = [...pedTimetable[targetDay][targetPeriod], cleanedId];
        }
        return { ...p, timetable: pedTimetable };
      }

      // 2. Eset: Forrás pedagógusból való törlés
      if (p.id === fromPedId) {
        const pedTimetable = { ...p.timetable };
        if (pedTimetable[sourceDay] && pedTimetable[sourceDay][sourcePeriod]) {
          const rem = pedTimetable[sourceDay][sourcePeriod].filter(id => cleanStudentId(id) !== cleanedId);
          pedTimetable[sourceDay] = { ...pedTimetable[sourceDay] };
          if (rem.length === 0) {
            delete pedTimetable[sourceDay][sourcePeriod];
            if (Object.keys(pedTimetable[sourceDay]).length === 0) {
              delete pedTimetable[sourceDay];
            }
          } else {
            pedTimetable[sourceDay][sourcePeriod] = rem;
          }
        }
        return { ...p, timetable: pedTimetable };
      }

      // 3. Eset: Cél pedagógushoz való hozzáadás
      if (p.id === toPedId) {
        const pedTimetable = { ...p.timetable };
        if (!pedTimetable[targetDay]) pedTimetable[targetDay] = {};
        if (!pedTimetable[targetDay][targetPeriod]) pedTimetable[targetDay][targetPeriod] = [];
        if (!pedTimetable[targetDay][targetPeriod].includes(cleanedId)) {
          pedTimetable[targetDay][targetPeriod] = [...pedTimetable[targetDay][targetPeriod], cleanedId];
        }
        return { ...p, timetable: pedTimetable };
      }

      return p;
    });

    // Frissítjük a diák pedagógus hozzárendelését a cél pedagógusra
    const updatedStudents = state.students.map(s => {
      if (String(s.id) === cleanedId) {
        return { ...s, pedagogueId: toPedId };
      }
      return s;
    });

    const activePed = updatedPedagogues.find(p => p.id === state.activePedagogueId);

    return {
      pedagogues: updatedPedagogues,
      students: updatedStudents,
      timetable: activePed ? (activePed.timetable || {}) : state.timetable,
    };
  }),

  // Teljes naptár kiürítése az aktív pedagógusnál (a zárolások megmaradnak)
  clearTimetable: () => set((state) => {
    const updatedPedagogues = state.pedagogues.map(p => {
      if (p.id === state.activePedagogueId) {
        return { ...p, timetable: {} };
      }
      return p;
    });
    return { timetable: {}, pedagogues: updatedPedagogues };
  }),

  // Az összes pedagógus naptárának kiürítése és a diákok közös poolba visszaállítása (tiszta újratervezéshez)
  clearAllTimetables: () => set((state) => {
    const updatedPedagogues = state.pedagogues.map(p => ({
      ...p,
      timetable: {}
    }));
    const updatedStudents = state.students.map(s => ({
      ...s,
      pedagogueId: null
    }));
    return {
      pedagogues: updatedPedagogues,
      students: updatedStudents,
      timetable: {}
    };
  }),

  // Egy diák összes órájának törlése az összes naptárból
  clearStudentAssignments: (studentId) => set((state) => {
    const cleanedId = cleanStudentId(studentId);
    
    const updatedPedagogues = state.pedagogues.map(p => {
      const pTimetable = { ...p.timetable };
      let changed = false;
      Object.keys(pTimetable).forEach(day => {
        pTimetable[day] = { ...pTimetable[day] };
        Object.keys(pTimetable[day]).forEach(period => {
          const enrolled = pTimetable[day][period] || [];
          if (enrolled.some(id => cleanStudentId(id) === cleanedId)) {
            pTimetable[day][period] = enrolled.filter(id => cleanStudentId(id) !== cleanedId);
            changed = true;
          }
        });
      });
      return changed ? { ...p, timetable: pTimetable } : p;
    });

    const activePed = updatedPedagogues.find(p => p.id === state.activePedagogueId);

    return { 
      pedagogues: updatedPedagogues, 
      timetable: activePed ? activePed.timetable : {} 
    };
  }),
}));

if (typeof window !== 'undefined') {
  window.__store = useStore;
}

export default useStore;
