export function parseKretaRTF(rtfText) {
  // 1. Unicode karakterek dekódolása
  // A KRÉTA RTF a magyar ékezetes karaktereket \uXXXX\'XX formátumban kódolja.
  let text = rtfText.replace(/\\u([0-9]{3,4})\\'?[0-9a-fA-F]{0,2}/g, (match, p1) => {
    return String.fromCharCode(parseInt(p1, 10));
  });

  // 2. Darabolás sorokra (\row)
  const rows = text.split('\\row');
  
  const classesData = {}; // {'2.a': { 'Hétfő': { 1: 'Matematika' } }}
  const foundClasses = new Set();
  
  const DAYS = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek'];

  rows.forEach(row => {
    const cells = row.split(/\\cell(?!x)/);
    if (cells.length < 6) return; // Nem egy teljes órarendi sor (pl. címlap vagy fejléc)

    // Az első cellából kiszedjük az óra sorszámát (pl: "1.")
    // A cella szövegéből előbb kiszedünk minden rtf formázást
    const cleanFirstCell = cells[0].replace(/\\[a-zA-Z0-9-]+[ ]?/g, '').replace(/\{|\}/g, '').trim();
    const periodMatch = cleanFirstCell.match(/^(\d+)\./);
    
    if (!periodMatch) return; // Ha nem sorszámmal kezdődik, nem órarend sor
    const period = parseInt(periodMatch[1], 10);

    for (let i = 1; i <= 5; i++) {
      if (i >= cells.length) break;
      const day = DAYS[i - 1];
      const cellText = cells[i];

      // A cellán belüli sorok tisztítása
      const rawLines = cellText.split('\\line').map(l => {
        return l.replace(/\\[a-zA-Z0-9-]+[ ]?/g, '').replace(/\{|\}/g, '').trim();
      }).filter(l => l.length > 0);

      // Elválasztott blokkok képzése (ha több csoport van a cellában, pl. '--------------------')
      const blocks = [];
      let currentBlock = [];
      rawLines.forEach(line => {
        if (line.includes('---')) {
          if (currentBlock.length > 0) blocks.push(currentBlock);
          currentBlock = [];
        } else {
          currentBlock.push(line);
        }
      });
      if (currentBlock.length > 0) blocks.push(currentBlock);

      blocks.forEach(block => {
        if (block.length === 0) return;
        const subject = block[0];
        const blockText = block.join(' ');

        // Keresünk minden osztálymintát a blokkban (pl. 8.b, 8.a, 1.c, akár összevonva: 8.a-8.b)
        const classMatches = blockText.match(/\b([1-8])\.([a-c])\b/gi) || [];
        const uniqueClasses = [...new Set(classMatches.map(c => c.toLowerCase()))];

        uniqueClasses.forEach(className => {
          if (!classesData[className]) classesData[className] = {};
          if (!classesData[className][day]) classesData[className][day] = {};

          // Ha még nincs óra, vagy ez egy testnevelés/elhozható óra, rögzítjük
          if (!classesData[className][day][period] || subject.toLowerCase().includes('testnevel')) {
            classesData[className][day][period] = subject;
            foundClasses.add(className);
          }
        });
      });
    }
  });

  return { classes: classesData };
}
