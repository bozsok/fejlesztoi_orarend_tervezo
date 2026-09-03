# Több pedagógus támogatás – Implementációs terv

Az alkalmazás kibővítése egyetlen fejlesztőpedagógus órarendjéről **tetszőleges számú pedagógus** egyidejű kezelésére. Jelenleg 4 kolléga van, de a rendszer bármennyi pedagógust képes legyen fogadni.

## Felhasználói döntések összefoglalása

| Kérdés | Döntés |
|--------|--------|
| Navigáció | Bal oldali pedagóguslista, kattintásra váltanak a naptárak |
| Diák–pedagógus kapcsolat | Előre hozzárendelhető, de felülbírálható és áthúzható |
| Egy diák több pedagógusnál? | **Nem** – egy diák kizárólag egy pedagógushoz tartozik |
| Automata ütemező | Egyéni és globális futtatás is |
| Zárolások | Pedagógusonként különbözőek |
| Mentés/betöltés | Egy közös JSON fájl |
| PDF export | Egyéni és összesített is |
| Pedagógusok bevitele | Első induláskor varázsló, utána Beállításokban szerkeszthető |

---

## Lezárt döntések

- ✅ **Sidebar elrendezés:** Kompakt pedagóguslista a sidebar tetején, alatta a kiválasztott pedagógus diákjai
- ✅ **Diák áthelyezés pedagógusok között:** Kuka ikonnal visszakerül a közös poolba, onnan átrendelhető
- ✅ **„Kész tanulók" szekció eltávolítása:** A jelenlegi „Kész tanulók (xx fő)" szekció kikerül a sidebarból. A pedagógus addig tervez, amíg a „Beosztandó diákok" lista el nem fogy. Az egyedi törlés a naptárcellákban lévő X gombokkal továbbra is elérhető. Ez helyet szabadít fel a pedagógusválasztónak.
- ✅ **Kettős szerepű pedagógus (tanít + fejleszt):** A meglévő zárolási rendszer kezel ilyen kollégákat is. A pedagógus naptárján a „Zárolás Mód"-ban zárolhatók a tanítási órák (pl. „Vizuális kultúra – 7.b"), és az ütemező ezeket tiszteletben tartja. Nem igényel új funkciót – a pedagógusonkénti `blockedPeriods` pontosan ezt szolgálja.

---

## Proposed Changes

A változásokat 6 fázisra bontom, a függőségek logikus sorrendjében.

---

### 1. FÁZIS – Adatmodell bővítés (Zustand Store)

A legkritikusabb változás: a „flat" (egypedagógus) adatmodellről áttérés a többpedagógus modellre.

#### [MODIFY] useStore.js (`src/store/useStore.js`)

**Új adatmodell:**

```javascript
{
  // ÚJ: Pedagógusok tömbje
  pedagogues: [
    {
      id: 'ped-1',
      name: 'Kiss Katalin',
      teacherCode: '2',
      maxTeacherHours: 24,
      groupNamingOrder: 'vertical',
      timetableTitle: 'Kiss Katalin, fejlesztőpedagógus',
      timetable: { 'Hétfő': { 1: ['excel-1'], ... } },
      blockedPeriods: { 'Hétfő': { 5: 'Napközi' } },
      customGroupLabels: { 'Hétfő-1': '2/1' },
    },
    // ... további pedagógusok
  ],

  // ÚJ: Aktívan kiválasztott pedagógus ID-ja
  activePedagogueId: 'ped-1',

  // MEGMARAD globálisan (mert az iskolai órarendek közösek):
  classes: { ... },

  // MEGMARAD globálisan (mert minden pedagógusnál ugyanaz a pool):
  students: [
    { id: 'excel-1', name: 'Kovács Anna', classId: '3.a', needs: 2,
      pedagogueId: 'ped-1'  // ÚJ: Melyik pedagógushoz van rendelve
    }
  ],

  // MEGMARAD globálisan:
  settings: {
    maxGroupSize: 5,
    allowManualGroupSizeOverride: false,
    // teacherCode, maxTeacherHours, groupNamingOrder → KIKERÜL, pedagógusonkénti lesz
  },

  // VÁLTOZATLAN:
  activeStudentId: null,
}
```

