// Fase 3 del piano espansioni: combo come sequenze di input (anche miste e ramificate), combo per arma,
// categoria aerea separata (combo in volo e colpo in picchiata con rimbalzo).
// Ogni t(descrizione, condizione, dettaglio) è un controllo: se la condizione è falsa il test fallisce.
import { projectRoot } from "../helpers.mjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";
export const description = "Combo: sequenze miste e ramificate, nomi, combo per arma, attacchi in aria, picchiata con rimbalzo";

export default async function (t, load) {
const {ComboManager}=await load('combat/ComboManager');
const {WEAPON_CONFIG}=await load('config/weaponConfig');const {ATTACK_DEFINITIONS}=await load('config/playerConfig');
const {GAME_CONFIG}=await load('config/gameConfig');
const {Player}=await load('entities/Player');const {CollisionSystem}=await load('systems/CollisionSystem');const {CombatSystem}=await load('combat/CombatSystem');
const W=WEAPON_CONFIG;
// le regole di combo miste e attacchi in aria valgono per le armi corpo a corpo (quelle a distanza tirano e basta)
const isRanged=w=>Object.values(w.attacks).some(a=>a.projectile||a.charge);
const MELEE=Object.values(W).filter(w=>!isRanged(w));

// --- ComboManager
const atk=id=>({id,damage:1,durationMs:100,hitStartMs:0,hitEndMs:50,cooldownMs:0,hitbox:{x:0,y:0,width:1,height:1},animation:id});
const attacks=Object.fromEntries(['a1','a2','a3','h1','h3','x2','x3'].map(id=>[id,atk(id)]));
const combos=[
 {id:'triple',name:'TRIPLA',inputSequence:['attack','attack','attack'],attackIds:['a1','a2','a3'],comboWindowMs:300},
 {id:'mixed',name:'MISTA',inputSequence:['attack','attack','heavyAttack'],attackIds:['a1','a2','h3'],comboWindowMs:300},
 {id:'short',name:'CORTA',inputSequence:['heavyAttack','attack'],attackIds:['h1','x2'],comboWindowMs:300},
 {id:'long',name:'LUNGA',inputSequence:['heavyAttack','attack','attack'],attackIds:['h1','x2','x3'],comboWindowMs:300},
];
const run=(inputs)=>{const m=new ComboManager(combos,attacks,{attack:'a1',heavyAttack:'h1'});const out=[];const names=[];for(const i of inputs){out.push(m.getNextAttack(i).id);names.push(m.drainCompletedCombo()?.name??'-');m.onAttackFinished();m.update(10);}return {ids:out.join(','),names:names.join(',')};};
t("ramificazione: dopo leggero, leggero il terzo tasto sceglie la combo",run(['attack','attack','attack']).ids==='a1,a2,a3'&&run(['attack','attack','heavyAttack']).ids==='a1,a2,h3');
t("la combo completata ha un nome, solo all'ultimo colpo",run(['attack','attack','heavyAttack']).names==='-,-,MISTA'&&run(['attack','attack','attack']).names==='-,-,TRIPLA');
t("una combo che è l'inizio di un'altra si completa e può continuare",(()=>{const r=run(['heavyAttack','attack','attack']);return r.ids==='h1,x2,x3'&&r.names==='-,CORTA,LUNGA';})());
t("un tasto che non continua nessuna combo fa ripartire la sequenza",run(['attack','heavyAttack','attack']).ids==='a1,h1,x2');
{const m=new ComboManager(combos,attacks,{attack:'a1',heavyAttack:'h1'});m.getNextAttack('attack');m.onAttackFinished();m.update(301);
 t("finestra scaduta: la combo riparte dal primo colpo",m.getNextAttack('attack').id==='a1'&&m.comboStep===1);}
{const m=new ComboManager(combos,attacks,{attack:'a1',heavyAttack:'h1'});m.getNextAttack('heavyAttack');m.getNextAttack('attack');m.reset();
 t("reset annulla anche la combo completata non ancora mostrata",m.drainCompletedCombo()===null);}

// --- dati delle combo di ogni arma (a terra e in aria)
const sets=Object.values(W).flatMap(w=>[[`${w.id} a terra`,w,w.combos,w.defaultAttackByInput],...(w.air?[[`${w.id} in aria`,w,w.air.combos,w.air.defaultAttackByInput]]:[])]);
t("ogni arma corpo a corpo ha la sua categoria di attacchi in aria (quelle a distanza tirano come a terra)",MELEE.length===5&&MELEE.every(w=>w.air!==undefined)&&Object.values(W).filter(isRanged).every(w=>w.air===undefined));
const bad=[];
for(const [label,w,cs,def] of sets){
 for(const c of cs){if(c.inputSequence.length!==c.attackIds.length||!c.attackIds.every(id=>w.attacks[id]))bad.push(`${label}/${c.id}: attacchi`);}
 for(const a of cs)for(const b of cs){if(a===b)continue;const n=Math.min(a.inputSequence.length,b.inputSequence.length);for(let k=1;k<=n;k++){if(a.inputSequence.slice(0,k).join()===b.inputSequence.slice(0,k).join()&&a.attackIds[k-1]!==b.attackIds[k-1])bad.push(`${label}: ${a.id}/${b.id} stesso inizio, attacchi diversi`);}}
 if(!def||!w.attacks[def.attack]||!w.attacks[def.heavyAttack])bad.push(`${label}: predefiniti`);
}
t("combo coerenti: attacchi dell'arma, e combo con lo stesso inizio usano gli stessi attacchi",bad.length===0,bad.slice(0,3).join('; '));
const unreachable=sets.flatMap(([label,w,cs])=>cs.flatMap(c=>c.attackIds.slice(0,-1).filter(id=>w.attacks[id].cooldownMs>=c.comboWindowMs).map(id=>`${label}/${c.id}: ${id}`)));
t("ogni combo si può davvero eseguire: il recupero di un colpo è più breve della finestra per il successivo",unreachable.length===0,unreachable.join('; '));
t("ogni arma corpo a corpo ha almeno una combo mista (leggero e pesante) con un nome",MELEE.every(w=>w.combos.some(c=>c.inputSequence.includes('attack')&&c.inputSequence.includes('heavyAttack')&&c.name)));
t("tutte le combo di terra e in aria hanno un nome",sets.every(([,,cs])=>cs.every(c=>typeof c.name==='string'&&c.name.length>0)));
t("la picchiata è l'attacco pesante in aria di ogni arma corpo a corpo e non si usa a terra",MELEE.every(w=>w.attacks[w.air.defaultAttackByInput.heavyAttack].plunge!==undefined&&!w.combos.some(c=>c.attackIds.some(id=>w.attacks[id].plunge))&&!w.attacks[w.defaultAttackByInput.heavyAttack].plunge&&!w.air.combos.some(c=>c.attackIds.some(id=>w.attacks[id].plunge))));
t("la picchiata dell'ascia rompe la guardia e quella della mazza schiaccia le corazze",W.axe.attacks.axePlunge.breaksGuard===true&&W.mace.attacks.macePlunge.crushesArmor===true);
t("la picchiata scende più piano della velocità massima di caduta (non viene tagliata)",Object.values(W).every(w=>Object.values(w.attacks).every(a=>!a.plunge||a.plunge.fallSpeed<GAME_CONFIG.maxFallSpeed)));
t("il terremoto della mazza colpisce anche dietro (area che parte prima del corpo)",W.mace.attacks.maceQuake.hitbox.x<0&&W.mace.attacks.maceQuake.hitbox.x+W.mace.attacks.maceQuake.hitbox.width>20);

// --- il cavaliere
const cs=new CollisionSystem();const P=[{x:0,y:200,width:2000,height:40}];
const input=(pressed=[],held=[])=>({isHeld:a=>held.includes(a),wasPressed:a=>pressed.includes(a),wasReleased:()=>false});
const frame=(p,pressed=[],held=[])=>p.update(1/60,input(pressed,held),cs,P,2000);
const grounded=(weapon='sword')=>{const p=new Player(100,176);p.equipWeapon(W[weapon]);for(let i=0;i<5;i++)frame(p);return p};
// preme il tasto ogni 4 frame finché il colpo parte (come una persona; nel recupero si memorizza solo negli ultimi 200 ms)
const pressAndStart=(p,action,held=[])=>{let k=0;while(!p.activeAttack&&k<40){frame(p,k%4===0?[action]:[],held);k++;}return p.activeAttack?.id;};
const sequence=(p,inputs)=>{const ids=[];const names=[];for(const i of inputs){ids.push(pressAndStart(p,i));const n=p.drainCompletedComboName();if(n)names.push(n);while(p.activeAttack)frame(p);}return {ids:ids.join(','),names:names.join(',')};};
{const r=sequence(grounded(),['attack','heavyAttack']);t("spada: Spazio, J = fendente montante, con il suo nome",r.ids==='swordLight1,swordRising'&&r.names==='FENDENTE MONTANTE',JSON.stringify(r));}
{const r=sequence(grounded(),['attack','attack','attack']);t("spada: Spazio x3 resta il triplo fendente",r.ids==='swordLight1,swordLight2,swordLight3'&&r.names==='TRIPLO FENDENTE',JSON.stringify(r));}
{const r=sequence(grounded('dagger'),['attack','attack','attack','heavyAttack']);t("pugnale: Spazio x3, J = morso del serpente",r.ids.endsWith('daggerPiercer')&&r.names==='MORSO DEL SERPENTE',JSON.stringify(r));}
{const r=sequence(grounded('axe'),['attack','attack','heavyAttack']);t("ascia: Spazio, Spazio, J = spaccaossa",r.ids==='axeChop1,axeChop2,axeSkullSplitter',JSON.stringify(r));}
{const p=grounded();frame(p,['heavyAttack']);t("a terra J resta l'attacco pesante (non la picchiata)",p.activeAttack?.id==='swordHeavy');}
// in aria
const jumpTo=(p,frames)=>{frame(p,['jump'],['jump']);for(let i=0;i<frames;i++)frame(p,[],['jump']);};
{const p=grounded();jumpTo(p,4);const first=pressAndStart(p,'attack',['jump']);while(p.activeAttack)frame(p,[],['jump']);const second=pressAndStart(p,'attack',['jump']);const name=p.drainCompletedComboName();
 t("in aria Spazio, Spazio = combo in volo (due colpi)",first==='swordLight1'&&second==='swordLight2'&&name==='SPADA IN VOLO',`${first} ${second} ${name}`);}
{const p=grounded();pressAndStart(p,'attack');while(p.activeAttack)frame(p);jumpTo(p,3);const id=pressAndStart(p,'attack',['jump']);
 t("passando da terra all'aria la combo riparte (categorie separate)",id==='swordLight1'&&!p.isOnGround,id);}
{const p=grounded();jumpTo(p,18);const yBefore=p.positionY;frame(p,['heavyAttack']);
 t("in aria J = colpo in picchiata: si scende subito veloce",p.activeAttack?.id==='swordPlunge'&&p.velocityY>=W.sword.attacks.swordPlunge.plunge.fallSpeed&&p.currentState==='attack',`${p.activeAttack?.id} vy=${p.velocityY}`);
 for(let i=0;i<5;i++)frame(p);const hb2=p.getActiveAttackHitbox();
 t("l'area della picchiata è sotto il cavaliere (arriva oltre i piedi)",hb2!==null&&hb2.y+hb2.height>p.positionY+p.height&&hb2.y>p.positionY);
 let n=0;while(p.activeAttack&&n<120){frame(p);n++;}
 t("toccando terra la picchiata finisce, una volta sola il segnale di atterraggio",p.isOnGround&&p.activeAttack===null&&p.drainPlungeLanding()&&!p.drainPlungeLanding());
 frame(p,['attack']);t("dopo l'atterraggio c'è un breve recupero prima di attaccare",p.activeAttack===null);}
{const p=grounded();jumpTo(p,18);frame(p,['heavyAttack']);for(let i=0;i<5;i++)frame(p);
 const target={isAlive:true,hits:[],getBounds:()=>({x:p.positionX,y:p.positionY+p.height,width:12,height:10}),receiveHit(d){this.hits.push(d);}};
 const hits=new CombatSystem().processPlayerAttack(p,[target]);const bounced=p.bounceOffTarget();
 t("la picchiata colpisce chi è sotto e il cavaliere rimbalza verso l'alto",hits.length===1&&target.hits[0]===W.sword.attacks.swordPlunge.damage&&bounced&&p.velocityY<0&&p.activeAttack===null);
 frame(p,['heavyAttack']);t("dopo il rimbalzo si può subito colpire di nuovo in picchiata",p.activeAttack?.id==='swordPlunge');}
{const p=grounded();frame(p,['attack']);t("un colpo a terra non fa rimbalzare",!p.bounceOffTarget()&&p.activeAttack?.id==='swordLight1');}

// --- il nome della combo resta dentro lo schermo
{const {EffectsManager}=await load('rendering/EffectsManager');const {measureTextWidth}=await load('rendering/BitmapFont');
 const texts=[];const renderer=new Proxy({width:320,height:240},{get:(o,k)=>k in o?o[k]:k==='drawText'?(text,x)=>texts.push({text,x}):()=>{}});
 const fx=new EffectsManager();fx.addPopup('FENDENTE MONTANTE!',4,100);fx.addPopup('TERREMOTO!',318,100);fx.render(renderer,0,0);
 const inside=texts.every(({text,x})=>{const half=measureTextWidth(text,1)/2;return x-half>=0&&x+half<=320;});
 t("le scritte vicino ai bordi (nomi delle combo) restano dentro lo schermo",texts.length===4&&inside,JSON.stringify(texts.map(x=>x.x)));}

// --- motore e schermata
{const src=readFileSync(join(projectRoot,'src/core/GameEngine.ts'),'utf8');
 t("il motore fa rimbalzare la picchiata quando colpisce e mostra nome della combo e polvere d'atterraggio",/processPlayerAttack\(this\.player, targets\);[\s\S]{0,200}if \(hits\.length > 0\) \{\s*this\.player\.bounceOffTarget\(\);/.test(src)&&src.includes('drainCompletedComboName()')&&src.includes('drainPlungeLanding()'));}
}
