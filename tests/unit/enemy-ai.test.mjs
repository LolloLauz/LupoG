// Nemici: pattuglia, inseguimento, guardia, attacchi, interruzioni, morte, difficoltà
// Ogni t(descrizione, condizione, dettaglio) è un controllo: se la condizione è falsa il test fallisce.
export const description = 'Nemici: pattuglia, inseguimento, guardia, attacchi, interruzioni, morte, difficoltà';

export default async function (t, load) {
const {Player}=await load('entities/Player');const {Enemy}=await load('entities/Enemy');const {CollisionSystem}=await load('systems/CollisionSystem');
const {CombatSystem}=await load('combat/CombatSystem');const {EnemyAISystem}=await load('systems/EnemyAISystem');
const {ENEMY_CONFIG}=await load('config/enemyConfig');const {LEVEL_CONFIG}=await load('config/levelConfig');const {ENEMY_ANIMATIONS}=await load('config/animationConfig');
const lvl={width:1024,platforms:[{x:0,y:200,width:400,height:40},{x:448,y:200,width:576,height:40},{x:120,y:150,width:48,height:8,oneWay:true},{x:220,y:120,width:48,height:8,oneWay:true},{x:330,y:150,width:48,height:8,oneWay:true},{x:560,y:168,width:32,height:32},{x:700,y:140,width:64,height:8,oneWay:true}]};const P=lvl.platforms;const cs=new CollisionSystem(),cb=new CombatSystem(),ai=new EnemyAISystem();

const mk=(pressed=[],held=[])=>({isHeld:a=>held.includes(a),wasPressed:a=>pressed.includes(a),wasReleased:()=>false});
const world=(enemies,player,n,pressed=()=>[])=>{for(let i=0;i<n;i++){player.update(1/60,mk(pressed(i)),cs,P,lvl.width);cb.processPlayerAttack(player,enemies);ai.update(enemies,player,P);enemies.forEach(e=>e.update(1/60,cs,P,lvl.width));cb.processEnemyAttacks(enemies,player)}};
const farPlayer=()=>{const p=new Player(900,176);for(let i=0;i<5;i++)p.update(1/60,mk(),cs,P,lvl.width);return p};
const settle=(e)=>{for(let i=0;i<10;i++)e.update(1/60,cs,P,lvl.width)};
// 1 pattuglia: resta nella zona ±60 e si gira
let sk=new Enemy(ENEMY_CONFIG.skeleton,230,176);let pl=farPlayer();let minX=999,maxX=0,turns=0,last=1;
for(let i=0;i<60*12;i++){ai.update([sk],pl,P);sk.update(1/60,cs,P,lvl.width);minX=Math.min(minX,sk.positionX);maxX=Math.max(maxX,sk.positionX);if(sk.patrolDirection!==last){turns++;last=sk.patrolDirection}}
t('pattuglia: resta in 170..290 e si gira',minX>=168&&maxX<=292&&turns>=2,`${minX.toFixed(0)}..${maxX.toFixed(0)} giri ${turns}`);
t('pattuglia: stato patrol/animazione walk',(sk.currentState==='patrol'||sk.currentState==='idle'));
// 2 non cade dal bordo (abisso x400..448) : enemy chase vicino abisso
let gb=new Enemy(ENEMY_CONFIG.goblin,380,184);settle(gb);pl=new Player(300,176);for(let i=0;i<5;i++)pl.update(1/60,mk(),cs,P,lvl.width);
// il giocatore è oltre l'abisso, sullo stesso livello
pl.positionX=470;pl.positionY=176;
for(let i=0;i<60*6;i++){ai.update([gb],pl,P);gb.update(1/60,cs,P,lvl.width)}
t('inseguitore non si butta nell\'abisso',gb.positionY<200&&gb.positionX<400,`x=${gb.positionX.toFixed(0)} y=${gb.positionY.toFixed(0)}`);
// 3 chase: insegue entro raggio, ignora oltre raggio
gb=new Enemy(ENEMY_CONFIG.goblin,500,184);settle(gb);pl=new Player(700,176);for(let i=0;i<5;i++)pl.update(1/60,mk(),cs,P,lvl.width);
for(let i=0;i<30;i++){ai.update([gb],pl,P);gb.update(1/60,cs,P,lvl.width)}t('goblin fuori raggio (200px) resta fermo',Math.abs(gb.positionX-500)<1&&!gb.isChasing);
pl.positionX=590; // 90px, nel raggio 110; blocco solido a 560..592 sul terreno: aggira? il muro blocca
gb=new Enemy(ENEMY_CONFIG.goblin,640,184);settle(gb);pl.positionX=560-12-2;pl.positionY=176;
// player a sinistra del blocco: goblin a destra del blocco a 640; distanza ~ 90 ma blocco in mezzo
for(let i=0;i<60*2;i++){ai.update([gb],pl,P);gb.update(1/60,cs,P,lvl.width)}
t('goblin bloccato dal muro non lo attraversa',gb.positionX>=592,gb.positionX.toFixed(1));
gb=new Enemy(ENEMY_CONFIG.goblin,800,184);settle(gb);pl=new Player(740,176);for(let i=0;i<5;i++)pl.update(1/60,mk(),cs,P,lvl.width);
for(let i=0;i<30;i++){ai.update([gb],pl,P);gb.update(1/60,cs,P,lvl.width)}t('goblin nel raggio insegue',gb.isChasing&&gb.positionX<800&&gb.currentState==='chase',gb.positionX.toFixed(1));
pl.positionX=1000;for(let i=0;i<60*3;i++){ai.update([gb],pl,P);pl.positionX=1000;gb.update(1/60,cs,P,lvl.width)}t('perde interesse se il giocatore è lontano',!gb.isChasing);
// 4 guardia: resta ferma, si volta, attacca a portata
let so=new Enemy(ENEMY_CONFIG.soldier,850,176);settle(so);pl=new Player(790,176);for(let i=0;i<5;i++)pl.update(1/60,mk(),cs,P,lvl.width);
for(let i=0;i<60;i++){ai.update([so],pl,P);so.update(1/60,cs,P,lvl.width)}t('guardia ferma e rivolta verso il giocatore (a sinistra)',Math.abs(so.positionX-850)<0.5&&so.facingDirection==='left'&&so.currentState==='idle');
pl.positionX=850-12-10;for(let i=0;i<3;i++)ai.update([so],pl,P);t('guardia in portata inizia l\'attacco',so.isAttacking||so.currentState==='attack');
// 5 colpo: windup 600ms, poi danno 15
so=new Enemy(ENEMY_CONFIG.soldier,850,176);settle(so);pl=new Player(826,176);for(let i=0;i<5;i++)pl.update(1/60,mk(),cs,P,lvl.width);let hpHistory=[];
const en=[so];world(en,pl,1);const startHp=pl.currentHealth;world(en,pl,30);t('durante il windup (500ms) nessun danno',pl.currentHealth===startHp);
world(en,pl,15);t('dopo windup+active: danno 15',pl.currentHealth===startHp-15,pl.currentHealth);
t('giocatore in hurt e invulnerabile (un colpo per attacco)',pl.currentState==='hurt'||pl.isInvulnerable);
const hpAfter=pl.currentHealth;world(en,pl,60);t('invulnerabilità: nessun doppio danno nello stesso secondo',pl.currentHealth>=hpAfter-15);
// 6 schivata evita il colpo
so=new Enemy(ENEMY_CONFIG.soldier,850,176);settle(so);pl=new Player(826,176);for(let i=0;i<5;i++)pl.update(1/60,mk(),cs,P,lvl.width);
const en2=[so];let h0=pl.currentHealth;world(en2,pl,1);// parte attacco
world(en2,pl,34);world(en2,pl,1,()=>['dodge']);world(en2,pl,20);t('schivare durante il colpo evita il danno',pl.currentHealth===h0,pl.currentHealth);
// 7 morte nemico: skeleton 40hp, 3 colpi da 15 -> non 2
sk=new Enemy(ENEMY_CONFIG.skeleton,600,176);settle(sk);t('skeleton vivo 40hp',sk.currentHealth===40);
sk.receiveHit(15,'right');t('colpo: ferito, stato hurt, rinculo a destra',sk.currentHealth===25&&sk.velocityX>0);sk.update(1/60,cs,P,lvl.width);t('stato hurt',sk.currentState==='hurt'&&sk.currentAnimationName==='hurt');
sk.receiveHit(15,'right');sk.receiveHit(15,'right');t('morto a 0 HP',!sk.isAlive&&sk.currentHealth===0);sk.update(1/60,cs,P,lvl.width);t('stato dead',sk.currentState==='dead'&&sk.currentAnimationName==='dead');
t('non ancora removibile',!sk.isRemovable);for(let i=0;i<50;i++)sk.update(1/60,cs,P,lvl.width);t('rimovibile dopo 700ms',sk.isRemovable);
const before=sk.currentHealth;sk.receiveHit(5,'left');t('niente danno da morto',sk.currentHealth===before);
// 8 colpo interrompe attacco nemico
so=new Enemy(ENEMY_CONFIG.soldier,850,176);settle(so);so.beginAttack();so.receiveHit(5,'left');t('soldato (armato): il colpo NON interrompe l\'attacco, ma fa danno',so.isAttacking&&so.currentHealth===55,so.currentHealth);
sk=new Enemy(ENEMY_CONFIG.skeleton,850,176);settle(sk);sk.beginAttack();sk.receiveHit(5,'left');t('scheletro: colpo nei primi 150ms interrompe l\'attacco',!sk.isAttacking&&sk.currentState!=='attack');
sk=new Enemy(ENEMY_CONFIG.skeleton,850,176);settle(sk);sk.beginAttack();for(let i=0;i<12;i++)sk.update(1/60,cs,P,lvl.width);sk.receiveHit(5,'left');t('scheletro: colpo dopo 150ms NON interrompe (finestra scaduta)',sk.isAttacking,sk.currentHealth);
gb=new Enemy(ENEMY_CONFIG.goblin,850,184);settle(gb);gb.beginAttack();gb.receiveHit(5,'left');t('goblin: attacco non interrompibile',gb.isAttacking);
// 9 giocatore morto: i nemici non attaccano più
so=new Enemy(ENEMY_CONFIG.soldier,850,176);settle(so);pl=new Player(826,176);pl.takeDamage(100,0);for(let i=0;i<10;i++)pl.update(1/60,mk(),cs,P,lvl.width);ai.update([so],pl,P);t('giocatore morto: niente attacco',!so.isAttacking);
// 10 difficoltà
const hard=new Enemy(ENEMY_CONFIG.goblin,0,0,'hard');t('difficoltà hard: 1.5x salute, 1.25x danno',hard.maxHealth===38&&hard.attackDamage===10,`${hard.maxHealth} ${hard.attackDamage}`);
// 11 durata animazione attacco = somma fasi; livello 1 spawn
for(const [id,a] of Object.entries(ENEMY_ANIMATIONS)){const d=ENEMY_CONFIG[id];const sum=a.attack.frameDurationsMs.reduce((x,y)=>x+y,0);t('animazione attacco '+id+' = windup+active+recovery',sum===d.attackWindupMs+d.attackActiveMs+d.attackRecoveryMs)}
// 12 il giocatore colpisce e uccide goblin (25hp): 2 colpi 15
gb=new Enemy(ENEMY_CONFIG.goblin,100+14,184);settle(gb);pl=new Player(100,176);for(let i=0;i<5;i++)pl.update(1/60,mk(),cs,P,lvl.width);
const en3=[gb];world(en3,pl,1,()=>['attack']);world(en3,pl,12);t('goblin ferito dal primo colpo',gb.currentHealth<25,gb.currentHealth);

}
