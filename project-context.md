# Órarend Tervező – Teljes Projekt Elemzés

## Cél és kontextus
Fejlesztőpedagógusok számára készült **kliensoldali webalkalmazás** (React + Vite), amely a KRÉTA rendszerből exportált osztályórarendek és tanulói listák alapján segíti a heti fejlesztő órarend összeállítását több pedagógus számára is. Tisztán böngészőben fut, nincs backend.

**Verzió:** 1.7.3 | **Port:** 3000

---

## Architektúra áttekintés

```mermaid
graph TD
  A["index.html"] --> B["main.jsx"]
  B --> C["App.jsx<br>(Fő komponens, DnD kontextus)"]
  C --> D["TimetableGrid.jsx<br>(Naptár rács + zárolás modal)"]
  C --> E["Sidebar<br>(Diákkártyák listája, közös pool)"]
  D --> F["DropZoneCell.jsx<br>(Egyes naptárcellák)"]
  F --> G["EnrolledStudentCard<br>(Beírt diákok kártyái)"]
  E --> H["StudentCard.jsx<br>(Húzható diákkártya)"]
  C --> I["Modálisok"]
  I --> I1["RulesModal.jsx"]
  I --> I2["SettingsModal.jsx"]
  I --> I3["StudentSelectionModal.jsx"]
  I --> I4["ConfirmClearModal.jsx"]
  I --> I5["PedagogueSetupWizard.jsx"]
  I --> I6["AutoScheduleChoiceModal.jsx"]
  I --> I7["ExportPdfModal.jsx"]
  C --> J["Zustand Store<br>(useStore.js)"]
  C --> K["Utils"]
  K --> K1["kretaParser.js"]
  K --> K2["excelParser.js"]
  K --> K3["scheduler.js"]
```

---

## Fájlstruktúra és felelősségek

### Forráskód (`src/`)

| Fájl | Méret | Felelősség |
|------|-------|------------|
| `main.jsx` | 229B | Belépőpont, React root renderelés |
| `App.jsx` | 29KB | Fő komponens: DndContext, fejléc gombok, pedagógus fülek, fájlkezelés, PDF export, sidebar, modálisok összekapcsolása |
| `index.css` | 6KB | Globális CSS változók, reset, glassmorphism, gombok, modál alap, tooltip, badge |
| `App.module.css` | 5KB | App layout, header, sidebar, pedagógus tabok, kapacitás indikátor, scheduler modal |

### Store (`src/store/`)

| Fájl | Méret | Felelősség |
|------|-------|------------|
| `useStore.js` | 46KB | **Teljes többpedagógusos állapotkezelés** (Zustand): pedagogues, activePedagogueId, students, classes, settings, validáció, CRUD műveletek |

### Segédeszközök (`src/utils/`)

| Fájl | Méret | Felelősség |
|------|-------|------------|
| `kretaParser.js` | 3.5KB | RTF/DOC formátumú KRÉTA órarendek kliensoldali feldolgozása al-blokkokkal és összevont osztályokkal (pl. `8.a-8.b csoport`) |
| `excelParser.js` | 1.8KB | XLSX tanulólista feldolgozása: Név, Osztály és opcionális heti Óraszám oszlopok |
| `scheduler.js` | 12KB | Automata ütemező: általános Constraint-First és kiegyensúlyozott csoportfeltöltő heurisztika |

### Komponensek (`src/components/`)

| Fájl | Felelősség |
|------|------------|
| `TimetableGrid.jsx` | 5×8-as naptár rács (Hétfő–Péntek, 1–8. óra), szerkeszthető cím, zárolás modal, heti óraszám badge |
| `DropZoneCell.jsx` | Egyetlen naptár cella: droppable zóna, szín-validáció, tooltip, csoportkód szerkesztés |
| `StudentCard.jsx` | Húzható diákkártya: név, osztály, igény, szűkösségi figyelmeztetés, kuka ikon |
| `RulesModal.jsx` | Súgó: 3 fül (Feltételek, Szabályok – 7–8. óra tiltása, Algoritmus) |
| `SettingsModal.jsx` | Beállítások: csoportlétszám, felülbírálás, pedagógusok fülei és szerkesztése |
| `StudentSelectionModal.jsx` | Excel importálás utáni diákválasztó: keresés, szűrés, igénybeállítás |
| `ConfirmClearModal.jsx` | Naptár kiürítés megerősítő dialógus |
| `PedagogueSetupWizard.jsx` | Kezdeti üdvözlő varázsló: pedagógusok beállítása és órarend/zárolás importálása |
| `AutoScheduleChoiceModal.jsx` | Automata tervezés indító modal: egyéni vagy globális tervezés, tiszta újratervezési opció |
| `ExportPdfModal.jsx` | PDF export opciók (aktív pedagógus vagy összes pedagógus) |

