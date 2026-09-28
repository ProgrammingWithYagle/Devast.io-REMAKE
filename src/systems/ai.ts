import { BALANCE,GHOULS } from '../content';
import type { Game } from '../core/game';
import type { Entity,Vec } from '../core/model';
import { circleRect,distance,entityRect,random,segmentCircle,sweptCircleRect } from '../core/math';
import { blocksActor } from '../world/entities';
import { hurtPlayer } from './survival';

// Geometry is shared by actors searching on the same simulation tick. A door,
// placed object or destruction invalidates it immediately; it is never saved.
const geometry=new WeakMap<Game,{tick:number;revision:number;clear:Map<string,boolean>;edges:Map<string,boolean>}>();
function searchGeometry(game:Game){let cache=geometry.get(game);if(!cache||cache.tick!==game.world.tick||cache.revision!==game.navigationRevision){cache={tick:game.world.tick,revision:game.navigationRevision,clear:new Map(),edges:new Map()};geometry.set(game,cache);}return cache;}

function walkable(game:Game,x:number,y:number,r:number,ignore:string){if(x<40||y<40||x>BALANCE.worldSize-40||y>BALANCE.worldSize-40)return false;return !game.near({x,y},100).some(e=>e.id!==ignore&&blocksActor(e)&&(e.radius?distance(e,{x,y})<r+e.radius:circleRect({x,y},r,entityRect(e))));}
export function pathBlocked(game:Game,from:Vec,to:Vec,r:number,ignore=''):boolean {return game.near({x:(from.x+to.x)/2,y:(from.y+to.y)/2},distance(from,to)/2+140).some(e=>e.id!==ignore&&blocksActor(e)&&(e.radius?segmentCircle(from,to,e,e.radius+r)!==null:sweptCircleRect(from,to,r,entityRect(e))));}
export function findPath(game:Game,from:Vec,to:Vec,r=22,ignore='',stopRange=0,limits={steps:24,visits:450}):Vec[]{
 if(!pathBlocked(game,from,to,r,ignore))return [to];
 const coarse=gridPath(game,from,to,r,ignore,stopRange,limits,64);
 if(coarse.length)return coarse;
 const medium=gridPath(game,from,to,r,ignore,stopRange,{steps:limits.steps,visits:Math.min(12000,limits.visits*4)},32);
 // A valid passage between a wide station and another object can be narrower
 // than the coarse grid. Refine only failed routes, with a bounded search.
 return medium.length?medium:gridPath(game,from,to,r,ignore,stopRange,{steps:limits.steps,visits:Math.min(12000,limits.visits*8)},16);
}
function gridPath(game:Game,from:Vec,to:Vec,r:number,ignore:string,stopRange:number,limits:{steps:number;visits:number},cell:number):Vec[]{
 const sx=Math.floor(from.x/cell),sy=Math.floor(from.y/cell),gx=Math.floor(to.x/cell),gy=Math.floor(to.y/cell),half=cell/2;
 const key=(x:number,y:number)=>`${x},${y}`;const start=key(sx,sy),target=key(gx,gy);
 // A stable min-heap avoids sorting the whole frontier for every visited tile.
 // Cache geometry within this synchronous search; no world mutation can occur
 // during it, so repeated approaches to a tile need not query it again.
 type Node={x:number;y:number;g:number;f:number;order:number};
 const open:Node[]=[{x:sx,y:sy,g:0,f:0,order:0}],closed=new Set<string>(),cost=new Map([[start,0]]),parents=new Map<string,string>();const {clear,edges}=searchGeometry(game),cachePrefix=`${cell}/${r}/${game.byId.get(ignore)&&blocksActor(game.byId.get(ignore)!)?ignore:''}/`;let found='',order=1;
 const less=(a:Node,b:Node)=>a.f<b.f||a.f===b.f&&a.order<b.order;
 const push=(n:Node)=>{let i=open.length;open.push(n);while(i){const p=(i-1)>>1;if(!less(n,open[p]))break;open[i]=open[p];i=p;}open[i]=n;};
 const pop=()=>{const first=open[0],last=open.pop()!;if(open.length){let i=0;while(i*2+1<open.length){let child=i*2+1;if(child+1<open.length&&less(open[child+1],open[child]))child++;if(!less(open[child],last))break;open[i]=open[child];i=child;}open[i]=last;}return first;};
 for(let visit=0;open.length&&visit<limits.visits;visit++){
  const at=pop(),k=key(at.x,at.y);if(closed.has(k))continue;const centre=k===start?from:{x:at.x*cell+half,y:at.y*cell+half};if(stopRange>0&&distance(centre,to)<=stopRange||!stopRange&&(k===target||distance(centre,to)<cell*.75)&&!pathBlocked(game,centre,to,r,ignore)){found=k;break;}closed.add(k);
  for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]]){const nx=at.x+dx,ny=at.y+dy,nk=key(nx,ny),g=at.g+1,next={x:nx*cell+half,y:ny*cell+half};if(closed.has(nk)||g>limits.steps*64/cell||(cost.get(nk)??Infinity)<=g)continue;const tile=cachePrefix+nk;let free=clear.get(tile);if(free===undefined){free=walkable(game,next.x,next.y,r,ignore);clear.set(tile,free);}if(!free)continue;const edge=cachePrefix+`${centre.x},${centre.y}>${next.x},${next.y}`;let blocked=edges.get(edge);if(blocked===undefined){blocked=pathBlocked(game,centre,next,r,ignore);edges.set(edge,blocked);}if(blocked)continue;cost.set(nk,g);parents.set(nk,k);push({x:nx,y:ny,g,f:g+Math.abs(gx-nx)+Math.abs(gy-ny),order:order++});}
 }
 if(!found)return [];const path:Vec[]=[];while(found!==start){const [x,y]=found.split(',').map(Number);path.push({x:x*cell+half,y:y*cell+half});found=parents.get(found)!;}path.reverse();if(!stopRange)path.push({...to});
 if(cell<64){const smooth:Vec[]=[];let previous=from;for(let i=0;i<path.length;){let last=i;while(last+1<path.length&&!pathBlocked(game,previous,path[last+1],r,ignore))last++;smooth.push(path[last]);previous=path[last];i=last+1;}return smooth;}return path;
}
function travel(game:Game,e:Entity,target:Vec,speed:number,dt:number){const ai=e.ai!;if(ai.path.length&&distance(e,ai.path[0])<12)ai.path.shift();const waypoint=ai.path[0]||target;
 if(game.near(e,35).some(s=>(s.type==='wooden_spike'||s.type==='wood_spike')&&s.activated>0&&distance(s,e)<32))speed*=BALANCE.spikeSpeedMultiplier;
 let angle=Math.atan2(waypoint.y-e.y,waypoint.x-e.x);const other=game.near(e,50).find(a=>a.id!==e.id&&(a.kind==='ghoul'||a.kind==='robot')&&distance(e,a)<e.radius+a.radius-5);
 if(other)angle+=.65;e.rotation=angle;
 const moved=game.move(e,Math.cos(angle)*speed*dt,Math.sin(angle)*speed*dt,e.radius,e.id);game.spatial.insert(e);if(!moved&&ai.path.length)ai.nextThink=Math.min(ai.nextThink,game.world.time+.15);
}
function think(game:Game,e:Entity,target:Vec,permitSearch:()=>boolean){const ai=e.ai!;if(game.world.time<ai.nextThink)return;const blocked=pathBlocked(game,e,target,e.radius,e.id);if(blocked&&!permitSearch())return;ai.nextThink=game.world.time+.8;const object='kind'in target?target as Entity:null;const reach=object&&blocksActor(object)?Math.max(object.width,object.height)/2+e.radius+12:0;ai.path=blocked?findPath(game,e,target,e.radius,e.id,reach):[];}
export function updateActors(game:Game,dt:number){const w=game.world,p=game.player;let searches=0;
 // Distribute expensive searches across fixed ticks. Waiting actors retain
 // their current route and retry on the next tick; no search is shortened.
 const permitSearch=()=>searches++<1;
 if(w.time>=w.nextSpawn){w.nextSpawn=w.time+(game.isNight()?18:45);const live=w.entities.filter(e=>e.active&&e.kind==='ghoul').length;
  if(live<32){const roll=random(w,'ai'),type=roll<.48?'normal_ghoul':roll<.71?'fast_ghoul':roll<.85?'explosive_ghoul':roll<.96?'radioactive_ghoul':'armored_ghoul';const a=random(w,'ai')*Math.PI*2,r=550+random(w,'ai')*550,x=p.x+Math.cos(a)*r,y=p.y+Math.sin(a)*r;
   if(walkable(game,x,y,26,''))game.create(type,x,y);
  }
 }
 for(const e of [...w.entities]){if(!e.active||!e.ai)continue;const ai=e.ai;ai.cooldown=Math.max(0,ai.cooldown-dt);ai.dodge=Math.max(0,ai.dodge-dt);
  if(e.deployment>0){e.deployment=Math.max(0,e.deployment-dt);if(!e.deployment){const ratio=e.hp/e.maxHp;e.maxHp=e.type==='tesla_bot'?3000:e.type==='hal_bot'?800:400;e.hp=e.maxHp*ratio;}continue;}
  if(e.kind==='ghoul'){
   const def=GHOULS[e.type];if(w.time-e.created>=def.lifespan_seconds){game.destroy(e);continue;}
   let light=!game.isNight()&&!game.inShelter(e)?2:0;
   if(light<2&&game.near(e,BALANCE.lampRadius).some(l=>l.type==='lamp'&&l.signal&&distance(e,l)<BALANCE.lampRadius&&!game.lineBlocked(e,l,true,l.id)))light=Math.max(light,1);
   if(light){e.hp-=light*dt;if(e.hp<=0){game.destroy(e);continue;}}
   const rival=ai.retaliation&&ai.retaliation!=='player'?game.byId.get(ai.retaliation):undefined;
   const target=rival?.active?rival:p;
   const hostile=target!==p||(p.age>=def.hostility_after_player_minutes*60||p.provoked.includes(e.type))&&p.effects.ghoul<=0;
   const canSee=distance(e,target)<(game.isNight()?540:360)&&!game.lineBlocked(e,target,true,e.id);
   if(hostile&&canSee){ai.mode='chase';ai.target=target.id;ai.lastSeen=w.time;}
   if(ai.mode==='chase'&&(!hostile||w.time-ai.lastSeen>12||distance(e,target)>900)){ai.mode='return';ai.target=null;ai.retaliation=null;ai.path=[];}
   if(ai.mode==='chase'){
    if(distance(e,target)<e.radius+BALANCE.playerRadius+10&&!game.lineBlocked(e,target,false,e.id)){if(!ai.cooldown){const damage=game.isNight()?def.night_damage:def.day_damage;if(target===p){hurtPlayer(game,damage,'melee',e.type.replaceAll('_',' '));game.move(p,(p.x-e.x)*.12,(p.y-e.y)*.12,BALANCE.playerRadius);}else game.damageEntity(target as Entity,damage,'melee',undefined,e.id);ai.cooldown=1;}}
    else{think(game,e,target,permitSearch);travel(game,e,target,BALANCE.ghoulSpeeds[e.type]*(game.isNight()?1:.8),dt);
     if(game.isNight()&&!ai.path.length&&game.lineBlocked(e,target,false,e.id)&&!ai.cooldown){const wall=game.near(e,90).find(o=>o.owner===p.owner&&blocksActor(o)&&distance(o,e)<80);if(wall){game.damageEntity(wall,def.night_damage*(e.type==='armored_ghoul'?BALANCE.armoredStructureMultiplier:BALANCE.ghoulStructureMultiplier),'melee',undefined,e.id);ai.cooldown=1;}}
    }
    if(!ai.dodge){const bullet=w.projectiles.find(b=>b.owner===p.owner&&distance(b,e)<120);if(bullet){const angle=Math.atan2(bullet.vy,bullet.vx)+Math.PI/2;game.move(e,Math.cos(angle)*22,Math.sin(angle)*22,e.radius,e.id);ai.dodge=2.5;}}
   }else{
    if(w.time>=ai.nextThink||distance(e,ai.waypoint)<15){ai.nextThink=w.time+3+random(w,'ai')*4;const a=random(w,'ai')*Math.PI*2;ai.waypoint={x:ai.home.x+Math.cos(a)*160,y:ai.home.y+Math.sin(a)*160};ai.path=[];}
    if(distance(e,ai.waypoint)>15)travel(game,e,ai.waypoint,BALANCE.ghoulSpeeds[e.type]*.25,dt);
   }
  }else{
   const loyal=e.owner===p.owner;
   if(!loyal&&(e.type!=='lapabot'||ai.retaliation==='player')){
    if(distance(e,p)<450){think(game,e,p,permitSearch);if(distance(e,p)>52)travel(game,e,p,120,dt);else if(!ai.cooldown&&!game.lineBlocked(e,p,false,e.id)){hurtPlayer(game,e.type==='tesla_bot'?100:e.type==='lapabot'?BALANCE.lapabotDamage:30,'melee','Abandoned guard robot');ai.cooldown=1;}}continue;
   }
   const rival=ai.retaliation?game.byId.get(ai.retaliation):undefined;
   const repairing=e.type==='lapabot'&&!rival?.active;
   const eligible=(o:Entity)=>o.active&&(repairing?o.owner===e.owner&&o.hp<o.maxHp&&['station','structure','container'].includes(o.kind):o.kind==='ghoul')&&distance(e,o)<(repairing?600:550);
   let target=rival?.active?rival:ai.target?game.byId.get(ai.target):undefined;
   if(target&&target!==rival&&!eligible(target))target=undefined;
   // Keep a valid target between think intervals. Re-running a path search for
   // every unreachable enemy on every simulation tick caused severe base stalls.
   if(!target&&w.time>=ai.nextThink){
    const candidates=game.near(e,repairing?600:550).filter(eligible).sort((a,b)=>distance(a,e)-distance(b,e));
    target=candidates.find(o=>distance(e,o)<Math.max(65,o.width/2+32)||!pathBlocked(game,e,o,e.radius,e.id));
    ai.path=[];let attempted=false;
    if(!target&&candidates.length){const offset=Math.floor(w.time/.8)%candidates.length;
     for(let i=0;i<Math.min(2,candidates.length);i++){if(!permitSearch())break;attempted=true;const candidate=candidates[(offset+i)%candidates.length],path=findPath(game,e,candidate,e.radius,e.id,blocksActor(candidate)?Math.max(candidate.width,candidate.height)/2+e.radius+12:0);if(path.length){target=candidate;ai.path=path;break;}}
    }
    if(target||!candidates.length||attempted)ai.nextThink=w.time+.8;
   }
   ai.target=target?.id||null;
   if(target){ai.mode='chase';if(distance(e,target)>Math.max(65,target.width/2+32)){think(game,e,target,permitSearch);if(!ai.path.length&&pathBlocked(game,e,target,e.radius,e.id))ai.target=null;else travel(game,e,target,130,dt);}else if(!ai.cooldown&&!game.lineBlocked(e,target,false,target.id)){
    if(repairing)target.hp=Math.min(target.maxHp,target.hp+65);else game.damageEntity(target,e.type==='tesla_bot'?100:e.type==='hal_bot'?30:BALANCE.lapabotDamage,'melee',e.owner||undefined,e.id);ai.cooldown=1;
   }}else if(distance(e,ai.home)>70){ai.mode='return';think(game,e,ai.home,permitSearch);travel(game,e,ai.home,110,dt);}else ai.mode='wander';
  }
 }
}
