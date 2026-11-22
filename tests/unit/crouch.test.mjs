// Accovacciarsi (tasto S / freccia giù): hitbox più bassa, piedi fermi, niente movimento, soffitto, sprite
// Ogni t(descrizione, condizione, dettaglio) è un controllo: se la condizione è falsa il test fallisce.
import { FakeSpriteManager } from "../helpers.mjs";
export const description = 'Accovacciarsi: hitbox, soffitti, movimento bloccato, attacco da accovacciati, sprite';

export default async function (t, load) {
const {Player}=await load('entities/Player');const {CollisionSystem}=await load('systems/CollisionSystem');
const {PLAYER_CONFIG}=await load('config/playerConfig');const {CONTROLS_CONFIG,INPUT_CONTEXT_ACTIONS}=await load('config/controlsConfig');
const {PLAYER_ANIMATIONS}=await load('config/animationConfig');const {registerKnightSprites}=await load('rendering/sprites/knightSprites');
const cs=new CollisionSystem();
const mk=(held=[])=>({isHeld:a=>held.includes(a),wasPressed:()=>false,wasReleased:()=>false});
const floor=()=>[{x:0,y:200,width:400,height:40}];
const frame=(p,held,platforms,n=1)=>{for(let i=0;i<n;i++)p.update(1/60,mk(held),cs,platforms,1024);};
const feet=p=>p.positionY+p.height;

t('tasto S e freccia giù per accovacciarsi, attivo solo nel gioco', CONTROLS_CONFIG.crouch.includes('KeyS')&&CONTROLS_CONFIG.crouch.includes('ArrowDown')&&INPUT_CONTEXT_ACTIONS.gameplay.includes('crouch')&&!INPUT_CONTEXT_ACTIONS.menu.includes('crouch'));

// a terra: i piedi restano a y=200
{const p=new Player(50,176);const pl=floor();frame(p,[],pl,10);
 t('in piedi sul pavimento: piedi a 200 e hitbox piena',feet(p)===200&&p.height===PLAYER_CONFIG.hitboxHeight&&!p.isCrouching,`feet=${feet(p)} h=${p.height}`);
 frame(p,['crouch'],pl,3);
 t('accovacciato: hitbox bassa, piedi fermi',p.isCrouching&&p.height===PLAYER_CONFIG.crouchHitboxHeight&&feet(p)===200,`h=${p.height} feet=${feet(p)}`);
 t('stato e animazione crouch',p.currentState==='crouch'&&p.currentAnimationName==='crouch',p.currentState);
 const x0=p.positionX;frame(p,['crouch','moveRight'],pl,30);
 t('accovacciato non ci si sposta (si gira soltanto)',p.positionX===x0&&p.facingDirection==='right',`x ${x0}->${p.positionX}`);
 frame(p,[],pl,2);
 t('rilasciando S ci si rialza (nessun ostacolo)',!p.isCrouching&&p.height===PLAYER_CONFIG.hitboxHeight&&feet(p)===200,`h=${p.height} feet=${feet(p)}`);
}

// soffitto: non ci si rialza sotto una piattaforma solida
{const p=new Player(50,176);const pl=floor();frame(p,['crouch'],pl,3);
 pl.push({x:40,y:170,width:60,height:14}); // bordo inferiore a 184 = altezza da accovacciato
 frame(p,[],pl,3);
 t('sotto un soffitto solido si resta accovacciati',p.isCrouching&&feet(p)===200,`h=${p.height}`);
}
// piattaforma a senso unico sopra la testa: si può passare e rialzarsi
{const p=new Player(50,176);const pl=floor();frame(p,['crouch'],pl,3);
 pl.push({x:40,y:170,width:60,height:14,oneWay:true});
 frame(p,[],pl,3);
 t('una piattaforma a senso unico non blocca il rialzarsi',!p.isCrouching&&feet(p)===200);
}
// in aria non ci si accovaccia
{const p=new Player(50,100);const pl=floor();frame(p,['crouch'],pl,2);
 t('in aria non ci si accovaccia',!p.isCrouching&&p.currentState!=='crouch');
}
// colpito mentre si è accovacciati: torna in piedi (se libero) e resta stordito
{const p=new Player(50,176);const pl=floor();frame(p,['crouch'],pl,3);
 p.takeDamage(10,0);frame(p,['crouch'],pl,1);
 t('colpito da accovacciato: non resta accovacciato',!p.isCrouching&&p.currentState==='hurt',`state=${p.currentState}`);
}
// la schivata non è un'accovacciata
{const p=new Player(50,176);const pl=floor();frame(p,['crouch'],pl,3);
 frame(p,['crouch'],pl,1);
 t('animazione crouch presente nel set del cavaliere',PLAYER_ANIMATIONS.crouch!==undefined&&PLAYER_ANIMATIONS.crouch.frameIds[0]==='knightCrouch');
}
// sprite registrato con dimensioni del cavaliere
{const sm=new FakeSpriteManager();registerKnightSprites(sm);
 const s=sm.getSpriteSize('knightCrouch');
 t('sprite knightCrouch registrato e alto come il cavaliere',s!==undefined&&s.height===30&&s.width===24,JSON.stringify(s&&{w:s.width,h:s.height}));
}
await crouchAttackChecks(t, load);
await crouchHurtRenderCheck(t, load);
}