---

## Adatmodell (Zustand Store)

```javascript
{
  pedagogues: [                         // Fejlesztőpedagógusok listája
    {
      id: 'ped-1',
      name: 'Minta Klára',
      teacherCode: '1',                 // KRÉTA csoportkód előtag
      maxTeacherHours: 24,              // Heti kötelező óraszám
      groupNamingOrder: 'vertical',
      timetableTitle: 'Minta Klára, fejlesztőpedagógus',
      timetable: { 'Hétfő': { 1: ['excel-1', 'excel-2'] } },
      blockedPeriods: { 'Kedd': { 7: 'Napközi' } },
      customGroupLabels: { 'Hétfő-1': '1/1' },
      color: '#6366f1'
    }
  ],
  activePedagogueId: 'ped-1',           // Jelenleg kiválasztott pedagógus
  students: [                           // Diákok (közös pool: pedagogueId === null)
    { id: 'excel-1', name: 'Kovács Anna', classId: '3.a', needs: 2, pedagogueId: 'ped-1' }
  ],
  classes: {                            // KRÉTA órarendek osztályonként
    '3.a': {
      'Hétfő': { 1: 'Matematika', 2: 'Testnevelés', ... }
    }
  },
  settings: {
    maxGroupSize: 5,                    // Max létszám egy csoportban
    allowManualGroupSizeOverride: false // Manuális felülbírálás engedélyezése
  }
}
```

---

## Üzleti logika – Elhozhatósági szabályrendszer

### Alsó tagozat (1–4. osztály)

| Típus | Elhozható tantárgyak | 5–6. óra (napközi/üres) |
|-------|---------------------|------------------------|
| **Tagozatos** (`.a`, `.b`) | Rajz, Testnevelés | ✅ Elhozható |
| **Nem tagozatos** (`.c`) | Rajz, Testnevelés, Ének | ✅ Elhozható |

### Felső tagozat (5–8. osztály)

| Szabály | Részletek |
|---------|-----------|
| Tantárgy | **Kizárólag Testnevelés** – semmilyen más tárgyról nem elhozható |
| Lyukas 5–6. óra | Csak **manuálisan** (sárga figyelmeztetéssel) |

### Általános korlátok

- **7. és 8. óra kizárása** – szigorú tiltás: sem manuálisan, sem automata tervezővel nem osztható be tanuló a 7. és 8. órára (fejlesztés kizárólag az 1–6. órákban tartható)
- **Napi max 1 alkalom** – egy diák naponta csak egyszer vehető ki (különböző napok kötelezőek)
- **Évfolyam-egyezés** – automata tiltja a keveredést; manuálisan felülbírálható (sárga figyelmeztetés)
- **Csoportlétszám** – a beállításokban konfigurálható (alapértelmezetten max 5 fő/csoport)
- **Pedagógus heti max óra** – pedagógusonként egyénileg beállítható órakeret (max 26)
- **Zárolások** – Napközi, Ebédeltetés, Értekezlet, Ügyelet, Helyettesítés, Szakkör stb.

---

## Automata ütemező algoritmus (`scheduler.js`)

