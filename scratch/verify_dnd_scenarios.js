import fs from 'fs';
import useStore, { cleanStudentId } from 'file:///d:/dev/Órarend tervező/src/store/useStore.js';

const rawData = fs.readFileSync('d:/dev/Órarend tervező/Source/terv/orarend-terv-2026-09-03.json', 'utf-8');
const testData = JSON.parse(rawData);

console.log('=== VALÓS ADATOK BETÖLTÉSE ===');
useStore.getState().importData(testData);

const initialState = useStore.getState();
const peds = initialState.pedagogues;
console.log(`Pedagógusok száma: ${peds.length}`);
console.log(`- 1. Pedagógus: ${peds[0].name} (ID: ${peds[0].id})`);
console.log(`- 2. Pedagógus: ${peds[1].name} (ID: ${peds[1].id})`);
console.log(`Aktív pedagógus: ${initialState.activePedagogueId}`);

// =========================================================================
// 1. FORGATÓKÖNYV:
// A naptárból húzunk egy tanulót a 2. pedagógusra (PedagogueDrop)
// =========================================================================
console.log('\n--- 1. FORGATÓKÖNYV: Naptárból húzás PedagogueDrop-ra (Pedagógus gombra) ---');
// Keressünk egy tanulót, aki az 1. pedagógus naptárában van
const ped1Timetable = initialState.pedagogues[0].timetable;
let enrolledStudentId = null;
let enrolledDay = null;
let enrolledPeriod = null;

for (const day of Object.keys(ped1Timetable)) {
  for (const period of Object.keys(ped1Timetable[day])) {
    const arr = ped1Timetable[day][period];
    if (arr.length > 0) {
      enrolledStudentId = arr[0];
      enrolledDay = day;
      enrolledPeriod = period;
      break;
    }
  }
  if (enrolledStudentId) break;
}

console.log(`Kiválasztott tanuló a naptárból: ${enrolledStudentId} (${enrolledDay} ${enrolledPeriod}. óra)`);
const studentObj = initialState.students.find(s => s.id === enrolledStudentId);
console.log(`Tanuló neve: ${studentObj?.name}, osztály: ${studentObj?.classId}, pedagógusa: ${studentObj?.pedagogueId}`);

// Szimuláljuk a drop eseményt a 2. pedagógus gombjára:
// active: { id: `enrolled-${enrolledStudentId}-${enrolledDay}-${enrolledPeriod}` }
// over: { data: { current: { type: 'PedagogueDrop', pedagogueId: peds[1].id } } }
const dragActiveId = `enrolled-${enrolledStudentId}-${enrolledDay}-${enrolledPeriod}`;
const cleanedDragId = cleanStudentId(dragActiveId);
console.log(`Drag active.id: ${dragActiveId} -> cleanStudentId: ${cleanedDragId}`);

// Lefuttatjuk a reassignStudentToPedagogue műveletet:
useStore.getState().reassignStudentToPedagogue(cleanedDragId, peds[1].id);

const stateAfterReassign = useStore.getState();
console.log('\nEredmény reassign után:');
console.log(`- Új aktív pedagógus ID: ${stateAfterReassign.activePedagogueId} (kell: ${peds[1].id}) -> ${stateAfterReassign.activePedagogueId === peds[1].id ? 'OK' : 'HIBA'}`);
const studentAfter = stateAfterReassign.students.find(s => s.id === enrolledStudentId);
console.log(`- Tanuló új pedagógus ID-ja: ${studentAfter?.pedagogueId} (kell: ${peds[1].id}) -> ${studentAfter?.pedagogueId === peds[1].id ? 'OK' : 'HIBA'}`);

// Szerepel-e még ped 1 naptárában?
let inPed1 = false;
Object.values(stateAfterReassign.pedagogues[0].timetable || {}).forEach(dayObj => {
  Object.values(dayObj).forEach(arr => {
    if (arr.includes(enrolledStudentId)) inPed1 = true;
  });
});
console.log(`- Szerepel-e még Ped 1 naptárában? ${inPed1} (kell: false) -> ${!inPed1 ? 'OK' : 'HIBA'}`);

// Megjelenik-e Ped 2 "Beosztandó diákok" listájában?
// Kiszámoljuk az App.jsx logikájával:
const getAssignedCount = (studId) => {
  let count = 0;
  const cleanId = cleanStudentId(studId);
  stateAfterReassign.pedagogues.forEach(p => {
    Object.values(p.timetable || {}).forEach(dayObj => {
      Object.values(dayObj).forEach(arr => {
        if (arr.some(id => cleanStudentId(id) === cleanId)) count++;
      });
    });
  });
  return count;
};

