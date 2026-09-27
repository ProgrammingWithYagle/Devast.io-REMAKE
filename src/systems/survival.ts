import { armorFor,BALANCE,FOOD,ITEMS,WEAPONS } from '../content';
import type { Game } from '../core/game';
import type { DamageKind,Stack } from '../core/model';
import { clamp,distance } from '../core/math';
import { add,count,remove } from '../core/inventory';

export function hurtPlayer(game:Game,damage:number,kind:DamageKind,cause:string){const p=game.player;if(p.dead||damage<=0)return;const mitigation=kind==='environment'?0:armorFor(p.equipped?.item)[kind];p.hp=clamp(p.hp-damage*(1-mitigation));p.lastDamage=game.world.time;p.deathCause=cause;}
export function updateSurvival(game:Game,dt:number){
 const p=game.player,w=game.world,armor=armorFor(p.equipped?.item);const nearby=game.near(p,360);
 let exposure=0,heat=0;
 for(const r of w.regions)if(r.radiation&&p.x>r.x&&p.x<r.x+r.width&&p.y>r.y&&p.y<r.y+r.height)exposure+=r.radiation;
 for(const e of nearby){const d=distance(p,e);if(['campfire','firepit'].includes(e.type)&&(e.fuelLeft>0||e.fuel>0)&&d<BALANCE.fireRadius)heat=Math.max(heat,BALANCE.fireWarmth);
  const rad=e.type==='uranium_node'?8:e.type==='radioactive_ghoul'?12:e.type==='green_barrel'?10:e.type.startsWith('uranium_')?BALANCE.uraniumIntensity:0;
  if(rad)exposure+=rad*Math.max(0,1-d/BALANCE.uraniumRadius);
 }
 if(count(p.inventory,'uranium'))exposure+=Math.min(4,count(p.inventory,'uranium')*.2);
 p.radiation=clamp(p.radiation+(exposure?exposure*(1-armor.radiation):-BALANCE.radiationDecay*(1+armor.radiation))*dt);
 p.hunger=clamp(p.hunger-BALANCE.hungerLoss*dt);
 const night=game.isNight()||game.inShelter(p)&&w.regions.some(r=>r.kind==='cave'&&p.x>r.x&&p.x<r.x+r.width&&p.y>r.y&&p.y<r.y+r.height);
 p.warmth=clamp(p.warmth+(night?-Math.max(0,BALANCE.nightCold-armor.warmth):BALANCE.dayWarmth)*dt+heat*dt);
 p.energyDelay=Math.max(0,p.energyDelay-dt);if(!p.energyDelay)p.energy=clamp(p.energy+BALANCE.energyRecovery*dt);
 if(p.energy<=0)p.exhausted=true;if(p.energy>64)p.exhausted=false;
 if(p.hunger===0)hurtPlayer(game,BALANCE.starveDamage*dt,'environment','Starvation');
 if(p.warmth===0)hurtPlayer(game,BALANCE.coldDamage*dt,'environment','Freezing');
 if(p.radiation>BALANCE.radiationThreshold)hurtPlayer(game,BALANCE.radiationDamage*(p.radiation/BALANCE.maxGauge)*dt,'environment','Radiation exposure');
 if(p.effects.poison>0)hurtPlayer(game,.5*dt,'environment','Poisoning');
 if(w.time-p.lastDamage>BALANCE.regenDelay&&p.hunger>60&&p.warmth>40&&p.radiation<BALANCE.radiationThreshold&&p.effects.poison<=0)p.hp=clamp(p.hp+BALANCE.regen*dt);
 if(p.effects.boost>0&&p.effects.boost<=dt)p.effects.withdrawal=480;
 for(const key of ['ghoul','boost','withdrawal','poison'] as const)p.effects[key]=Math.max(0,p.effects[key]-dt);
}
export function consume(game:Game,s:Stack){
 const p=game.player;if(p.action||p.dead)return false;
 const consumables=['bandage','medkit','radaway','ghoul_drug','lapadone','antidote'];if(!FOOD[s.item]&&!consumables.includes(s.item))return false;
 const time=s.item==='medkit'?5.5:s.item==='tomato_soup'?2:1;
 p.action={kind:'consume',stack:s.uid,remaining:time,total:time,aim:p.aim};return true;
}
export function beginReload(game:Game){const p=game.player,s=game.selected();if(!s||p.action)return false;const gun=WEAPONS[s.item];if(!gun?.ammo||!gun.magazine||s.loaded>=gun.magazine)return false;
 const n=Math.min(gun.magazine-s.loaded,count(p.inventory,gun.ammo));if(!n){game.message(`You need ${ITEMS[gun.ammo]?.name||gun.ammo}.`);return false;}
 const ammo=remove(p.inventory,gun.ammo,n)!;p.action={kind:'reload',stack:s.uid,remaining:gun.reload,total:gun.reload,ammo,aim:p.aim};return true;
}
export function cancelAction(game:Game){const a=game.player.action;if(a?.ammo)for(const s of a.ammo){const left=add(game.player.inventory,s);if(left)game.drop({...s,quantity:left},game.player);}game.player.action=null;}
export function updateAction(game:Game,dt:number){const p=game.player,a=p.action;if(!a)return;a.remaining-=dt;if(a.remaining>0)return;
 const index=p.inventory.findIndex(s=>s?.uid===a.stack);const s=p.inventory[index];if(!s){cancelAction(game);return;}
 if(a.kind==='reload'){s.loaded+=(a.ammo||[]).reduce((n,s)=>n+s.quantity,0);game.sound('open');}
 if(a.kind==='consume'){
  const food=FOOD[s.item];if(food){p.hunger=clamp(p.hunger+(food.hunger??BALANCE.unmeasuredFoodHunger));p.energy=clamp(p.energy+(food.energy??BALANCE.unmeasuredFoodEnergy));if(food.health_delta<0)hurtPlayer(game,-food.health_delta,'environment',`Eating ${ITEMS[s.item].name}`);else p.hp=clamp(p.hp+food.health_delta);if(s.item==='amanita')p.effects.poison=20;}
  if(s.item==='bandage')p.hp=clamp(p.hp+60);if(s.item==='medkit')p.hp=clamp(p.hp+200);
  if(s.item==='radaway')p.radiation=0;
  if(s.item==='ghoul_drug'){p.effects.ghoul=480;hurtPlayer(game,10,'environment','Ghoul drug');}
  if(s.item==='lapadone'){p.effects.boost=240;p.effects.withdrawal=0;}
  if(s.item==='antidote'){p.effects={ghoul:0,boost:0,withdrawal:0,poison:0};p.hp=clamp(p.hp+50);}
  const returnCan=s.item==='tomato_soup';s.quantity--;if(!s.quantity)p.inventory[index]=null;if(returnCan)game.give('can',1);game.sound('eat-1s-0');
 }
 if(a.kind==='throw'){
  const angle=a.aim,grenade=s.item==='grenade';s.quantity--;if(!s.quantity)p.inventory[index]=null;
  game.world.projectiles.push({id:`p${game.world.nextId++}`,owner:p.owner,x:p.x,y:p.y,vx:Math.cos(angle)*(grenade?260:420),vy:Math.sin(angle)*(grenade?260:420),remaining:grenade?400:800,damage:grenade?15:80,structureDamage:grenade?15:80,kind:'ballistic',weapon:s.item,recover:grenade?null:'spear',fuse:grenade?2.8:-1,hitIds:[]});game.sound(grenade?'spear-shot':'spear-shot');
 }
 p.action=null;
}
