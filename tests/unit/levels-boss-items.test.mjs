// Livelli (geometria e percorribilità), boss, oggetti, danno ambientale
// Ogni t(descrizione, condizione, dettaglio) è un controllo: se la condizione è falsa il test fallisce.
export const description = 'Livelli (geometria e percorribilità), boss, oggetti, danno ambientale';

export default async function (t, load) {
const {Player}=await load('entities/Player');const {Boss}=await load('entities/Boss');const {CollisionSystem}=await load('systems/CollisionSystem');
const {CombatSystem}=await load('combat/CombatSystem');const {LEVEL_CONFIG}=await load('config/levelConfig');
const {BOSS_CONFIG,ENEMY_CONFIG}=await load('config/enemyConfig');const {ITEM_CONFIG}=await load('config/itemConfig');
const {ScoreManager}=await load('systems/ScoreManager');const {BOSS_ANIMATIONS}=await load('config/animationConfig');
const cs=new CollisionSystem(),cb=new CombatSystem();

const mk=(pressed=[],held=[])=>({isHeld:a=>held.includes(a),wasPressed:a=>pressed.includes(a),wasReleased:()=>false});
// ---------- DATI LIVELLI ----------
LEVEL_CONFIG.forEach((L,i)=>{
 t(`L${L.id} id consecutivo`,L.id===i+1);
 const ground=L.platforms.filter(p=>p.y===200&&!p.oneWay).sort((a,b)=>a.x-b.x);
 // una vasca (fondo solido al massimo 44 px più in basso, sotto tutto lo spazio) non è un abisso
 let maxGap=0;for(let k=1;k<ground.length;k++){const gs=ground[k-1].x+ground[k-1].width;const basin=L.platforms.some(p=>!p.oneWay&&p.y>200&&p.y-200<=44&&p.x<=gs&&p.x+p.width>=ground[k].x);if(!basin)maxGap=Math.max(maxGap,ground[k].x-gs);}
 t(`L${L.id} abissi <= 36px (le vasche con il fondo non contano)`,maxGap<=36,'max '+maxGap);
 t(`L${L.id} terreno copre fino al bordo`,ground[ground.length-1].x+ground[ground.length-1].width>=L.width);
 // altezza piattaforme sospese raggiungibili: ogni oneWay ha sotto una superficie a <= 44px (terreno o altra piattaforma/blocco)
 const surfaces=L.platforms.map(p=>({x:p.x,w:p.width,top:p.y}));
 let bad=[];L.platforms.filter(p=>p.y<200).forEach(p=>{const below=surfaces.filter(s=>s.top>p.y&&s.x<p.x+p.width+30&&s.x+s.w>p.x-30&&s.top-p.y<=44);if(!below.length)bad.push(`${p.x},${p.y}`)});
 t(`L${L.id} piattaforme tutte raggiungibili (<=44px su, <=30px di lato)`,bad.length===0,bad.join(' '));
 // nemici sopra una superficie, non dentro solidi
 let badE=[];L.enemies.forEach(e=>{const d=ENEMY_CONFIG[e.type];if(d.behavior==='flyer')return;const feet=e.position.y+d.hitbox.height;const cx=e.position.x+d.hitbox.width/2;
  const sup=L.platforms.some(p=>cx>=p.x&&cx<=p.x+p.width&&Math.abs(p.y-feet)<=0.5);
  const inside=L.platforms.some(p=>!p.oneWay&&e.position.x<p.x+p.width&&e.position.x+d.hitbox.width>p.x&&e.position.y<p.y+p.height&&e.position.y+d.hitbox.height>p.y&&!(Math.abs(p.y-feet)<=0.5));
  if(!sup||inside)badE.push(e.type+'@'+e.position.x)});t(`L${L.id} nemici a terra appoggiati su una superficie (i volanti no)`,badE.length===0,badE.join(' '));
 let badI=[];L.items.forEach(it=>{const cx=it.position.x+4;const feet=it.position.y+8;const sup=L.platforms.some(p=>cx>=p.x&&cx<=p.x+p.width&&p.y>=feet-1&&p.y-feet<=2);if(!sup)badI.push(it.type+'@'+it.position.x+','+it.position.y)});t(`L${L.id} oggetti appoggiati/poco sopra una superficie`,badI.length===0,badI.join(' '));
 if(L.completion.kind==='reachExit'){const ex=L.completion.exitX;t(`L${L.id} uscita su terreno`,ground.some(g=>ex>=g.x&&ex+24<=g.x+g.width))}
 else t(`L${L.id} boss definito con arena`,L.hasBoss&&L.bossSpawn&&L.bossArenaStartX<L.bossSpawn.x);
 t(`L${L.id} start su terreno`,ground.some(g=>L.playerStart.x>=g.x&&L.playerStart.x<g.x+g.width&&L.playerStart.y+24===200));
});
// ---------- BOT: attraversa i livelli con fisica reale (senza nemici) ----------
for(const L of LEVEL_CONFIG){
 const P=L.platforms;const p=new Player(L.playerStart.x,L.playerStart.y);let t0=0,falls=0,reached=false;const goal=L.completion.kind==='reachExit'?L.completion.exitX:(L.bossArenaStartX+40);
 const supported=x=>P.some(q=>x>=q.x&&x<=q.x+q.width&&Math.abs(q.y-(p.positionY+24))<1.5);
 const groundAt=x=>P.some(q=>!q.oneWay&&x>=q.x&&x<=q.x+q.width&&q.y>=p.positionY+20);
 let jumpedAt=-1;
 for(let f=0;f<60*200&&!reached;f++){
  const ahead=p.positionX+p.width+10, wallAhead=P.some(q=>!q.oneWay&&ahead>=q.x&&ahead<=q.x+q.width&&q.y<p.positionY+20&&q.y+q.height>p.positionY+2);
  const edge=p.isOnGround&&!groundAt(p.positionX+p.width+6);
  const jump=p.isOnGround&&(wallAhead||edge);
  const held=['moveRight'];
  p.update(1/60,mk(jump?['jump']:[],held),cs,P,L.width);
  if(jump&&f-jumpedAt<2){} jumpedAt=jump?f:jumpedAt;
  if(p.positionY>300){falls++;break}
  if(p.positionX+6>=goal)reached=true;
 }
 t(`BOT livello ${L.id}: raggiunge ${goal} senza cadere`,reached&&falls===0,`x=${p.positionX.toFixed(0)} y=${p.positionY.toFixed(0)}`);
}
// ---------- BOSS ----------
const flat=[{x:0,y:200,width:1536,height:40}];
const mkp=(x)=>{const p=new Player(x,176);for(let i=0;i<5;i++)p.update(1/60,mk(),cs,flat,1536);return p};
const step=(b,p,n,pressed=()=>[])=>{for(let i=0;i<n;i++){p.update(1/60,mk(pressed(i)),cs,flat,1536);cb.processPlayerAttack(p,b.isAlive?[b]:[]);b.update(1/60,p,cs,flat,1536);cb.processBossAttack(b,p)}};
let b=new Boss(BOSS_CONFIG,1000,160,()=>0.9),p=mkp(300);b.update(1/60,p,cs,flat,1536);
t('boss dormiente lontano dal giocatore',b.currentState==='dormant'&&!b.isActive);
t('boss: salute massima da config, fase 1',b.currentHealth===BOSS_CONFIG.maxHealth&&b.phaseIndex===0);
p=mkp(1000-150);step(b,p,3);t('si risveglia entro 220px',b.isActive&&b.currentState!=='dormant');
// slash: giocatore vicino
b=new Boss(BOSS_CONFIG,1000,160,()=>0.9);p=mkp(1000-30);step(b,p,50);const hp0=p.currentHealth;
t('prima del cooldown iniziale (800ms) nessun attacco',b.currentState==='idle'||b.currentState==='walk'||b.currentState==='slash',b.currentState);
let sawSlash=false;let hp1=p.currentHealth;for(let i=0;i<120;i++){step(b,p,1);if(b.currentState==='slash')sawSlash=true;}
const slashAttack=BOSS_CONFIG.attacks.find(a=>a.kind==='melee');
t('fendente eseguito e danno da config subito',sawSlash&&p.currentHealth<=100-slashAttack.damage,p.currentHealth);
// carica (random=0 => charge) da lontano
b=new Boss(BOSS_CONFIG,1000,160,()=>0);p=mkp(1000-150);let seen=new Set();let x0=b.positionX;let minX=1e9;let hpC=p.currentHealth;
for(let i=0;i<60*6;i++){step(b,p,1);seen.add(b.currentState);minX=Math.min(minX,b.positionX);}
t('sequenza carica: windup -> charging -> recovery',seen.has('chargeWindup')&&seen.has('charging')&&seen.has('recovery'),[...seen].join());
t('la carica copre distanza e può colpire (20 danno se a segno)',minX<x0-60||p.currentHealth<hpC,`minX ${minX.toFixed(0)} hp ${p.currentHealth}`);
// nessuna carica da vicino
b=new Boss(BOSS_CONFIG,1000,160,()=>0);p=mkp(1000-26);seen=new Set();for(let i=0;i<60*4;i++){step(b,p,1);seen.add(b.currentState)}
t('da vicino usa il fendente, non la carica',!seen.has('charging')&&seen.has('slash'),[...seen].join());
// windup visibile
b=new Boss(BOSS_CONFIG,1000,160,()=>0);p=mkp(1000-150);for(let i=0;i<60*3;i++){step(b,p,1);if(b.currentState==='chargeWindup')break}
t('windup della carica: fermo (velocità 0) per 700ms',b.currentState==='chargeWindup'&&b.velocityX===0&&b.currentAnimationName==='chargeWindup');
// niente stordimento + lampo
b=new Boss(BOSS_CONFIG,1000,160,()=>0.9);p=mkp(900);b.receiveHit(15,'right');t('colpo: salute -15, nessuna interruzione dell\'azione',b.currentHealth===BOSS_CONFIG.maxHealth-15&&b.currentState==='idle');
// fasi
{const half=BOSS_CONFIG.maxHealth/2;b.receiveHit(Math.floor(BOSS_CONFIG.maxHealth-15-(half+10)),'right');t('fase 1 appena sopra il 50%',b.phaseIndex===0,b.currentHealth);b.receiveHit(20,'right');t('fase 2 sotto il 50%',b.phaseIndex===1&&b.currentPhase.speedMultiplier===1.3,b.currentHealth)}
// morte
b.receiveHit(1000,'right');t('morto, 0 HP e non sconfitto subito',!b.isAlive&&b.currentHealth===0&&!b.isDefeated&&b.currentState==='dead');
b.update(1,p,cs,flat,1536);b.update(1,p,cs,flat,1536);t('sconfitto dopo 1.5s',b.isDefeated);
const h=b.currentHealth;b.receiveHit(5,'left');t('niente danno da morto',b.currentHealth===h);
// danno dal giocatore 5 combo
b=new Boss(BOSS_CONFIG,1000,160,()=>0.9);b.receiveHit(15+15+30,'right');t('una combo = 60 danno',b.currentHealth===BOSS_CONFIG.maxHealth-60);
// animazione slash somma fasi
const sa=BOSS_ANIMATIONS.blackKnight.slash.frameDurationsMs.reduce((x,y)=>x+y,0);t('animazione slash = windup+active+recovery',sa===slashAttack.windupMs+slashAttack.activeMs+slashAttack.recoveryMs);
// boss sveglio se colpito da lontano
b=new Boss(BOSS_CONFIG,1000,160,()=>0.9);b.receiveHit(5,'right');t('colpito da dormiente si sveglia',b.isActive);
// ---------- OGGETTI ----------
const {ItemManager}=await load('systems/ItemManager');
const im=new ItemManager();const sm=new ScoreManager();const pp=mkp(100);pp.takeDamage(50,0);
im.loadItems([{type:'healthPotion',position:{x:102,y:190}},{type:'scoreCoin',position:{x:104,y:190}},{type:'collectible',position:{x:106,y:190}},{type:'scoreCoin',position:{x:500,y:190}}]);
const n=im.collectItems(pp,sm).length;t('raccolti 3 oggetti vicini, 1 lontano resta',n===3&&im.remainingItemCount===1);
t('pozione +30 (50->80), moneta +50, gemma +200',pp.currentHealth===80&&sm.currentScore===250&&sm.collectiblesFound===1,`${pp.currentHealth} ${sm.currentScore}`);
const pp2=mkp(100);pp2.heal(500);t('cura non supera il massimo',pp2.currentHealth===100);
t('oggetti non raccolti due volte',im.collectItems(pp,sm).length===0);
// ---------- DANNO AMBIENTALE ----------
const pe=mkp(100);pe.takeEnvironmentalDamage(15);t('caduta: -15 e invulnerabile',pe.currentHealth===85&&pe.isInvulnerable);
const pd=mkp(100);pd.takeEnvironmentalDamage(999);t('caduta letale',pd.isDead);

}
