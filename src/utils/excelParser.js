import * as XLSX from 'xlsx';

export const parseStudentsExcel = (arrayBuffer) => {
  try {
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Konvertálás 2D tömbbé
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    const students = [];
    
    // Az 1. sort (index 0) átugorjuk, feltételezve, hogy fejléc
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      
      const name = row[0]; // A oszlop (Név)
      const classId = row[6]; // G oszlop (Osztály)
      
      if (name && classId && typeof name === 'string' && typeof classId === 'string') {
        students.push({
          id: `excel-${i}`,
          name: name.trim(),
          classId: classId.trim().toLowerCase(),
          needs: 1 // Alapértelmezett óraigény (fejlesztés)
        });
      }
    }
    
    return students;
  } catch (err) {
    console.error("Hiba az Excel feldolgozása során:", err);
    return [];
  }
};
