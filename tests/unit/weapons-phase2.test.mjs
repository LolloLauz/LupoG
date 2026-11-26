// Fase 2 del piano espansioni: armi a distanza (arco con carica, balestra, coltelli da lancio, giavellotto),
// proiettili del giocatore, munizioni nella borsa, coltelli da recuperare.
// Ogni t(descrizione, condizione, dettaglio) è un controllo: se la condizione è falsa il test fallisce.
import { FakeSpriteManager, projectRoot } from "../helpers.mjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";
export const description = "Armi a distanza: arco caricato, balestra, coltelli recuperabili, giavellotto, proiettili del giocatore, munizioni";

export default async function (t, load) {
const {WEAPON_CONFIG}=await load('config/weaponConfig');const {PROJECTILE_CONFIG}=await load('config/projectileConfig');
const {LEVEL_CONFIG}=await load('config/levelConfig');const {ENEMY_CONFIG}=await load('config/enemyConfig');
const {Player}=await load('entities/Player');const {Enemy}=await load('entities/Enemy');
const {CollisionSystem}=await load('systems/CollisionSystem');const {ProjectileSystem}=await load('systems/ProjectileSystem');
const {Inventory}=await load('systems/Inventory');const {WeaponPickupManager}=await load('systems/WeaponPickupManager');
const {registerProjectileSprites}=await load('rendering/sprites/projectileSprites');
const W=WEAPON_CONFIG;const RANGED=['bow','crossbow','throwingKnives','javelin'];

// --- configurazione
t("quattro armi a distanza: arco, balestra, coltelli, giavellotto",RANGED.every(id=>W[id]?.id===id));
const shotAttacks=RANGED.flatMap(id=>Object.values(W[id].attacks)).filter(a=>a.projectile);
t("ogni tiro usa un proiettile del giocatore, non deviabile, con i suoi sprite",(()=>{const sm=new FakeSpriteManager();registerProjectileSprites(sm);return shotAttacks.every(a=>{const p=PROJECTILE_CONFIG[a.projectile.projectileId];return p&&!p.isDeflectable&&['arrow','magicBolt','fireball'].indexOf(p.id)<0&&p.frameIds.every(f=>sm.sprites.has(f));});})());
t("le armi a distanza non feriscono con un'area d'urto (solo proiettili)",RANGED.every(id=>Object.values(W[id].attacks).every(a=>a.projectile||a.charge)&&Object.values(W[id].attacks).every(a=>a.hitbox.width===0)));
t("arco: J carica (rilascio con proiettile), Spazio tira subito",W.bow.attacks[W.bow.defaultAttackByInput.heavyAttack].charge!==undefined&&W.bow.attacks[W.bow.attacks.bowCharge.charge.releaseAttackId].projectile!==undefined&&W.bow.attacks[W.bow.defaultAttackByInput.attack].projectile!==undefined);
t("balestra: il colpo più forte tra i tiri singoli e una ricarica lunga",W.crossbow.attacks.crossbowShot.damage>=Math.max(...shotAttacks.filter(a=>a.id!=='javelinThrow').map(a=>a.damage))&&W.crossbow.attacks.crossbowShot.cooldownMs>=3*W.bow.attacks.bowShot.cooldownMs);
t("munizioni: coltelli (6, si recuperano), giavellotti (3, si perdono), arco 12 frecce e balestra 6 dardi (l'arma resta nella borsa vuota)",W.throwingKnives.ammo?.max===6&&!W.throwingKnives.ammo.isLostWhenEmpty&&W.javelin.ammo?.max===3&&W.javelin.ammo.isLostWhenEmpty&&W.bow.ammo?.max===12&&!W.bow.ammo.isLostWhenEmpty&&W.crossbow.ammo?.max===6&&!W.crossbow.ammo.isLostWhenEmpty);
t("il coltello si recupera, il giavellotto trafigge",PROJECTILE_CONFIG.throwingKnife.recoveredAsAmmoOf==='throwingKnives'&&PROJECTILE_CONFIG.javelin.isPiercing===true&&PROJECTILE_CONFIG.javelin.recoveredAsAmmoOf===undefined);
t("giavellotto: il colpo più forte di tutte le armi a distanza",W.javelin.attacks.javelinThrow.damage>Math.max(W.crossbow.attacks.crossbowShot.damage,W.bow.attacks.bowCharge.charge.maxDamage));

// --- il cavaliere tira
const cs=new CollisionSystem();const P=[{x:0,y:200,width:2000,height:40}];
const input=(pressed=[],held=[])=>({isHeld:a=>held.includes(a),wasPressed:a=>pressed.includes(a),wasReleased:()=>false});
const frame=(p,pressed=[],held=[])=>p.update(1/60,input(pressed,held),cs,P,2000);
// Classi Fase 3: l'arco lo impugna il Ranger, per cui è neutro (il Cavaliere ha ▼ sull'arco); qui si misurano i valori dell'arma
const {CHARACTER_CONFIG}=await load('config/characterConfig');
const grounded=(id,ammo=null)=>{const p=new Player(100,176,id==='bow'?CHARACTER_CONFIG.ranger:undefined);p.equipWeapon(W[id],ammo);for(let i=0;i<5;i++)frame(p);return p};
const fireAndCollect=(p,action,held=[],frames=30)=>{frame(p,[action],held);const launches=[...p.drainProjectileLaunches()];for(let i=0;i<frames;i++){frame(p,[],held);launches.push(...p.drainProjectileLaunches());}return launches;};
{const p=grounded('bow');frame(p,['attack']);for(let i=0;i<3;i++)frame(p);
 t("tirando non c'è area d'urto della spada",p.activeAttack?.id==='bowShot'&&p.getActiveAttackHitbox()===null);
 const l=[...p.drainProjectileLaunches()];for(let i=0;i<20;i++){frame(p);l.push(...p.drainProjectileLaunches());}
 t("arco, Spazio: una freccia del giocatore verso destra con il danno del tiro",l.length===1&&l[0].owner==='player'&&l[0].projectileId==='playerArrow'&&l[0].direction.x===1&&l[0].damage===W.bow.attacks.bowShot.damage,JSON.stringify(l));}
{const p=grounded('bow');p.facingDirection='left';const l=fireAndCollect(p,'attack');
 t("guardando a sinistra la freccia parte a sinistra, dal lato sinistro del corpo",l.length===1&&l[0].direction.x===-1&&l[0].origin.x<p.positionX+p.width/2);}
{const p=grounded('bow');const l=fireAndCollect(p,'heavyAttack',[],20);const c=W.bow.attacks.bowCharge.charge;
 t("arco, J appena toccato (un frame di carica): tiro quasi al minimo",l.length===1&&l[0].damage===c.minDamage&&l[0].speedMultiplier<c.minSpeedMultiplier+0.05,JSON.stringify(l));}
{const p=grounded('bow');const c=W.bow.attacks.bowCharge.charge;frame(p,['heavyAttack'],['heavyAttack']);for(let i=0;i<70;i++)frame(p,[],['heavyAttack']);
 t("tenendo premuto J l'arco si carica fino in fondo, senza tirare",p.chargeFraction===1&&p.drainProjectileLaunches().length===0);
 const l=[];for(let i=0;i<10;i++){frame(p);l.push(...p.drainProjectileLaunches());}
 t("rilasciando: freccia con danno e velocità massimi",l.length===1&&l[0].damage===c.maxDamage&&Math.abs(l[0].speedMultiplier-c.maxSpeedMultiplier)<1e-9,JSON.stringify(l));}
{const p=grounded('bow');frame(p,['heavyAttack'],['heavyAttack']);const half=Math.round(W.bow.attacks.bowCharge.charge.maxChargeMs/2/(1000/60));for(let i=0;i<half;i++)frame(p,[],['heavyAttack']);
 const l=[];for(let i=0;i<10;i++){frame(p);l.push(...p.drainProjectileLaunches());}const c=W.bow.attacks.bowCharge.charge;
 t("a metà carica il danno è circa a metà",l.length===1&&l[0].damage>c.minDamage&&l[0].damage<c.maxDamage,JSON.stringify(l.map(x=>x.damage)));}
{const p=grounded('bow');frame(p,['heavyAttack'],['heavyAttack']);let n=0,l=[];while(n<200){frame(p,[],['heavyAttack']);l.push(...p.drainProjectileLaunches());n++;if(l.length)break;}
 t("tenendo troppo a lungo l'arco tira da solo",l.length===1&&n*1000/60>=W.bow.attacks.bowCharge.durationMs-20,`${n} frame`);}
{const p=grounded('throwingKnives');let thrown=0;for(let k=0;k<6;k++){thrown+=fireAndCollect(p,'attack',[],20).length;}
 t("coltelli: sei lanci, uno per munizione",thrown===6&&p.currentAmmo===0);
 const l=fireAndCollect(p,'attack',[],20);t("senza munizioni non si lancia e c'è l'avviso",l.length===0&&p.activeAttack===null&&p.drainOutOfAmmo()&&!p.drainOutOfAmmo());
 p.setAmmo(99);t("le munizioni non superano il massimo",p.currentAmmo===6);}
{const p=grounded('javelin',1);const l=fireAndCollect(p,'attack',[],40);
 t("giavellotto: lancio ad arco verso l'alto, consuma la munizione",l.length===1&&l[0].direction.y<0&&l[0].projectileId==='javelin'&&p.currentAmmo===0);}
{const p=grounded('bow');p.applyPowerUp({id:'berserk',name:'x',description:'',type:'temporary',effects:[{stat:'damageMultiplier',mode:'multiply',value:1.5}],durationMs:5000,iconSpriteId:'itemBerserk',auraColor:'#ffffff'});const l=fireAndCollect(p,'attack');
 t("i power-up valgono anche per i tiri (Furia)",l[0]?.damage===Math.round(W.bow.attacks.bowShot.damage*1.5),JSON.stringify(l.map(x=>x.damage)));}

// --- proiettili del giocatore
const enemyAt=x=>{const e=new Enemy(ENEMY_CONFIG.skeleton,x,176);for(let i=0;i<10;i++)e.update(1/60,cs,P,2000);return e};
// come nel gioco: coltelli e giavellotti partono un po' verso l'alto (traiettoria ad arco)
const shoot=(sys,projectileId,x,dirX=1,damage=10)=>sys.spawn({projectileId,owner:'player',origin:{x,y:186},direction:{x:dirX,y:projectileId==='playerArrow'||projectileId==='crossbowBolt'?0:-0.15},damage});
{const sys=new ProjectileSystem();const pl=new Player(40,176);for(let i=0;i<5;i++)frame(pl);const e=enemyAt(150);const hp=e.currentHealth;
 shoot(sys,'playerArrow',70);let ev=[];for(let i=0;i<60&&sys.activeProjectiles.length;i++)ev.push(...sys.update(1/60,pl,P,2000,240,[e]));
 t("la freccia del giocatore colpisce il nemico (una volta) e sparisce",e.currentHealth===hp-10&&ev.filter(x=>x.kind==='hitTarget').length===1&&sys.activeProjectiles.length===0);}
{const sys=new ProjectileSystem();const pl=new Player(100,176);for(let i=0;i<5;i++)frame(pl);const hp=pl.currentHealth;
 shoot(sys,'playerArrow',90);for(let i=0;i<10;i++)sys.update(1/60,pl,P,2000,240,[]);
 t("i proiettili del giocatore non feriscono il giocatore",pl.currentHealth===hp);}
{const sys=new ProjectileSystem();const pl=new Player(40,176);for(let i=0;i<5;i++)frame(pl);const a=enemyAt(140),b=enemyAt(160);
 // altezza di lancio del giavellotto nel gioco: originY 4 dalla cima del cavaliere (176 + 4)
 sys.spawn({projectileId:'javelin',owner:'player',origin:{x:70,y:180},direction:{x:1,y:-0.2},damage:5});let hits=0;for(let i=0;i<60;i++)hits+=sys.update(1/60,pl,P,2000,240,[a,b]).filter(x=>x.kind==='hitTarget').length;
 t("il giavellotto trafigge: colpisce due nemici in fila, ognuno una volta",hits===2&&a.currentHealth<a.maxHealth&&b.currentHealth<b.maxHealth);}
{const sys=new ProjectileSystem();const pl=new Player(40,176);for(let i=0;i<5;i++)frame(pl);const walls=[...P,{x:150,y:150,width:20,height:50}];
 shoot(sys,'throwingKnife',70);let ev=[];for(let i=0;i<60;i++)ev.push(...sys.update(1/60,pl,walls,2000,240,[]));const drop=ev.find(x=>x.kind==='dropAmmo');
 t("il coltello contro un muro cade a terra davanti al muro, da recuperare",drop!==undefined&&drop.weaponId==='throwingKnives'&&drop.x<150&&drop.spriteId.startsWith('projectileKnife'));}
{const sys=new ProjectileSystem();const pl=new Player(40,176);for(let i=0;i<5;i++)frame(pl);const e=enemyAt(150);
 shoot(sys,'throwingKnife',70);let ev=[];for(let i=0;i<60;i++)ev.push(...sys.update(1/60,pl,P,2000,240,[e]));
 t("il coltello che colpisce un nemico cade a terra lì",ev.some(x=>x.kind==='hitTarget')&&ev.some(x=>x.kind==='dropAmmo'&&Math.abs(x.x-155)<20));}
{const sys=new ProjectileSystem();const pl=new Player(40,176);for(let i=0;i<5;i++)frame(pl);
 shoot(sys,'throwingKnife',1990);let ev=[];for(let i=0;i<120;i++)ev.push(...sys.update(1/60,pl,P,2000,240,[]));
 t("un coltello uscito dalla mappa è perso",!ev.some(x=>x.kind==='dropAmmo')&&sys.activeProjectiles.length===0);}
{const sys=new ProjectileSystem();const pl=new Player(40,176);for(let i=0;i<5;i++)frame(pl);frame(pl,['attack']);for(let i=0;i<6;i++)frame(pl);
 shoot(sys,'crossbowBolt',62);sys.update(1/60,pl,P,2000,240,[]);
 t("la spada non distrugge i proiettili del giocatore",sys.activeProjectiles.length===1);}

// --- borsa e munizioni
{const b=new Inventory();const r=b.addWeapon('throwingKnives');
 t("coltelli nella borsa con le munizioni piene",r.outcome==='added'&&b.equippedAmmo===6);
 b.setEquippedAmmo(2);t("la borsa segue le munizioni in mano",b.equippedAmmo===2&&b.snapshot().slots[1].ammo===2);
 t("coltello recuperato: +1, mai oltre il massimo",b.addAmmo('throwingKnives',1)&&b.equippedAmmo===3&&!b.addAmmo('sword',1));
 t("riprendendo i coltelli le munizioni tornano piene",b.addWeapon('throwingKnives').outcome==='refilled'&&b.equippedAmmo===6&&b.addWeapon('throwingKnives').outcome==='duplicate'&&!b.addAmmo('throwingKnives',1));
 b.addWeapon('javelin',1);const next=b.removeWeapon('javelin');
 t("giavellotti finiti: l'arma esce dalla borsa e si impugna la prima arma rimasta",!b.hasWeapon('javelin')&&next==='sword'&&b.equippedWeaponId==='sword');
 const c=new Inventory();c.reset(['javelin'],'javelin');t("senza altre armi, al posto del giavellotto torna la spada",c.removeWeapon('javelin')==='sword'&&c.weaponIds.join()==='sword');
 const d=new Inventory();d.addWeapon('throwingKnives',4);d.addWeapon('axe');d.addWeapon('bow');d.selectSlot(1);d.setEquippedAmmo(4);const sw=d.addWeapon('mace');
 t("borsa piena: l'arma lasciata a terra tiene le sue munizioni",sw.outcome==='swapped'&&sw.droppedWeaponId==='throwingKnives'&&sw.droppedAmmo===4);
 const e=new Inventory();e.reset(['sword','throwingKnives'],'throwingKnives');t("a inizio partita le armi con munizioni sono piene",e.equippedAmmo===6);}
{const m=new WeaponPickupManager();const drop=m.spawnAmmoDrop('throwingKnives','projectileKnife4',300,120);for(let i=0;i<120;i++)m.updateAmmoDrops(1/60,cs,P,2000,240);
 t("il coltello a terra cade fino al terreno",drop.isOnGround&&drop.positionY+drop.height===200);
 const pl=new Player(296,176);t("passandoci sopra lo si tocca",m.findTouchedAmmoDrops(pl).includes(drop));
 m.removeAmmoDrop(drop);m.spawnAmmoDrop('throwingKnives','projectileKnife4',2010,100);for(let i=0;i<200;i++)m.updateAmmoDrops(1/60,cs,[],2100,240);
 t("un coltello caduto in un abisso si perde",m.activeAmmoDrops.length===0);}

// --- livelli e motore
{const sources=new Set();for(const l of LEVEL_CONFIG){(l.chests??[]).forEach(c=>sources.add(c.weaponId));l.enemies.forEach(e=>e.weaponDrop&&sources.add(e.weaponDrop));}
 t("ogni arma a distanza si trova nei livelli (forzieri o nemici d'élite)",RANGED.every(id=>sources.has(id)),[...sources].join(','));}
{const src=readFileSync(join(projectRoot,'src/core/GameEngine.ts'),'utf8');
 t("il motore lancia i proiettili del cavaliere e tiene la borsa al passo con le munizioni",/private updateRangedWeapon[\s\S]{0,300}drainProjectileLaunches\(\)\.forEach\(\(launch\) => this\.projectileSystem\.spawn\(launch\)\)[\s\S]{0,600}this\.inventory\.setEquippedAmmo\(ammo\)/.test(src)&&/applyContactDamage[^\n]*\n\s*this\.updateRangedWeapon\(\);/.test(src));
 t("finiti i giavellotti l'arma esce dalla borsa a fine lancio",/ammo === 0 && weapon\.ammo\?\.isLostWhenEmpty === true && this\.player\.activeAttack === null[\s\S]{0,120}this\.inventory\.removeWeapon\(weapon\.id\)/.test(src));
 t("i proiettili del giocatore colpiscono nemici, boss e forzieri; i colpi vanno a segno come quelli della spada",src.includes('this.projectileSystem.update(deltaTimeSeconds, this.player, platforms, level.width, level.height, projectileTargets)')&&/event\.kind === "hitTarget"[\s\S]{0,80}this\.handlePlayerHit\(event\.target, event\.damage, event\.directionX\)/.test(src)&&/event\.kind === "dropAmmo"[\s\S]{0,80}spawnAmmoDrop/.test(src));
 t("i coltelli a terra si recuperano passandoci sopra",/private recoverAmmoDrops[\s\S]{0,200}this\.inventory\.addAmmo\(drop\.weaponId, 1\)/.test(src));}

// --- cambio d'arma a metà attacco (difetto trovato dal fuzz nel browser, Fase 4): il frame disegnato deve
// esistere per la nuova arma (es. non "knightAttack1BBow", un fendente di spada con l'arco in mano)
{const {registerKnightSprites}=await load('rendering/sprites/knightSprites');const {FakeSpriteManager}=await import('../helpers.mjs');
 const sm=new FakeSpriteManager();registerKnightSprites(sm);
 const P=[{x:0,y:200,width:2000,height:40}];const cs=new CollisionSystem();
 const inp=(held=[],pressed=[])=>({isHeld:a=>held.includes(a),wasPressed:a=>pressed.includes(a),wasReleased:()=>false});
 const missing=[];
 for(const from of Object.values(W))for(const to of Object.values(W)){if(from===to)continue;
  for(const air of [false,true]){
   const p=new Player(100,air?60:176);p.equipWeapon(from);for(let i=0;i<(air?2:5);i++)p.update(1/60,inp(),cs,P,2000);
   p.update(1/60,inp(['attack'],['attack']),cs,P,2000);for(let i=0;i<6;i++)p.update(1/60,inp(['attack']),cs,P,2000);
   p.equipWeapon(to);
   const id=p.getRenderedFrameId();if(!sm.sprites.has(id))missing.push(`${from.id}->${to.id}${air?' (in aria)':''}: ${id}`);}}
 t("cambiando arma a metà attacco il frame disegnato esiste per la nuova arma",missing.length===0,missing.slice(0,3).join('; '));}
}
