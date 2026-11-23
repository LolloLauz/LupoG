// Borsa: pozioni e armi raccolte con E, scelte con i tasti numerici; i power-up restano automatici
// Ogni t(descrizione, condizione, dettaglio) è un controllo: se la condizione è falsa il test fallisce.
import { projectRoot } from "../helpers.mjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";
export const description = "Borsa: tasti E e 1-4, posti, pozioni impilate, armi, borsa piena, salvataggio, ripristino del livello";

export default async function (t, load) {
const {CONTROLS_CONFIG,INPUT_CONTEXT_ACTIONS}=await load('config/controlsConfig');
const {INVENTORY_CONFIG,BAG_SLOT_ACTIONS}=await load('config/inventoryConfig');
const {Inventory}=await load('systems/Inventory');const {ProgressManager}=await load('systems/ProgressManager');
const {ItemManager}=await load('systems/ItemManager');const {ScoreManager}=await load('systems/ScoreManager');
const {Player}=await load('entities/Player');const {CollisionSystem}=await load('systems/CollisionSystem');
const {ITEM_CONFIG}=await load('config/itemConfig');
const {CONTROLS_ROWS,CONTROLS_TABLE,CONTROLS_NOTES_Y}=await load('ui/ScreenManager');

// --- tasti
t("E raccoglie, solo durante il gioco",CONTROLS_CONFIG.pickUp.includes('KeyE')&&INPUT_CONTEXT_ACTIONS.gameplay.includes('pickUp')&&!INPUT_CONTEXT_ACTIONS.menu.includes('pickUp'));
t("un tasto numerico (anche del tastierino) per ogni posto della borsa",BAG_SLOT_ACTIONS.length===INVENTORY_CONFIG.slotCount&&BAG_SLOT_ACTIONS.every((a,i)=>CONTROLS_CONFIG[a].includes(`Digit${i+1}`)&&CONTROLS_CONFIG[a].includes(`Numpad${i+1}`)&&INPUT_CONTEXT_ACTIONS.gameplay.includes(a)));
t("la schermata dei controlli mostra E e 1-4 e la tabella non tocca le scritte sotto",CONTROLS_ROWS.some(r=>r.keyGroups.flat().includes('E'))&&CONTROLS_ROWS.some(r=>r.keyGroups.flat().join('')==='1234')&&CONTROLS_TABLE.firstRowY+(CONTROLS_ROWS.length-1)*CONTROLS_TABLE.rowStep+14<CONTROLS_NOTES_Y[0]);

// --- la borsa
{const b=new Inventory();
 t("all'inizio: spada nel posto 1, in mano, altri posti vuoti",b.bagSlots.length===4&&b.bagSlots[0]?.weaponId==='sword'&&b.equippedSlotIndex===0&&b.bagSlots.slice(1).every(s=>s===null));
 const r1=b.addWeapon('axe');
 t("un'arma nuova va nel primo posto libero e diventa quella in mano",r1.outcome==='added'&&r1.droppedWeaponId===null&&b.bagSlots[1]?.weaponId==='axe'&&b.equippedWeaponId==='axe');
 t("un'arma già nella borsa non si prende due volte",b.addWeapon('axe').outcome==='duplicate'&&b.weaponIds.length===2);
 const maxStack=INVENTORY_CONFIG.maxPotionsPerSlot;
 let added=0;while(b.addPotion())added++;
 t("le pozioni si impilano in un solo posto fino al limite (scorta piccola: conservarle aiuta molto)",added===maxStack*INVENTORY_CONFIG.maxPotionSlots&&b.bagSlots[2]?.kind==='potion'&&b.bagSlots[2].count===maxStack&&b.potionCount===added);
 t("raggiunto il limite di pozioni un'altra non entra, anche con un posto libero",!b.canAddPotion()&&b.bagSlots[3]===null);
 b.addWeapon('dagger');
 const r2=b.addWeapon('mace');
 t("borsa piena: l'arma nuova prende il posto di quella in mano, che va lasciata a terra",r2.outcome==='swapped'&&r2.droppedWeaponId==='dagger'&&b.bagSlots[3]?.weaponId==='mace'&&b.equippedWeaponId==='mace'&&!b.hasWeapon('dagger'));
 t("scegliendo il posto di un'arma la si impugna",b.selectSlot(0).kind==='equip'&&b.equippedWeaponId==='sword'&&b.equippedSlotIndex===0);
 t("scegliendo il posto di una pozione l'arma in mano non cambia",b.selectSlot(2).kind==='potion'&&b.equippedWeaponId==='sword');
 const snap=b.snapshot();
 let drunk=0;while(b.consumePotion(2))drunk++;
 t("bere: una pozione in meno alla volta; finite, il posto si libera",drunk===maxStack&&b.bagSlots[2]===null&&b.selectSlot(2).kind==='empty'&&!b.consumePotion(0));
 b.addWeapon('spear');
 b.restore(snap);
 t("il ripristino riporta la borsa esattamente com'era (anche l'arma in mano)",b.potionCount===maxStack&&b.bagSlots[2]?.count===maxStack&&b.equippedWeaponId==='sword'&&!b.hasWeapon('spear'));
 b.bagSlots[2].count=0;t("la copia non cambia se cambia la borsa",snap.slots[2].count===maxStack);
 b.reset(['spear','spear','sword'],'sword');
 t("reset: armi senza doppioni, nessuna pozione, l'arma in mano scelta",b.weaponIds.join()==='spear,sword'&&b.potionCount===0&&b.equippedWeaponId==='sword'&&b.equippedSlotIndex===1);
 b.reset([],'axe');t("reset senza armi: la spada",b.weaponIds.join()==='sword'&&b.equippedWeaponId==='sword');}

// --- progressi
const memory=()=>{const data=new Map();return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};};
{const pm=new ProgressManager(memory());t("senza salvataggio la borsa ha solo la spada",pm.bagWeaponIds.join()==='sword');}
{const m=memory();const pm=new ProgressManager(m);pm.setBagWeapons(['sword','axe'],'axe');
 const saved=JSON.parse(m.data.get('ironAndShadow.progress'));
 t("si salvano le armi della borsa e quella in mano (non le pozioni)",saved.bagWeaponIds.join()==='sword,axe'&&saved.equippedWeaponId==='axe'&&new ProgressManager(m).bagWeaponIds.join()==='sword,axe');
 const before=m.data.get('ironAndShadow.progress');m.data.set('ironAndShadow.progress',before);pm.setBagWeapons(['sword','axe'],'axe');
 t("se non cambia nulla non si riscrive",m.data.get('ironAndShadow.progress')===before);}
{const m=memory();m.data.set('ironAndShadow.progress',JSON.stringify({unlockedLevelId:3,difficulty:'easy',equippedWeaponId:'mace'}));
 const pm=new ProgressManager(m);t("un salvataggio senza borsa (2.0.0 o Fase 1) dà una borsa con l'arma in mano",pm.bagWeaponIds.join()==='mace'&&pm.equippedWeaponId==='mace'&&pm.unlockedLevelId===3);}
{const m=memory();m.data.set('ironAndShadow.progress',JSON.stringify({unlockedLevelId:2,difficulty:'normal',equippedWeaponId:'spear',bagWeaponIds:['sword','bazooka','axe','axe',7,'dagger','mace']}));
 const pm=new ProgressManager(m);t("borsa salvata non valida: niente armi sconosciute o doppie, l'arma in mano sempre presente, al massimo 4",pm.bagWeaponIds.length<=4&&pm.bagWeaponIds.includes('spear')&&new Set(pm.bagWeaponIds).size===pm.bagWeaponIds.length&&pm.bagWeaponIds.every(id=>['sword','dagger','spear','axe','mace'].includes(id)),pm.bagWeaponIds.join());}

