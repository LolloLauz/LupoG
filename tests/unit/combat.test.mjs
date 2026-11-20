// Combattimento: attacchi, combo, buffer, schivata, danni, morte, sincronizzazione animazioni
// Ogni t(descrizione, condizione, dettaglio) è un controllo: se la condizione è falsa il test fallisce.
export const description = 'Combattimento: attacchi, combo, buffer, schivata, danni, morte, sincronizzazione animazioni';

export default async function (t, load) {
const {Player}=await load('entities/Player');const {CollisionSystem}=await load('systems/CollisionSystem');
const {CombatSystem}=await load('combat/CombatSystem');const {getAttackWorldHitbox}=await load('combat/AttackDefinition');
const {LEVEL_CONFIG}=await load('config/levelConfig');const {PLAYER_ANIMATIONS}=await load('config/animationConfig');
const {ATTACK_DEFINITIONS,PLAYER_CONFIG}=await load('config/playerConfig');
const lvl={width:1024,platforms:[{x:0,y:200,width:400,height:40},{x:448,y:200,width:576,height:40},{x:120,y:150,width:48,height:8,oneWay:true},{x:220,y:120,width:48,height:8,oneWay:true},{x:330,y:150,width:48,height:8,oneWay:true},{x:560,y:168,width:32,height:32},{x:700,y:140,width:64,height:8,oneWay:true}]};const cs=new CollisionSystem();const cb=new CombatSystem();
const mk=(held=[],pressed=[],released=[])=>({isHeld:a=>held.includes(a),wasPressed:a=>pressed.includes(a),wasReleased:a=>released.includes(a)});

const fresh=()=>{const p=new Player(100,176);for(let i=0;i<5;i++)p.update(1/60,mk(),cs,lvl.platforms,lvl.width);return p};
const frame=(p,pressed=[],held=[],released=[])=>p.update(1/60,mk(held,pressed,released),cs,lvl.platforms,lvl.width);
const idle=(p,n)=>{for(let i=0;i<n;i++)frame(p)};
const dummy=()=>({isAlive:true,hp:100,hits:[],getBounds(){return{x:112,y:176,width:12,height:24}},receiveHit(d){this.hp-=d;this.hits.push(d)}});
// 1 attacco singolo colpisce una volta
let p=fresh();let d=dummy();frame(p,['attack']);let hits=0;for(let i=0;i<30;i++){hits+=cb.processPlayerAttack(p,[d]).length;frame(p)}
t('attacco leggero: 1 solo colpo da 15',hits===1&&d.hits[0]===15,JSON.stringify(d.hits));
// 2 combo x3 con finestre: premi attack ogni 20 frame (333ms)
p=fresh();d=dummy();const names=[];
for(let n=0;n<3;n++){frame(p,['attack']);names.push(p.currentAnimationName);for(let i=0;i<24;i++){cb.processPlayerAttack(p,[d]);frame(p)}}
t('combo tripleSlash: attack1,attack2,attack3',names.join()==='attack1,attack2,attack3',names.join());
t('danno combo 15+15+30=60',d.hits.join()==='15,15,30',d.hits.join());
// 3 dopo la finale la combo riparte da 1
for(let i=0;i<40;i++)frame(p);frame(p,['attack']);t('dopo il 3° colpo riparte da attack1',p.currentAnimationName==='attack1',p.currentAnimationName);
// 4 finestra scaduta
p=fresh();frame(p,['attack']);idle(p,80);frame(p,['attack']);t('finestra combo scaduta -> attack1',p.currentAnimationName==='attack1');
// 5 attacco pesante
p=fresh();d=dummy();frame(p,['heavyAttack']);for(let i=0;i<40;i++){cb.processPlayerAttack(p,[d]);frame(p)}
t('pesante: danno 30, animazione attackHeavy',d.hits[0]===30&&true,d.hits.join());
p=fresh();frame(p,['heavyAttack']);t('animazione pesante',p.currentAnimationName==='attackHeavy');
// 6 buffer: premere durante l'attacco accoda
p=fresh();frame(p,['attack']);idle(p,9);frame(p,['attack']);idle(p,22);t('input anticipato (ultimi 200ms) eseguito dopo (buffer) -> attack2',p.currentAnimationName==='attack2',p.currentAnimationName);
p=fresh();frame(p,['attack']);idle(p,3);frame(p,['attack']);idle(p,40);t('input troppo anticipato (>200ms prima) ignorato: nessun secondo attacco',p.activeAttack===null&&p.currentAnimationName!=='attack2',p.currentAnimationName);
// 7 attacco blocca movimento a terra e direzione
p=fresh();frame(p,['attack'],['moveLeft']);t('a terra l\'attacco ferma il movimento e la direzione',p.velocityX===0&&p.facingDirection==='right');
// 8 hitbox specchiata
const pb={x:100,y:176,width:12,height:24};const A=ATTACK_DEFINITIONS.swordLight1;
const r=getAttackWorldHitbox(A,pb,'right'),l=getAttackWorldHitbox(A,pb,'left');
t('hitbox specchiata a sinistra',r.x===108&&l.x===100+12-8-20&&l.width===r.width,`${r.x} ${l.x}`);
// 9 nessun colpo fuori portata/finestra
p=fresh();d=dummy();d.getBounds=()=>({x:300,y:176,width:12,height:24});frame(p,['attack']);for(let i=0;i<20;i++){cb.processPlayerAttack(p,[d]);frame(p)}t('bersaglio lontano non colpito',d.hits.length===0);
// colpo solo nella finestra attiva
p=fresh();d=dummy();frame(p,['attack']);t('fuori dalla finestra attiva niente hitbox',p.getActiveAttackHitbox()===null);
// 10 schivata
p=fresh();const x0=p.positionX;frame(p,['dodge']);t('schivata: stato dodge e invulnerabile',p.currentState==='dodge'&&p.isInvulnerable);
t('schivata: danno ignorato',p.takeDamage(10,0)===false&&p.currentHealth===100);
idle(p,25);t('schivata finita, spostamento ~48px',!p.isInvulnerable&&Math.abs(p.positionX-x0-48)<4,(p.positionX-x0).toFixed(1));
frame(p,['dodge']);t('cooldown schivata',p.currentState!=='dodge');
idle(p,45);frame(p,['dodge']);t('schivata di nuovo disponibile',p.currentState==='dodge');
// 11 danno e invulnerabilità
p=fresh();t('danno applicato',p.takeDamage(20,50)&&p.currentHealth===80&&p.currentState!=='dead');frame(p);t('stato hurt',p.currentState==='hurt'&&p.currentAnimationName==='hurt');
t('rinculo lontano dalla fonte (fonte a sinistra->destra)',p.velocityX>0||p.positionX>100);
t('invulnerabile dopo il colpo',p.takeDamage(20,50)===false&&p.currentHealth===80);
idle(p,30);t('controllo ripristinato dopo ~350ms',p.currentState!=='hurt');
idle(p,10);t('ancora invulnerabile (<1s)',p.isInvulnerable);idle(p,25);t('invulnerabilità finita (>1s)',!p.isInvulnerable);
// 12 colpo subito interrompe attacco/combo
p=fresh();frame(p,['attack']);p.takeDamage(10,50);frame(p);t('colpo subito annulla l\'attacco',p.activeAttack===null);
// 13 morte
p=fresh();p.takeDamage(100,50);frame(p);t('morte a 0 HP',p.isDead&&p.currentState==='dead'&&p.currentAnimationName==='dead'&&p.currentHealth===0);
t('da morto niente altri danni/input',p.takeDamage(5,0)===false);frame(p,['attack','jump']);t('da morto nessun attacco',p.activeAttack===null);
t('non ancora pronto a ripartire',!p.isReadyToRespawn);idle(p,95);t('pronto a ripartire dopo 1.5s',p.isReadyToRespawn);
p.revive();p.respawnAt({x:24,y:176});frame(p);t('revive: salute piena',p.currentHealth===100&&!p.isDead);
// 14 durata frame animazione = durata attacco
for(const [k,a] of Object.entries(ATTACK_DEFINITIONS)){const an=PLAYER_ANIMATIONS[a.animation];t('animazione '+a.animation+' sincronizzata',Math.abs(an.frameDurationMs*an.frameIds.length-a.durationMs)<0.01&&a.hitEndMs<=a.durationMs)}
// 15 danno calcolato
t('calculateDamage',CombatSystem.calculateDamage(15,1)===15&&CombatSystem.calculateDamage(15,1.5)===23&&CombatSystem.calculateDamage(0,1)===1);

}
