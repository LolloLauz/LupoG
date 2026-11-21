// Vite, record, menu, transizioni di stato, font
// Ogni t(descrizione, condizione, dettaglio) è un controllo: se la condizione è falsa il test fallisce.
export const description = 'Vite, record, menu, transizioni di stato, font';

export default async function (t, load) {

const {LivesManager}=await load('systems/LivesManager');
const {HighScoreManager}=await load('systems/HighScoreManager');
const {MenuManager}=await load('ui/MenuManager');
const {GameState}=await load('core/GameState');
const {getGlyphRows}=await load('rendering/BitmapFont');
const {GAME_CONFIG}=await load('config/gameConfig');
// vite
const l=new LivesManager();t('vite iniziali = startingLives (3)',l.remainingLives===3&&l.hasLivesLeft);
t('loseLife 3->2->1->0',l.loseLife()===2&&l.loseLife()===1&&l.loseLife()===0&&!l.hasLivesLeft);
t('mai sotto zero',l.loseLife()===0);l.addLife();t('addLife',l.remainingLives===1);l.reset();t('reset',l.remainingLives===3);
// record
const mem={};const st={getItem:k=>k in mem?mem[k]:null,setItem:(k,v)=>{mem[k]=v}};
let h=new HighScoreManager(st);t('record iniziale 0',h.bestScore===0);
t('primo punteggio = nuovo record',h.submitScore(500)===true&&h.bestScore===500);
t('punteggio minore/uguale non è record',h.submitScore(500)===false&&h.submitScore(100)===false&&h.bestScore===500);
t('punteggio zero non è record',new HighScoreManager({getItem:()=>null,setItem(){}}).submitScore(0)===false);
const h2=new HighScoreManager(st);t('persistenza: un nuovo manager rilegge 500',h2.bestScore===500);
t('record maggiore aggiorna e salva',h2.submitScore(1200)&&new HighScoreManager(st).bestScore===1200);
const broken={getItem(){throw new Error('x')},setItem(){throw new Error('y')}};
const hb=new HighScoreManager(broken);t('archivio guasto: non crasha, record in memoria',hb.bestScore===0&&hb.submitScore(300)===true&&hb.bestScore===300);
const hn=new HighScoreManager(null);t('senza archivio funziona in memoria',hn.submitScore(10)&&hn.bestScore===10);
mem['ironAndShadow.bestScore']='abc';t('valore corrotto -> 0',new HighScoreManager(st).bestScore===0);
mem['ironAndShadow.bestScore']='-5';t('valore negativo -> 0',new HighScoreManager(st).bestScore===0);
// menu
let pressed=new Set();const input={wasPressed:a=>pressed.has(a)};const press=(...a)=>{pressed=new Set(a)};
const m=new MenuManager([{label:'A',command:'a'},{label:'B',command:'b'},{label:'C',command:'c'}]);
t('cursore parte da 0',m.selectedItemIndex===0);
press('menuDown');m.update(input);t('giù -> 1',m.selectedItemIndex===1);
press('menuDown');m.update(input);press('menuDown');m.update(input);t('giù oltre la fine -> riparte da 0',m.selectedItemIndex===0);
press('menuUp');m.update(input);t('su dall\'inizio -> ultima voce',m.selectedItemIndex===2);
press('confirm');t('invio restituisce il comando della voce',m.update(input)==='c');
press();t('senza input nessun comando',m.update(input)===null);m.reset();t('reset',m.selectedItemIndex===0);
// stati
const g=new GameState();const ch=(s)=>g.change(s);
t('title->playing->gameOver->playing (riprova)',ch('playing')&&ch('gameOver')&&ch('playing'));
t('playing->victory->title',ch('victory')&&ch('title'));
t('title->controls->title',ch('controls')&&ch('title'));
t('transizioni vietate: title->gameOver, title->paused',!ch('gameOver')&&!ch('paused'));
// font
t('glifo ^ valido',getGlyphRows('^').length===9&&getGlyphRows('^').every(r=>r.length===5));
t('startingLives=3',GAME_CONFIG.startingLives===3);

}
