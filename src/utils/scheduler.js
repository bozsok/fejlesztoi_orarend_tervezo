import useStore, { cleanStudentId } from '../store/useStore.js';

const DAYS = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek'];
const PERIODS = [1, 2, 3, 4, 5, 6]; // 7–8. órára nem osztható be tanuló

/**
 * Best Practice Automata Ütemező Motor (Constraint Satisfaction Problem - CSP)
 * 
 * Alappillérek:
 * 1. Évfolyam-arányos kvótavezérlés (Proportional Quota Allocation): A 61 tanári óra
 *    az évfolyamok létszámarányában oszlik el, megakadályozva, hogy a felsősök elszívják
 *    a tanári kapacitást az alsósok elől.
 * 2. Pair-First Gatekeeper: Üres idősávba KIZÁRÓLAG akkor nyitható új óra, ha azonnal
 *    legalább 2 azonos évfolyamú tanuló ül be. Így 1 fős csoport SOHA nem jön létre!
 * 3. Dinamikus kapacitás-kiegyensúlyozás: Az új órák a legnagyobb relatív órahiánnyal
 *    rendelkező pedagógusokhoz kerülnek, így mindegyikük heti kötelező kerete betöltődik.
 * 4. Kétütemű feltöltés: Először a 61 óra megnyitása arányos 2-4 fős csoportokkal, majd a
 *    maradék diákok beültetése a meglévő csoportokba maximum létszámig (5 főig).
 * 5. Iteratív Javítás és Visszalépés (Backtracking / Local Search): Konfliktusok és
 *    elakadt tanulók feloldása diák-áthelyezéssel és idősáv-cserékkel.
 * 
 * @param {Object} options
 * @param {string|null} options.pedagogueId - Egyéni tervezés esetén az adott pedagógus azonosítója.
 * @param {boolean} options.all - Ha true, az összes pedagógus órarendjét együttesen tervezi meg.
 * @param {boolean} options.resetTimetables - Ha true, tiszta újratervezést hajt végre a naptárak kiürítésével.
 */