// --- oggetti: pozioni da borsa, il resto (power-up compresi) come prima
{const cs=new CollisionSystem();const P=[{x:0,y:200,width:400,height:40}];const p=new Player(100,176);for(let i=0;i<5;i++)p.update(1/60,{isHeld:()=>false,wasPressed:()=>false,wasReleased:()=>false},cs,P,400);
 p.takeDamage(40,0);const hp=p.currentHealth;const im=new ItemManager();const sm=new ScoreManager();
 im.loadItems([{type:'healthPotion',position:{x:102,y:190}},{type:'powerSpeed',position:{x:104,y:190}}]);
 const got=im.collectItems(p,sm);
 t("solo la pozione è un oggetto da borsa",Object.values(ITEM_CONFIG).filter(d=>d.storedInBag).map(d=>d.id).join()==='healthPotion');
 t("toccando un power-up si attiva subito (come prima); la pozione no",got.length===1&&got[0].definition.id==='powerSpeed'&&p.modifiers.has('speed')&&p.currentHealth===hp);}

// --- motore
{const src=readFileSync(join(projectRoot,'src/core/GameEngine.ts'),'utf8');
 t("con E si prende prima un'arma, se non c'è una pozione (borsa piena: messaggio)",/private pickUpWithE[\s\S]*findReachablePickup[\s\S]*findReachableBagItem[\s\S]*addPotion\(\)[\s\S]*BORSA PIENA/.test(src));
 t("borsa piena: l'arma vecchia resta a terra, non prendibile finché non ci si allontana",/droppedWeaponId !== null\)[\s\S]{0,200}weaponPickups\.spawn\(result\.droppedWeaponId, centerX, pickup\.positionY \+ pickup\.height, false, result\.droppedAmmo \?\? null\)/.test(src));
 t("i tasti numerici usano il posto: arma in mano o pozione (non a salute piena)",/BAG_SLOT_ACTIONS\.forEach[\s\S]{0,400}useBagSlot\(slotIndex\)/.test(src)&&/currentHealth >= this\.player\.maxHealth\)[\s\S]{0,200}SALUTE PIENA[\s\S]{0,80}return;[\s\S]{0,80}consumePotion\(slotIndex\)/.test(src));
 t("ricominciando il livello la borsa torna com'era all'inizio del livello",/private restartCurrentLevel[\s\S]{0,500}this\.inventory\.restore\(this\.levelStartInventory\)/.test(src)&&src.includes('this.levelStartInventory = this.inventory.snapshot();'));
 t("a ogni nuova partita la borsa riparte dalle armi salvate, senza pozioni",/private startNewGame[\s\S]{0,600}this\.inventory\.reset\(this\.progressManager\.bagWeaponIds/.test(src));}
}
