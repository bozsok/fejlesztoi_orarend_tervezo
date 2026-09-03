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

// Példa kezdőadatok a fejlesztéshez
const INITIAL_STUDENTS = [];

const useStore = create((set, get) => ({
  // Állapotok
  settings: {
    maxGroupSize: 5,
    allowManualGroupSizeOverride: false,
    maxTeacherHours: 24,
    teacherCode: '2',
    groupNamingOrder: 'vertical',
  },
  students: INITIAL_STUDENTS,
  classes: {}, // {'3.a': { 'Hétfő': { 1: 'Matek', 2: 'Rajz' } } }
  timetable: {}, // { 'Hétfő': { 1: ['s1', 's2'] } } // idősávokhoz rendelt diák ID-k listája
  blockedPeriods: {}, // { 'Hétfő': { 1: 'Napközi' } } // Zárolt idősávok indoklással
  customGroupLabels: {}, // { 'Hétfő-1': '2/1' } // Egyedi csoport felülbírálások
  activeStudentId: null, // Az éppen húzott diák azonosítója
  timetableTitle: 'Fejlesztőpedagógus neve, beosztása...', // A naptár szerkeszthető címe

  // Műveletek
  updateSettings: (newSettings) => set((state) => ({
    settings: { ...state.settings, ...newSettings }
  })),

  setCustomGroupLabel: (day, period, label) => set((state) => {
    const key = `${day}-${period}`;
    const updated = { ...state.customGroupLabels };
    if (label && label.trim() !== '') {
      updated[key] = label.trim();
    } else {
      delete updated[key];
    }
    return { customGroupLabels: updated };
  }),

  getGroupLabels: () => {
    const state = get();
    const DAYS = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek'];
    const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];
    const labels = {};
    const teacherCode = state.settings.teacherCode || '2';
    const order = state.settings.groupNamingOrder || 'vertical';

    let counter = 1;

    if (order === 'vertical') {
      DAYS.forEach(day => {
        PERIODS.forEach(period => {
          const enrolled = state.timetable[day]?.[period] || [];
          if (enrolled.length > 0) {
            const key = `${day}-${period}`;
            if (state.customGroupLabels[key]) {
              labels[key] = state.customGroupLabels[key];
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
          const enrolled = state.timetable[day]?.[period] || [];
          if (enrolled.length > 0) {
            const key = `${day}-${period}`;
            if (state.customGroupLabels[key]) {
              labels[key] = state.customGroupLabels[key];
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

  cleanAndValidateGroupLabel: (day, period, inputLabel) => {
    const state = get();
    if (!inputLabel) return { cleanedLabel: '', error: null };

    let cleaned = inputLabel.trim();
    const regexMatch = cleaned.match(/^(\d+)[\s/\\.,-]+(\d+)$/);
    if (regexMatch) {
      cleaned = `${regexMatch[1]}/${regexMatch[2]}`;
    }

    const allLabels = state.getGroupLabels();
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

  getTeacherHoursCount: (excludeDay = null, excludePeriod = null) => {
    const state = get();
    let count = 0;
    Object.keys(state.timetable).forEach(day => {
      Object.keys(state.timetable[day]).forEach(period => {
        if (day === excludeDay && String(period) === String(excludePeriod)) {
          return;
        }
        const enrolled = state.timetable[day][period] || [];
        if (enrolled.length > 0) {
          count++;
        }
      });
    });
    return count;
  },

  setActiveStudentId: (id) => set(() => ({ activeStudentId: id })),
  setTimetableTitle: (title) => set(() => ({ timetableTitle: title })),

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

    // Pedagógus maximális óraszámának ellenőrzése
    const currentEnrolled = state.timetable[day]?.[period] || [];
    const isTargetSlotEmpty = currentEnrolled.length === 0;
    if (isTargetSlotEmpty) {
      let currentHours = state.getTeacherHoursCount();
      
      if (options.sourceDay && options.sourcePeriod) {
        const sourceEnrolled = state.timetable[options.sourceDay]?.[options.sourcePeriod] || [];
        const isCleanedSourceId = cleanStudentId(studentId);
        const sourceWithoutStudent = sourceEnrolled.filter(id => String(id) !== isCleanedSourceId);
        if (sourceWithoutStudent.length === 0) {
          currentHours = state.getTeacherHoursCount(options.sourceDay, options.sourcePeriod);
        }
      }

      if (currentHours >= (state.settings.maxTeacherHours || 24)) {
        return false;
      }
    }

    const cleanedId = cleanStudentId(studentId);
    const student = state.students.find(s => String(s.id) === cleanedId);
    if (!student) return false;

    // Csoportlétszám-limit ellenőrzése
    if (currentEnrolled.length >= state.settings.maxGroupSize) {
      if (isAutoScheduler || !state.settings.allowManualGroupSizeOverride) {
        return false; // A csoport megtelt és nem bírálható felül
      }
    }

    // Napi egyszeri részvétel ellenőrzése
    const daySchedule = state.timetable[day];
    if (daySchedule) {
      const alreadyAssignedPeriods = Object.keys(daySchedule).filter(p => {
        // Áthelyezésnél a forrás idősávot figyelmen kívül hagyjuk a napi ellenőrzésnél
        if (options.sourceDay === day && p === String(options.sourcePeriod)) {
          return false;
        }
        const enrolled = daySchedule[p] || [];
        return enrolled.some(id => String(id) === cleanedId);
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

    // Blokkolt sáv ellenőrzése
    if (state.blockedPeriods[day] && state.blockedPeriods[day][period]) {
      return false; // Zárolt sávba nem lehet beosztani
    }

    // Évfolyam (Grade) ellenőrzése
    // Csak azonos számú osztályok kerülhetnek egy csoportba (pl. 4.a és 4.c)
    if (currentEnrolled.length > 0) {
      const studentGrade = student.classId.match(/\d+/)?.[0];
      // Megkeressük az első már bent lévő diák évfolyamát
      const firstEnrolledStudent = state.students.find(s => String(s.id) === String(currentEnrolled[0]));
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

    const cleanId = String(studentId).replace('student-', '');

    // Ha a diák már be van osztva máshova, azt kezelni kell (később)
    // Most csak hozzáadjuk ehhez a sávhoz
    if (!currentTimetable[day][period].includes(cleanId)) {
      currentTimetable[day][period] = [...currentTimetable[day][period], cleanId];
    }

    return { timetable: currentTimetable };
  }),

  // Diák eltávolítása egy sávból
  removeStudent: (studentId, day, period) => set((state) => {
    const currentTimetable = { ...state.timetable };
    if (currentTimetable[day] && currentTimetable[day][period]) {
      currentTimetable[day][period] = currentTimetable[day][period].filter(id => id !== studentId);
    }
    return { timetable: currentTimetable };
  }),

  // JSON adat betöltése
  importData: (data) => set(() => data),

  // Excel tanuló lista betöltése hozzáfűző (merge) logikával
  importExcelStudents: (newStudents) => set((state) => {
    const mergedStudents = [...state.students];
    
    newStudents.forEach(newS => {
      const existingIdx = mergedStudents.findIndex(s => 
        s.name.toLowerCase() === newS.name.toLowerCase() && 
        s.classId.toLowerCase() === newS.classId.toLowerCase()
      );
      
      if (existingIdx !== -1) {
        // Ha létezik, csak a heti igényt frissítjük
        mergedStudents[existingIdx] = { 
          ...mergedStudents[existingIdx], 
          needs: newS.needs 
        };
      } else {
        // Ha új, hozzáadjuk
        mergedStudents.push(newS);
      }
    });
    
    return { students: mergedStudents };
  }),

  // KRÉTA adat betöltése
  importKretaData: (classesData) => set(() => ({
    classes: classesData,
    timetable: {} // Töröljük a korábbi beosztást, mert megváltozott az órarend
  })),

  // Idősáv zárolása vagy feloldása
  toggleBlockedPeriod: (day, period, reason = '') => set((state) => {
    const currentBlocked = { ...state.blockedPeriods };
    if (!currentBlocked[day]) currentBlocked[day] = {};

    if (currentBlocked[day][period]) {
      // Feloldás
      delete currentBlocked[day][period];
      return { blockedPeriods: currentBlocked };
    } else {
      // Zárolás – az idősávból a beosztott tanulókat is eltávolítjuk
      currentBlocked[day][period] = reason || 'Zárolva';
      const updatedTimetable = { ...state.timetable };
      if (updatedTimetable[day]) {
        updatedTimetable[day] = { ...updatedTimetable[day] };
        delete updatedTimetable[day][period];
      }
      return { blockedPeriods: currentBlocked, timetable: updatedTimetable };
    }
  }),

  // Validációs hiba lekérdezése magyar indoklással
  getAssignmentValidationError: (studentId, day, period, options = {}) => {
    const state = get();
    if (!studentId) return "Nincs diák kiválasztva";

    // Pedagógus maximális óraszámának ellenőrzése
    const currentEnrolled = state.timetable[day]?.[period] || [];
    const isTargetSlotEmpty = currentEnrolled.length === 0;
    if (isTargetSlotEmpty) {
      let currentHours = state.getTeacherHoursCount();
      
      if (options.sourceDay && options.sourcePeriod) {
        const sourceEnrolled = state.timetable[options.sourceDay]?.[options.sourcePeriod] || [];
        const isCleanedSourceId = cleanStudentId(studentId);
        const sourceWithoutStudent = sourceEnrolled.filter(id => String(id) !== isCleanedSourceId);
        if (sourceWithoutStudent.length === 0) {
          currentHours = state.getTeacherHoursCount(options.sourceDay, options.sourcePeriod);
        }
      }

      if (currentHours >= (state.settings.maxTeacherHours || 24)) {
        return `Elérted a pedagógus heti max óraszámát (${state.settings.maxTeacherHours || 24} óra)`;
      }
    }

    const cleanedId = cleanStudentId(studentId);
    const student = state.students.find(s => String(s.id) === cleanedId);
    if (!student) return "Diák nem található";

    // Csoportlétszám-limit ellenőrzése
    if (currentEnrolled.length >= state.settings.maxGroupSize) {
      const isAuto = options.isAutoScheduler || false;
      if (isAuto || !state.settings.allowManualGroupSizeOverride) {
        return `Megtelt a csoport (max ${state.settings.maxGroupSize} fő)`;
      }
    }

    // Napi egyszeri részvétel ellenőrzése
    const daySchedule = state.timetable[day];
    if (daySchedule) {
      const alreadyAssignedPeriods = Object.keys(daySchedule).filter(p => {
        // Áthelyezésnél a forrás idősávot figyelmen kívül hagyjuk a napi ellenőrzésnél
        if (options.sourceDay === day && p === String(options.sourcePeriod)) {
          return false;
        }
        const enrolled = daySchedule[p] || [];
        return enrolled.some(id => String(id) === cleanedId);
      });
      
      if (alreadyAssignedPeriods.length > 0) {
        if (!(alreadyAssignedPeriods.length === 1 && alreadyAssignedPeriods[0] === String(period))) {
          return "Már be van osztva egy órára ezen a napon";
        }
      }
    }

    // Blokkolt sáv ellenőrzése
    if (state.blockedPeriods[day] && state.blockedPeriods[day][period]) {
      return `Zárolt időpont: ${state.blockedPeriods[day][period]}`;
    }

    // Évfolyam (Grade) ellenőrzése — manuális drag esetén az évfolyam-keveredés
    // nem hibaként, hanem figyelmeztetésként jelenik meg (ld. getAssignmentWarning)
    if (currentEnrolled.length > 0) {
      const studentGrade = student.classId.match(/\d+/)?.[0];
      const firstEnrolledStudent = state.students.find(s => String(s.id) === String(currentEnrolled[0]));
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

    const currentEnrolled = state.timetable[day]?.[period] || [];

    // Évfolyam-keveredés figyelmeztetés
    if (currentEnrolled.length > 0) {
      const studentGrade = student.classId.match(/\d+/)?.[0];
      const firstEnrolledStudent = state.students.find(s => String(s.id) === String(currentEnrolled[0]));
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
  getStudentConstraints: (studentId) => {
    const state = get();
    const cleanedId = cleanStudentId(studentId);
    const student = state.students.find(s => String(s.id) === cleanedId);
    if (!student) return 0;

    const classId = student.classId;
    let possibleSlotsCount = 0;
    const DAYS = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek'];
    const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

    DAYS.forEach(day => {
      PERIODS.forEach(period => {
        const hasTimetable = state.classes[classId] && state.classes[classId][day];
        if (hasTimetable) {
          const subject = state.classes[classId][day][period];
          const isBlocked = state.blockedPeriods[day] && state.blockedPeriods[day][period];
          
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
        currentTimetable[sourceDay][sourcePeriod].filter(id => String(id) !== cleanedId);
    }

    // 2. Hozzáadás a célhoz
    if (!currentTimetable[targetDay]) currentTimetable[targetDay] = {};
    if (!currentTimetable[targetDay][targetPeriod]) currentTimetable[targetDay][targetPeriod] = [];
    
    if (!currentTimetable[targetDay][targetPeriod].includes(cleanedId)) {
      currentTimetable[targetDay][targetPeriod] = [...currentTimetable[targetDay][targetPeriod], cleanedId];
    }

    return { timetable: currentTimetable };
  }),

  // Teljes naptár kiürítése (a zárolások megmaradnak)
  clearTimetable: () => set(() => ({ timetable: {} })),

  // Egy diák összes órájának törlése a naptárból
  clearStudentAssignments: (studentId) => set((state) => {
    const currentTimetable = { ...state.timetable };
    const cleanedId = cleanStudentId(studentId);
    
    Object.keys(currentTimetable).forEach(day => {
      Object.keys(currentTimetable[day]).forEach(period => {
        const enrolled = currentTimetable[day][period] || [];
        if (enrolled.includes(cleanedId)) {
          currentTimetable[day][period] = enrolled.filter(id => id !== cleanedId);
        }
      });
    });
    
    return { timetable: currentTimetable };
  }),
}));

export default useStore;
