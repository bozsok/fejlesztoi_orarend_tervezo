import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, Info, ListOrdered } from 'lucide-react';
import styles from './RulesModal.module.css';

export default function RulesModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('feltetelek');
  const mouseDownTargetRef = useRef(null);

  if (!isOpen) return null;

  const handleOverlayMouseDown = (e) => {
    mouseDownTargetRef.current = e.target;
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && mouseDownTargetRef.current === e.currentTarget) {
      onClose();
    }
  };

  const modalContent = (
    <div className="modal-overlay fade-in" onMouseDown={handleOverlayMouseDown} onClick={handleOverlayClick}>
      <div 
        className="modal-content glass-panel" 
        onMouseDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2><Info size={24} className="icon-blue" /> Generálási és beosztási szabályok</h2>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tabBtn} ${activeTab === 'feltetelek' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('feltetelek')}
          >
            Feltételek és lépések
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'szabalyok' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('szabalyok')}
          >
            Beosztási szabályok
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'algoritmus' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('algoritmus')}
          >
            Tervező algoritmus
          </button>
        </div>

        <div className={`modal-body ${styles.tabbedContent}`}>
          {activeTab === 'feltetelek' && (
            <div>
              <p className="modal-subtitle">Ezen az oldalon találod azokat a feltételeket és sorrendi lépéseket, amelyeket követned kell a hibátlan órarend elkészítéséhez.</p>

              <div className={styles.ruleSection}>
                <h3><CheckCircle size={18} className="icon-green" /> Feltételek a helyes működéshez (KRÉTA Export)</h3>
                <p className={styles.ruleDesc}>A rendszer működéséhez elengedhetetlen az osztályórarendek és a tanulói lista megléte. Ezeket a KRÉTA rendszerből az alábbi lépésekkel tudod kinyerni:</p>
                <ul>
                  <li>
                    <strong>Osztályórarendek letöltése:</strong><br />
                    <small className={styles.ruleStepDesc}>
                      <em>Elektronikus napló/Adminisztrációs rendszer</em> szerepkör ➔ Dokumentumok menüpont ➔ Dokumentumok parancs ➔ Órarendek lenyíló lista ➔ Osztályok órarendje parancs.<br />
                      A megjelenő ablakban állítsd be a Hétválasztót (pl. 1. hét) és a Formátumot (Word). Válaszd ki az Osztályokat (pl. 2.a, 2.b), pipáld be az <strong>"Osztálybontások megjelenítése"</strong> jelölőnégyzetet, végül kattints a Letöltés gombra.
                    </small>
                  </li>
                  <li className="mt-3">
                    <strong>Tanulói lista letöltése:</strong><br />
                    <small className={styles.ruleStepDesc}>
                      <em>Adminisztrációs rendszer</em> szerepkör ➔ Nyilvántartás menüpont ➔ Tanulók parancs.<br />
                      A bal oldalon található szűrőfelületen állítsd be a <strong>BTMN: Igen</strong> feltételt ➔ Keresés gomb ➔ Export gomb ➔ Export parancs.
                    </small>
                  </li>
                </ul>
              </div>

              <div className={styles.ruleSection}>
                <h3><ListOrdered size={18} className="icon-blue" /> Végrehajtás lépései a kész órarendig</h3>
                <ol className={styles.ruleStepsList}>
                  <li><strong>Fájlok előkészítése:</strong> Töltsd le az Osztályórarendeket és a Tanulói listát a fenti útmutató alapján.</li>
                  <li><strong>Importálás:</strong> Kattints a felső menüsávban található 'Importálás' gombra, és válaszd ki a letöltött fájlokat a beolvasáshoz.</li>
                  <li><strong>Tanulók kiválasztása és igényeik megadása:</strong> A beolvasás után felugró ablakban pipáld be azokat a diákokat, akik részt vesznek a fejlesztésen, és állítsd be a heti óraigényüket (+ / - gombokkal).</li>
                  <li><strong>Automata Ütemezés:</strong> Kattints a felső menüsávban az 'Automata tervezés' gombra. A rendszer másodpercek alatt optimálisan szétosztja a tanulókat a naptárban.</li>
                  <li><strong>Finomhangolás:</strong> A "maradék" (vagy problémás) diákokat a bal oldali listából manuálisan (Drag & Drop) is behúzhatod a naptár megfelelő (zöld) celláiba.</li>
                  <li><strong>Zárolás és Nyomtatás:</strong> Ha elégedett vagy a beosztással, zárolhatod a lyukasórákat a 'Zárolás Mód' gombbal, majd kattints az 'Export (PDF)' gombra a kész órarend nyomtatásához.</li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'szabalyok' && (
            <div>
              <p className="modal-subtitle">Az intelligens órarend-tervező motor az alábbi belső szabályok alapján végzi el a diákok automatikus és manuális elhelyezését a naptárban:</p>

              <div className={styles.ruleSection}>
                <h3><Info size={18} className="icon-green" /> Elhozhatósági Szabályok (Tantárgyak)</h3>
                <ul>
                  <li><strong>Alsó tagozat (1–4. osztály):</strong>
                    <ul>
                      <li><strong>Tagozatos osztályok („a", „b"):</strong> A tanulók <u>csak és kizárólag</u> <strong>Rajz (Vizuális kultúra)</strong> és <strong>Testnevelés</strong> órákról hozhatók el.</li>
                      <li><strong>Nem tagozatos osztályok („c"):</strong> A tanulók <strong>Rajz</strong>, <strong>Testnevelés</strong>, valamint <strong>Ének-zene</strong> órákról is elhozhatók.</li>
                      <li><strong>5. és 6. óra (napközi/ebédeltetés):</strong> Ha ezek az órák a Krétában üresek (lyukasak), vagy napközi/ebéd/szabadidő bejegyzésűek, a tanulók <strong>elhozhatók fejlesztésre</strong> (mind az automata, mind a manuális beosztásnál). Az automata tervező ezeket a sávokat <u>másodlagos prioritással</u> kezeli: először a rendes tantárgyi órákat (Rajz, Tesi, Ének) tölti fel, és csak szükség esetén helyez ide diákot.</li>
                    </ul>
                  </li>
                  <li><strong>Felső tagozat (5–8. osztály):</strong>
                    <ul>
                      <li><strong>Kizárólag Testnevelés:</strong> A felső tagozatos tanulók az 1–6. órákban <strong>kizárólag testnevelés</strong> óráról hozhatók el fejlesztésre. Más tantárgyról (Rajz, Ének stb.) nem engedélyezett az elhozás. A tagozatos/nem tagozatos megkülönböztetés felső tagozaton nem érvényesül.</li>
                      <li><strong>Lyukas 5–6. óra (csak manuális):</strong> Ha egy felső tagozatos tanuló <strong>5. vagy 6. órája üres</strong> (lyukas) a Kréta órarendben, a pedagógus <u>manuális húzással</u> beoszthatja fejlesztésre. Az automata tervező nem használja ezeket a sávokat. A beosztáskor sárga figyelmeztetés jelzi, hogy a diák nem rendes tanóráról kerül elhozásra.</li>
                    </ul>
                  </li>
                  <li><strong>Lyukasórák főszabálya:</strong> A fent felsorolt kivételeken túl lyukasóráról (üres sávról) <u>nem hozhatók el</u> a tanulók.</li>
                </ul>
              </div>

              <div className={styles.ruleSection}>
                <h3><Info size={18} className="icon-green" /> Időbeli eloszlás és órakerethez tartozó korlátozások</h3>
                <ul>
                  <li><strong>7. és 8. óra kizárása:</strong> A 7. és 8. órára <u>szigorúan tilos tanulót beosztani</u>: sem manuális áthúzással, sem az automata tervezővel nem helyezhető ide diák. A fejlesztő foglalkozások kizárólag az <strong>1–6. órákban</strong> tarthatók meg.</li>
                  <li><strong>Különálló napok:</strong> Ha egy diáknak hetente többször is van fejlesztése, azok szigorúan <u>különböző napokra</u> kell, hogy essenek. (Egy napon belül maximum egy alkalom engedélyezett).</li>
                  <li>Nincs napszaki prioritás (az algoritmus oda osztja be a diákot az 1–6. órák között, ahová a tantárgyi szabályok miatt lehetséges).</li>
                </ul>
              </div>

              <div className={styles.ruleSection}>
                <h3><Info size={18} className="icon-green" /> Csoportos Fejlesztés (Keveredés)</h3>
                <ul>
                  <li><strong>Évfolyamok szétválasztása:</strong> Különböző évfolyamú diákok (pl. egy 2.-os és egy 4.-es) <u>nem kerülhetnek egy csoportba</u> ugyanabban az idősávban az automata tervezés futásakor. *(Manuális húzással a pedagógus ezt felülbírálhatja, ha szakmailag indokolt).*</li>
                  <li><strong>Osztályok keveredése:</strong> Azonos évfolyamú, de különböző osztályba járó gyerekek (pl. 4.a és 4.c) <u>beoszthatók együtt</u>.</li>
                  <li><strong>Csoportlétszám:</strong> Egy csoport (egy idősáv) létszáma nem haladhatja meg a beállított maximumot (amely alapértelmezetten 5 fő, de a Beállításokban módosítható). Manuális kártyahúzásnál ez a limit felülbírálható, ha a Beállítások menüben engedélyezve van a felülbírálás, és a diák órarendje egyébként ezt megengedi.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'algoritmus' && (
            <div>
              <p className="modal-subtitle">Az Automata tervezés egy speciális kényszer-alapú ütemező algoritmust (Constraint-based scheduling) használ, melyet kifejezetten a fejlesztő órarendek szűkös kényszerpályáira szabtunk:</p>

              <div className={styles.ruleSection}>
                <h3><Info size={18} className="icon-blue" /> 1. Szűkösség alapú ütemezési sorrend</h3>
                <p className={styles.ruleDesc}>Az algoritmus nem véletlenszerűen vagy névsorban halad a diákok beosztásakor, hanem kiszámítja az egyes diákok órarendi mozgásterét:</p>
                <ul>
                  <li>Minden tanulónál felmérjük az elhozható órák (Rajz, Tesi, Ének) és a zárolt időpontok alapján az egész héten lehetséges idősávok számát.</li>
                  <li><strong>A legszűkösebb diákok előre kerülnek:</strong> Azt a tanulót osztja be a rendszer legelőször, akinek a legkevesebb lehetséges helye van az órarendjében (pl. csak heti 2 alkalmas időpontja van a naptárban). A rugalmasabb, több lehetőséggel bíró diákok a lista végére kerülnek.</li>
                  <li>Ez garantálja, hogy a legnehezebben elhelyezhető diákok nem szorulnak ki a naptárból.</li>
                </ul>
              </div>

              <div className={styles.ruleSection}>
                <h3><Info size={18} className="icon-blue" /> 2. Csoport-tömörítés (Group-filling heurisztika)</h3>
                <p className={styles.ruleDesc}>Az algoritmus célja nem csupán a diákok elhelyezése, hanem a csoportok optimális tömörítése és az 1 fős csoportok burjánzásának megakadályozása:</p>
                <ul>
                  <li>Egy tanuló elhelyezésekor az algoritmus lepontozza a lehetséges idősávokat.</li>
                  <li><strong>Elsőbbség a megkezdett csoportoknak:</strong> Azok a sávok kapnak magas prioritást, ahol már van beosztva legalább egy tanuló, aki **azonos évfolyamra** jár és a csoport még nem érte el a maximumot (5 fő).</li>
                  <li><strong>Új csoport nyitása:</strong> Csak akkor nyit teljesen új idősávot az algoritmus, ha nincs már megkezdett azonos évfolyamú csoport, vagy azok már teljesen beteltek.</li>
                  <li><strong>Napközis sávok másodlagos prioritása:</strong> Az alsó tagozatos 5–6. órai napközis/üres sávok alacsonyabb pontszámot kapnak, mint a rendes tantárgyi órák. Az algoritmus először a Rajz, Tesi, Ének órákat tölti fel, és csak szükség esetén helyez diákot a napközis sávokba.</li>
                </ul>
              </div>

              <div className={styles.ruleSection}>
                <h3><Info size={18} className="icon-blue" /> 3. Manuális beosztások tiszteletben tartása (Bebetonozás)</h3>
                <p className={styles.ruleDesc}>Az Automata Tervező nem írja felül a korábbi vagy kézzel elhelyezett beosztásokat:</p>
                <ul>
                  <li>Ha egy diákot manuálisan már beosztottál egy vagy több órára, az algoritmus azokat **érintetlenül és bebetonozva hagyja**.</li>
                  <li>A rendszer érzékeli a meglévő beosztásokat, csökkenti a tanuló heti hátralévő igényét, és csak a megmaradt alkalmakat kísérli meg szétosztani a naptár többi szabad sávjába.</li>
                  <li>Ez lehetővé teszi a kiemelt diákok kézi elhelyezését, mielőtt a gép elvégezné a tömeges tervezést.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>Értettem</button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
