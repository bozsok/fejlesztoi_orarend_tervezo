import useStore from '../store/useStore';

const DAYS = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

export const runAutoScheduler = () => {
  const state = useStore.getState();
  const { students } = state;

  // 1. Kiszámoljuk minden diákra a szűkösséget a store központi getStudentConstraints függvényével
  const studentConstraints = {};
  students.forEach(student => {
    studentConstraints[student.id] = state.getStudentConstraints(student.id);
  });

  // 2. Összesítjük a hátralévő igényeket
  let pendingTasks = [];
  students.forEach(student => {
    let currentlyAssigned = 0;
    Object.values(state.timetable).forEach(dayObj => {
      Object.values(dayObj).forEach(periodArr => {
        if (periodArr.includes(student.id)) {
          currentlyAssigned++;
        }
      });
    });

    const remaining = Math.max(0, student.needs - currentlyAssigned);
    for (let i = 0; i < remaining; i++) {
      pendingTasks.push(student.id);
    }
  });

  // Rendezzük a feladatokat: a legszűkösebb diákok (akiknek a legkevesebb lehetséges sávjuk van) kerülnek előre
  pendingTasks.sort((a, b) => {
    const constraintA = studentConstraints[a] || 0;
    const constraintB = studentConstraints[b] || 0;
    
    if (constraintA !== constraintB) {
      return constraintA - constraintB; // növekvő sorrend (szűkösebb előre)
    }
    
    // Ha a szűkösség egyenlő, a tagozatosokat vesszük előre
    const sA = students.find(s => s.id === a);
    const sB = students.find(s => s.id === b);
    const aIsTag = /\.[ab]$/i.test(sA.classId);
    const bIsTag = /\.[ab]$/i.test(sB.classId);
    if (aIsTag && !bIsTag) return -1;
    if (!aIsTag && bIsTag) return 1;
    return 0;
  });

  let successCount = 0;
  let failedCount = 0;

  // 3. Beosztási kísérlet
  for (const studentId of pendingTasks) {
    let assigned = false;
    const student = students.find(s => s.id === studentId);
    if (!student) {
      failedCount++;
      continue;
    }
    
    // Létrehozzuk az összes lehetséges idősáv listáját a héten
    const allSlots = [];
    DAYS.forEach(day => {
      PERIODS.forEach(period => {
        allSlots.push({ day, period });
      });
    });

    // Osztályozzuk a sávokat a csoport-tömörítés (Group-filling) heurisztika alapján:
    // Előnyben részesítjük azt a sávot, ahol már van beosztva azonos évfolyamú diák.
    // Az alsó tagozatos napközis/üres 5–6. órai sávok másodlagos prioritást kapnak.
    const currentStoreState = useStore.getState();
    const studentGrade = student.classId.match(/\d+/)?.[0];
    const studentGradeNum = studentGrade ? parseInt(studentGrade, 10) : 0;
    const isStudentLowerGrade = studentGradeNum >= 1 && studentGradeNum <= 4;
    
    const ratedSlots = allSlots.map(slot => {
      const enrolled = currentStoreState.timetable[slot.day]?.[slot.period] || [];
      let score = 0; // 0 = teljesen üres sáv (új csoport)
      
      // Meghatározzuk, hogy ez a sáv "fallback" típusú-e (alsós 5–6. óra napközi/üres)
      const slotSubject = currentStoreState.classes[student.classId]?.[slot.day]?.[slot.period];
      const isSlotLunchOrNapkozi = slotSubject && (
        slotSubject.toLowerCase().includes('napközi') || 
        slotSubject.toLowerCase().includes('ebéd') ||
        slotSubject.toLowerCase().includes('szabadid')
      );
      const isFallbackSlot = isStudentLowerGrade && 
        (slot.period === 5 || slot.period === 6) && 
        (!slotSubject || isSlotLunchOrNapkozi);
      
      if (enrolled.length > 0) {
        // Megnézzük a már bent lévők évfolyamát
        const firstEnrolled = students.find(s => s.id === enrolled[0]);
        if (firstEnrolled) {
          const firstGrade = firstEnrolled.classId.match(/\d+/)?.[0];
          if (studentGrade === firstGrade) {
            // Ugyanaz az évfolyam és van már itt csoport
            // Fallback sáv alacsonyabb prioritással, de még mindig preferált az üres sávokhoz képest
            score = isFallbackSlot ? 5 : 10;
          } else {
            // Eltérő évfolyam -> Ebbe a sávba nem helyezhető a diák az évfolyam-korlát miatt
            score = -100;
          }
        }
      } else {
        // Üres sáv: fallback sávok alacsonyabb prioritással
        score = isFallbackSlot ? -5 : 0;
      }
      return { ...slot, score };
    });

    // Rendezzük a sávokat prioritás szerint csökkenő sorrendbe (a magasabb score előrébb kerül)
    ratedSlots.sort((a, b) => b.score - a.score);

    // Próbáljuk beosztani a rendezett prioritási sávok szerint
    for (const slot of ratedSlots) {
      if (slot.score < -50) continue; // ha eleve tiltott az évfolyam-keveredés miatt, meg se próbáljuk
      
      const currentState = useStore.getState(); // Friss állapot lekérése a cikluson belül
      
      // Szabályok ellenőrzése (canAssignStudent kezeli a napi limitet, csoportméretet, évfolyamot, krétát, zárolásokat)
      if (currentState.canAssignStudent(studentId, slot.day, slot.period, true)) {
        currentState.assignStudent(studentId, slot.day, slot.period);
        assigned = true;
        successCount++;
        break; // Sikeres beosztás az első legoptimálisabb sávba, jöhet a következő igény
      }
    }

    if (!assigned) {
      failedCount++;
    }
  }

  return { successCount, failedCount };
};