export const runAutoScheduler = (options = {}) => {
  const state = useStore.getState();
  const { students, pedagogues, activePedagogueId } = state;

  if (!students || students.length === 0) {
    return { successCount: 0, failedCount: 0, error: 'no_students' };
  }
  if (!state.classes || Object.keys(state.classes).length === 0) {
    return { successCount: 0, failedCount: 0, error: 'no_classes' };
  }

  let targetPedagogues = [];
  const isGlobal = !!options.all;

  if (options.pedagogueId) {
    const found = pedagogues.find(p => p.id === options.pedagogueId);
    if (found) targetPedagogues = [found];
  } else if (isGlobal) {
    targetPedagogues = [...pedagogues];
  } else if (activePedagogueId) {
    const found = pedagogues.find(p => p.id === activePedagogueId);
    if (found) targetPedagogues = [found];
  } else if (pedagogues.length > 0) {
    targetPedagogues = [pedagogues[0]];
  }

  if (targetPedagogues.length === 0) {
    return { successCount: 0, failedCount: 0, error: 'no_pedagogues' };
  }

  // Tiszta újratervezés kérése esetén kiürítjük az érintett naptárakat
  if (options.resetTimetables) {
    if (isGlobal) {
      useStore.getState().clearAllTimetables();
    } else {
      useStore.getState().clearTimetable();
    }
  }

  const originalActiveId = activePedagogueId;

  // Segédfüggvények a pontos állapotlekérdezéshez
  const getAssignedCount = (studentId) => {
    const currentState = useStore.getState();
    let count = 0;
    const cleaned = cleanStudentId(studentId);
    currentState.pedagogues.forEach(p => {
      Object.values(p.timetable || {}).forEach(d => {
        Object.values(d).forEach(arr => {
          if ((arr || []).some(id => cleanStudentId(id) === cleaned)) count++;
        });
      });
    });
    return count;
  };

  const getAssignedDays = (studentId) => {
    const currentState = useStore.getState();
    const days = new Set();
    const cleaned = cleanStudentId(studentId);
    currentState.pedagogues.forEach(p => {
      DAYS.forEach(d => {
        const dSchedule = p.timetable?.[d] || {};
        Object.values(dSchedule).forEach(arr => {
          if ((arr || []).some(id => cleanStudentId(id) === cleaned)) days.add(d);
        });
      });
    });
    return days;
  };

  const getTeacherHours = (pedId) => {
    return useStore.getState().getTeacherHoursCount(null, null, pedId);
  };

  const anyTeacherNeedsHours = () => {
    const currentState = useStore.getState();
    return targetPedagogues.some(p => {
      const h = currentState.getTeacherHoursCount(null, null, p.id);
      return h < (p.maxTeacherHours || 24);
    });
  };

  // Segédfüggvény: Csatlakozás meglévő nyitott csoporthoz
  const tryJoinExistingGroup = (student, maxLimit = 3) => {
    const currentState = useStore.getState();
    const needs = student.needs || 2;
    if (getAssignedCount(student.id) >= needs) return false;

    const studentGrade = student.classId.match(/\d+/)?.[0] || '0';
    const studentDays = getAssignedDays(student.id);

    for (const ped of targetPedagogues) {
      const pedData = currentState.pedagogues.find(p => p.id === ped.id);
      if (!pedData) continue;

      for (const d of DAYS) {
        if (studentDays.has(d)) continue; // Napi legfeljebb 1 alkalom

        for (const p of PERIODS) {
          const grp = pedData.timetable?.[d]?.[p] || [];
          if (grp.length >= 1 && grp.length < maxLimit) {
            const firstSt = currentState.students.find(s => String(s.id) === cleanStudentId(grp[0]));
            if (firstSt && (firstSt.classId.match(/\d+/)?.[0] || '0') === studentGrade) {
              if (currentState.canAssignStudent(student.id, d, p, true, { targetPedagogueId: ped.id })) {
                currentState.assignStudentToPedagogue(student.id, ped.id);
                currentState.setActivePedagogueId(ped.id);
                currentState.assignStudent(student.id, d, p);
                return true;
              }
            }
          }
        }
      }
    }
    return false;
  };

  // Segédfüggvény: hány óra nyílt már egy adott évfolyamnak összesen a célpedagógusoknál?
  const getGradeOpenedHours = (g) => {
    const currentState = useStore.getState();
    let count = 0;
    targetPedagogues.forEach(ped => {
      const pData = currentState.pedagogues.find(p => p.id === ped.id);
      DAYS.forEach(d => {
        PERIODS.forEach(p => {
          const grp = pData?.timetable?.[d]?.[p] || [];
          if (grp.length > 0) {
            const firstSt = currentState.students.find(s => String(s.id) === cleanStudentId(grp[0]));
            if (firstSt && (firstSt.classId.match(/\d+/)?.[0] || '0') === g) {
              count++;
            }
          }
        });
      });
    });
    return count;
  };

  // 1. FÁZIS: A már tanárhoz rendelt tanulók beosztása
  for (const ped of targetPedagogues) {
    const currentState = useStore.getState();
    const assignedToPed = currentState.students.filter(s => s.pedagogueId === ped.id);
    if (assignedToPed.length === 0) continue;

    for (const student of assignedToPed) {
      tryJoinExistingGroup(student, 4);
    }
  }

  // 2. FÁZIS: Közös poolban lévő diákok (pedagogueId === null) Kvótavezérelt Csoportképzése
  const poolStudents = useStore.getState().students.filter(s => !s.pedagogueId);

  if (poolStudents.length > 0) {
    // 2.1 Évfolyamonkénti igények felmérése és naptári kvóták arányos kiszámítása
    const gradeNeeds = {};
    poolStudents.forEach(s => {
      const g = s.classId.match(/\d+/)?.[0] || '0';
      gradeNeeds[g] = (gradeNeeds[g] || 0) + (s.needs || 2);
    });

    let totalCapacityHours = 0;
    targetPedagogues.forEach(p => {
      totalCapacityHours += (p.maxTeacherHours || 24);
    });

    const totalNeeds = Object.values(gradeNeeds).reduce((a, b) => a + b, 0);
    const gradeTargetHours = {};
    let allocatedHours = 0;

    Object.keys(gradeNeeds).forEach(g => {
      const target = Math.round((gradeNeeds[g] / (totalNeeds || 1)) * totalCapacityHours);
      gradeTargetHours[g] = target;
      allocatedHours += target;
    });

    while (allocatedHours < totalCapacityHours) {
      const maxG = Object.keys(gradeNeeds).sort((a, b) => (gradeNeeds[b] / (gradeTargetHours[b] || 1)) - (gradeNeeds[a] / (gradeTargetHours[a] || 1)))[0];
      gradeTargetHours[maxG]++;
      allocatedHours++;
    }
    while (allocatedHours > totalCapacityHours) {
      const minG = Object.keys(gradeNeeds).sort((a, b) => (gradeNeeds[a] / (gradeTargetHours[a] || 1)) - (gradeNeeds[b] / (gradeTargetHours[b] || 1)))[0];
      gradeTargetHours[minG]--;
      allocatedHours--;
    }

    // Segédfüggvény: Új óra nyitása PÁRBAN a kvóta tiszteletben tartásával
    const tryOpenPairSlot = (st1, st2, enforceQuota = true) => {
      const currentState = useStore.getState();
      const needs1 = st1.needs || 2;
      const needs2 = st2.needs || 2;
      if (getAssignedCount(st1.id) >= needs1 || getAssignedCount(st2.id) >= needs2) return false;

      const g = st1.classId.match(/\d+/)?.[0] || '0';
      if (enforceQuota && getGradeOpenedHours(g) >= (gradeTargetHours[g] || 999)) {
        return false;
      }

      const days1 = getAssignedDays(st1.id);
      const days2 = getAssignedDays(st2.id);

      // Dinamikus rendezés: a legnagyobb hiánnyal rendelkező pedagógus kapja az új órát
      const sortedPeds = [...targetPedagogues].sort((a, b) => {
        const maxA = a.maxTeacherHours || 24;
        const maxB = b.maxTeacherHours || 24;
        const defA = (maxA - getTeacherHours(a.id)) / maxA;
        const defB = (maxB - getTeacherHours(b.id)) / maxB;
        return defB - defA;
      });

      for (const ped of sortedPeds) {
        const maxH = ped.maxTeacherHours || 24;
        if (getTeacherHours(ped.id) >= maxH) continue;

        for (const d of DAYS) {
          if (days1.has(d) || days2.has(d)) continue;

          for (const p of PERIODS) {
            const pedData = currentState.pedagogues.find(item => item.id === ped.id);
            const currentSlot = pedData?.timetable?.[d]?.[p] || [];
            if (currentSlot.length > 0) continue;

            if (
              currentState.canAssignStudent(st1.id, d, p, true, { targetPedagogueId: ped.id }) &&
              currentState.canAssignStudent(st2.id, d, p, true, { targetPedagogueId: ped.id })
            ) {
              currentState.assignStudentToPedagogue(st1.id, ped.id);
              currentState.assignStudentToPedagogue(st2.id, ped.id);
              currentState.setActivePedagogueId(ped.id);
              currentState.assignStudent(st1.id, d, p);
              currentState.assignStudent(st2.id, d, p);
              return true;
            }
          }
        }
      }
      return false;
    };

    // Évfolyamok szerinti rendezés
    const byGrade = {};
    poolStudents.forEach(s => {
      const g = s.classId.match(/\d+/)?.[0] || '0';
      if (!byGrade[g]) byGrade[g] = [];
      byGrade[g].push(s);
    });

    const gradeOrder = ['8', '7', '6', '5', '4', '3', '2', '1'].filter(g => byGrade[g]);

    // 1. KÖR: Évfolyam-arányos kvóták szerinti páros órák nyitása és 3-4 főig való csatlakoztatás
    gradeOrder.forEach(g => {
      const gStudents = byGrade[g] || [];

      for (let pass = 0; pass < 5; pass++) {
        for (let i = 0; i < gStudents.length; i++) {
          const s1 = gStudents[i];
          if (getAssignedCount(s1.id) >= (s1.needs || 2)) continue;

          for (let j = i + 1; j < gStudents.length; j++) {
            const s2 = gStudents[j];
            if (getAssignedCount(s2.id) >= (s2.needs || 2)) continue;

            if (tryOpenPairSlot(s1, s2, true)) {
              gStudents.forEach(other => {
                if (other.id !== s1.id && other.id !== s2.id) {
                  tryJoinExistingGroup(other, 4);
                }
              });
              break;
            }
          }
        }
      }
    });

    // 2. KÖR: Fennmaradó tanári órák feltöltése párokkal
    for (let pass = 0; pass < 5; pass++) {
      if (!anyTeacherNeedsHours()) break;
      gradeOrder.forEach(g => {
        const gStudents = byGrade[g] || [];
        for (let i = 0; i < gStudents.length; i++) {
          const s1 = gStudents[i];
          if (getAssignedCount(s1.id) >= (s1.needs || 2)) continue;

          for (let j = i + 1; j < gStudents.length; j++) {
            const s2 = gStudents[j];
            if (getAssignedCount(s2.id) >= (s2.needs || 2)) continue;

            if (tryOpenPairSlot(s1, s2, false)) {
              gStudents.forEach(other => {
                if (other.id !== s1.id && other.id !== s2.id) {
                  tryJoinExistingGroup(other, 4);
                }
              });
              break;
            }
          }
        }
      });
    }

    // 3. KÖR: Csoportbővítés maximum létszámig (5 főig)
    poolStudents.forEach(s => {
      const maxGrp = useStore.getState().settings.maxGroupSize || 5;
      while (getAssignedCount(s.id) < (s.needs || 2)) {
        if (!tryJoinExistingGroup(s, maxGrp)) break;
      }
    });

    // 4. KÖR: ITERATÍV JAVÍTÁS ÉS VISSZALÉPÉS (Backtracking / Local Search)
    const maxGrpLimit = useStore.getState().settings.maxGroupSize || 5;
    for (let round = 0; round < 3; round++) {
      const currentState = useStore.getState();
      const unassigned = poolStudents.filter(s => getAssignedCount(s.id) < (s.needs || 2));
      if (unassigned.length === 0) break;

      for (const s of unassigned) {
        if (getAssignedCount(s.id) >= (s.needs || 2)) continue;
        const sGrade = s.classId.match(/\d+/)?.[0] || '0';
        const sDays = getAssignedDays(s.id);
        let resolved = false;

        for (const ped of targetPedagogues) {
          if (resolved) break;
          const pedData = currentState.pedagogues.find(p => p.id === ped.id);
          if (!pedData) continue;

          for (const d of DAYS) {
            if (resolved) break;
            if (sDays.has(d)) continue;

            for (const p of PERIODS) {
              if (resolved) break;
              const grp = pedData.timetable?.[d]?.[p] || [];
              if (grp.length >= maxGrpLimit) {
                const firstSt = currentState.students.find(st => String(st.id) === cleanStudentId(grp[0]));
                if (firstSt && (firstSt.classId.match(/\d+/)?.[0] || '0') === sGrade) {
                  for (let mIdx = 0; mIdx < grp.length; mIdx++) {
                    const memberId = grp[mIdx];
                    const memberClean = cleanStudentId(memberId);
                    const memberSt = currentState.students.find(st => String(st.id) === memberClean);
                    if (!memberSt) continue;

                    for (const altD of DAYS) {
                      if (resolved) break;
                      const memberDays = getAssignedDays(memberId);
                      if (altD !== d && memberDays.has(altD)) continue;

                      for (const altP of PERIODS) {
                        if (altD === d && altP === p) continue;
                        const altGrp = pedData.timetable?.[altD]?.[altP] || [];
                        if (altGrp.length >= 1 && altGrp.length < maxGrpLimit) {
                          const altFirst = currentState.students.find(st => String(st.id) === cleanStudentId(altGrp[0]));
                          if (altFirst && (altFirst.classId.match(/\d+/)?.[0] || '0') === sGrade) {
                            if (currentState.canAssignStudent(memberClean, altD, altP, true, { targetPedagogueId: ped.id })) {
                              currentState.removeStudent(memberClean, d, p, ped.id);
                              currentState.setActivePedagogueId(ped.id);
                              currentState.assignStudent(memberClean, altD, altP);

                              if (currentState.canAssignStudent(s.id, d, p, true, { targetPedagogueId: ped.id })) {
                                currentState.assignStudentToPedagogue(s.id, ped.id);
                                currentState.assignStudent(s.id, d, p);
                                resolved = true;
                              } else {
                                currentState.removeStudent(memberClean, altD, altP, ped.id);
                                currentState.assignStudent(memberClean, d, p);
                              }
                              break;
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // 5. KÖR: Kapacitás-teljesítés (Nagyobb csoportok felezése új órák nyitására a hiányzó pedagógusokhoz)
    for (const ped of targetPedagogues) {
      while (useStore.getState().getTeacherHoursCount(null, null, ped.id) < (ped.maxTeacherHours || 24)) {
        let splitSuccess = false;
        const currentState = useStore.getState();

        for (const d of DAYS) {
          if (splitSuccess) break;
          for (const p of PERIODS) {
            if (splitSuccess) break;
            const targetPedData = currentState.pedagogues.find(item => item.id === ped.id);
            if ((targetPedData?.timetable?.[d]?.[p] || []).length > 0) continue; // Csak üres sávba

            for (const donorPed of targetPedagogues) {
              if (splitSuccess) break;
              const donorPedData = currentState.pedagogues.find(item => item.id === donorPed.id);

              for (const donorD of DAYS) {
                if (splitSuccess) break;
                if (donorD === d) continue; // Ugyanarra a napra ne tegyük

                for (const donorP of PERIODS) {
                  if (splitSuccess) break;
                  const donorGrp = donorPedData?.timetable?.[donorD]?.[donorP] || [];
                  if (donorGrp.length >= 4) {
                    for (let i = 0; i < donorGrp.length - 1; i++) {
                      if (splitSuccess) break;
                      for (let j = i + 1; j < donorGrp.length; j++) {
                        const stId1 = cleanStudentId(donorGrp[i]);
                        const stId2 = cleanStudentId(donorGrp[j]);

                        if (
                          currentState.canAssignStudent(stId1, d, p, true, { targetPedagogueId: ped.id }) &&
                          currentState.canAssignStudent(stId2, d, p, true, { targetPedagogueId: ped.id })
                        ) {
                          currentState.removeStudent(stId1, donorD, donorP, donorPed.id);
                          currentState.removeStudent(stId2, donorD, donorP, donorPed.id);
                          currentState.assignStudentToPedagogue(stId1, ped.id);
                          currentState.assignStudentToPedagogue(stId2, ped.id);
                          currentState.setActivePedagogueId(ped.id);
                          currentState.assignStudent(stId1, d, p);
                          currentState.assignStudent(stId2, d, p);
                          splitSuccess = true;
                          break;
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }

        if (!splitSuccess) break;
      }
    }
  }

  // Eredmények pontos összegzése (helyes számítással, nem duplikálva a diákokat)
  let totalAssignedHours = 0;
  const finalState = useStore.getState();

  targetPedagogues.forEach(ped => {
    const pedData = finalState.pedagogues.find(p => p.id === ped.id);
    DAYS.forEach(d => {
      PERIODS.forEach(p => {
        const grp = pedData?.timetable?.[d]?.[p] || [];
        totalAssignedHours += grp.length;
      });
    });
  });

  // A valós tanulói igények összege (nem duplikálva!)
  let totalRequiredHours = 0;
  finalState.students.forEach(s => {
    totalRequiredHours += (s.needs || 2);
  });
  const failedHours = Math.max(0, totalRequiredHours - totalAssignedHours);

  // Visszaállítjuk az eredetileg aktív pedagógust
  if (originalActiveId && originalActiveId !== useStore.getState().activePedagogueId) {
    useStore.getState().setActivePedagogueId(originalActiveId);
  }

  return {
    successCount: totalAssignedHours,
    failedCount: failedHours
  };
};
