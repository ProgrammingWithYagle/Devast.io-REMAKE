import { BALANCE,ITEMS,RECIPES,WEAPONS } from '../src/content';
import { Game } from '../src/core/game';
import { count } from '../src/core/inventory';
import { circleRect,distance,entityRect,snap } from '../src/core/math';
import type { Entity,Vec } from '../src/core/model';
import { blocksActor } from '../src/world/entities';
import { findPath,pathBlocked } from '../src/systems/ai';

// Validation controller. It uses ordinary game commands and fixed ticks; it never grants resources,
// changes health/XP, teleports, bypasses research, or changes production and survival rates.
export class Playthrough {
 readonly trace:{time:number;message:string}[]=[];private tickCount=0;onNote:(entry:{time:number;message:string})=>void=()=>{};
 constructor(readonly game:Game){}
 note(message:string){const entry={time:Math.round(this.game.world.time*10)/10,message};this.trace.push(entry);this.onNote(entry);}
 tick(x=0,y=0,aim=this.game.player.aim,attack=false,sprint=false){const g=this.game;if(g.player.dead)throw Error(`Died at ${g.world.time.toFixed(1)}s: ${g.player.deathCause}`);if(this.tickCount++>600000)throw Error('Playthrough exceeded tick budget');g.step({x,y,aim,attack,sprint});g.events.length=0;}
 wait(seconds:number){for(let i=0;i<Math.ceil(seconds*60);i++)this.tick();}
 select(id:string){const i=this.game.player.inventory.findIndex(s=>s?.item===id);if(i<0)throw Error(`Missing ${id}`);this.game.player.selected=i;}
 emptySelection(){this.game.player.selected=-1;}
 protected free(p:Vec){return !this.game.near(p,100).some(e=>blocksActor(e)&&(e.radius?distance(e,p)<e.radius+22:circleRect(p,22,entityRect(e))));}
 private route(target:Vec){
  const g=this.game,limits={steps:512,visits:12000};if(!pathBlocked(g,g.player,target,BALANCE.playerRadius))return [target];let path:Vec[]=[];
  // Plan an exit before an overland journey. Searching an entire map at the
  // fine resolution needed between room furniture exceeds the bounded AI grid.
  const inside=(p:Vec,r:{x:number;y:number;width:number;height:number})=>p.x>=r.x&&p.x<=r.x+r.width&&p.y>=r.y&&p.y<=r.y+r.height;
  const buildings=g.world.regions.filter(r=>r.id!=='city'&&r.kind!=='road');
  const leaving=buildings.find(r=>inside(g.player,r)&&!inside(target,r));
  const building=leaving||buildings.find(r=>inside(target,r)&&!inside(g.player,r));
  if(!building)return findPath(g,g.player,target,BALANCE.playerRadius,'',0,limits);
  const exits:Vec[]=[];
  for(let x=building.x-64;x<=building.x+building.width+64;x+=64)exits.push({x,y:building.y-64},{x,y:building.y+building.height+64});
  for(let y=building.y-64;y<=building.y+building.height+64;y+=64)exits.push({x:building.x-64,y},{x:building.x+building.width+64,y});
  const candidates=exits.filter(p=>this.free(p)).sort((a,b)=>distance(g.player,a)+distance(a,target)-distance(g.player,b)-distance(b,target));
  for(const exit of candidates){
   // Search outwards from the destination room first. A locked room then fails
   // inside its small enclosure instead of repeatedly exploring the whole map.
   const entry=leaving?[]:findPath(g,target,exit,BALANCE.playerRadius,'',0,limits);
   if(!leaving&&!entry.length)continue;
   path=findPath(g,g.player,exit,BALANCE.playerRadius,'',0,limits);
   if(path.length&&distance(g.player,exit)>12)return leaving?path:[...path,...entry.reverse().slice(1),target];
  }
  return [];
 }
 go(target:Vec,range=8){const g=this.game;let stuck=0,plans=0,previous=distance(g.player,target),path:Vec[]=[];
  for(let i=0;i<12000&&distance(g.player,target)>range;i++){
   if(i===0||!path.length||stuck===30){if(++plans>32)throw Error(`Repeated replanning to ${Math.round(target.x)},${Math.round(target.y)} from ${Math.round(g.player.x)},${Math.round(g.player.y)}`);path=this.route(target);if(!path.length)throw Error(`No walking route to ${Math.round(target.x)},${Math.round(target.y)}`);if(plans===8)this.note(`Replanning route from ${Math.round(g.player.x)},${Math.round(g.player.y)} to ${Math.round(target.x)},${Math.round(target.y)}; first waypoint ${Math.round(path[0].x)},${Math.round(path[0].y)}`);}
   if(path.length&&distance(g.player,path[0])<10)path.shift();const point=path[0]||target;const angle=Math.atan2(point.y-g.player.y,point.x-g.player.x);this.tick(Math.cos(angle),Math.sin(angle),angle);
   const remaining=distance(g.player,target);if(Math.abs(previous-remaining)<.01)stuck++;else stuck=0;previous=remaining;if(stuck>90)throw Error(`Path blocked going to ${Math.round(target.x)},${Math.round(target.y)} from ${Math.round(g.player.x)},${Math.round(g.player.y)}`);
  }
  if(distance(g.player,target)>range)throw Error('Travel time exceeded');
 }
 approach(e:Entity,range=74){const g=this.game;if(distance(g.player,e)<=range&&!g.lineBlocked(g.player,e,false,e.id))return;
  const points=Array.from({length:16},(_,i)=>({x:e.x+Math.cos(i*Math.PI/8)*(range-8),y:e.y+Math.sin(i*Math.PI/8)*(range-8)})).filter(p=>this.free(p)&&!g.lineBlocked(p,e,false,e.id)).sort((a,b)=>distance(a,g.player)-distance(b,g.player));
  if(!points.length)throw Error(`No approach to ${e.type}`);let error:unknown;for(const p of points)try{this.go(p,7);return;}catch(e){error=e;}throw error;
 }
 food(){const g=this.game;if(g.player.hunger>140)return;let available=g.player.inventory.find(s=>s&&['orange','tomato','cooked_steak','tomato_soup'].includes(s.item));
  if(!available){const bushes=g.world.entities.filter(e=>e.active&&e.kind==='crop'&&e.growAt<=g.world.time&&e.type.endsWith('_bush')).sort((a,b)=>distance(a,g.player)-distance(b,g.player));let success=false;for(const bush of bushes.slice(0,10))try{this.approach(bush,90);g.interact(bush);success=true;break;}catch{}if(!success)throw Error('Could not find reachable food');available=g.player.inventory.find(s=>s&&['orange','tomato'].includes(s.item));}
  // Harvesting can award a bonus seed before the fruit. Pick up the visible overflow
  // after making room, just as a player does with a nearly full inventory.
  if(!available){for(let i=0;i<g.player.inventory.length;i++)if(g.player.inventory[i]?.item.endsWith('_seed'))g.dropSlot(i);const drop=g.near(g.player,110).find(e=>e.kind==='drop'&&e.inventory.some(s=>s&&['orange','tomato'].includes(s.item)));if(drop)g.interact(drop);available=g.player.inventory.find(s=>s&&['orange','tomato'].includes(s.item));}
  if(g.player.dead)throw Error(`Died at ${g.world.time.toFixed(1)}s: ${g.player.deathCause}`);
  if(!available)throw Error('Food did not fit inventory');const id=available.item;this.select(id);g.useSelected();while(g.player.action)this.tick();this.note(`Ate ${id}`);
 }
 gather(id:string,targetCount:number){const g=this.game;const nodeType:Record<string,string>={wood:'tree',stone:'stone_node',iron:'iron_node',sulfur:'sulfur_node',uranium:'uranium_node'};
  while(count(g.player.inventory,id)<targetCount){this.food();const tools=id==='wood'?['sulfur_axe','metal_axe','hatchet']:id==='stone'?['sulfur_pickaxe','metal_pickaxe','stone_pickaxe','hatchet']:['sulfur_pickaxe','metal_pickaxe','stone_pickaxe'];const tool=tools.find(t=>count(g.player.inventory,t)>0)||'fists';if(tool==='fists'&&id!=='wood')throw Error(`No tool for ${id}`);
   const nodes=g.world.entities.filter(e=>e.active&&e.type===nodeType[id]&&!g.world.regions.some(r=>r.id!=='city'&&r.kind!=='road'&&e.x>r.x&&e.x<r.x+r.width&&e.y>r.y&&e.y<r.y+r.height)).sort((a,b)=>distance(a,g.player)-distance(b,g.player));let e:Entity|undefined;for(const candidate of nodes.slice(0,10))try{this.approach(candidate);e=candidate;break;}catch{}if(!e)throw Error(`No reachable ${id}`);
   if(tool==='fists')this.emptySelection();else this.select(tool);const before=count(g.player.inventory,id);let ticks=0;while(e.active&&distance(e,g.player)<105&&count(g.player.inventory,id)<targetCount&&g.player.hunger>70&&ticks++<3600){this.tick(0,0,Math.atan2(e.y-g.player.y,e.x-g.player.x),true);}
   if(distance(e,g.player)>=105)continue;
   if(count(g.player.inventory,id)===before)throw Error(`Harvest made no progress for ${id}: target ${e.type} at ${e.x},${e.y}, distance ${distance(g.player,e).toFixed(1)}, nearby ${g.near(g.player,120).map(n=>`${n.type}:${distance(g.player,n).toFixed(1)}`).join(';')}`);
  }
  this.note(`Gathered ${targetCount} ${id}`);
 }
 make(id:string,station?:Entity){const g=this.game;if(!g.player.unlocked.includes(id)&&!g.unlock(id))throw Error(`Cannot research ${id}: level ${g.player.level}, ${g.player.points} points`);if(station)this.approach(station,Math.max(85,station.width/2+45));if(!g.craft(id,station))throw Error(`Craft ${id} failed: ${g.events.filter(e=>e.kind==='message').at(-1)?.text||'unavailable'}`);const list=station?.jobs||g.player.jobs;while(list.length){this.food();this.tick();}if(station){if(!station.active)throw Error(`Station destroyed while crafting ${id}`);this.approach(station,Math.max(85,station.width/2+45));for(let i=0;i<station.outputs.length;i++)g.transfer(station,i,true,true);}this.note(`Crafted ${id}`);}
 place(id:string,near:Vec=this.game.player){
  const g=this.game,anchor={...near},wide=['research_bench','tesla_bench','smelter'].includes(id),width=wide?192:64,candidates:Vec[]=[];
  for(let dx=-8;dx<=8;dx++)for(let dy=-8;dy<=8;dy++)candidates.push({x:snap(anchor.x)+dx*64,y:snap(anchor.y)+dy*64});
  candidates.sort((a,b)=>distance(a,anchor)-distance(b,anchor));
  // Leave a walking aisle around workstations. The previous controller could
  // legally wall itself into a pocket between a bench, a rock and a house.
  for(const p of candidates){
   if(g.near(p,280).some(e=>e.type==='uranium_node'&&distance(e,p)<280))continue;
   if(g.near(p,width+120).some(e=>blocksActor(e)&&Math.abs(e.x-p.x)<(width+entityRect(e).width)/2+56&&Math.abs(e.y-p.y)<(64+entityRect(e).height)/2+56))continue;
   if(!g.canPlace(id,p.x,p.y).ok){
    const positions=Array.from({length:16},(_,i)=>({x:p.x+Math.cos(i*Math.PI/8)*(width/2+76),y:p.y+Math.sin(i*Math.PI/8)*(width/2+76)})).filter(q=>this.free(q)).sort((a,b)=>distance(a,g.player)-distance(b,g.player));
    let reachable=false;for(const q of positions)try{this.go(q);if(g.canPlace(id,p.x,p.y).ok){reachable=true;break;}}catch{}
    if(!reachable)continue;
   }
   this.select(id);if(!g.place(p.x,p.y))continue;const e=g.world.entities.at(-1)!;this.note(`Placed ${id} at ${p.x},${p.y}`);return e;
  }
  throw Error(`No accessible building space for ${id}`);
 }
 camp(){const g=this.game;this.gather('wood',10);this.make('hatchet');this.gather('wood',40);this.gather('stone',20);this.make('workbench');const bench=this.place('workbench');
  this.gather('wood',150);this.gather('stone',5);this.make('campfire');const fire=this.place('campfire');this.approach(fire,90);for(let i=0;i<20;i++)g.fuel(fire);
  this.note('Camp is fueled for the first night');return {bench,fire};
 }
 surviveFirstNight(fire:Entity){const g=this.game;while(g.world.time<965){this.food();if(distance(g.player,fire)>95)this.approach(fire,85);this.tick();}this.note(`Survived first night with ${Math.round(g.player.hp)} health`);}
 firstNight(){const camp=this.camp();this.surviveFirstNight(camp.fire);return camp;}
}
