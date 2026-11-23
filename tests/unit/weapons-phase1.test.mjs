// Fase 1 del piano espansioni: armi corpo a corpo (pugnale, lancia, ascia, mazza), forzieri,
// nemici d'élite, trofei dei boss, armi a terra e scambio d'arma.
// Ogni t(descrizione, condizione, dettaglio) è un controllo: se la condizione è falsa il test fallisce.
import { FakeSpriteManager, projectRoot } from "../helpers.mjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";
export const description = "Armi corpo a corpo: statistiche, ascia e mazza, forzieri, élite, trofei, scambio d'arma, sprite, livelli";

export default async function (t, load) {
const {WEAPON_CONFIG,WEAPON_ICON_SIZE}=await load('config/weaponConfig');
const {PLAYER_ANIMATIONS}=await load('config/animationConfig');
const {ENEMY_CONFIG,ENEMY_AI_CONFIG,BOSS_CATALOG}=await load('config/enemyConfig');
const {LEVEL_CONFIG}=await load('config/levelConfig');
const {Player}=await load('entities/Player');const {Enemy}=await load('entities/Enemy');
const {Chest,CHEST_SIZE}=await load('entities/Chest');
const {CollisionSystem}=await load('systems/CollisionSystem');const {CombatSystem}=await load('combat/CombatSystem');
const {WeaponPickupManager}=await load('systems/WeaponPickupManager');const {LevelManager}=await load('systems/LevelManager');
const {registerKnightSprites,KNIGHT_CROUCH_SUFFIX,KNIGHT_FIRE_SUFFIX}=await load('rendering/sprites/knightSprites');
const {HUDManager,BAG_SLOT_GEOMETRY}=await load('ui/HUDManager');
const W=WEAPON_CONFIG;const sw=W.sword.attacks;
const reach=a=>a.hitbox.x+a.hitbox.width;
const lights=w=>Object.values(w.attacks).filter(a=>a.id!==w.defaultAttackByInput.heavyAttack);

// --- le armi
t("cinque armi corpo a corpo: spada, pugnale, lancia, ascia, mazza",['sword','dagger','spear','axe','mace'].every(id=>W[id]?.id===id));
t("ogni arma ha un suffisso di sprite diverso (la spada nessuno) e un'icona",new Set(Object.values(W).map(w=>w.spriteSuffix)).size===Object.keys(W).length&&W.sword.spriteSuffix===''&&Object.values(W).every(w=>w.iconSpriteId.startsWith('weaponIcon')));
t("pugnale: i colpi leggeri sono più rapidi e più deboli del primo colpo di spada",[W.dagger.attacks.daggerStab1,W.dagger.attacks.daggerStab2].every(a=>a.durationMs<sw.swordLight1.durationMs&&a.damage<sw.swordLight1.damage));
t("pugnale: combo di quattro colpi e passo più svelto",W.dagger.combos[0].inputSequence.length===4&&W.dagger.movementSpeedMultiplier>1);
t("lancia: gli affondi arrivano più lontano di qualsiasi colpo di spada",['spearThrust1','spearThrust2'].every(id=>Object.values(sw).every(s=>reach(W.spear.attacks[id])>reach(s))));
t("lancia: l'attacco pesante arriva più lontano di quelli delle altre armi; la mossa più lunga di tutte è della lancia",Object.values(W).filter(w=>w.id!=='spear').every(w=>Object.values(w.attacks).every(a=>reach(a)<reach(W.spear.attacks.spearHeavy)))&&Math.max(...Object.values(W.spear.attacks).map(reach))===Math.max(...Object.values(W).flatMap(w=>Object.values(w.attacks).map(reach))));
t("ascia: colpi più lenti e più forti della spada, passo più lento",W.axe.attacks.axeChop1.damage>sw.swordLight1.damage&&W.axe.attacks.axeChop1.durationMs>sw.swordLight1.durationMs&&W.axe.attacks.axeHeavy.damage>sw.swordHeavy.damage&&W.axe.movementSpeedMultiplier<1);
t("solo l'ascia rompe la guardia (tutti i suoi colpi)",Object.values(W).every(w=>Object.values(w.attacks).every(a=>(a.breaksGuard===true)===(w.id==='axe'))));
t("solo la mazza schiaccia le corazze (tutti i suoi colpi)",Object.values(W).every(w=>Object.values(w.attacks).every(a=>(a.crushesArmor===true)===(w.id==='mace'))));

// --- effetti dei colpi sui nemici
const P=[{x:0,y:200,width:1024,height:40}];const cs=new CollisionSystem();
const settle=e=>{for(let i=0;i<10;i++)e.update(1/60,cs,P,1024);return e};
{const attacking=()=>{const e=settle(new Enemy(ENEMY_CONFIG.soldier,300,176));e.beginAttack();for(let i=0;i<6;i++)e.update(1/60,cs,P,1024);return e};
 const a=attacking();a.receiveHit(15,'right',sw.swordLight1);
 t("la spada non interrompe un soldato che ha già avviato l'attacco",a.isAttacking);
 const b=attacking();b.receiveHit(22,'right',W.axe.attacks.axeChop1);
 t("l'ascia interrompe il soldato anche ad attacco avviato (rompe la guardia)",!b.isAttacking&&!b.canAct);}
{const g=settle(new Enemy(ENEMY_CONFIG.iceGolem,300,172));g.receiveHit(17,'right',sw.swordLight1);
 t("la corazza del golem dimezza un colpo leggero di spada e non lo stordisce",g.lastHitDamage===Math.max(1,Math.round(17*0.5))&&g.canAct);
 const h=settle(new Enemy(ENEMY_CONFIG.iceGolem,300,172));h.receiveHit(17,'right',W.mace.attacks.maceSwing1);
 t("la mazza fa danno pieno al golem e lo stordisce",h.lastHitDamage===17&&!h.canAct);
 let ms=0;while(!h.canAct&&ms<3000){h.update(1/60,cs,P,1024);ms+=1000/60;}
 t("lo stordimento della mazza dura armorCrushStunMs",Math.abs(ms-ENEMY_AI_CONFIG.armorCrushStunMs)<=34,`${ms.toFixed(0)} ms`);
 const sk=settle(new Enemy(ENEMY_CONFIG.skeleton,300,176));sk.receiveHit(17,'right',W.mace.attacks.maceSwing1);let ms2=0;while(!sk.canAct&&ms2<3000){sk.update(1/60,cs,P,1024);ms2+=1000/60;}
 t("su un nemico senza corazza la mazza stordisce come un colpo normale",Math.abs(ms2-ENEMY_CONFIG.skeleton.hurtDurationMs)<=34,`${ms2.toFixed(0)} ms`);}

// --- nemici d'élite
{const n=new Enemy(ENEMY_CONFIG.soldier,300,176);const e=new Enemy(ENEMY_CONFIG.soldier,300,176,'normal',{elite:true,weaponDrop:'spear'});
 t("élite: salute, danno e punti moltiplicati",e.maxHealth===n.maxHealth*ENEMY_AI_CONFIG.eliteHealthMultiplier&&e.attackDamage===Math.round(n.attackDamage*ENEMY_AI_CONFIG.eliteDamageMultiplier)&&e.scoreReward===n.scoreReward*ENEMY_AI_CONFIG.eliteScoreMultiplier);
 t("élite: arma da lasciare; un nemico normale non ne ha",e.isElite&&e.weaponDrop==='spear'&&!n.isElite&&n.weaponDrop===null);
 const lm=new LevelManager();lm.loadLevel(2);const elites=lm.createEnemies('normal').filter(x=>x.isElite);
 t("LevelManager crea i nemici d'élite con la loro arma",elites.length===1&&elites[0].weaponDrop==='spear');}

// --- forzieri
{const grounded=x=>{const p=new Player(x,176);for(let i=0;i<5;i++)p.update(1/60,{isHeld:()=>false,wasPressed:()=>false,wasReleased:()=>false},cs,P,1024);return p};
 const c=new Chest(120,188,'axe');const p=grounded(100);const cb=new CombatSystem();
 t("un forziere chiuso si può colpire e non lascia ancora nulla",c.isAlive&&c.drainOpenedWeapon()===null);
 p.update(1/60,{isHeld:()=>false,wasPressed:a=>a==='attack',wasReleased:()=>false},cs,P,1024);
 let hits=0;for(let i=0;i<20;i++){p.update(1/60,{isHeld:()=>false,wasPressed:()=>false,wasReleased:()=>false},cs,P,1024);hits+=cb.processPlayerAttack(p,[c]).length;}
 t("colpito, il forziere si apre e lascia la sua arma una volta sola",hits===1&&c.isOpened&&!c.isAlive&&c.drainOpenedWeapon()==='axe'&&c.drainOpenedWeapon()===null);
 t("un forziere aperto non è più un bersaglio",cb.processPlayerAttack(p,[c]).length===0);}

// --- armi a terra e scambio
{const m=new WeaponPickupManager();const p=new Player(100,176);for(let i=0;i<5;i++)p.update(1/60,{isHeld:()=>false,wasPressed:()=>false,wasReleased:()=>false},cs,P,1024);
 const pk=m.spawn('spear',106,200);
 t("un'arma a terra poggia sul terreno ed è centrata",pk.positionY+pk.height===200&&pk.positionX+pk.width/2===106&&pk.width===WEAPON_ICON_SIZE);
 t("il giocatore sopra l'arma la può prendere",m.findReachablePickup(p)===pk);
 m.take(pk);const dropped=m.spawn('sword',106,200,false);
 t("presa l'arma sparisce; un'arma lasciata a terra nello stesso punto non è subito prendibile",m.activePickups.length===1&&m.activePickups[0]===dropped&&dropped.positionX===pk.positionX&&m.findReachablePickup(p)===null);
 m.update(1/60,p);t("restando sopra l'arma lasciata, non torna prendibile",!dropped.isArmed);
 p.positionX=300;m.update(1/60,p);p.positionX=100;
 t("dopo essersi allontanati la si può riprendere",m.findReachablePickup(p)===dropped);
 p.takeEnvironmentalDamage(9999);t("un giocatore morto non prende armi",m.findReachablePickup(p)===null);}

// --- sprite
{const sm=new FakeSpriteManager();registerKnightSprites(sm);const missing=[];
 const baseFrames=Object.entries(PLAYER_ANIMATIONS).filter(([name])=>!Object.values(W).some(w=>Object.values(w.attacks).some(a=>a.animation===name))).flatMap(([,a])=>a.frameIds);
 for(const w of Object.values(W)){
  const attackFrames=Object.values(w.attacks).flatMap(a=>PLAYER_ANIMATIONS[a.animation].frameIds);
  for(const f of baseFrames)for(const fire of ['',KNIGHT_FIRE_SUFFIX])if(!sm.sprites.has(f+w.spriteSuffix+fire))missing.push(f+w.spriteSuffix+fire);
  for(const f of attackFrames)for(const crouch of ['',KNIGHT_CROUCH_SUFFIX])for(const fire of ['',KNIGHT_FIRE_SUFFIX])if(!sm.sprites.has(f+crouch+w.spriteSuffix+fire))missing.push(f+crouch+w.spriteSuffix+fire);}
 t("ogni arma ha tutti i frame del cavaliere (anche accovacciati e con il fuoco)",missing.length===0,missing.slice(0,3).join(','));
 t("ogni arma ha un'icona 16x16",Object.values(W).every(w=>{const s=sm.sprites.get(w.iconSpriteId);return s&&s.width===16&&s.height===16;}));
 const thrust=sm.sprites.get('knightSpearThrustBSpear');const lastCol=Math.max(...thrust.rows.map(r=>r.replace(/\.+$/,'').length-1));
 t("l'affondo della lancia si vede lontano quanto colpisce",thrust.width===58&&lastCol-7>=reach(W.spear.attacks.spearThrust1),`ultima colonna ${lastCol}`);
 const idle=id=>sm.sprites.get(id).rows.join('');
 t("con armi diverse il cavaliere a riposo è disegnato diverso",new Set(Object.values(W).map(w=>idle('knightIdle1'+w.spriteSuffix))).size===Object.keys(W).length);
 const p=new Player(100,176);p.equipWeapon(W.mace);
 t("il giocatore disegna i frame dell'arma in mano",p.getRenderedFrameId()==='knightIdle1Mace'&&sm.sprites.has(p.getRenderedFrameId()));}

// --- HUD: la borsa (armi e pozioni) sotto il pannello
{const drawn=[];const renderer=new Proxy({width:320,height:240},{get:(o,k)=>k in o?o[k]:()=>{}});
 const sm={drawSprite:(r,id,x,y)=>drawn.push({id,x,y}),drawSpriteAligned(){}};
 const texts=[];const renderer2=new Proxy({width:320,height:240},{get:(o,k)=>k in o?o[k]:k==='drawText'?(text,x,y)=>texts.push({text,x,y}):()=>{}});
 const bag=[{iconSpriteId:'weaponIconSword',iconSize:16,count:null,isEquipped:false},{iconSpriteId:'weaponIconAxe',iconSize:16,count:null,isEquipped:true},{iconSpriteId:'itemPotion',iconSize:8,count:2,isEquipped:false},null];
 new HUDManager().render(renderer2,sm,{health:100,maxHealth:100,stamina:100,maxStamina:100,ability:{cooldownFraction:0,isReady:true,isActive:false},lives:3,score:0,collectibles:0,coins:0,levelNumber:1,bag,powerUps:[],boss:null},0);
 const slotX=i=>HUDManager.getBagSlotX(i,4,320);
 t("l'HUD disegna le armi della borsa nei loro riquadri, sotto il pannello",drawn.some(d=>d.id==='weaponIconAxe'&&d.x===slotX(1)+2&&d.y===BAG_SLOT_GEOMETRY.y+2)&&BAG_SLOT_GEOMETRY.y>=24);
 t("l'HUD disegna la pozione con il loro numero",drawn.some(d=>d.id==='itemPotion')&&texts.some(x=>x.text==='2'&&x.x>slotX(2)));
 t("ogni riquadro mostra il suo tasto numerico (1-4), l'ultimo dentro lo schermo",['1','2','3','4'].every(n=>texts.some(x=>x.text===n))&&slotX(3)+BAG_SLOT_GEOMETRY.size<=320&&slotX(0)>200);}

// --- livelli
{const sources=new Set();const last=Math.max(...LEVEL_CONFIG.map(l=>l.id));
 for(const l of LEVEL_CONFIG){(l.chests??[]).forEach(c=>sources.add(c.weaponId));l.enemies.forEach(e=>e.weaponDrop&&sources.add(e.weaponDrop));
  const boss=l.hasBoss?BOSS_CATALOG[l.bossId??'blackKnight']??Object.values(BOSS_CATALOG)[0]:null;if(boss?.weaponReward&&l.id<last)sources.add(boss.weaponReward);}
 t("ogni arma nuova si trova almeno una volta nei livelli",['dagger','spear','axe','mace'].every(id=>sources.has(id)),[...sources].join(','));
 t("solo i nemici d'élite lasciano armi",LEVEL_CONFIG.every(l=>l.enemies.every(e=>e.weaponDrop===undefined||e.elite===true)));
 t("almeno un forziere, un nemico d'élite e un trofeo di boss",LEVEL_CONFIG.some(l=>(l.chests??[]).length>0)&&LEVEL_CONFIG.some(l=>l.enemies.some(e=>e.elite))&&Object.values(BOSS_CATALOG).some(b=>b.weaponReward));
 const onGround=(l,x,w,y)=>l.platforms.some(p=>p.oneWay!==true&&p.y===y&&x>=p.x&&x+w<=p.x+p.width)&&!(l.hazards??[]).some(h=>x<h.x+h.width&&x+w>h.x);
 const badChests=LEVEL_CONFIG.flatMap(l=>(l.chests??[]).filter(c=>!onGround(l,c.position.x,CHEST_SIZE.width,c.position.y+CHEST_SIZE.height)).map(c=>`L${l.id}@${c.position.x}`));
 t("ogni forziere poggia su un terreno solido, fuori dai pericoli",badChests.length===0,badChests.join(','));
 const badRewards=LEVEL_CONFIG.filter(l=>l.hasBoss&&l.id<last).flatMap(l=>{const b=BOSS_CATALOG[l.bossId??Object.keys(BOSS_CATALOG)[0]];const next=LEVEL_CONFIG.find(n=>n.id===l.id+1);if(!b.weaponReward)return [];const cx=next.playerStart.x+48;return onGround(next,cx-8,16,next.playerStart.y+24)?[]:[`L${next.id}`];});
 t("il trofeo di ogni boss compare su un terreno sicuro del livello successivo",badRewards.length===0,badRewards.join(','));
 const lastBoss=LEVEL_CONFIG.find(l=>l.id===last);t("il boss dell'ultimo livello non ha trofeo (non c'è un livello dopo)",BOSS_CATALOG[lastBoss.bossId].weaponReward===undefined);}

// --- motore
{const src=readFileSync(join(projectRoot,'src/core/GameEngine.ts'),'utf8');
 t("i forzieri chiusi sono bersagli degli attacchi",src.includes('...closedChests];')&&src.includes('target instanceof Chest'));
 t("con E sopra un'arma la si mette nella borsa e la si impugna (salvando i progressi)",/wasPressed\("pickUp"\)/.test(src)&&/inventory\.addWeapon\(pickup\.weaponId, pickup\.ammo\)[\s\S]{0,1600}this\.player\.equipWeapon\(WEAPON_CONFIG\[pickup\.weaponId\], this\.inventory\.equippedAmmo\);\s*this\.saveBagWeapons\(\)/.test(src));
 t("i nemici d'élite lasciano la loro arma morendo",/enemy\.weaponDrop !== null\)[\s\S]{0,80}this\.dropWeapon\(enemy\.weaponDrop/.test(src));
 t("il trofeo del boss vale per il livello successivo e si azzera a ogni nuova partita",src.includes('this.weaponReward = { levelId: this.currentLevelId + 1, weaponId: reward }')&&/private startNewGame[\s\S]{0,1400}?this\.weaponReward = null;\n    this\.startLevel/.test(src)&&src.includes('TROFEO: '));}
}
