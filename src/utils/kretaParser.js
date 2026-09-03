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
      const cellText = cells[i];
      
      // A Kréta a cellán belüli sorokat (Tantárgy, Osztály, Tanár, Terem) \line-al választja el.
      const lines = cellText.split('\\line').map(l => {
         // Töröljük a vezérlő kódokat (pl. \qc, \f0, \cf2 stb.)
         let cleanLine = l.replace(/\\[a-zA-Z0-9-]+[ ]?/g, '').replace(/\{|\}/g, '').trim();
         // Néha maradnak extra visszajelek vagy szóközök
         return cleanLine;
      }).filter(l => l.length > 0);

      // lines = [ "Matematika", "2.a", "Tanár neve", "Terem" ]
      if (lines.length >= 2) {
         let subject = lines[0];
         let className = lines[1].toLowerCase().trim(); // pl. "2.a"
         
         if (subject && className && className.match(/^\d+\.[a-z]$/)) {
           if (!classesData[className]) classesData[className] = {};
           if (!classesData[className][DAYS[i-1]]) classesData[className][DAYS[i-1]] = {};
           
           // Mentsük az órát
           classesData[className][DAYS[i-1]][period] = subject;
           foundClasses.add(className);
         }
      }
    }
  });

  // A próba tanuló (dummy) generálást eltávolítottuk, mert már van dedikált Excel import
  return { classes: classesData };
}