```mermaid
flowchart TD
  A["1. Szűkösség számolása<br>(getStudentConstraints)"] --> B["2. Hátralévő igények listázása"]
  B --> C["3. Rendezés: legszűkösebb elöl<br>(tagozatos másodlagos prioritás)"]
  C --> D["4. Sávok pontozása<br>(Group-filling heurisztika)"]
  D --> E{"Meglévő azonos<br>évfolyamú csoport?"}
  E -->|Igen| F["score = 10<br>(napközis: 5)"]
  E -->|Nem, üres| G["score = 0<br>(napközis: -5)"]
  E -->|Eltérő évfolyam| H["score = -100<br>(kihagyás)"]
  F --> I["5. canAssignStudent() ellenőrzés"]
  G --> I
  I --> J["6. Beosztás vagy Failed"]
```

---

## Drag & Drop rendszer

- **Motor:** `@dnd-kit/core` + `@dnd-kit/utilities`
- **Két forrástípus:**
  1. `Student` – oldalsávból húzott diák (`student-{id}` prefixszel)
  2. `EnrolledStudent` – naptárból áthelyezett diák (`enrolled-{id}-{day}-{period}` prefixszel)
- **Vizuális visszajelzés:**
  - Zöld háttér + tantárgynév badge = elhozható
  - Piros szaggatott keret + tooltip = nem elhozható
  - Sárga tooltip = figyelmeztetés (nem blokkoló)
- **DragOverlay:** Önálló lebegő réteg (`dropAnimation={null}`)
- **PointerSensor:** 5px elmozdulás küszöb (kattintás vs. húzás megkülönböztetés)

---

## Importálás / Exportálás

| Funkció | Formátum | Részletek |
|---------|----------|-----------|
| KRÉTA órarend beolvasás | `.doc` / `.rtf` | Saját RTF parser (`\\row`, `\\cell` feldolgozás) |
| Tanulói lista beolvasás | `.xlsx` | A oszlop = Név, G oszlop = Osztály |
| Projekt mentés | `.json` | Teljes állapot (students, classes, timetable, blockedPeriods, title) |
| Projekt visszatöltés | `.json` | `importData()` – teljes állapot felülírás |
| PDF export | `.pdf` | jsPDF + jspdf-autotable, vektorgrafikus, landscape A4, Roboto font |

---

## Függőségek

| Csomag | Verzió | Funkció |
|--------|--------|---------|
| `react` / `react-dom` | ^19.2.7 | UI keretrendszer |
| `zustand` | ^5.0.14 | Állapotkezelés |
| `@dnd-kit/core` | ^6.3.1 | Drag & Drop motor |
| `@dnd-kit/sortable` | ^10.0.0 | Sortable kiterjesztés (jelenlegi kódban nem használt) |
| `@dnd-kit/utilities` | ^3.2.2 | DnD segédeszközök |
| `jspdf` | ^4.2.1 | PDF generálás |
| `jspdf-autotable` | ^5.0.8 | PDF táblázat |
| `lucide-react` | ^1.24.0 | Ikonok |
| `mammoth` | ^1.12.0 | .docx konverter (jelenlegi kódban nem használt aktívan) |
| `xlsx` | ^0.18.5 | Excel feldolgozás |

---

## CSS Architektúra

- **Módszer:** CSS Modules (`.module.css`) + globális `index.css`
- **Dizájn nyelv:** Glassmorphism (sötét mód, áttetszőség, blur, indigo árnyalatok)
- **Betűtípus:** Inter (Google Fonts, 300–700 súlyok)
- **Változók:** Központosított `:root` CSS custom properties

---

## Azonosított korlátok és ismert sajátosságok

1. **`@dnd-kit/sortable` telepítve, de nem használt** – a `package.json`-ban szerepel, de sehol nincs importálva
2. **`mammoth` csomag telepítve, de nem használt** – korábban .docx konverternek szánták, de a saját RTF parser lett a végleges
3. **`cleanStudentId` duplikáció** – exportált segédfüggvény, amelyet mind a store, mind a komponensek importálnak; központi `utils` helyre is kerülhetne
4. **Nincs routing** – egyoldalas alkalmazás, nincs React Router
5. **Nincs perzisztencia** – az állapot csak JSON fájlba menthető/tölthető, nincs localStorage/IndexedDB automatikus mentés
6. **Nincs undo/redo** – minden művelet végleges (kivéve a teljes naptár kiürítés)
7. **A beállítások nem mentődnek a JSON-ba** – a `handleSave` nem tartalmazza a `settings` objektumot
