// Regressioni 0.9.1: rinculo vicino agli abissi e attacco a raffica
// Ogni t(descrizione, condizione, dettaglio) è un controllo: se la condizione è falsa il test fallisce.
export const description = 'Regressioni 0.9.1: rinculo vicino agli abissi e attacco a raffica';

export default async function (t, load) {

const {Player}=await load('entities/Player');const {Enemy}=await load('entities/Enemy');const {CollisionSystem}=await load('systems/CollisionSystem');
const {CombatSystem}=await load('combat/CombatSystem');const {EnemyAISystem}=await load('systems/EnemyAISystem');
const {LEVEL_CONFIG}=await load('config/levelConfig');const {ENEMY_CONFIG}=await load('config/enemyConfig');const {PLAYER_CONFIG}=await load('config/playerConfig');
const cs=new CollisionSystem(),cb=new CombatSystem(),ai=new EnemyAISystem();
const mk=(held=[],pressed=[])=>({isHeld:a=>held.includes(a),wasPressed:a=>pressed.includes(a),wasReleased:()=>false});
// ================= BUG 1: il rinculo non spinge nel vuoto =================
// terreno 0-400, abisso 400-440, terreno 440-900
const P=[{x:0,y:200,width:400,height:40},{x:440,y:200,width:460,height:40}];
const run=(p,n,held=[],pressedAt=()=>[])=>{for(let i=0;i<n;i++)p.update(1/60,mk(held,pressedAt(i)),cs,P,900)};
function atEdge(x){const p=new Player(x,176);run(p,6);return p}
// giocatore sul bordo destro (x=386), colpito da un nemico a SINISTRA -> rinculo verso destra, cioè nel vuoto
let p=atEdge(386);t('il giocatore sta sul bordo',p.isOnGround&&p.positionX+p.width<=400+1);
p.takeDamage(10,p.positionX-20);let minY=0,maxX=0;run(p,150);
t('rinculo verso il vuoto: NON cade nell\'abisso',p.positionY<=176.5&&p.isOnGround&&p.positionX+p.width<=401,`x=${p.positionX.toFixed(1)} y=${p.positionY.toFixed(1)}`);
// rinculo verso il terreno: funziona ancora
p=atEdge(300);const x0=p.positionX;p.takeDamage(10,p.positionX+30);run(p,60);t('rinculo normale (verso il terreno) funziona: si sposta indietro',p.positionX<x0-5,`${(p.positionX-x0).toFixed(1)}`);
// danno ricevuto, ma non letale per la posizione
p=atEdge(386);p.takeDamage(20,p.positionX-20);t('il danno viene comunque applicato',p.currentHealth===80);
// bordo sinistro dell'abisso lato destro (440): colpito da destra, rinculo verso sinistra = vuoto
p=new Player(442,176);run(p,6);p.takeDamage(10,p.positionX+40);run(p,150);t('anche sul bordo opposto non cade',p.positionY<=176.5&&p.isOnGround,`x=${p.positionX.toFixed(1)}`);
// muro/terreno largo: nessun effetto strano a metà piattaforma
p=atEdge(200);p.takeDamage(10,p.positionX-20);const xa=p.positionX;run(p,60);t('a metà terreno il rinculo è completo',p.positionX>xa+10);
// scenario reale del livello 3: salto sull'abisso 900-936 e goblin in attesa
const L=LEVEL_CONFIG.find(l=>l.id===3);const goblinsL3=L.enemies.filter(e=>e.type==='goblin').map(e=>e.position.x);
for(const gx of [980,1040]){
  let landed=0,knockedIn=0;
  for(let takeoff=884;takeoff<=898;takeoff++){
    const pl=new Player(takeoff-40,176);const g=new Enemy(ENEMY_CONFIG.goblin,gx,184);let jumped=false,didLand=false,fell=false;
    for(let f=0;f<360&&!fell;f++){
      const edge=pl.isOnGround&&pl.positionX+pl.width>=takeoff;const pr=[];if(edge&&!jumped){pr.push('jump');jumped=true}
      pl.update(1/60,mk(didLand?[]:['moveRight'],pr),cs,L.platforms,L.width);
      if(jumped&&pl.isOnGround&&pl.positionX>=926)didLand=true;
      ai.update([g],pl,L.platforms);g.update(1/60,cs,L.platforms,L.width);cb.processEnemyAttacks([g],pl);
      if(pl.positionY>260)fell=true;
    }
    if(didLand){landed++;if(fell)knockedIn++}
  }
  t(`livello 3, goblin a x=${gx}: dopo l'atterraggio nessun rinculo nell'abisso (${landed} salti)`,landed>=10&&knockedIn===0,`caduti ${knockedIn}`);
}
t('il goblin del livello 3 è ad almeno 100 px dall\'abisso (x >= 1036)',goblinsL3.every(x=>x<=800||x>=1036),goblinsL3.join(','));
// ================= BUG 2: attacco a raffica =================
const flat=[{x:0,y:200,width:3000,height:40}];
function mash(intervalFrames,presses,key='attack'){
  const q=new Player(100,176);for(let i=0;i<5;i++)q.update(1/60,mk(),cs,flat,3000);
  const pressFrames=[];const startFrames=[];let was=false;
  for(let f=0;f<60*8;f++){
    const press=f<presses*intervalFrames&&f%intervalFrames===0;if(press)pressFrames.push(f);
    q.update(1/60,mk([],press?[key]:[]),cs,flat,3000);
    const a=q.activeAttack!==null;if(a&&!was)startFrames.push(f);was=a;
  }
  // ritardo di ogni inizio attacco rispetto all'ultima pressione precedente (ms)
  const delays=startFrames.map(sf=>{const prev=pressFrames.filter(pf=>pf<=sf).pop();return prev===undefined?Infinity:(sf-prev)/60*1000});
  const lastPress=pressFrames[pressFrames.length-1];
  return{starts:startFrames.length,maxDelay:Math.max(...delays),lastStartAfterLastPress:(startFrames[startFrames.length-1]-lastPress)/60*1000};
}
for(const [iv,n] of [[4,30],[6,20],[10,12],[3,40]]){const r=mash(iv,n);
  t(`raffica (${n} pressioni ogni ${Math.round(iv/60*1000)}ms): nessun attacco parte più di ${PLAYER_CONFIG.attackBufferMs+20}ms dopo una pressione`,r.maxDelay<=PLAYER_CONFIG.attackBufferMs+20,`max ${Math.round(r.maxDelay)}ms`);
  t(`raffica ogni ${Math.round(iv/60*1000)}ms: dopo l'ultima pressione parte al massimo 1 attacco, entro ${PLAYER_CONFIG.attackBufferMs+20}ms`,r.lastStartAfterLastPress<=PLAYER_CONFIG.attackBufferMs+20,`${Math.round(r.lastStartAfterLastPress)}ms`)}
t('la raffica concatena comunque gli attacchi (almeno 4 in 2 s)',mash(6,20).starts>=4,`${mash(6,20).starts}`);
// una sola pressione = un solo attacco
let q=new Player(100,176);for(let i=0;i<5;i++)q.update(1/60,mk(),cs,flat,3000);let starts=0,was=false;for(let f=0;f<120;f++){q.update(1/60,mk([],f===0?['attack']:[]),cs,flat,3000);const a=q.activeAttack!==null;if(a&&!was)starts++;was=a}
t('una sola pressione esegue un solo attacco',starts===1,String(starts));
// pesante: stessa regola
const mh=mash(10,12,'heavyAttack');t('raffica di attacchi pesanti: nessun attacco in ritardo',mh.maxDelay<=PLAYER_CONFIG.attackBufferMs+20,`max ${Math.round(mh.maxDelay)}ms`);
// pressione ignorata durante un'attacco lungo non resta in coda
q=new Player(100,176);for(let i=0;i<5;i++)q.update(1/60,mk(),cs,flat,3000);
q.update(1/60,mk([],['heavyAttack']),cs,flat,3000);for(let i=0;i<5;i++)q.update(1/60,mk(),cs,flat,3000);
q.update(1/60,mk([],['attack']),cs,flat,3000); // 100ms dentro un attacco da 500+500ms: troppo presto
let started=0;was=true;for(let f=0;f<150;f++){q.update(1/60,mk(),cs,flat,3000);const a=q.activeAttack!==null;if(a&&!was)started++;was=a}
t('un tasto premuto troppo presto durante un attacco pesante non parte dopo',started===0,String(started));

}
