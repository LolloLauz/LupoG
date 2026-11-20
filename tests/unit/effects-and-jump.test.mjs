// Effetti grafici, hit-stop, coyote time e salto anticipato
// Ogni t(descrizione, condizione, dettaglio) è un controllo: se la condizione è falsa il test fallisce.
export const description = 'Effetti grafici, hit-stop, coyote time e salto anticipato';

export default async function (t, load) {

const {EffectsManager}=await load('rendering/EffectsManager');
const {Player}=await load('entities/Player');const {CollisionSystem}=await load('systems/CollisionSystem');const {PLAYER_CONFIG}=await load('config/playerConfig');
// ---- effetti ----
let seq=0;const rnd=()=>{seq=(seq*9301+49297)%233280;return seq/233280};
const fx=new EffectsManager(rnd);
fx.spawnHitSparks(10,10,1);t('scintille: 7 particelle',fx.particleCount===7);
fx.spawnBurst(0,0,['#fff'],14);t('burst: +14',fx.particleCount===21);
fx.spawnDust(0,0);fx.spawnSparkle(0,0);t('polvere +5, scintillio +6',fx.particleCount===32);
for(let i=0;i<50;i++)fx.update(1/60);t('dopo 0.83s tutte le particelle sono scadute',fx.particleCount===0,fx.particleCount);
for(let i=0;i<500;i++)fx.spawnBurst(0,0,['#fff'],50);t('tetto di 200 particelle',fx.particleCount<=200,fx.particleCount);
fx.clear();t('clear svuota',fx.particleCount===0&&!fx.isHitStopActive);
fx.addPopup('+100',5,5);t('popup creato',fx.popupCount===1);for(let i=0;i<50;i++)fx.update(1/60);t('popup scade dopo 700ms',fx.popupCount===0);
// shake
let off=fx.getShakeOffset();t('senza shake offset 0',off.x===0&&off.y===0);
fx.triggerShake(3,200);let nonZero=0,maxAbs=0;for(let i=0;i<14;i++){const o=fx.getShakeOffset();if(o.x||o.y)nonZero++;maxAbs=Math.max(maxAbs,Math.abs(o.x),Math.abs(o.y));fx.update(1/60)}
t('shake: offset non nulli, interi, <= magnitudine',nonZero>=10&&maxAbs<=3&&maxAbs>=1,`nonZero ${nonZero} max ${maxAbs}`);
for(let i=0;i<5;i++)fx.update(1/60);off=fx.getShakeOffset();t('shake termina',off.x===0&&off.y===0);
fx.triggerShake(4,200);fx.triggerShake(1,50);let o2=fx.getShakeOffset();t('shake debole non sostituisce quello forte',Math.max(Math.abs(o2.x),Math.abs(o2.y))>=3,JSON.stringify(o2));
// hit-stop
fx.clear();fx.triggerHitStop(60);fx.triggerHitStop(30);t('hit-stop vale il più lungo (60)',fx.isHitStopActive);fx.tickHitStop(0.03);t('dopo 30ms ancora attivo',fx.isHitStopActive);fx.tickHitStop(0.04);t('dopo 70ms finito',!fx.isHitStopActive);
// ---- coyote time e jump buffer ----
const cs=new CollisionSystem();const P=[{x:0,y:200,width:200,height:40}];
const mk=(pressed=[],held=[],rel=[])=>({isHeld:a=>held.includes(a),wasPressed:a=>pressed.includes(a),wasReleased:a=>rel.includes(a)});
const run=(p,n,pressed=()=>[],held=[])=>{for(let i=0;i<n;i++)p.update(1/60,mk(pressed(i),held),cs,P,400)};
const fresh=(x=100)=>{const p=new Player(x,176);run(p,5);return p};
// cammina oltre il bordo (x=200)
let p=fresh(190);run(p,12,()=>[],['moveRight']);t('cammina oltre il bordo e inizia a cadere',!p.isOnGround&&p.positionX>200-12+1,`x ${p.positionX.toFixed(1)}`);
// salto entro coyote (1-3 frame dopo il bordo)
p=fresh(190);let f=0;while(p.isOnGround&&f<60){run(p,1,()=>[],['moveRight']);f++}
run(p,2,()=>[],['moveRight']);let vy0=p.velocityY;run(p,1,(i)=>['jump'],['moveRight']);t('salto subito dopo il bordo (coyote) permesso',p.velocityY<vy0-100,`vy ${p.velocityY.toFixed(0)}`);
// salto troppo tardi (oltre 80ms = 5 frame)
p=fresh(190);f=0;while(p.isOnGround&&f<60){run(p,1,()=>[],['moveRight']);f++}
run(p,8,()=>[],['moveRight']);vy0=p.velocityY;run(p,1,()=>['jump'],['moveRight']);t('salto oltre il coyote time negato',p.velocityY>=vy0,`vy ${p.velocityY.toFixed(0)}`);
// niente doppio salto con coyote
p=fresh(100);run(p,1,()=>['jump']);run(p,3);const vyA=p.velocityY;run(p,1,()=>['jump']);t('nessun doppio salto (coyote azzerato dopo il salto)',p.velocityY>vyA-1);
// jump buffer: salto premuto 3 frame prima di toccare terra
p=fresh(100);run(p,1,()=>['jump']);let landed=false,pressedAt=-1;for(let i=0;i<120&&!landed;i++){run(p,1);const vy=p.velocityY;const nearGround=p.positionY>176-8&&vy>0;if(nearGround&&pressedAt<0){pressedAt=i;run(p,1,()=>['jump']);}if(pressedAt>=0&&i>pressedAt+1){landed=true}}
run(p,4);t('salto anticipato (buffer) eseguito all\'atterraggio',p.velocityY<0||!p.isOnGround,`y ${p.positionY.toFixed(1)} vy ${p.velocityY.toFixed(0)}`);
// buffer scaduto: premuto 15 frame prima
p=fresh(100);run(p,1,()=>['jump']);for(let i=0;i<500&&p.velocityY<=0;i++)run(p,1);// apice
let framesToGround=0;const q=new Player(p.positionX,p.positionY);
t('PLAYER_CONFIG coyote/buffer definiti',PLAYER_CONFIG.coyoteTimeMs===80&&PLAYER_CONFIG.jumpBufferMs===100);

}
