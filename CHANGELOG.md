# Changelog

Minden említésre méltó változtatás ebben a projektben (Órarend Tervező) itt kerül dokumentálásra. A projekt szemantikus verziózást (Semantic Versioning) követ.

## [1.6.1] - 2026-08-25

### Javítva
- **PDF Export betűtípus hiba**: A PDF exportálás során a Roboto betűtípusok betöltése mostantól a Vite `import.meta.env.BASE_URL` változóját használja, így az alkalmazás éles környezetben (akár almappába telepítve) is helyesen tölti be az erőforrásokat és megbízhatóan legenerálja a PDF-et.


## [1.6.0] - 2026-08-03

### Hozzáadva
- **Alsó tagozat – 6. óra elhozhatósága**: Az alsó tagozatos (1–4. osztály) tanulók az 5. óra mellett immár a **6. óráról** is elhozhatók fejlesztésre, amennyiben az a Kréta órarendben üres (lyukas), napközi, ebéd vagy szabadidő bejegyzésű. A szabály az automatikus és a manuális beosztásra egyaránt vonatkozik.
- **Felső tagozat – kizárólag testnevelés**: A felső tagozatos (5–8. osztály) tanulók **bármely órában (1–8.) kizárólag testnevelés** óráról hozhatók el fejlesztésre. Más tantárgyról (Rajz, Ének stb.) nem engedélyezett az elhozás. A tagozatos/nem tagozatos megkülönböztetés felső tagozaton nem érvényesül.
- **Napközis sávok másodlagos prioritása (fallback)**: Az automata tervező az alsó tagozatos 5–6. órai napközis/üres sávokat alacsonyabb pontszámmal értékeli, mint a rendes tantárgyi órákat (Rajz, Tesi, Ének). Így az algoritmus először a tantárgyi sávokat tölti fel, és csak szükség esetén helyez diákot napközis idősávba.
- **Sárga figyelmeztetési rendszer (warning tooltip)**: Új, nem blokkoló figyelmeztetési réteg a manuális drag-and-drop műveletekhez. A figyelmeztetés amber/sárga tooltipben jelenik meg, és a húzás engedélyezett marad. Jelenleg két figyelmeztetés működik:
  - **Évfolyam-keveredés**: Ha a pedagógus eltérő évfolyamú diákot húz egy meglévő csoportba, sárga üzenet jelzi az eltérést (pl. „Eltérő évfolyam! A csoportban 3. osztályos diák van, te 5. osztályost helyezel ide.").
  - **Felsős lyukasóra**: Ha a pedagógus felső tagozatos tanulót manuálisan az 5. órai lyukasórába helyez, sárga figyelmeztetés jelzi, hogy a diák nem rendes tanóráról kerül elhozásra.
- **Felső tagozat – lyukas 5–6. óra manuálisan engedélyezett**: A felső tagozatos tanulók manuális húzással beoszthatók az 5–6. órai lyukasórába (sárga figyelmeztetéssel), az automatikus tervező azonban továbbra sem használja ezeket a sávokat.

### Módosítva
- **Ütemező szűkösségszámolás konzisztenssé tétele**: A `scheduler.js` szűkösségszámolási logikája szinkronba került a `useStore.js` `getStudentConstraints` függvényével. Korábban a scheduler nem vette figyelembe az alsó tagozatos napközis kivételt az 5. órára, így tévesen priorizálhatta az alsós diákokat.
- **Súgó (RulesModal) szövegeinek frissítése**: Az elhozhatósági szabályok szekciója logikusan alsó és felső tagozatra lett szétválasztva beágyazott listákkal, kiegészülve a lyukasórák főszabályával.
- **Scheduler szűkösségszámolás DRY refaktorálása**: A `scheduler.js` saját ~50 soros szűkösségszámolása lecserélve a store központi `getStudentConstraints` függvényének hívására, megszüntetve a duplikált karbantartási kockázatot.
- **Tagozat-felismerés robusztussá tétele**: A törékeny `classId.includes('a')` ellenőrzés lecserélve a `/\.[ab]$/i` regex-alapú megoldásra, amely pontosan a KRÉTA osztályformátumot (pl. „2.a", „5.b") illeszti. Az összes érintett fájlban egységesítve: `useStore.js` (3 hely), `scheduler.js` (2 hely), `StudentCard.jsx` (1 hely).
- **Automata/manuális eltérések dokumentálása**: A `canAssignStudent` függvény JSDoc kommentjében táblázatos formában összefoglalva az automatikus és manuális beosztás közötti viselkedési különbségek (8 szabály).

## [1.5.0] - 2026-08-01

### Hozzáadva
- **KRÉTA-csoportmegjelölő rendszer**: Automatizált `[PedagógusKód]/[Sorszám]` csoportkód-generálás (például `2/1`, `2/2`, `2/3`, `2/10`, `2/12`, `2/13`), amely a KRÉTA rendszer csoportszámozási konvencióit követi.
- **Pedagóguskód és számozási irány beállítása**: A Beállítások modális ablakban konfigurálható a pedagógus KRÉTA-azonosítókódja (alapértelmezett: `2`), valamint a csoportok automatikus számozási iránya (függőleges / napok szerinti, illetve vízszintes / órák szerinti).
- **Manuális csoportkód-felülbírálás és érvényesítés**: Beépített szerkesztési lehetőség a naptárcellák jelvényén Enter billentyűs vagy pipagombos mentéssel. A rendszer automatikusan javítja az elgépeléseket (például `2.13`, `2-13`, `2,13` -> `2/13`), és valós idejű duplikációellenőrzéssel megakadályozza a névütközéseket.
- **Vízhatlan modálisablak-háttér eseménykezelése**: A `useRef` egérgomb-lenyomásos nyomon követéssel kiegészített háttéreseménykezelésnek köszönhetően a beviteli mezők kijelölése közben a kurzor túlszaladása többé nem zárja be véletlenszerűen a modális ablakokat.

### Javítva
- **Vektorgrafikus PDF-exportálás (jsPDF + jspdf-autotable)**: A korábbi `html2pdf.js` (html2canvas raszterizáló) motor lecserélése a `jsPDF` + `jspdf-autotable` vektorgrafikus PDF-motorra. A PDF-tartalom közvetlenül a Zustand store adataiból épül fel, fekvő (landscape) A4-es elrendezéssel, Unicode-kompatibilis Roboto betűtípussal, éles keretekkel és kereshető szöveggel.
- **Karakter-elvágási reguláris kifejezés javítása**: Kijavítottuk a csoportkód-érvényesítési regex tartományhibáját (`[.-\\\\/\\s,]`), amely a 10 feletti számoknál (például `2/12`, `2/13`) elnyelte az `1`-es számjegyet.

### Eltávolítva
- **html2pdf.js csomag**: Eltávolítva a projektből, mivel a html2canvas raszterizáló motor nem biztosított megbízható PDF-kimenetet (halvány szöveg, CSS-specifikussági ütközések, nem kereshető tartalom).
- **@media print CSS-blokkok**: Eltávolítva az `index.css`, `TimetableGrid.module.css` és `DropZoneCell.module.css` fájlokból, mivel a jsPDF motor nem használja a böngésző nyomtatási CSS-ét.

## [1.4.0] - 2026-07-13

### Hozzáadva
- **Zárolás mód gomblezárás**: A „Zárolás Mód" aktív állapotában a Súgó gomb kivételével az összes fejléc gomb (Automata tervezés, Naptár kiürítése, Importálás, Mentés, Export PDF, Beállítások) inaktívvá válik. Ez megakadályozza a párhuzamos műveletek véletlen végrehajtását zárolás közben.
- **Tooltip rendszer**: Minden fejléc gomb (Súgó kivételével) és a Zárolás Mód gomb egyedi, leíró tooltip-et kapott. A tooltip a gombok alatt jelenik meg indigo háttérrel, nyilacskával és lila árnyékkal, 500ms-es késleltetéssel – elhúzáskor azonnal eltűnik.
- **Helyettesítés zárolási típus**: Az idősáv-zárolási modalban ötödik lehetőségként megjelent a „Helyettesítés" gomb, amely rózsaszín háttérrel és csíkozással különbözteti meg magát a naptárban.
- **Build optimalizáció (Code Splitting)**: A Vite build konfigurációjában a `manualChunks` szétválasztja a vendor könyvtárakat (React, dnd-kit, xlsx) külön fájlokra, így egyetlen chunk sem lépi túl az 500 kB-os küszöböt, és a böngésző jobban gyorsítótárazhatja a ritkán változó függőségeket.
- **Relatív útvonalú build**: A `vite.config.js` fájlban `base: './'` beállítással a production build relatív útvonalakat generál, így a `dist` mappa bármilyen szerver-almappába telepíthető hardkódolt útvonal nélkül.

### Javítva
- **Idősáv kiürítése zároláskor**: Amennyiben egy idősávban már vannak beosztott tanulók és a felhasználó zárolja azt, a tanulók automatikusan eltávolításra kerülnek a naptárból és visszakerülnek a bal oldali beosztandó diákok listájába.
- **Kapacitás-figyelmeztetés szövegének pontosítása**: A „Vigyázat!" piros üzenet mostantól dinamikusan jelzi, hogy a kapacitáshiányt a pedagógus heti óraszám-korlátja (pl. „A beállított heti 12 órás korlátod miatt…") vagy a zárolt idősávok okozzák.
- **Pedagógus heti óraszám maximum**: A Beállítások modalban a maximális heti óraszám beviteli mezőjének felső korlátja 40-ről 26-ra csökkent (HTML `max` attribútum és JavaScript `Math.min` validáció).
- **Gombmagasságok egységesítése**: A naptár fejlécében a „Zárolás Mód" gomb és a „Heti órák" kapszula badge függőleges paddingjét a fejléc gombokéval azonosra (`0.5rem`) állítottuk, így vizuálisan egységes sormagasság alakult ki.
- **Gombváltás layout ugrás javítása**: A `.btn` alaposztály `border: none` szabályát `border: 1px solid transparent`-ra cseréltük, így a `btn-primary` (keretmentes) és `btn-secondary` (1px keret) közötti osztályváltás nem okoz 2px-es méretváltozást és layout ugrást.
- **Hover ugrás eltávolítása**: A `.btn-primary:hover` stílusból eltávolítottuk a `transform: translateY(-1px)` effektet, amely a zárolás gomb állapotváltásakor rövid villanást okozott.
- **Naptár sorok tömörítése**: A `periodLabel` és a `dropZone` cellák függőleges paddingjét csökkentettük, így a magasabb gombméret ellenére a naptár táblázat függőleges görgősáv nélkül elfér.

