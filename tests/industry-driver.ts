import {BALANCE,DATA,FOOD,GHOULS,RECIPES,STATIONS,WEAPONS} from '../src/content';
import {count} from '../src/core/inventory';
import {distance} from '../src/core/math';
import type {Entity} from '../src/core/model';
import {SALVAGE} from '../src/world/entities';
import {pathBlocked} from '../src/systems/ai';
import {Playthrough} from './playthrough-driver';

// An ordinary-play acceptance controller, not a cheat interface. It chooses actions,
// carries limited stacks, gathers/researches every ingredient, travels and manages needs.
export class IndustryPlaythrough extends Playthrough {
 private servicing=false;private defending=false;private careTicks=0;private recipeDepth=0;private gathering?:string;private reservations:string[][]=[];fire?:Entity;
 private stations=new Map<string,Entity>();checkpoint:(label:string)=>void=()=>{};
 private clothes=['winter_coat','radiation_suit','min_radiation_suit','radiation_mask'];
 registerCamp(bench:Entity,fire:Entity){this.stations.set('workbench',bench);this.stations.set('campfire',fire);this.fire=fire;}
 resumeCamp(){for(const e of this.game.world.entities)if(e.active&&e.owner===this.game.player.owner&&e.kind==='station')this.stations.set(e.type,e);this.fire=this.stations.get('firepit')||this.stations.get('campfire');}
 override tick(x=0,y=0,aim=this.game.player.aim,attack=false){const p=this.game.player;++this.careTicks;if(this.careTicks%60===0)this.chooseOutfit();if(!this.defending&&this.careTicks%15===0&&this.game.near(p,115).some(e=>e.kind==='ghoul'&&e.ai?.target==='player')){const selected=p.inventory[p.selected];this.defending=true;try{this.defend();}finally{this.defending=false;p.selected=selected?p.inventory.findIndex(s=>s?.uid===selected.uid):-1;}super.tick();return;}if(!this.servicing&&this.careTicks%60===0){const selected=p.inventory[p.selected];this.servicing=true;try{this.care();}finally{this.servicing=false;p.selected=selected?p.inventory.findIndex(s=>s?.uid===selected.uid):-1;}super.tick();return;}super.tick(x,y,aim,attack);}
 override food(){const g=this.game;if(g.player.action||g.player.hunger>140)return;const wasServicing=this.servicing;this.servicing=true;try{for(let i=0;i<g.player.inventory.length;i++){const s=g.player.inventory[i];if(s&&(s.item.endsWith('_seed')||s.item.startsWith('rotten_')||s.item==='acorn'))g.dropSlot(i);}if(!g.player.inventory.some(s=>!s||['orange','tomato','cooked_steak','tomato_soup'].includes(s.item))){this.roomFor('orange');}super.food();}finally{this.servicing=wasServicing;if(this.gathering)this.roomFor(this.gathering);}}
 private roomFor(id:string){const g=this.game,inv=g.player.inventory;for(let from=inv.length-1;from>0;from--)for(let to=0;to<from;to++)if(inv[from]&&inv[to]?.item===inv[from]?.item)g.rearrange(from,to);if(inv.some(s=>!s||s.item===id))return;const protectedItems=new Set([...this.tools(),...this.clothes,...this.reservations.flat(),'bandage','orange','tomato','cooked_steak','tomato_soup']);const i=inv.findIndex(s=>s&&!protectedItems.has(s.item)&&!['wood','stone'].includes(s.item));const fallback=inv.findIndex(s=>s&&!protectedItems.has(s.item));if(i>=0||fallback>=0){g.dropSlot(i>=0?i:fallback);return;}const immediate=this.reservations.at(-1)||[];const cache=inv.findIndex(s=>s&&this.reservations.flat().includes(s.item)&&!immediate.includes(s.item)&&!this.tools().includes(s.item)&&!this.clothes.includes(s.item));if(cache>=0){this.note(`Cached ${inv[cache]!.item} on the ground to make room for ${id}`);g.dropSlot(cache);}}
 override gather(id:string,n:number){const previous=this.gathering;this.gathering=id;try{this.roomFor(id);super.gather(id,n);}finally{this.gathering=previous;}}
 private defend(){
  const g=this.game,p=g.player;
  const enemies=()=>g.near(p,240).filter(e=>e.kind==='ghoul'&&e.ai?.target==='player');
  let foes=enemies();
  if(!foes.length){if(p.hp<180&&count(p.inventory,'bandage')&&!p.action){this.select('bandage');g.useSelected();while(p.action)super.tick();}return;}
  let firearm=p.inventory.find(s=>s&&WEAPONS[s.item]?.ammo&&(s.loaded>0||count(p.inventory,WEAPONS[s.item].ammo!)));
  const melee=()=>p.inventory.filter(s=>s&&WEAPONS[s.item]&&!WEAPONS[s.item].magazine&&s.item!=='spear').sort((a,b)=>WEAPONS[b!.item].damage-WEAPONS[a!.item].damage)[0];
  let weapon=firearm||melee();
  if(!weapon)throw Error('No defensive tool');
  this.select(weapon.item);
  for(let i=0;i<3600;i++){
   foes=enemies();if(!foes.length)break;
   if(firearm&&!firearm.loaded&&!count(p.inventory,WEAPONS[firearm.item].ammo!)){firearm=undefined;weapon=melee();if(!weapon)throw Error('No defensive tool after ammunition ran out');}
   foes.sort((a,b)=>distance(a,p)-distance(b,p));const target=foes[0],d=distance(p,target),aim=Math.atan2(target.y-p.y,target.x-p.x);
   if(p.hp<155&&count(p.inventory,'bandage')&&!p.action){this.select('bandage');g.useSelected();}
   if(!p.action){this.select(weapon.item);if(firearm&&!weapon.loaded)g.reload();}
   // Choose a clear swept path away from the whole pursuing group. Retreating
   // directly from whichever enemy is closest oscillates between two attackers.
   const directions=Array.from({length:24},(_,n)=>n*Math.PI/12).map(a=>({a,x:p.x+Math.cos(a)*70,y:p.y+Math.sin(a)*70})).filter(q=>this.free(q)&&!pathBlocked(g,p,q,BALANCE.playerRadius));
   directions.sort((a,b)=>Math.min(...foes.map(e=>distance(e,b)))-Math.min(...foes.map(e=>distance(e,a))));
   const retreat=d<(firearm?230:105)||!!p.action,direction=directions[0]?.a??aim+Math.PI;
   super.tick(retreat?Math.cos(direction):0,retreat?Math.sin(direction):0,aim,!p.action&&d<WEAPONS[weapon.item].range+target.width/2,retreat&&d<(firearm?170:88)&&p.energy>55);
  }
  this.note(`Defended against pursuing ghouls; health ${Math.round(p.hp)}`);
 }
 private chooseOutfit(){const g=this.game,p=g.player;
  const irradiated=g.world.regions.some(r=>r.radiation&&p.x>r.x&&p.x<r.x+r.width&&p.y>r.y&&p.y<r.y+r.height)||count(p.inventory,'uranium')>0||g.near(p,160).some(e=>['uranium_node','radioactive_ghoul','green_barrel'].includes(e.type)&&distance(e,p)<160);
  const options=g.isNight()&&p.warmth<140?['winter_coat','chapka','headscarf']:irradiated?['radiation_suit','min_radiation_suit','radiation_mask']:g.isNight()?['winter_coat','chapka','headscarf']:[];
  const outfit=options.find(id=>!this.reservations.flat().includes(id)&&(p.equipped?.item===id||count(p.inventory,id)));
  if(outfit&&p.equipped?.item!==outfit&&!p.action){const selected=p.inventory[p.selected];this.select(outfit);g.useSelected();p.selected=selected?p.inventory.findIndex(s=>s?.uid===selected.uid):-1;}
 }
 private care(){const g=this.game,p=g.player;for(const u of DATA.upgrades.filter(u=>u.id.startsWith('inventory_')))if(!p.upgrades.includes(u.id)&&p.level>=u.required_level&&p.points>=u.skill_points&&g.unlock(u.id))this.note(`Researched ${u.id}`);
  this.chooseOutfit();
  this.defend();this.food();
  if(p.warmth<140&&!this.fire?.active)this.station('firepit');
  if(p.warmth<140&&this.fire?.active){this.approach(this.fire,90);const refuel=()=>{if(this.fire!.fuel*BALANCE.woodFuelSeconds+this.fire!.fuelLeft>35)return;this.retrieve('wood',30);if(count(p.inventory,'wood')<30)this.gather('wood',30);this.approach(this.fire!,90);for(let n=0;n<6;n++)g.fuel(this.fire!);};refuel();for(let i=0;i<12000&&p.warmth<225;i++){if(i%60===0){this.chooseOutfit();this.defend();this.food();refuel();if(distance(p,this.fire)>110)this.approach(this.fire,90);}super.tick();}this.note('Warmed up at camp');}
 }
 private tools(){const inv=this.game.player.inventory;return [['sulfur_axe','metal_axe','hatchet'],['sulfur_pickaxe','metal_pickaxe','stone_pickaxe'],['hammer'],['9mm'],['bullet']].map(list=>list.find(id=>count(inv,id)>0)).filter((id):id is string=>!!id);}
 private clear(keep:string[]=[]){const g=this.game;const food=g.player.inventory.find(s=>s&&['orange','tomato','cooked_steak','tomato_soup'].includes(s.item));const wanted=new Set([...keep,...this.reservations.flat(),...this.tools(),...this.clothes,...(food?[food.item]:[]),'bandage']);for(let i=0;i<g.player.inventory.length;i++){const s=g.player.inventory[i];if(s&&!wanted.has(s.item))g.dropSlot(i);}}
 private retrieve(id:string,n:number){const g=this.game;const valuable=!!RECIPES[id]||['big_wires','energy_cells','electronic_parts'].includes(id);const drops=g.world.entities.filter(e=>e.active&&e.kind==='drop'&&(valuable||distance(e,g.player)<1200)&&e.inventory.some(s=>s?.item===id)).sort((a,b)=>distance(a,g.player)-distance(b,g.player));for(const e of drops.slice(0,20)){if(count(g.player.inventory,id)>=n)break;try{this.roomFor(id);this.approach(e,95);g.interact(e);}catch{continue;}}}
 private gainLevel(level:number,points=0){const g=this.game;while(g.player.level<level||g.player.points<points){this.clear();const id=this.tools().some(t=>['sulfur_pickaxe','metal_pickaxe'].includes(t))?'sulfur':count(g.player.inventory,'stone_pickaxe')?'iron':'stone';const n=count(g.player.inventory,id);if(n>180){const i=g.player.inventory.findIndex(s=>s?.item===id);g.dropSlot(i);}this.gather(id,count(g.player.inventory,id)+20);}this.note(`Reached level ${g.player.level} with ${g.player.points} available points`);}
 private upgrade(id:string){const u=DATA.upgrades.find(x=>x.id===id)!;if(this.game.player.upgrades.includes(id))return;this.gainLevel(u.required_level,u.skill_points);if(!this.game.unlock(id))throw Error(`Cannot buy ${id}`);this.note(`Researched ${id}`);}
 private salvage(id:string,n:number){const g=this.game;let attempts=0;
  if(id==='big_wires')this.openComputerRoom();
  while(count(g.player.inventory,id)<n&&attempts++<30){this.food();this.clear([id]);const house=(e:Entity)=>g.world.regions.some(r=>r.id.startsWith('house_')&&e.x>=r.x&&e.x<=r.x+r.width&&e.y>=r.y&&e.y<=r.y+r.height);const candidates=g.world.entities.filter(e=>e.active&&!e.owner&&SALVAGE[e.type]?.[id]).sort((a,b)=>Number(house(b))-Number(house(a))||distance(a,g.player)-distance(b,g.player));let target:Entity|undefined;
   if(!candidates.length){const regrowth=g.world.entities.filter(e=>!e.active&&!e.owner&&SALVAGE[e.type]?.[id]&&e.regenAt>0).sort((a,b)=>a.regenAt-b.regenAt)[0];if(regrowth&&this.fire){this.approach(this.fire,90);this.note(`Waiting for ${regrowth.type} to replenish away from the player`);while(g.world.time<regrowth.regenAt+1&&!regrowth.active)this.tick();if(id==='big_wires')this.openComputerRoom();continue;}}
   for(const e of candidates.slice(0,12))try{this.note(`Walking to ${e.type} for ${id} at ${e.x},${e.y}`);this.approach(e,80);target=e;break;}catch(error){this.note(`Could not approach ${e.type}: ${String(error)}`);}if(!target)throw Error(`No reachable salvage source for ${id}`);
   const tool=count(g.player.inventory,'hammer')?'hammer':this.tools()[0]||'hatchet';this.select(tool);let budget=2400;while(target.active&&budget-->0){if(distance(target,g.player)>100){this.approach(target,80);this.select(tool);}this.tick(0,0,Math.atan2(target.y-g.player.y,target.x-g.player.x),true);}
   if(target.active)throw Error(`Could not break ${target.type}`);this.note(`Salvaged ${target.type} for ${id}`);this.retrieve(id,n);
  }if(count(g.player.inventory,id)<n)throw Error(`Insufficient ${id} after scavenging`);
 }
 private animals(id:string,n:number){const g=this.game;while(count(g.player.inventory,id)<n){this.roomFor(id);const e=g.world.entities.filter(e=>e.active&&['boar','deer'].includes(e.type)).sort((a,b)=>distance(a,g.player)-distance(b,g.player))[0];if(!e)throw Error('No carcasses remain');this.approach(e,75);this.select(this.tools()[0]);while(e.active){if(distance(e,g.player)>100){this.approach(e,75);this.select(this.tools()[0]);}this.tick(0,0,Math.atan2(e.y-g.player.y,e.x-g.player.x),true);}this.retrieve(id,n);}}
 ensure(id:string,n=1){if(++this.recipeDepth>30)throw Error(`Crafting dependency loop at ${id}`);try{
  const g=this.game;if(g.player.equipped?.item===id){this.roomFor(id);g.unequip();}if(count(g.player.inventory,id)>=n)return;this.retrieve(id,n);if(count(g.player.inventory,id)>=n)return;
  if(['wood','stone','iron','sulfur','uranium'].includes(id)){const required=({iron:'stone_pickaxe',sulfur:'metal_pickaxe',uranium:'sulfur_pickaxe'} as Record<string,string>)[id];if(required&&!this.tools().includes(required)&&!(required==='stone_pickaxe'&&this.tools().some(t=>['metal_pickaxe','sulfur_pickaxe'].includes(t)))&&!(required==='metal_pickaxe'&&this.tools().includes('sulfur_pickaxe')))this.ensure(required);this.gather(id,n);return;}
  if(['leather','animal_tendon','animal_fat','raw_steak'].includes(id)){this.animals(id,n);return;}
  if(['orange','tomato'].includes(id)){while(count(g.player.inventory,id)<n){const bush=g.world.entities.filter(e=>e.active&&e.type===`${id}_bush`&&e.growAt<=g.world.time).sort((a,b)=>distance(a,g.player)-distance(b,g.player))[0];if(!bush)throw Error(`No ripe ${id}`);this.approach(bush,90);g.interact(bush);}return;}
  if(id==='energy_cells'){const tesla=this.stations.get('tesla_bench');if(!tesla?.active||tesla.fuel*BALANCE.cellSeconds+tesla.fuelLeft<=RECIPES.energy_cells.craft_seconds+8){this.salvage(id,n);return;}}
  if(!RECIPES[id]){this.salvage(id,n);return;}
  while(count(g.player.inventory,id)<n)this.produce(id);
 }finally{this.recipeDepth--;}}
 station(id:string):Entity|undefined {if(id==='hand')return;const old=this.stations.get(id);if(old?.active)return old;this.ensure(id);const bench=this.stations.get('workbench');if(bench)this.approach(bench,155);const built=this.place(id);this.stations.set(id,built);if(id==='firepit')this.fire=built;return built;}
 private fuelFor(e:Entity,seconds:number){const fuel=STATIONS[e.type]?.fuel;if(!fuel)return;const unit=fuel==='wood'?BALANCE.woodFuelSeconds:fuel==='gasoline'?BALANCE.gasolineSeconds:BALANCE.cellSeconds;const need=Math.max(0,Math.ceil((seconds+8-e.fuelLeft)/unit)-e.fuel);if(!need)return;this.ensure(fuel,need);this.approach(e,Math.max(85,e.width/2+55));for(let i=0;i<need;i++)this.game.fuel(e);}
 produce(id:string){const g=this.game,r=RECIPES[id];if(!r)throw Error(`Unknown recipe ${id}`);let station=this.station(r.station);if(!g.player.unlocked.includes(id)){this.gainLevel(r.required_level,r.skill_points);if(!g.unlock(id))throw Error(`Research failed for ${id}`);}this.reservations.push([id,...r.ingredients.map(i=>i.item_id)]);try{
  for(let attempt=0;attempt<8;attempt++){
  for(let pass=0;pass<8&&!r.ingredients.every(i=>count(g.player.inventory,i.item_id)>=i.quantity);pass++){this.clear([id,...r.ingredients.map(i=>i.item_id)]);for(const i of r.ingredients)this.ensure(i.item_id,i.quantity);}
  if(station)this.fuelFor(station,r.craft_seconds);
  // Fuel preparation may use an ingredient stack; reserve the final inputs only once all are present.
  for(const i of r.ingredients)this.ensure(i.item_id,i.quantity);
  if(station&&!station.active){this.note(`Rebuilding destroyed ${station.type}`);station=this.station(r.station);continue;}
  try{this.make(id,station);if(station){this.roomFor(id);for(let i=0;i<station.outputs.length;i++)g.transfer(station,i,true,true);}return;}catch(error){if(!station||station.active)throw error;this.note(`Recovered from destruction of ${station.type}`);station=this.station(r.station);}
  }
  throw Error(`Could not complete ${id} after rebuilding stations`);
  }finally{this.reservations.pop();}
 }
 research(){const g=this.game;this.clear(['wood','stone']);this.ensure('stone_pickaxe');this.upgrade('inventory_1');this.ensure('iron',20);this.station('firepit');const fire=this.fire!;this.ensure('wood',100);this.approach(fire,90);for(let i=0;i<16;i++)g.fuel(fire);this.station('research_bench');this.upgrade('inventory_2');this.note('Ordinary research-bench milestone complete');}
 private openComputerRoom(){const g=this.game,door=g.world.entities.find(e=>e.tag==='city_2-computer-door')!;if(door.open)return;
  this.ensure('orange',24);while(g.isNight()||g.world.time%960>300)this.tick();
  this.note('Entering the city computer complex in daylight');
  for(let i=1;i<=6;i++){const button=g.world.entities.find(e=>e.tag===`city_2-switch-${i}`)!;this.approach(button,80);if(button.switchOn!==[false,true,true,false,true,true][i-1])g.interact(button);}
  this.wait(2);if(!door.open)throw Error('The computer-room wiring did not open the door');this.note('Solved the six-switch computer-room circuit through ordinary interactions');
 }
 finishTesla(){this.station('tesla_bench');this.checkpoint('tesla-bench');this.ensure('power_armor');this.checkpoint('power-armor');this.ensure('tesla_armor');this.select('tesla_armor');this.game.useSelected();this.note('Crafted and equipped Tesla armor through ordinary play');}
 cityAndTesla(){this.ensure('winter_coat');this.ensure('9mm');this.ensure('bullet',100);this.select('9mm');this.game.reload();while(this.game.player.action)this.tick();this.ensure('radiation_suit');this.checkpoint('radiation-suit');this.ensure('big_wires',4);this.checkpoint('first-city-salvage');this.finishTesla();}
 industry(){this.ensure('metal_pickaxe');this.ensure('metal_axe');this.station('weaving_machine');this.ensure('headscarf');this.select('headscarf');this.game.useSelected();this.ensure('bandage',3);this.ensure('winter_coat');this.select('winter_coat');this.game.useSelected();this.station('compost');this.station('smelter');this.ensure('sulfur_pickaxe');this.ensure('radiation_mask');this.select('radiation_mask');this.game.useSelected();this.ensure('hammer');this.checkpoint('industry-pre-city');this.cityAndTesla();}
}
