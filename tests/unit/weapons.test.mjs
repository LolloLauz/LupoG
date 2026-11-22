// Armi (Fase 0 del piano espansioni): definizioni, arma in mano, cambio d'arma, salvataggio
// Ogni t(descrizione, condizione, dettaglio) è un controllo: se la condizione è falsa il test fallisce.
import { projectRoot } from "../helpers.mjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";
export const description = "Armi: WeaponDefinition, spada come prima arma, cambio d'arma, arma salvata nei progressi";

export default async function (t, load) {
const {WEAPON_CONFIG,DEFAULT_WEAPON_ID,getAllWeaponAttacks,isWeaponId}=await load('config/weaponConfig');
const {ATTACK_DEFINITIONS,COMBO_DEFINITIONS,DEFAULT_ATTACK_BY_INPUT,PLAYER_CONFIG}=await load('config/playerConfig');
const {PLAYER_ANIMATIONS}=await load('config/animationConfig');
const {Player}=await load('entities/Player');const {CollisionSystem}=await load('systems/CollisionSystem');
const {ProgressManager}=await load('systems/ProgressManager');

// --- definizioni
const weapons=Object.entries(WEAPON_CONFIG);
t("ogni arma ha l'id uguale alla sua chiave e un nome",weapons.every(([k,w])=>w.id===k&&w.name.length>0));
t("l'arma di partenza esiste",WEAPON_CONFIG[DEFAULT_WEAPON_ID]!==undefined);
const allIds=weapons.flatMap(([,w])=>Object.keys(w.attacks));
t("gli id degli attacchi sono unici fra tutte le armi",new Set(allIds).size===allIds.length);
t("ogni attacco di un'arma ha l'id uguale alla sua chiave",weapons.every(([,w])=>Object.entries(w.attacks).every(([k,a])=>a.id===k)));
t("le combo di ogni arma usano solo i suoi attacchi, con lunghezze coerenti",weapons.every(([,w])=>w.combos.every(c=>c.inputSequence.length===c.attackIds.length&&c.attackIds.every(id=>w.attacks[id]!==undefined)&&c.comboWindowMs>0)));
t("ogni arma ha un attacco predefinito suo per attacco leggero e pesante",weapons.every(([,w])=>['attack','heavyAttack'].every(i=>w.attacks[w.defaultAttackByInput[i]]!==undefined)));
t("ogni attacco di ogni arma ha un'animazione con la stessa durata",weapons.every(([,w])=>Object.values(w.attacks).every(a=>{const an=PLAYER_ANIMATIONS[a.animation];return an!==undefined&&Math.abs(an.frameDurationMs*an.frameIds.length-a.durationMs)<0.01;})));
t("la velocità di camminata di ogni arma è positiva",weapons.every(([,w])=>w.movementSpeedMultiplier>0));
t("getAllWeaponAttacks riunisce gli attacchi di tutte le armi",Object.keys(getAllWeaponAttacks()).length===allIds.length);
t("isWeaponId riconosce solo le armi esistenti",isWeaponId('sword')&&!isWeaponId('bazooka')&&!isWeaponId(3)&&!isWeaponId('toString'));
// la spada è la prima arma e non cambia nulla rispetto alla 2.0
const sword=WEAPON_CONFIG.sword;
// (ogni modulo dei test è compilato a parte: si confronta il contenuto, non l'identità degli oggetti)
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
t("la spada contiene, invariati, gli attacchi, le combo e i predefiniti della 2.0",Object.entries(ATTACK_DEFINITIONS).every(([id,a])=>same(sword.attacks[id],a))&&same(sword.combos.slice(0,COMBO_DEFINITIONS.length),COMBO_DEFINITIONS)&&same(sword.defaultAttackByInput,DEFAULT_ATTACK_BY_INPUT)&&sword.movementSpeedMultiplier===1);
t("nel codice la spada riusa gli oggetti della 2.0 (più i suoi attacchi e combo nuovi)",/attacks: \{ \.\.\.ATTACK_DEFINITIONS, \.\.\.SWORD_EXTRA_ATTACKS \},\s*combos: \[\.\.\.COMBO_DEFINITIONS, \.\.\.SWORD_EXTRA_COMBOS\],\s*defaultAttackByInput: DEFAULT_ATTACK_BY_INPUT,/.test(readFileSync(join(projectRoot,'src/config/weaponConfig.ts'),'utf8')));

// --- giocatore e cambio d'arma
const cs=new CollisionSystem();const P=[{x:0,y:200,width:1024,height:40}];
const input=(pressed=[],held=[])=>({isHeld:a=>held.includes(a),wasPressed:a=>pressed.includes(a),wasReleased:()=>false});
const grounded=()=>{const p=new Player(100,176);for(let i=0;i<5;i++)p.update(1/60,input(),cs,P,1024);return p};
// arma di prova: un solo attacco (riusa l'animazione attack1, stessa durata), niente combo, più lenta
const a1=ATTACK_DEFINITIONS.swordLight1;
const testWeapon={id:'sword',name:'Prova',attacks:{testStab:{...a1,id:'testStab',damage:7}},combos:[],defaultAttackByInput:{attack:'testStab',heavyAttack:'testStab'},movementSpeedMultiplier:0.5};
{const p=grounded();
 t("il giocatore parte con la spada",p.equippedWeapon.id==='sword'&&Object.keys(ATTACK_DEFINITIONS).every(id=>p.equippedWeapon.attacks[id]!==undefined));
 p.update(1/60,input(['attack']),cs,P,1024);
 t("con la spada l'attacco leggero è swordLight1",p.activeAttack?.id==='swordLight1');
 p.equipWeapon(testWeapon);
 t("cambiando arma l'attacco in corso viene annullato",p.activeAttack===null&&p.equippedWeapon===testWeapon);
 for(let i=0;i<40;i++)p.update(1/60,input(),cs,P,1024);
 p.update(1/60,input(['attack']),cs,P,1024);
 t("con l'arma nuova si usano i suoi attacchi",p.activeAttack?.id==='testStab'&&p.activeAttack.damage===7,p.activeAttack?.id);
 for(let i=0;i<40;i++)p.update(1/60,input(),cs,P,1024);
 p.update(1/60,input(['heavyAttack']),cs,P,1024);
 t("anche l'attacco pesante segue l'arma",p.activeAttack?.id==='testStab');
 for(let i=0;i<40;i++)p.update(1/60,input(),cs,P,1024);
 const x0=p.positionX;for(let i=0;i<60;i++)p.update(1/60,input([],['moveRight']),cs,P,1024);
 t("la velocità di camminata segue l'arma",Math.abs((p.positionX-x0)-PLAYER_CONFIG.movementSpeed*0.5)<0.5,`${(p.positionX-x0).toFixed(2)}`);
 p.equipWeapon(WEAPON_CONFIG.sword);
 for(let i=0;i<40;i++)p.update(1/60,input(),cs,P,1024);
 p.update(1/60,input(['attack']),cs,P,1024);
 t("tornando alla spada si riparte dalla sua combo",p.activeAttack?.id==='swordLight1');}
// la combo non sopravvive al cambio d'arma
{const p=grounded();p.update(1/60,input(['attack']),cs,P,1024);
 for(let i=0;i<20;i++)p.update(1/60,input(),cs,P,1024);
 p.equipWeapon(testWeapon);p.equipWeapon(WEAPON_CONFIG.sword);
 p.update(1/60,input(['attack']),cs,P,1024);
 t("dopo un cambio d'arma la combo riparte dal primo colpo",p.activeAttack?.id==='swordLight1',p.activeAttack?.id);}

// --- progressi
const memory=()=>{const data=new Map();return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};};
{const m=memory();const pm=new ProgressManager(m);
 t("senza progressi salvati si parte con la spada",pm.equippedWeaponId==='sword');
 pm.setEquippedWeapon('sword');
 t("l'arma non scrive nulla se non cambia",m.data.size===0);}
{const m=memory();m.data.set('ironAndShadow.progress',JSON.stringify({unlockedLevelId:4,difficulty:'hard',equippedWeaponId:'sword'}));
 const pm=new ProgressManager(m);t("l'arma salvata viene letta",pm.equippedWeaponId==='sword'&&pm.unlockedLevelId===4);}
{const m=memory();m.data.set('ironAndShadow.progress',JSON.stringify({unlockedLevelId:3,difficulty:'easy'}));
 const pm=new ProgressManager(m);t("un salvataggio della 2.0.0 (senza arma) tiene livello e difficoltà e dà la spada",pm.equippedWeaponId==='sword'&&pm.unlockedLevelId===3&&pm.difficulty==='easy');}
{const m=memory();m.data.set('ironAndShadow.progress',JSON.stringify({unlockedLevelId:2,difficulty:'normal',equippedWeaponId:'bazooka'}));
 const pm=new ProgressManager(m);t("un'arma sconosciuta nei progressi torna alla spada",pm.equippedWeaponId==='sword'&&pm.unlockedLevelId===2);
 pm.unlockLevel(3);t("salvando di nuovo si scrive un'arma valida",JSON.parse(m.data.get('ironAndShadow.progress')).equippedWeaponId==='sword');}

// --- motore: a ogni partita si impugna l'arma salvata
{const src=readFileSync(join(projectRoot,'src/core/GameEngine.ts'),'utf8');
 const m=src.match(/private startNewGame\([^)]*\): void \{([\s\S]*?)\n  \}/);
 const resetBag='this.inventory.reset(this.progressManager.bagWeaponIds, this.progressManager.equippedWeaponId);\n    this.player.equipWeapon(WEAPON_CONFIG[this.inventory.equippedWeaponId]);';
 t("GameEngine dà al giocatore la borsa e l'arma salvate all'avvio e a ogni nuova partita",m!==null&&m[1].includes(resetBag)&&src.split(resetBag).length===3);}
}