const activePedStudents = stateAfterReassign.students.filter(s => s.pedagogueId === stateAfterReassign.activePedagogueId);
const pendingStudents = activePedStudents.filter(s => getAssignedCount(s.id) < (s.needs || 1));
const isPendingInPed2 = pendingStudents.some(s => s.id === enrolledStudentId);
console.log(`- Megjelenik-e Ped 2 Beosztandó diákjai között? ${isPendingInPed2} (kell: true) -> ${isPendingInPed2 ? 'OK' : 'HIBA'}`);

// =========================================================================
// 2. FORGATÓKÖNYV:
// Beosztandó diákok felületről húzás pedagógus gombra (PedagogueDrop)
// =========================================================================
console.log('\n--- 2. FORGATÓKÖNYV: Beosztandó diákok felületről húzás pedagógus gombra ---');
// Válasszunk egy diákot Ped 2 beosztandó listájából, és rendeljük vissza Ped 1-re
const candStudent = pendingStudents[0];
console.log(`Kiválasztott beosztandó diák Ped 2-nél: ${candStudent.name} (${candStudent.id})`);

const studentDragId = `student-${candStudent.id}`;
const cleanedStudentDragId = cleanStudentId(studentDragId);
console.log(`Drag active.id: ${studentDragId} -> clean: ${cleanedStudentDragId}`);

useStore.getState().reassignStudentToPedagogue(cleanedStudentDragId, peds[0].id);
const stateAfterReturn = useStore.getState();
const candAfter = stateAfterReturn.students.find(s => s.id === candStudent.id);
console.log(`- Tanuló új pedagógusa: ${candAfter?.pedagogueId} (kell: ${peds[0].id}) -> ${candAfter?.pedagogueId === peds[0].id ? 'OK' : 'HIBA'}`);
console.log(`- Új aktív pedagógus: ${stateAfterReturn.activePedagogueId} (kell: ${peds[0].id}) -> ${stateAfterReturn.activePedagogueId === peds[0].id ? 'OK' : 'HIBA'}`);

// =========================================================================
// 3. FORGATÓKÖNYV:
// Beosztandó diákok felületről húzás egy naptárcellára
// =========================================================================
console.log('\n--- 3. FORGATÓKÖNYV: Beosztandó diákok felületről húzás naptárcellára ---');
// Válasszunk egy beosztandó diákot a jelenlegi aktív pedagógusnál (Ped 1)
const activePedStudents1 = stateAfterReturn.students.filter(s => s.pedagogueId === stateAfterReturn.activePedagogueId);
const pending1 = activePedStudents1.filter(s => {
  let count = 0;
  stateAfterReturn.pedagogues.forEach(p => {
    Object.values(p.timetable || {}).forEach(dayObj => {
      Object.values(dayObj).forEach(arr => {
        if (arr.some(id => cleanStudentId(id) === cleanStudentId(s.id))) count++;
      });
    });
  });
  return count < (s.needs || 1);
});

console.log(`Ped 1 beosztandó diákok száma: ${pending1.length}`);
if (pending1.length > 0) {
  const testStudent = pending1[0];
  console.log(`Teszt diák: ${testStudent.name} (${testStudent.id}), osztály: ${testStudent.classId}`);
  
  // Keressünk egy érvényes slotot canAssignStudent-tel:
  const DAYS = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek'];
  let validSlot = null;
  for (const day of DAYS) {
    for (let p = 1; p <= 6; p++) {
      if (useStore.getState().canAssignStudent(testStudent.id, day, p, false)) {
        validSlot = { day, period: p };
        break;
      }
    }
    if (validSlot) break;
  }
  
  if (validSlot) {
    console.log(`Talált érvényes idősáv: ${validSlot.day} ${validSlot.period}. óra`);
    // Lefuttatjuk az App.jsx handleDragEnd logikáját:
    useStore.getState().assignStudent(testStudent.id, validSlot.day, validSlot.period);
    
    const finalState = useStore.getState();
    const activeTimetable = finalState.pedagogues.find(p => p.id === finalState.activePedagogueId)?.timetable;
    const enrolledInSlot = activeTimetable?.[validSlot.day]?.[validSlot.period] || [];
    console.log(`Cellában lévő diákok:`, enrolledInSlot);
    console.log(`- Bekerült a naptárcellába? ${enrolledInSlot.includes(testStudent.id) ? 'OK' : 'HIBA'}`);
  } else {
    console.log('Nem volt azonnal érvényes szabad idősáv a teszt diákhoz.');
  }
}
