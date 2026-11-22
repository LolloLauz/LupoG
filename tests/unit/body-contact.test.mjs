// Corpi solidi: il giocatore non entra nei nemici (se non schivando) e chi gli sta addosso lo colpisce
// Ogni t(descrizione, condizione, dettaglio) è un controllo: se la condizione è falsa il test fallisce.
import { projectRoot } from "../helpers.mjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";
export const description = 'Corpi solidi: niente compenetrazione coi nemici (tranne in schivata), colpi a contatto';

export default async function (t, load) {
const {Player}=await load('entities/Player');const {Enemy}=await load('entities/Enemy');const {Boss}=await load('entities/Boss');
const {CollisionSystem}=await load('systems/CollisionSystem');const {CombatSystem}=await load('combat/CombatSystem');
const {EnemyAISystem}=await load('systems/EnemyAISystem');const {ENEMY_CONFIG,BOSS_CONFIG}=await load('config/enemyConfig');
const cs=new CollisionSystem(),cb=new CombatSystem(),ai=new EnemyAISystem();
const P=[{x:0,y:200,width:1024,height:40}];const W=1024;
const mk=(pressed=[],held=[])=>({isHeld:a=>held.includes(a),wasPressed:a=>pressed.includes(a),wasReleased:()=>false});
const overlaps=(a,b)=>CollisionSystem.intersects(a.getBounds(),b.getBounds());
// come GameEngine.separatePlayerFromBodies
const separate=(p,enemies)=>{if(p.isDead||p.isDodging)return;for(const e of enemies)if(e.isAlive&&!e.isFlying)cs.separateHorizontally(p,e,P,W);};
const step=(p,enemies,pressed=[],held=[],useAI=false)=>{p.update(1/60,mk(pressed,held),cs,P,W);cb.processPlayerAttack(p,enemies);if(useAI)ai.update(enemies,p,P);enemies.forEach(e=>e.update(1/60,cs,P,W));separate(p,enemies);cb.processEnemyAttacks(enemies,p);};
const grounded=(x)=>{const p=new Player(x,176);for(let i=0;i<5;i++)p.update(1/60,mk(),cs,P,W);return p};
const settled=(type,x)=>{const e=new Enemy(ENEMY_CONFIG[type],x,150);for(let i=0;i<20;i++)e.update(1/60,cs,P,W);return e};

// 1. camminando contro un nemico ci si ferma al suo bordo
{const e=settled('skeleton',200);const p=grounded(150);let everInside=false;
 for(let i=0;i<90;i++){step(p,[e],[],['moveRight']);everInside||=overlaps(p,e);}
 t('camminando verso un nemico non ci si entra dentro',!everInside&&Math.abs(p.positionX+p.width-e.positionX)<0.01,`player=${p.positionX.toFixed(2)} enemy=${e.positionX}`);}
// da sinistra verso destra e viceversa
{const e=settled('skeleton',200);const p=grounded(260);let everInside=false;
 for(let i=0;i<90;i++){step(p,[e],[],['moveLeft']);everInside||=overlaps(p,e);}
 t('anche arrivando da destra ci si ferma al bordo',!everInside&&Math.abs(p.positionX-(e.positionX+e.width))<0.01);}

// 2. schivando si attraversa il nemico
{const e=settled('skeleton',200);const p=grounded(180);p.facingDirection='right';
 let wasInside=false;step(p,[e],['dodge']);for(let i=0;i<40;i++){step(p,[e]);wasInside||=overlaps(p,e);}
 t('con la schivata si attraversa il nemico e si esce dall\'altra parte',wasInside&&p.positionX>=e.positionX+e.width-0.01&&!overlaps(p,e),`x=${p.positionX.toFixed(1)} e=${e.positionX}`);}

// 3. finita la schivata dentro un nemico si viene spinti fuori dal lato più vicino
{const e=settled('skeleton',200);const p=grounded(196);
 separate(p,[e]);
 t('chi resta dentro un nemico viene spinto fuori (lato più vicino)',!overlaps(p,e)&&p.positionX+p.width<=e.positionX+0.01);}

// 4. contro un muro è il nemico a spostarsi
{const walls=[...P,{x:100,y:150,width:20,height:50}];
 const p=grounded(120);const e=new Enemy(ENEMY_CONFIG.skeleton,125,176);
 cs.separateHorizontally(p,e,walls,W);
 t('se dietro il giocatore c\'è un muro, si sposta il nemico',p.positionX===120&&e.positionX===132);}

// 5. a contatto (anche dentro) il nemico colpisce comunque
{const e=settled('skeleton',200);const p=grounded(196);e.faceTowards(0);
 e.beginAttack();const hp=p.currentHealth;let hit=false;
 for(let i=0;i<60&&!hit;i++){e.update(1/60,cs,P,W);hit=cb.processEnemyAttacks([e],p)>0;}
 t('un nemico colpisce anche il giocatore che gli sta addosso',hit&&p.currentHealth<hp);}
{const e=settled('skeleton',200);const hb=()=>{e.beginAttack();for(let i=0;i<60;i++){e.update(1/60,cs,P,W);const h=e.getAttackHitbox();if(h)return h;}return null;};
 e.facingDirection='right';const h=hb();
 t("l'area d'urto in mischia va dalla metà del corpo fino a attackRange davanti",h!==null&&h.x===e.positionX+e.width/2&&h.x+h.width===e.positionX+e.width+ENEMY_CONFIG.skeleton.attackRange);}

// 6. in un combattimento vero il giocatore che spinge verso il nemico non lo attraversa e viene colpito
{const e=settled('skeleton',230);const p=grounded(150);const hp=p.currentHealth;let everInside=false;
 for(let i=0;i<240;i++){step(p,[e],[],['moveRight'],true);everInside||=overlaps(p,e)&&!p.isDodging;}
 t('spingendo contro uno scheletro non ci si entra e si viene colpiti',!everInside&&p.currentHealth<hp,`hp=${p.currentHealth}`);}

// 7. i volanti non hanno un corpo solido; i morti nemmeno
{const p=grounded(200);const bat=new Enemy(ENEMY_CONFIG.bat,200,176);const x=p.positionX;separate(p,[bat]);
 t('i nemici volanti non spingono il giocatore',p.positionX===x);
 const dead=settled('skeleton',200);dead.receiveHit(9999,'right');const q=grounded(196);const qx=q.positionX;separate(q,[dead]);
 t('i nemici morti non spingono il giocatore',q.positionX===qx);}

// 8. boss: corpo solido e fendente a contatto
{const b=new Boss(BOSS_CONFIG,300,150);for(let i=0;i<20;i++)b.update(1/60,grounded(900),cs,P,W,0);
 const p=grounded(b.positionX+2);cs.separateHorizontally(p,b,P,W);
 t('anche il boss ha un corpo solido',!overlaps(p,b));}

// 9. il motore separa i corpi (tranne in schivata) prima di applicare i colpi nemici
{const src=readFileSync(join(projectRoot,'src/core/GameEngine.ts'),'utf8');
 const m=src.match(/private separatePlayerFromBodies\(\): void \{([\s\S]*?)\n  \}/);
 t('GameEngine.separatePlayerFromBodies salta la schivata e i nemici volanti',m!==null&&m[1].includes('isDodging')&&m[1].includes('isFlying'));
 const a=src.indexOf('this.separatePlayerFromBodies();\n    this.combatSystem.processEnemyAttacks');
 t('la separazione avviene prima dei colpi nemici e del boss',a>0&&src.includes('this.separatePlayerFromBodies();\n      this.combatSystem.processBossAttack'));}
}
