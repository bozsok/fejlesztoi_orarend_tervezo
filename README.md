# Órarend Tervező Fejlesztőpedagógusoknak

Üdvözöllek az **Órarend Tervező** alkalmazás dokumentációjában! Ez a projekt kifejezetten egy fejlesztőpedagógus munkájának megkönnyítésére jött létre. 

## A projekt célja
Minden tanév elején komoly kihívást jelent összeállítani egy olyan órarendet, amely figyelembe veszi az általános iskolai osztályok – esetenként nagyon eltérő és bonyolult – beosztásait, valamint az iskolai szabályokat (például, hogy egy tagozatos gyermeket melyik óráról lehet kikérni fejlesztésre). Ez az alkalmazás vizuálisan támogatja ezt a logikai és optimalizálási folyamatot.

A webalkalmazás képes beolvasni a KRÉTA rendszerből exportált órarendeket, majd egy letisztult, "húzd-és-ejtsd" (Drag & Drop) felületen keresztül lehetővé teszi, hogy a pedagógus pillanatok alatt beossza a diákokat a saját naptárába. A beépített üzleti logika automatikusan jelzi majd, ha egy diák nem hozható el egy adott idősávból, és kezeli azt is, ha egy időpontban több gyermeket (csoportosan) szeretnénk fejleszteni.

## Fő funkciók
- **Interaktív Naptár Rács:** Drag & Drop technológia egyedi, lebegő réteg (`DragOverlay`) vizualizációval.
- **Kréta Integráció:** Nyers `.doc` / `.rtf` kiterjesztésű exportált fájlok okos beolvasása és elemzése azonnal a kliensoldalon (saját RTF parser motorral).
- **Szabály-vezérelt Validáció:** A rendszer automatikusan megkülönbözteti a "tagozatos" és "nem tagozatos" diákokat a tantárgyi kivételek kapcsán.
- **Kimenet és Adatbiztonság:** JSON formátumú projekttárolás/visszatöltés egy gombnyomással, valamint letisztult, azonnal nyomtatható PDF/Papír export funkció.
- **Zustand Állapotkezelés:** Hordozható, reaktív kliensoldali adattárolás.
- **Glassmorphism Design:** Elegáns, áttetsző és modern felhasználói felület (UI) Vanilla CSS alapokon.

## Technológiai háttér
A projekt tisztán kliensoldali technológiákra épül:
- **Keretrendszer:** React (Vite alapokon, a lehető leggyorsabb betöltésért)
- **Állapotkezelő:** Zustand
- **Drag & Drop Engine:** @dnd-kit/core
- **Stílus:** Vanilla CSS (CSS változókkal)
- **Ikonok:** Lucide-React

## Fejlesztés elindítása
A futtatáshoz Node.js környezetre van szükség. 
1. Telepítsd a függőségeket: `npm install`
2. Indítsd el a dev szervert: `npm run dev`
3. Nyisd meg a `http://localhost:3000` címet a böngésződben.