// Attacco da accovacciati: il cavaliere resta basso (hitbox e sprite)
export async function crouchAttackChecks(t, load) {
const {Player}=await load('entities/Player');const {CollisionSystem}=await load('systems/CollisionSystem');
const {PLAYER_CONFIG,ATTACK_DEFINITIONS}=await load('config/playerConfig');const {PLAYER_ANIMATIONS}=await load('config/animationConfig');
const {registerKnightSprites,KNIGHT_CROUCH_SUFFIX,KNIGHT_FIRE_SUFFIX}=await load('rendering/sprites/knightSprites');
const cs=new CollisionSystem();const pl=[{x:0,y:200,width:400,height:40}];
const input=(held=[],pressed=[])=>({isHeld:a=>held.includes(a),wasPressed:a=>pressed.includes(a),wasReleased:()=>false});
const p=new Player(50,176);for(let i=0;i<10;i++)p.update(1/60,input(),cs,pl,1024);
for(let i=0;i<3;i++)p.update(1/60,input(['crouch']),cs,pl,1024);
p.update(1/60,input(['crouch'],['attack']),cs,pl,1024);
let alwaysLow=true,alwaysCrouchFrame=true,sawHitbox=false,hitboxLow=true;
for(let i=0;i<12;i++){p.update(1/60,input(['crouch']),cs,pl,1024);
 if(p.currentState!=='attack')break;
 alwaysLow&&=p.isCrouching&&p.height===PLAYER_CONFIG.crouchHitboxHeight&&p.positionY+p.height===200;
 alwaysCrouchFrame&&=p.getRenderedFrameId().endsWith(KNIGHT_CROUCH_SUFFIX);
 const hb=p.getActiveAttackHitbox();if(hb){sawHitbox=true;hitboxLow&&=hb.y>=p.positionY&&hb.y===200-PLAYER_CONFIG.crouchHitboxHeight+ATTACK_DEFINITIONS.swordLight1.hitbox.y;}}
t('attaccando da accovacciati la hitbox resta bassa e i piedi fermi',alwaysLow);
t('attaccando da accovacciati si disegna la variante bassa dello sprite',alwaysCrouchFrame,p.getRenderedFrameId());
t("l'area d'urto dell'attacco da accovacciati parte dal corpo abbassato",sawHitbox&&hitboxLow);
// in piedi: niente variante
const q=new Player(50,176);for(let i=0;i<10;i++)q.update(1/60,input(),cs,pl,1024);
q.update(1/60,input([],['attack']),cs,pl,1024);q.update(1/60,input(),cs,pl,1024);
t('attaccando in piedi si usa lo sprite normale',q.currentState==='attack'&&!q.getRenderedFrameId().endsWith(KNIGHT_CROUCH_SUFFIX),q.getRenderedFrameId());
// ogni frame d'attacco ha la variante accovacciata (anche col fuoco), alta 30 e con i piedi in basso
const sm=(await import('../helpers.mjs')).FakeSpriteManager;const s=new sm();registerKnightSprites(s);
const attackFrames=[...new Set(Object.values(ATTACK_DEFINITIONS).flatMap(a=>PLAYER_ANIMATIONS[a.animation].frameIds))];
const missing=attackFrames.filter(id=>!s.sprites.has(id+KNIGHT_CROUCH_SUFFIX)||!s.sprites.has(id+KNIGHT_CROUCH_SUFFIX+KNIGHT_FIRE_SUFFIX));
t('ogni frame d\'attacco ha la variante accovacciata (normale e fuoco)',missing.length===0,missing.join(','));
const lowEnough=attackFrames.every(id=>{const sp=s.sprites.get(id+KNIGHT_CROUCH_SUFFIX);const top=sp.rows.findIndex(r=>/[^.]/.test(r.slice(0,15)));return sp.height===30&&top>=6;});
t('nelle varianti accovacciate il corpo è abbassato (elmo dalla riga 6)',lowEnough);
}

// colpiti durante un attacco da accovacciati: prima del frame successivo lo stato è ancora "attack",
// ma l'animazione è già "hurt" e non esiste "knightHurtCrouch" (difetto trovato dal fuzz nel browser)
export async function crouchHurtRenderCheck(t, load) {
const {Player}=await load('entities/Player');const {CollisionSystem}=await load('systems/CollisionSystem');
const {registerKnightSprites,KNIGHT_FIRE_SUFFIX}=await load('rendering/sprites/knightSprites');const {FakeSpriteManager}=await import('../helpers.mjs');
const cs=new CollisionSystem();const pl=[{x:0,y:200,width:400,height:40}];
const input=(held=[],pressed=[])=>({isHeld:a=>held.includes(a),wasPressed:a=>pressed.includes(a),wasReleased:()=>false});
const sm=new FakeSpriteManager();registerKnightSprites(sm);
const p=new Player(50,176);for(let i=0;i<10;i++)p.update(1/60,input(),cs,pl,1024);
for(let i=0;i<3;i++)p.update(1/60,input(['crouch']),cs,pl,1024);
p.update(1/60,input(['crouch'],['attack']),cs,pl,1024);p.update(1/60,input(['crouch']),cs,pl,1024);
p.takeDamage(5,0);
const id=p.getRenderedFrameId();
t('colpiti durante un attacco da accovacciati, il frame disegnato esiste',sm.sprites.has(id)&&sm.sprites.has(id+KNIGHT_FIRE_SUFFIX),id);
}
