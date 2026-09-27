import { BALANCE,EXPLOSIVES,ITEMS,WEAPONS } from '../content';
import { count,remove,stack } from '../core/inventory';
import { distance,entityRect,newId,random,segmentCircle,segmentRect } from '../core/math';
import type { Entity,Vec } from '../core/model';
import type { Game } from '../core/game';
import { blocksShot } from '../world/entities';
import { hurtPlayer } from './survival';

export function attack(game:Game){
 const p=game.player,s=game.selected(),id=s?.item||'fists';if(p.cooldown>0||p.action)return;
 if(ITEMS[id]?.placeable)return;
 if(id==='c4_trigger'||ITEMS[id]?.armor||ITEMS[id]?.category==='Food'||ITEMS[id]?.category==='Medicine'){game.useSelected();return;}
 if(id==='spear'||id==='grenade'){if(!s)return;const total=id==='spear'?2:0.45;p.action={kind:'throw',stack:s.uid,remaining:total,total,aim:p.aim};return;}
 const weapon=WEAPONS[id]||WEAPONS.fists;if(p.energy<weapon.energy||p.exhausted)return;
 if(weapon.magazine&&s){
  if(!s.loaded){game.reload();return;}s.loaded--;p.energy-=weapon.energy;p.energyDelay=BALANCE.energyDelay;p.cooldown=1/weapon.rate;
  for(let i=0;i<weapon.pellets;i++){const angle=p.aim+(weapon.pellets>1?(i-(weapon.pellets-1)/2)*weapon.spread/2:(random(game.world)-.5)*weapon.spread);
   game.world.projectiles.push({id:newId(game.world,'p'),owner:p.owner,x:p.x,y:p.y,vx:Math.cos(angle)*weapon.speed,vy:Math.sin(angle)*weapon.speed,remaining:weapon.range,damage:weapon.damage,structureDamage:weapon.damage,kind:weapon.kind,weapon:id,recover:null,fuse:-1,hitIds:[]});}
  game.sound(id.replaceAll('_','-')+'-shot');return;
 }
 p.cooldown=1/weapon.rate;p.energy=Math.max(0,p.energy-weapon.energy);p.energyDelay=BALANCE.energyDelay;
 const candidates=game.near(p,weapon.range+40).filter(e=>e.active&&e.kind!=='drop'&&(e.kind!=='floor'||['hammer','repair_hammer'].includes(id))&&(e.owner!==p.owner||['hammer','repair_hammer'].includes(id)));
 const angleFromAim=(e:Entity)=>{const angle=Math.atan2(e.y-p.y,e.x-p.x);return Math.abs(Math.atan2(Math.sin(angle-p.aim),Math.cos(angle-p.aim)));};
 // A nearby bush at the edge of the swing must not steal every hit aimed at a rock.
 // Physical cover still rejects the target, while the centre of the swing takes priority.
 const target=candidates.filter(e=>angleFromAim(e)<.9&&distance(p,e)<=weapon.range+Math.min(40,e.width/2)&&!game.lineBlocked(p,e,false,e.id)).sort((a,b)=>(angleFromAim(a)-angleFromAim(b))*weapon.range+distance(p,a)-distance(p,b)+Number(a.kind==='floor')*150-Number(b.kind==='floor')*150)[0];
 game.sound(id.includes('pickaxe')?'pickaxe-swing':id.includes('axe')||id==='hatchet'?'hatchet-swing':id.includes('hammer')?'hammer-swing':'hand-swing0');
 if(!target)return;
 if(target.kind==='resource'||target.kind==='crop'){game.harvest(target,id);return;}
 if(id==='repair_hammer'&&target.kind!=='ghoul'&&target.kind!=='robot'&&target.hp<target.maxHp&&count(p.inventory,'nails')>0){remove(p.inventory,'nails',1);target.hp=Math.min(target.maxHp,target.hp+(p.upgrades.includes('builder_2')?130:65));game.sound('metal-impact2');return;}
 let damage=weapon.damage;if(id==='hammer'&&target.kind!=='ghoul'&&target.kind!=='robot')damage*=target.owner===p.owner?12:5;
 game.damageEntity(target,damage,weapon.kind,p.owner);
 if(['ghoul','robot'].includes(target.kind)&&target.type!=='armored_ghoul')game.move(target,Math.cos(p.aim)*16,Math.sin(p.aim)*16,target.radius,target.id);
}
export function explode(game:Game,point:Vec,type:string,owner:string){const def=EXPLOSIVES[type];if(!def)return;
 game.emit({kind:'explosion',x:point.x,y:point.y,value:def.radius});game.sound('explosion',point);
 const pd=distance(point,game.player);if(pd<def.radius)hurtPlayer(game,def.actor*(1-.6*pd/def.radius),'explosive',`${ITEMS[type]?.name||type} explosion`);
 for(const e of [...game.near(point,def.radius)]){if(!e.active||e.kind==='drop')continue;const d=distance(point,e);if(d>def.radius)continue;
  // Mark the explosive as inactive in destroy() before chaining. Each entity can explode once.
  const actor=e.kind==='ghoul'||e.kind==='robot';game.damageEntity(e,(actor?def.actor:def.structure)*(1-.6*d/def.radius),'explosive',owner);
 }
}
export function updateCombat(game:Game,dt:number){const w=game.world;
 const keep=[];for(const p of w.projectiles){
  if(p.fuse>=0){p.fuse-=dt;if(p.fuse<=0){game.explosion(p,'grenade',p.owner);continue;}}
  const next={x:p.x+p.vx*dt,y:p.y+p.vy*dt};let hit:Entity|undefined,best=1;
  for(const e of game.near({x:(p.x+next.x)/2,y:(p.y+next.y)/2},distance(p,next)/2+120)){
   if(e.kind==='drop'||e.kind==='floor'||e.kind==='circuit'||e.owner===p.owner&&e.kind==='robot'||p.hitIds.includes(e.id))continue;
   const actor=e.kind==='ghoul'||e.kind==='robot';if(!actor&&!blocksShot(e))continue;
   const t=actor||e.radius?segmentCircle(p,next,e,e.radius):segmentRect(p,next,entityRect(e));if(t!==null&&t<=best){best=t;hit=e;}
  }
  if(hit){p.x+=(next.x-p.x)*best;p.y+=(next.y-p.y)*best;
   if(p.weapon==='nail_gun'&&hit.kind!=='ghoul'&&hit.kind!=='robot'&&hit.owner===p.owner)hit.hp=Math.min(hit.maxHp,hit.hp+65);
   else game.damageEntity(hit,hit.kind==='ghoul'||hit.kind==='robot'?p.damage:p.structureDamage,p.kind,p.owner);
   if(p.weapon==='grenade'){p.vx=p.vy=0;p.hitIds.push(hit.id);keep.push(p);}else if(p.recover)game.drop(stack(w,p.recover,1),p);
  }else{const moved=distance(p,next);p.x=next.x;p.y=next.y;p.remaining-=moved;if(p.remaining>0||p.fuse>=0){if(p.remaining<=0)p.vx=p.vy=0;keep.push(p);}else if(p.recover)game.drop(stack(w,p.recover,1),p);}
 }w.projectiles=keep;
 for(const e of [...w.entities]){if(!e.active)continue;if(e.fuse>=0){e.fuse-=dt;if(e.fuse<=0){game.destroy(e);continue;}}
  if(e.type==='landmine'||e.type==='wooden_spike'||e.type==='wood_spike'){
   const targets=game.near(e,32).filter(a=>(a.kind==='ghoul'||a.kind==='robot')&&distance(e,a)<32);const player=distance(e,game.player)<30;
   const previous=e.contacts||[],current=[...targets.map(a=>a.id),...(player?['player']:[])];e.contacts=current;
   const hostileEntry=targets.some(a=>a.owner!==e.owner&&!previous.includes(a.id));
   const playerEntry=player&&e.owner!==game.player.owner&&!previous.includes('player')&&(!game.player.upgrades.includes('lightweight')||random(w)>=BALANCE.trapAvoidChance);
   if(e.type==='landmine'){if(hostileEntry||playerEntry)game.destroy(e);continue;}
   if(!e.activated&&(hostileEntry||playerEntry))e.activated=BALANCE.spikeLifetime;
   if(e.activated>0){e.activated=Math.max(0,e.activated-dt);for(const a of targets)game.damageEntity(a,5*dt,'melee',e.owner||undefined);if(player)hurtPlayer(game,5*dt,'melee','Wooden spikes');if(e.activated===0)game.destroy(e);}
  }
 }
}
