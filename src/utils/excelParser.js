import * as XLSX from 'xlsx';

export const parseStudentsExcel = (arrayBuffer) => {
  try {
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Konvertálás 2D tömbbé
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    if (!data || data.length < 2) return [];

    // Intelligens oszlopkeresés a fejlécben (0. sor)
    const headerRow = data[0] || [];
    let nameCol = -1;
    let classCol = -1;
    let needsCol = -1;
    let pedCol = -1;

    headerRow.forEach((col, idx) => {
      if (typeof col !== 'string') return;
      const clean = col.trim().toLowerCase();
      if (nameCol === -1 && (clean.includes('név') || clean.includes('neve') || clean.includes('tanuló') || clean.includes('diák'))) {
        nameCol = idx;
      } else if (classCol === -1 && (clean.includes('osztály') || clean.includes('csoport') || clean.includes('évfolyam'))) {
        classCol = idx;
      } else if (needsCol === -1 && (clean.includes('óra') || clean.includes('alkalom') || clean.includes('igény') || clean.includes('fejlesztés'))) {
        needsCol = idx;
      } else if (pedCol === -1 && (clean.includes('pedagógus') || clean.includes('fejlesztő') || clean.includes('kolléga') || clean.includes('tanár'))) {
        pedCol = idx;
      }
    });

    // Fallback pozíciók a standard KRÉTA tanulóexport formátumhoz
    if (nameCol === -1) nameCol = 0; // A oszlop: Név
    if (classCol === -1) classCol = 6; // G oszlop: Osztály
    // Ha nem találtunk külön óraszám fejlécet, de van 8. oszlop (H oszlop / index 7)
    if (needsCol === -1 && headerRow.length > 7) {
      needsCol = 7;
    }

    const students = [];
    
    // Az 1. sortól kezdve feldolgozzuk a diákokat
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      
      const rawName = row[nameCol];
      const rawClass = row[classCol];
      
      if (rawName && rawClass) {
        const nameStr = String(rawName).trim();
        const classStr = String(rawClass).trim().toLowerCase();

        // Heti óraszám kiolvasása
        let needs = 1;
        if (needsCol !== -1 && row[needsCol] !== undefined && row[needsCol] !== null && String(row[needsCol]).trim() !== '') {
          const parsed = parseInt(String(row[needsCol]).trim(), 10);
          if (!isNaN(parsed)) {
            needs = Math.min(5, Math.max(1, parsed));
          }
        }

        // Opcionális pedagógus megnevezés az Excelből
        let rawPed = null;
        if (pedCol !== -1 && row[pedCol]) {
          rawPed = String(row[pedCol]).trim();
        }

        if (nameStr.length > 0 && classStr.length > 0) {
          students.push({
            id: `excel-${i}`,
            name: nameStr,
            classId: classStr,
            needs: needs,
            rawPedagogue: rawPed,
            pedagogueId: null // Alapértelmezetten a Közös poolba kerül
          });
        }
      }
    }
    
    return students;
  } catch (err) {
    console.error("Hiba az Excel feldolgozása során:", err);
    return [];
  }
};