**Érintett store műveletek – migrálandó pedagógusonkéntire:**
- `assignStudent()` → az aktív pedagógus `timetable`-jébe ír
- `removeStudent()` → az aktív pedagógus `timetable`-jéből töröl
- `moveStudent()` → az aktív pedagógus `timetable`-ján belül mozgat
- `clearTimetable()` → az aktív pedagógus naptárját üríti
- `clearStudentAssignments()` → az aktív pedagógus naptárjából törli a diákot
- `canAssignStudent()` → **cross-pedagógus ellenőrzés**: a diák nem lehet ugyanabban az idősávban egy másik pedagógusnál sem
- `getAssignmentValidationError()` → frissítendő az új kereszt-validációval
- `getAssignmentWarning()` → frissítendő
- `getStudentConstraints()` → figyelembe kell vennie az összes pedagógus zárolásait
- `getTeacherHoursCount()` → pedagógusonkénti
- `getGroupLabels()` → pedagógusonkénti
- `toggleBlockedPeriod()` → pedagógusonkénti
- `setTimetableTitle()` → pedagógusonkénti
- `setCustomGroupLabel()` → pedagógusonkénti
- `cleanAndValidateGroupLabel()` → pedagógusonkénti

**Új store műveletek:**
- `addPedagogue(name, teacherCode, maxHours)` → új pedagógus hozzáadása
- `removePedagogue(id)` → pedagógus törlése (diákjait visszateszi a poolba)
- `updatePedagogue(id, updates)` → pedagógus adatainak frissítése
- `setActivePedagogue(id)` → aktív pedagógus váltás
- `getActivePedagogue()` → getter a kiválasztott pedagógusra
- `assignStudentToPedagogue(studentId, pedagogueId)` → diák hozzárendelése pedagógushoz
- `unassignStudentFromPedagogue(studentId)` → diák levétele pedagógusról (visszakerül a poolba)

**Kritikus kereszt-validáció (`canAssignStudent` bővítés):**
- Ha a diák már be van osztva egy **másik** pedagógusnál **ugyanarra az idősávra** (nap + óra), az tiltott → piros tooltip: „A diák ebben az időpontban már egy másik pedagógusnál van beosztva."

---

### 2. FÁZIS – Pedagógus kezelő UI

#### [NEW] PedagogueSetupWizard.jsx (`src/components/PedagogueSetupWizard.jsx`)

Első induláskor megjelenő varázsló modal:
- Pedagógusok hozzáadása (név, KRÉTA kód, heti max óraszám)
- „+" gombbal bővíthető lista
- **Opcionális JSON importálás pedagógusonként:** Minden pedagógus sorában egy „Importálás" gomb, amellyel egy korábban (a jelenlegi egypedagógus verzióval) mentett JSON fájlból betölthetők a zárolások (`blockedPeriods`) és az esetleges naptári beosztás (`timetable`) közvetlenül az adott pedagógus profiljába. Ez különösen hasznos a kettős szerepű kollégáknál, akiknek előre zárolják a tanítási óráit.
- „Indítás" gombbal zárható (minimum 1 pedagógus szükséges)
- A varázsló csak akkor jelenik meg, ha a `pedagogues` tömb üres

#### [NEW] PedagogueSetupWizard.module.css (`src/components/PedagogueSetupWizard.module.css`)

A varázsló stíluslapja (glassmorphism, az alkalmazás dizájnnyelvének megfelelő).

#### [MODIFY] SettingsModal.jsx (`src/components/SettingsModal.jsx`)

A jelenlegi „Csoport megjelölés előtagja", „Maximális heti óraszám" és „Számozási irány" mezők **kikerülnek** a globális beállításokból, mert ezentúl pedagógusonként állíthatók.

Helyette egy „Pedagógusok kezelése" szekció kerül be:
- Lista a pedagógusokról (név, kód, max óra)
- Szerkesztés / törlés gombok
- „Új pedagógus hozzáadása" gomb

---

### 3. FÁZIS – Sidebar és navigáció átalakítás

#### [MODIFY] App.jsx (`src/App.jsx`)

A sidebar tetejére egy kompakt pedagóguslista kerül:
- Pedagógusok nevei egymás alatt, kis avatárokkal vagy színkódolással
- Az aktív pedagógus kiemelve (accent szín)
- Kattintásra váltás (`setActivePedagogue`)
- A diáklista automatikusan csak az aktív pedagógushoz rendelt diákokat mutatja
- A „Beosztandó diákok" lista szétválik:
  - **Hozzárendelt, de még beosztandó** (az aktív pedagógus diákjai, akik nincsenek teljesen beosztva)
  - **Hozzá nem rendelt** (közös pool, még egyik pedagógushoz sem rendelt diákok) – ha van ilyen, egy külön szekció mutatja
