import { BALANCE,DATA,ITEMS,RECIPES,STATIONS } from '../content';
import { add,count,remove,reserve,stack } from '../core/inventory';
import { distance,newId,random } from '../core/math';
import type { Entity,Inventory,Job } from '../core/model';
import type { Game } from '../core/game';

export function validStation(recipe:string,station:string):boolean {const r=RECIPES[recipe];return !!r&&(r.station===station||r.station==='hand'&&station==='workbench'||r.station==='campfire'&&station==='firepit'||recipe==='shaped_metal'&&station==='smelter');}
export function craft(game:Game,id:string,station?:Entity):boolean {
 const r=RECIPES[id],p=game.player;if(!r||p.dead)return false;
 if(station&&(!station.active||!game.reach(station))){game.message('Move closer to the station.');return false;}
 if(!validStation(id,station?.type||'hand')){game.message(`Requires ${ITEMS[r.station]?.name||r.station}.`);return false;}
 if(p.level<r.required_level){game.message(`Reach level ${r.required_level} first.`);return false;}
 if(!p.unlocked.includes(id)){game.message('Research this recipe first.');return false;}
 const jobs=station?.jobs||p.jobs;if(jobs.length>=4){game.message('The four queue slots are full.');return false;}
 const actionItem=p.inventory.find(s=>s?.uid===p.action?.stack)?.item;if(actionItem&&r.ingredients.some(i=>i.item_id===actionItem)){game.message('Finish the current action first.');return false;}
 const reserved=reserve(p.inventory,r.ingredients);if(!reserved){game.message('Not enough materials.');return false;}
 const total=r.craft_seconds*(r.station==='hand'&&station?.type==='workbench'?.6:station?.type==='smelter'&&id==='shaped_metal'?.6:1);
 const output=r.output_quantity*(ITEMS[id].category==='Building'&&p.upgrades.includes('builder_1')?2:1);
 jobs.push({id:newId(game.world,'job'),recipe:id,remaining:total,total,output,reserved});game.sound('craft');return true;
}
export function unlock(game:Game,id:string):boolean {const p=game.player;const u=DATA.upgrades.find(x=>x.id===id);const r=RECIPES[id];if(!u&&!r)return false;
 if(u){if(p.upgrades.includes(id)||p.level<u.required_level||p.points<u.skill_points||u.requires&&!p.upgrades.includes(u.requires))return false;p.points-=u.skill_points;p.upgrades.push(id);if('additional_slots'in u)for(let i=0;i<(u.additional_slots||0);i++)p.inventory.push(null);}
 else{if(p.unlocked.includes(id)||p.level<r.required_level||p.points<r.skill_points)return false;p.points-=r.skill_points;p.unlocked.push(id);}
 game.sound('skill');return true;
}
export function addFuel(game:Game,e:Entity):boolean {const fuel=STATIONS[e.type]?.fuel;if(!fuel||!e.active||!game.reach(e))return false;const n=Math.min(fuel==='wood'?5:1,count(game.player.inventory,fuel),255-e.fuel);if(n<=0){game.message(`You need ${ITEMS[fuel].name}.`);return false;}remove(game.player.inventory,fuel,n);e.fuel+=n;game.sound('button');return true;}
function capacity(inv:Inventory,id:string){return inv.reduce((n,s)=>n+(!s?ITEMS[id].stack:s.item===id&&s.loaded===0?Math.max(0,ITEMS[id].stack-s.quantity):0),0);}
function finish(game:Game,j:Job,inv:Inventory):boolean {if(capacity(inv,j.recipe)<j.output)return false;add(inv,stack(game.world,j.recipe,j.output));
 const awards:Record<string,number>={hatchet:15,workbench:62,stone_pickaxe:156,firepit:187,metal_axe:234,research_bench:15,smelter:15};game.xp(awards[j.recipe]??0);
 if(!game.player.milestones.includes(`craft:${j.recipe}`))game.player.milestones.push(`craft:${j.recipe}`);game.sound('craft');return true;
}
export function cancelJob(game:Game,index:number,e?:Entity){if(e&&!game.reach(e))return;const list=e?.jobs||game.player.jobs;const j=list[index];if(!j)return;for(const s of j.reserved){if(s.freshness>=0)continue;const left=add(game.player.inventory,s);if(left)game.drop({...s,quantity:left},e||game.player);}list.splice(index,1);}
export function updateProduction(game:Game,dt:number){const p=game.player;const personal=p.jobs[0];if(personal){personal.remaining=Math.max(0,personal.remaining-dt);if(!personal.remaining&&finish(game,personal,p.inventory))p.jobs.shift();}
 for(const e of game.world.entities){if(!e.active||e.kind!=='station')continue;const def=STATIONS[e.type];if(!def)continue;
  const passive=['campfire','firepit','feeder','extractor'].includes(e.type);
  // A completed item waits for space without consuming more industrial fuel.
  if(e.jobs[0]?.remaining===0&&finish(game,e.jobs[0],e.outputs))e.jobs.shift();
  const working=!!e.jobs[0]?.remaining||passive;
  const fuelled=!def.fuel||e.fuelLeft>0||e.fuel>0;
  if(!working||!fuelled)continue;
  if(def.fuel){if(e.fuelLeft<=0&&e.fuel>0){e.fuel--;e.fuelLeft=def.fuel==='wood'?BALANCE.woodFuelSeconds:def.fuel==='gasoline'?e.type==='extractor'?BALANCE.extractorFuelSeconds:BALANCE.gasolineSeconds:e.type==='feeder'?BALANCE.feederCellSeconds:BALANCE.cellSeconds;}e.fuelLeft=Math.max(0,e.fuelLeft-dt);}
  const job=e.jobs[0];if(job){job.remaining=Math.max(0,job.remaining-dt);if(!job.remaining&&finish(game,job,e.outputs))e.jobs.shift();}
  if(e.type==='feeder'&&distance(e,p)<BALANCE.feederRadius)p.hunger=Math.min(255,p.hunger+BALANCE.feederRate*dt);
  if(e.type==='extractor'){
   const table:Record<string,[number,number,number]>={stone:[80,125,200],iron:[120,7,15],sulfur:[240,5,10],uranium:[240,3,5]};const [time,min,max]=table[e.selectedResource]||table.stone;e.work=Math.min(time,e.work+dt);
   if(e.work>=time&&capacity(e.outputs,e.selectedResource)>=max){const n=min+Math.floor(random(game.world)*(max-min+1));add(e.outputs,stack(game.world,e.selectedResource,n));e.work=0;}
  }
 }
}