## [1.3.0] - 2026-07-10

### Hozzáadva
- **Beállítások (Settings) Modal**: Új, fogaskerék gombbal elérhető, glassmorphism stílusú egyedi modal ablak a legfontosabb paraméterek kezelésére (létszám korlát és manuális felülbírálás). Ezzel összhangban a Súgó (RulesModal) csoportlétszám-szabályzat szövegezése is frissült.
- **Csoportlétszám manuális felülbírálása**: Beállítási lehetőség és logika, amellyel a kártyák manuális húzásakor a pedagógus átlépheti a beállított csoportlétszám-limitet (pl. 6. tanuló beosztásakor), amennyiben a tanuló az adott órarendi órájáról egyébként elhozható (Rajz, Tesi, Ének).
- **8. óra támogatása**: A heti naptár kibővült a 8. órával (15:00 - 15:45 sáv), amelyet az Automata Tervező motor és a kapacitás kalkuláció (40 heti slot) is teljes mértékben támogat.
- **Egyedi Favicon**: Létrehoztunk egy új, prémium kék-indigo színátmenetes naptár ikont ábrázoló SVG favicont a `public/favicon.svg` helyen.
- **Importálási visszajelző modal**: Bevezettünk egy új visszajelző panelt a KRÉTA órarend (RTF/DOC), a mentett órarendterv (JSON), valamint az Excel tanulói lista betöltésének ellenőrzésére. A modal sikeres importálás esetén tájékoztatja a felhasználót a beolvasott adatokról (pl. felismert osztályok száma), míg sikertelen vagy nem megfelelő fájlformátum esetén pontos, piros figyelmeztető hibaüzenettel segíti a munkát.
- **Pedagógus heti óraszám korlátozása**: Beállítási lehetőség a fejlesztőpedagógus heti maximális megtartott óraszámának (kapacitásának) korlátozására a Settings modalban. Ezt a korlátot a rendszer szigorúan érvényesíti az órarend tervezésekor: az automata tervező nem nyit meg új idősávokat a beállított limit felett, manuális beosztás esetén pedig piros tooltip és blokkolás akadályozza meg a limit túllépését.
- **Pedagógus terheltség kijelző (badge)**: A naptár fejlécében, a cím és a jelmagyarázat között egy indigo árnyalatú kapszula badge jelzi a pedagógus aktuális és maximális heti óraszámát (pl. „Heti órák: 8 / 12"). Ez munka közben azonnali visszajelzést ad a kapacitásról.
- **Diákkapacitás kalkuláció pontosítása**: A bal oldali sáv terheltségi indikátora mostantól figyelembe veszi a pedagógus heti maximális óraszámát is. Ha a pedagógus kapacitása a szűk keresztmetszet (pl. 12 óra < 40 szabad slot), a sáv a valós korlátot mutatja.
- **Speciális zárolási stílusok**: A zárolt naptárcellák egyedi háttérszínt és csíkozást kaptak a zárolás típusa alapján: borostyán (Ebédeltetés), indigo (Értekezlet), smaragdzöld (Ügyelet). A Napközi az eredeti sötét alapértelmezett stílusban marad.

### Javítva
- **Egyedi kiürítés-megerősítő modal**: A "Naptár kiürítése" gomb már nem a böngésző natív `confirm` ablakát hívja meg, hanem egy elegáns, piros figyelmeztető színvilágú glassmorphism modalt.
- **Naptáron belüli Drag & Drop overlay**: Kijavítottuk a naptár cellái közötti áthúzáskor a lebegő kék kártya (DragOverlay) láthatósági hibáját. A store-ból importált `cleanStudentId` segédfüggvénnyel az Excelből beolvasott kötőjeles (pl. `excel-1`) tanulók áthelyezésekor is helyesen renderelődik a kurzor alatti kártya.
- **Naptár alatti sötét sáv eltüntetése**: A táblázat (`.timetable`) és a wrapper div (`.tableResponsive`) stílusainak magasságát `100%`-ra állítottuk, így a naptár pontosan kitölti a rendelkezésre álló helyet, megszüntetve a táblázat alól kilógó 10px-es sötét csíkot. Esztétikai okokból a legalsó (8. óra) sor alatti felesleges szegélyt (border-bottom) is eltávolítottuk, a sorok hajszálpontos és egyenlő függőleges eloszlását pedig a `tbody tr` magasságának finomhangolásával biztosítottuk, így a 8. óra sora sem magasabb a többinél.
- **Automata tervező üres-állapot validációja**: Megakadályoztuk, hogy az „Automata tervezés” gomb megnyomásakor sikeres üzenet jelenjen meg, ha még nincsenek tanulók vagy KRÉTA órarend adatok betöltve. Ehelyett részletes hibaüzenet (piros x ikonnal) tájékoztatja a felhasználót az importálási teendőkről.
- **Tervezési eredmény modal gomb igazítása**: Kijavítottuk az eredményjelző modal „Rendben, értettem” gombjának (`.schedulerButton`) hibás szövegigazítását. A flexbox alapú gombon belül a `justify-content: center` szabállyal a felirat most már tökéletesen középre került.

## [1.2.9] - 2026-07-10

### Módosítva
- **Diákválasztó Modal (StudentSelectionModal) UX tisztítás**:
  - **Átrendezett felület**: Az osztály-gyorsszűrő gombok bekerültek a legfelső helyre a jobb láthatóság és a fentről lefelé haladó munkafolyamat érdekében (előbb szűrünk, alatta jelölünk ki csoportosan).
  - **Tipp-tooltip a gomb mellett**: A korábbi statikus tippboxot eltávolítottuk, helyette a „Kijelöltek hozzáadása a listához” gomb mellé egy diszkrét 💡 ikon került, mely fölé víve az egeret dőlt betűs, stílusos lebegő tipp (tooltip) jelenik meg. Ez rengeteg értékes helyet szabadított fel.
  - **Gomb sortörés elleni védelme**: A fő akciógomb megkapta a `white-space: nowrap` formázást, garantálva, hogy a gomb felirata sose törjön meg.
  - **Felesleges szövegek eltávolítása**: Töröltük az „Az Excel fájlban X diák található...” felesleges magyarázó szöveget, aminek köszönhetően a diákokat tartalmazó táblázat területe jelentősen megnövekedett (3 sor helyett most már 12-15 sor látható egyszerre).

## [1.2.8] - 2026-07-10

### Hozzáadva
- **Osztály gyorsszűrő gombok (StudentSelectionModal)**: A diákválasztó modal tetején mostantól dinamikusan megjelennek az Excelből beolvasott egyedi osztályok gombjai (pl. `3.A`, `3.B`, `4.A`, stb.). Erre rákattintva a lista azonnal leszűrődik az adott osztály tanulóira (toggle logikával), megkönnyítve az osztályonkénti áttekintést és kijelölést.
- **Importálási tipp box**: Beépítettünk egy tipp panelt, amely felhívja a pedagógus figyelmét a hozzáfűző importálás előnyeire (hogy nyugodtan dolgozhat osztályonként).

### Módosítva
- **Összefésülő (Merge) diákimportálás**: Átalakítottuk a store `importExcelStudents` akcióját. A diákok beolvasása mostantól nem törli a meglévő tanulókat és nem nullázza le a naptárt (timetable). Az új tanulók hozzáfűződnek a listához, a meglévőknek pedig csak a heti óraigényük frissül (megtartva az eddigi naptári beosztásaikat). A fő gomb feliratát is egyértelműsítettük: *„Kijelöltek hozzáadása a listához”*.
- **Modal méret optimalizálás**: A modal magasságát fix 680px-re (max 90vh) növeltük, így egyszerre kb. 15 sor látható a táblázatban, csökkentve a felesleges görgetést.

## [1.2.7] - 2026-07-10

### Javítva
- **Excel Kötőjeles ID kezelés (Bugfix)**: Javítottuk az ID tisztító logikát a store-ban és a naptárcellákban. Korábban a kötőjelek mentén történő `split('-')[0]` kettévágta az Excelből importált tanulók egyedi azonosítóit (pl. `excel-1` helyett csak `excel`-t adott vissza), ami miatt sem a manuális beosztás, sem az automata tervező nem talált egyetlen tanulót sem a store-ban. A hibát egy univerzális `cleanStudentId` segédfüggvény bevezetésével, valamint a `DropZoneCell`-ben a tömb-végéről-visszafelé-indexelés (array-back-indexing) alkalmazásával oldottuk meg, így a kötőjeles azonosítók is tökéletesen érvényesülnek.

## [1.2.6] - 2026-07-10

### Javítva
- **Naptári drag validáció és tantárgy kiírás (Bugfix)**: Visszaállítottuk az `App.jsx` `handleDragStart` metódusában az prefixes `activeStudentId` store-szinkronizációt. Ezzel egy időben a store `canAssignStudent` és `getAssignmentValidationError` metódusaiban kiterjesztettük a `cleanStudentId` tisztítást (az `enrolled-` prefixek és a split kezelésével). Ez elhárította a hibát, amely miatt a naptáron belüli áthúzáskor a cellák tévesen pirosak lettek, és a zöld celláknál nem íródott ki az elhozható tantárgy neve.

## [1.2.5] - 2026-07-10

### Hozzáadva
- **Alsós 5. órai napközi szabály kivétel**: Az alsó tagozaton (1-4. osztály) az 5. idősávot a rendszer mostantól nem tekinti merev lyukasórának, ha az üres (lyukas) a KRÉTA órarendben, vagy napközi/ebéd bejegyzésű. Ezen a sávon a diákok elhozhatók fejlesztő órára mind manuális húzáskor, mind az automata tervezés során.

### Módosítva
- **Szűkösség számítás**: A `getStudentConstraints` metódus frissítésre került, így a szűkösségi mutató és a pulzáló figyelmeztetések is pontosan figyelembe veszik az alsósok 5. órájában megnyíló napközis mozgásteret.
- **Súgó (Szabályok)**: A Súgó modal tantárgyi szabályok listájában részletesen elmagyaráztuk az 5. órai alsós napközis kivételt a lyukasóra szabály alól.

## [1.2.4] - 2026-07-10

### Hozzáadva
- **Naptáron belüli áthúzás (Enrolled Student Drag & Drop)**: A naptár celláiba beosztott diákok kártyái közvetlenül áthúzhatók lettek egy másik nap/idősáv cellába. Az áthelyezésnél a program automatikusan kezeli a napi limit ellenőrzést, biztosítva a zökkenőmentes napon belüli átcsoportosítást.
- **Naptár kiürítése gomb**: A felső menüsávban elhelyezett piros gombbal a teljes naptár kiüríthető egyetlen kattintással (megerősítés után). A zárolt órák és a diákok listája megmarad.
- **Completed (Kész) diákok kuka ikonja**: A sidebar aljára beépítettük a „Kész tanulók” listát. Minden beosztott diák kártyája kapott egy kis piros kuka ikont. Erre kattintva a diák összes órarendi bejegyzése törlődik egyszerre, és a diák visszaugrik a beosztandó diákok közé.

### Módosítva
- **Manuális évfolyam-felülbírálás**: Az eltérő évfolyamok azonos csoportba tételének tilalmát az automata számára szigorúan fenntartjuk, de a manuális Drag & Drop húzásnál engedjük a pedagógusnak a felülbírálást (a cella zöld és húzható marad).
- **PointerSensor activation constraint**: 5 pixeles elmozdulás küszöböt állítottunk be az egéreseményekhez, így a kártyákon lévő törlés (X) gombok kattintása nem ütközik az áthúzás indításával.
- **Súgó frissítése**: A Súgó modal részletesen leírja a manuális szabályfelülbírálás és a meglévő beosztások bebetonozásának (Automata általi tiszteletben tartásának) logikáját.

## [1.2.3] - 2026-07-10

### Hozzáadva
- **Validációs Tooltip**: A naptár celláinál húzás közben ha az egér érvénytelen cella felett áll, egy sötétpiros, animált buborékban (tooltip) megjelenik a pontos elutasítási indok (pl. *„Már be van osztva egy órára ezen a napon”*, *„Eltérő évfolyam!”*, *„Tagozatos diák nem hozható el...”*).
- **Szűkösség Figyelmeztető Ikon**: A bal oldali sidebarban a diákok kártyái mellett egy pulzáló `⚠️` ikon jelenik meg, ha a diák órarendjében 2 vagy kevesebb alkalmas időpont maradt az egész héten. Hover esetén részletes magyarázatot ad.
- **Zárolási Gyorsgombok**: A Zárolás modalban 4 gyorsgomb („Napközi”, „Ebédeltetés”, „Értekezlet”, „Ügyelet”) jelent meg a beviteli mező alatt az azonnali rögzítéshez.

### Módosítva
- **Rendezett Sidebar diákok**: A bal oldali „Beosztandó diákok” listát mostantól a mozgásterük (szűkösségi mutatójuk) szerint növekvő sorrendben rendereli az oldal. A kritikus helyzetű diákok automatikusan felülre kerülnek.

### Javítva
- **Excel Importőr Case-Sensitivity**: Az Excel importálása során az osztályneveket (`classId`) automatikusan kisbetűsítjük, így elkerülve a nagybetűs eltérésekből (`2.A` vs `2.a`) fakadó Kréta validációs hibákat.

## [1.2.2] - 2026-07-10

### Hozzáadva
- **Új Súgó Fül**: Bővült a Súgó modal egy dedikált „Tervező algoritmus” füllel, amely közérthetően elmagyarázza a felhasználónak a Constraint-based ütemezés és a csoporttömörítés működését.

### Módosítva
- **Szűkösség (Constraint Density) Alapú Tervezés**: Az Automatikus Tervező a beosztási kísérlet előtt kiszámítja minden diákra, hogy az órarendjük (Rajz, Tesi, Ének elhozhatóság) és a zárolások alapján hány idősáv áll rendelkezésükre. A legkevesebb lehetséges helyet kapó diákok prioritást élveznek, így ők kerülnek beosztásra először.
- **Csoport-tömörítő (Group-filling) Heurisztika**: Az algoritmus a lehetséges üres idősávok helyett előnyben részesíti a már megkezdett és azonos évfolyamú csoportokat. Ezzel elkerüljük az 1 fős csoportok felesleges burjánzását és maximálisan kihasználjuk a pedagógus kapacitását.
- **Store ID Konzisztencia**: A store `canAssignStudent` és `assignStudent` metódusai belsőleg azonnal megtisztítják a diák ID-kat a `student-` prefix-től, így megelőzve az ütközéseket a Dnd-kit azonosítóival.
- **Szigorú Létszámellenőrzés**: A csoportméret limit (`maxGroupSize`) beépítésre került a közös validátorba (`canAssignStudent`).

## [1.2.1] - 2026-07-10

### Módosítva
- **CSS Modules Refaktorálás (Best Practice)**: A két monolitikus stíluslap (`Layout.css` + `index.css`) teljes szétbontása komponensenkénti CSS Module fájlokra (`*.module.css`). Minden komponens mellé saját, scope-izolált stíluslap került, a Vite beépített CSS Modules támogatásával. Az `index.css` a globális változókat, resetet, és a több komponens által közösen használt utility class-okat (`btn-*`, `badge`, `modal-*`, `glass-panel`, `fade-in`) tartalmazza.
- **Inline Stílusok Kihelyezése**: Az `App.jsx`, `StudentCard.jsx`, `TimetableGrid.jsx`, `DropZoneCell.jsx` és `StudentSelectionModal.jsx` komponensekből ~60 db `style={{...}}` inline objektum eltávolítva és CSS osztályokká alakítva. Egyetlen megengedett kivétel a CSS custom property átadás (`style={{ '--progress': ... }}`).
- **`Layout.css` Törlése**: A fájl teljes tartalma szétoszlott az `index.css` globális részei és a 6 db új `.module.css` fájl között. A korábbi `.student-card` CSS duplikáció (149. és 469. sor) is feloldásra került.

### Javítva
- **Drag & Drop Szaggatott Keret Levágódás**: A refaktorálás során a CSS specificitás változása miatt a táblázat cellák szegélye (`border-collapse`) felülírta a validációs szaggatott kereteket (`drop-valid`, `drop-invalid`). A `border` tulajdonság `outline`-ra cserélve (az `outline-offset` finomhangolásával), amely nem vesz részt a `border-collapse`-ban, így a zöld/piros szaggatott vonal újra körbeöleli a cellákat.

## [1.2.0] - 2026-07-10

### Hozzáadva
- **Automata Ütemező (Varázslat)**: Teljes értékű "Greedy" (mohó) algoritmus implementálása (`scheduler.js`), amely egyetlen kattintással megkísérli a beosztandó diákok *összes* heti óraigényét elhelyezni a naptárban.
  - Tiszteletben tartja a napi részvételi korlátokat (egy diák napi max 1 órán vehet részt).
  - Tiszteletben tartja a csoportlétszám (max 5 fő) korlátot.
  - Tiszteletben tartja a Kréta órarendi elhozhatóságot és az évfolyam-egyezést.
- **Kapacitás és Állapot Indikátor**: Új, vizuális haladási sáv a "Beosztandó diákok" oldalsávban, amely valós időben mutatja a szabad/foglalt kapacitást, figyelembe véve a zárolt órákat és a maximum csoportlétszámot.
- **Egyedi Modalok (Custom Alerts)**: 
  - Az Automata Ütemező végrehajtása után egy prémium eredményjelző ablak (sikeres/sikertelen beosztások statisztikájával) ugrik fel az elavult böngészős alert helyett.
  - A Zárolás Mód `window.prompt` ablaka is cserélve lett egy a dizájnba illeszkedő "Zárolás oka" felugró ablakra a rács fölött.

### Módosítva
- **StudentCard (Diák Kártya) Redesign**: 
  - A kártyák extrém helytakarékosak (vékonyak) lettek (`flex-direction: row` az egy soros elrendezéshez).
  - Eltűntek a felesleges "Oszt.: " és "Igény: " feliratok, a dobozos háttér és a sárga keret. 
  - Helyette a diák neve mellett közvetlenül a jobb oldalon nagyban (1.2rem) szerepel az osztály (megtartva az eredeti, tag/non-tag feltűnő színét), és "X. óra" sorszámozott formátumban a heti igény.
- **Dinamikus Lista Tisztítás**: A bal oldali "Beosztandó diákok" lista már csak a **fennmaradó** igényeket (vagy félig beosztott diákokat) mutatja. Amint egy diák minden óráját megkapta, eltűnik a listából. Teljes siker esetén egy zöld pipás "Minden diák beosztva!" üzenet jelenik meg. A memóriából a kezdő példaadatok végleg törlésre kerültek, az alkalmazás "tiszta lappal" indul.
- **Információgazdag Naptárcellák**: A naptárba behúzott/beosztott diákok nevei mellett mostantól (kisebb méretben, halványan) az osztályuk is megjelenik a gyors vizuális tájékozódás érdekében.

### Javítva
- **"Magára húzás" kiskapu bezárása**: A `canAssignStudent` függvény kiegészült egy szigorított `isAutoScheduler` VIP paraméterrel. Ezzel sikeresen megakadályozható, hogy az Automata motorja egy azonos napon többször is ugyanabba a cellába húzzon egy több igénnyel rendelkező diákot, így garantálva a hiánytalan beosztást (Load Balancing).

## [1.1.1] - 2026-07-10

### Hozzáadva
- **Tanuló Excel Importáló**: Létrejött a dedikált Excel beolvasó motor (`.xlsx` fájlokhoz), mely a KRÉTA tanulóexport dokumentumból automatikusan listázza a beosztandó diákokat (Név és Osztály alapján).
- **KRÉTA Exportálási Útmutató**: A Súgó modal kibővült az "Osztályórarendek" és a "Tanulói lista" KRÉTA rendszerből való kinyerésének pontos, menüpontos lépéseivel.
- **Súgó (Szabályzat) Modal**: Beépítésre került egy új, információs ablak az `Importálás` gomb mellé, mely részletesen foglalja össze az alkalmazás generálási és elhozhatósági szabályait.

### Javítva / Módosítva
- **Importálási Logika**: A KRÉTA RTF importálás már nem írja felül "próba tanulókkal" az Excelből előzőleg beolvasott, létező diáklistát.
- **Modal Design (Glassmorphism javítás)**: A felugró ablakok maszkja (overlay) megkapta a főoldali háttér színátmenetét, így a Modal dobozokon lévő üveg-hatás pontosan ugyanazt a prémium hatást éri el, mint a főképernyő panelei.
- **Súgó Gomb UI**: A Súgó gomb kapott egy dedikált halványsárga (figyelemfelkeltő, de nem tolakodó) kiemelést az egyértelmű vizuális navigáció érdekében.
- **Kódminőség (Best Practice)**: Eltávolításra kerültek a tiltott `!important` direktívák a nyomtatási nézetből (`@media print`). A `RulesModal` komponens kikerült a `DndContext` belsejéből, és a `createPortal` (React Portals) segítségével tisztán a DOM gyökérhez csatolódik. A `package.json` belső verziószáma szinkronba került a naplóval.

## [1.1.0] - 2026-07-10

### Hozzáadva
- **Szerkeszthető Órarend Cím**: A naptár fejlécében lévő statikus cím interaktív lett (inline szerkesztés), ami automatikusan kimentésre kerül a `.json` állapotba is. Személyre szabott, magyar "helyőrző" (placeholder) szövegekkel támogatva a felhasználót.

### Javítva
- **Dupla Fejléc Hiba**: Kijavítva a TimetableGrid dupla renderelési hibája az `App.jsx`-ben, ami miatt a címsor és a panel kétszer jelent meg (egymásba ágyazva).
- **Nyomtatási Nézet Tisztítása**: A szerkesztést jelző ceruza ikon eltávolításra került a PDF exportálás/nyomtatás során a `@media print` CSS szűréssel.
- **Papír Margó & Tájolás**: A nyomtatási CSS kiegészítése az alapértelmezett fekvő (landscape) tájolással, valamint a böngésző natív fejléc/lábléc adatainak (URL, dátum) eltüntetése a `@page` margó nullázásával.

## [1.0.0] - 2026-07-10

### Hozzáadva
- **Kréta RTF Parser Motor**: Integrált, saját fejlesztésű RTF olvasó, mely képes a Kréta `.doc`/`.rtf` órarendeket kliensoldalon feldolgozni (a bonyolult `\cellx` és `\cell` formázások okos negatív lookahead Regex szűrésével).
- **Okos Validációs Rendszer**: Az "a/b" (tagozatos) és "c" (nem tagozatos) osztályokra vonatkozó elhozási szabályok bevezetése (Rajz, Testnevelés és/vagy Ének-zene szerint).
- **Fejlett UX (Drag & Drop)**: Húzás indításakor a potenciális beosztási mezők zöld halványítást kapnak (`.possible-target`), a tiltottak elhalványodnak. Továbbá a zöld cellákon megjelenik egy kis üveg-hatású badge (`.subject-hint`), amely kiírja a cél tantárgyat.
- **Projekt Mentés/Betöltés (JSON)**: Az aktuális állapot egy kattintással elmenthető egy automatikusan elnevezett `.json` fájlba. Ugyanez az fájl a közös *Importálás* gombon keresztül azonnal visszatölthető az alkalmazásba.
- **PDF Exportálás (Nyomtatási Nézet)**: A `@media print` CSS direktívák segítségével kialakított speciális fekete-fehér rács nézet, amely a böngésző natív nyomtatás funkciójával azonnal A4-es méretű, "zajmentes" PDF dokumentumot vagy nyomatot készít.
- **Scrollbar Stilizálás**: Böngészőfüggetlen (WebKit és Firefox) elegáns "glass" stílusú, halvány görgetősáv integrálása.

### Módosítva
- Az *Importálás* gomb mostantól egyszerre tudadja a `.doc`, `.rtf` és `.json` fájlokat, tartalmuk alapján ágaztatva a logikát.

## [0.1.0] - 2026-07-10

### Hozzáadva
- **Projekt Alapok**: React + Vite inicializálása a 3000-es fejlesztői porton.
- **Állapotkezelés**: Zustand store (`useStore.js`) integrálása a naptár és a diákok adatainak kezelésére. Előkészítve a JSON-alapú mentés/import funkcióra.
- **Glassmorphism UI**: Teljes vizuális stílus (`Layout.css`, `index.css`) prémium, áttetsző sötét témával.
- **Naptár Rács**: TimetableGrid komponens, napokkal és idősávokkal (1-7. óra).
- **Drag & Drop Rendszer**: `@dnd-kit/core` beépítése a diák kártyák és a naptár cellák összekötésére. Több diák is behúzható egy cellába a "csoportos fejlesztés" logikája alapján (alapértelmezett korlát: 5 fő).
- **Dokumentáció**: Narratív `README.md` és `CHANGELOG.md` állományok létrehozása.

### Módosítva
- A húzás közbeni visszarepülő (drop) animáció kikapcsolva a gördülékenyebb vizuális élmény érdekében (`dropAnimation={null}`).
- A naptár táblázat méretezése `table-layout: fixed` tulajdonsággal finomítva a stabil, egyenlő oszlopszélességek megtartása érdekében (függetlenül a behúzott diáknevek hosszától).

### Javítva
- **Vízszintes görgetés (scroll) hiba**: A `DragOverlay` implementálásával az oldalsávból kihúzott kártyák most már egy független, lebegő rétegen mozognak, így nem tolják el a layoutot és nem okoznak felesleges görgetősávot.
- **Villogás és szövegkijelölés**: A `user-select: none` CSS szabállyal kiküszöbölve a böngésző véletlen, zavaró kék kijelölései az egérrel történő húzási (drag) interakciók alatt.