- **„Kész tanulók" szekció eltávolítása:** A `completedStudents` lista, a `completedSection`, `completedHeader`, `completedList`, `completedIcon` CSS osztályok és a hozzájuk tartozó JSX törlése az `App.jsx`-ből és az `App.module.css`-ből. A `clearStudentAssignments` store művelet megmarad (a cellák X gombja használja).

Az `handleAutoSchedule` kibővítése:
- Egyéni mód: az aktív pedagógus diákjait osztja be
- Globális mód: minden pedagógus minden diákját

Az `handleSave` / `handleFileSelect` átalakítása a teljes többpedagógus adatmodell mentésére/betöltésére.

A PDF export kibővítése:
- „Aktív pedagógus exportálása" (mint eddig)
- „Összesített export" (minden pedagógus, oldalanként)

#### [NEW] PedagogueSelector.jsx (`src/components/PedagogueSelector.jsx`)

Kompakt pedagógusválasztó komponens a sidebar tetejére:
- Pedagógusok listája színkóddal
- Aktív kijelölés
- Drag & drop forrásként is működik (diákokat lehessen ráhúzni egy pedagógus nevére a hozzárendeléshez)

#### [NEW] PedagogueSelector.module.css (`src/components/PedagogueSelector.module.css`)

---

### 4. FÁZIS – Diák–pedagógus hozzárendelés

#### [MODIFY] StudentSelectionModal.jsx (`src/components/StudentSelectionModal.jsx`)

Új oszlop a diákválasztó táblázatban: **„Pedagógus"** – legördülő menüvel az egyes diákoknál kiválasztható, melyik pedagógushoz kerüljön. Alapértelmezetten az éppen aktív pedagógus.

#### [MODIFY] StudentCard.jsx (`src/components/StudentCard.jsx`)

- Pedagógus színkód megjelenítése a kártyán (kis pont vagy csík az ő pedagógusa színében)
- A „Beosztandó" listán a hozzá nem rendelt diákoknál egy kis „rendeld hozzá" ikon

---

### 5. FÁZIS – Ütemező és validáció bővítés

#### [MODIFY] scheduler.js (`src/utils/scheduler.js`)

- **Egyéni futtatás:** `runAutoScheduler(pedagogueId)` – csak az adott pedagógus hozzárendelt diákjait osztja be az ő naptárjába
- **Globális futtatás:** `runGlobalAutoScheduler()` – minden pedagógusra lefuttatja sorban (a legszűkösebb pedagógus diákjai először)
- **Kereszt-ütközés ellenőrzés:** A `canAssignStudent` hívás során figyelembe veszi, hogy a diák nincs-e ugyanabban az idősávban egy másik pedagógusnál

#### [MODIFY] DropZoneCell.jsx (`src/components/DropZoneCell.jsx`)

- A kereszt-pedagógus ütközés megjelenítése: ha egy diák egy másik pedagógusnál már be van osztva az adott időpontra → piros tooltip: „Más pedagógusnál már foglalt ez az időpont"

#### [MODIFY] TimetableGrid.jsx (`src/components/TimetableGrid.jsx`)

- A naptár fejléce az aktív pedagógus adatait mutatja (név, heti órák)
- A zárolások az aktív pedagógusra vonatkoznak

---

### 6. FÁZIS – Mentés/betöltés és PDF

#### [MODIFY] App.jsx (`src/App.jsx`) – handleSave, handleExportPDF

**Mentés:** Az exportált JSON tartalmazza a `pedagogues` tömböt a teljes adatmodellel.

**JSON import kompatibilitás:** Ha egy régi (egypedagógus) JSON-t töltünk be, automatikus migráció: a rendszer létrehoz egyetlen pedagógust a régi adatokból.

**PDF export:**
- Egyéni: a jelenlegi logika, az aktív pedagógus adataival
- Összesített: `doc.addPage()` hívásokkal pedagógusonként új oldal, mindegyiken a pedagógus neve fejlécben

---

## Verifikációs terv

### Manuális ellenőrzés
1. Varázsló megjelenik első induláskor, pedagógusok hozzáadhatók
2. Pedagógus váltás működik a sidebarban
3. Diákok importálása és hozzárendelése pedagógusokhoz
4. Drag & Drop az aktív pedagógus naptárjába
5. Automata ütemező egyéni és globális módban
6. Kereszt-pedagógus ütközés detektálása (piros tooltip)
7. Mentés/betöltés a teljes többpedagógus állapottal
8. Régi (egypedagógus) JSON migráció
9. PDF export (egyéni + összesített)
10. Zárolások pedagógusonként működnek

### Build ellenőrzés
- `npm run build` sikeresen lefut figyelmeztetés nélkül
