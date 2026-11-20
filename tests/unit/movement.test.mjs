// Movimento, salto, gravità e collisioni del giocatore
// Ogni t(descrizione, condizione, dettaglio) è un controllo: se la condizione è falsa il test fallisce.
export const description = 'Movimento, salto, gravità e collisioni del giocatore';

export default async function (t, load) {
const {Player}=await load('entities/Player');const {CollisionSystem}=await load('systems/CollisionSystem');const {LEVEL_CONFIG}=await load('config/levelConfig');
const lvl={width:1024,platforms:[{x:0,y:200,width:400,height:40},{x:448,y:200,width:576,height:40},{x:120,y:150,width:48,height:8,oneWay:true},{x:220,y:120,width:48,height:8,oneWay:true},{x:330,y:150,width:48,height:8,oneWay:true},{x:560,y:168,width:32,height:32},{x:700,y:140,width:64,height:8,oneWay:true}]};const cs=new CollisionSystem();
const mk=(held=[],pressed=[],released=[])=>({isHeld:a=>held.includes(a),wasPressed:a=>pressed.includes(a),wasReleased:a=>released.includes(a)});
const step=(p,inp,n=1,dt=1/60)=>{for(let i=0;i<n;i++)p.update(dt,i===0?inp:mk(inp.held||[]),cs,lvl.platforms,lvl.width)};
const run=(p,held,pressed,released,n,dt=1/60)=>{for(let i=0;i<n;i++)p.update(dt,mk(held,i===0?pressed:[],i===0?released:[]),cs,lvl.platforms,lvl.width)};

// 1 atterraggio
let p=new Player(24,150);run(p,[],[],[],60);t('atterra su terreno y=176',Math.abs(p.positionY-176)<0.01&&p.isOnGround&&p.currentState==='idle',p.positionY);
// 2 camminata 1s
run(p,['moveRight'],[],[],60);t('cammina ~80px/s',Math.abs(p.positionX-104)<2&&p.currentState==='walk'&&p.facingDirection==='right',p.positionX);
run(p,['moveLeft'],[],[],30);t('gira a sinistra',p.facingDirection==='left');
// 3 salto apice
p=new Player(24,176);run(p,[],[],[],5);let minY=p.positionY;run(p,[],['jump'],[],1);for(let i=0;i<80;i++){run(p,['x'],[],[],1);minY=Math.min(minY,p.positionY)}
t('altezza salto ~53px',Math.abs((176-minY)-53)<3,(176-minY).toFixed(1));
// 4 salto variabile
p=new Player(24,176);run(p,[],[],[],5);run(p,[],['jump'],[],1);run(p,[],[],['jump'],1);minY=p.positionY;for(let i=0;i<80;i++){run(p,[],[],[],1);minY=Math.min(minY,p.positionY)}
t('salto corto < salto pieno',(176-minY)<30,(176-minY).toFixed(1));
// 5 no doppio salto
p=new Player(24,176);run(p,[],[],[],5);run(p,[],['jump'],[],10);const vy=p.velocityY;run(p,[],['jump'],[],1);t('niente doppio salto',p.velocityY>vy-1);
// 6 stati aria
p=new Player(24,176);run(p,[],[],[],5);run(p,[],['jump'],[],3);t('stato jump',p.currentState==='jump'&&p.currentAnimationName==='jump');run(p,[],[],[],30);t('stato fall',p.currentState==='fall');
// 7 limiti mappa
p=new Player(10,176);run(p,['moveLeft'],[],[],60);t('limite sinistro',p.positionX===0);
// 8 muro solido (blocco 560..592 y168)
p=new Player(520,176);run(p,[],[],[],5);run(p,['moveRight'],[],[],120);t('bloccato dal muro',Math.abs(p.positionX-(560-12))<0.01,p.positionX);
// 9 piattaforma sospesa: da sotto attraversa, da sopra atterra
p=new Player(130,176);run(p,[],[],[],5);run(p,[],['jump'],[],1);let reached=false;for(let i=0;i<120;i++){run(p,['x'],[],[],1);if(p.isOnGround&&Math.abs(p.positionY-(150-24))<0.1)reached=true}
t('sale sopra piattaforma sospesa (passando da sotto)',reached,p.positionY.toFixed(1));
// 10 abisso
p=new Player(395,176);run(p,[],[],[],3);run(p,['moveRight'],[],[],90);t('cade nell\'abisso',p.positionY>240,p.positionY.toFixed(0));
// 11 indipendenza da FPS: 1s a 30fps vs 120fps
const a=new Player(24,176);run(a,['moveRight'],[],[],30,1/30);const b=new Player(24,176);run(b,['moveRight'],[],[],120,1/120);t('velocità indipendente dagli FPS',Math.abs(a.positionX-b.positionX)<0.5,a.positionX+' '+b.positionX);

}
