import { BALANCE,CIRCUIT_IDS,FOOD,GHOULS,ITEMS,ROBOTS,STATIONS,STRUCTURES } from '../content';
import { newId,random } from '../core/math';
import { add,stack } from '../core/inventory';
import type { Entity,World } from '../core/model';

export function createEntity(w:World,type:string,x:number,y:number,owner:string|null=null):Entity {
 let kind:Entity['kind']='furniture',hp=180,width=56,height=56,radius=0;
 if(type.endsWith('_floor')){kind='floor';hp=STRUCTURES[type]?.health??4000;width=height=64;}
 else if(STRUCTURES[type]){kind='structure';hp=STRUCTURES[type].health??(type.endsWith('door')?BALANCE.uraniumDoorHP:BALANCE.uraniumWallHP);width=height=64;}
 else if(STATIONS[type]){kind='station';hp=STATIONS[type].health??350;width=type==='research_bench'||type==='tesla_bench'||type==='smelter'?192:64;height=64;}
 else if(['tree','stone_node','iron_node','sulfur_node','uranium_node','boar','deer','boletus','russula','amanita','rare_flower'].includes(type)){kind='resource';hp=type==='tree'?120:type.endsWith('node')?180:type==='boar'||type==='deer'?80:1;radius=type==='tree'?24:type.endsWith('node')?35:0;width=height=radius*2;}
 else if(type.endsWith('_bush')||type.endsWith('_seed')){kind='crop';hp=60;radius=14;width=height=28;}
 else if(GHOULS[type]){kind='ghoul';hp=GHOULS[type].health;radius=type==='armored_ghoul'?28:22;width=height=radius*2;}
 else if(ROBOTS.has(type)){kind='robot';hp=type==='tesla_bot'?3000:type==='hal_bot'?800:400;radius=24;width=height=48;}
 else if(['wood_chest','fridge','crate','cupboard','safe','vending_machine','garbage','sink','toilet'].includes(type)){kind='container';hp=type==='safe'?3000:200;}
 else if(['c4','landmine','dynamite'].includes(type)){kind='explosive';hp=5;width=height=30;}
 else if(type==='cave_wall'){kind='structure';hp=2000;width=height=64;}
 if(CIRCUIT_IDS.has(type)&&!['cable_wall','automatic_door'].includes(type)){kind='circuit';hp=200;width=height=48;}
 if(['computer','office_computer','television'].includes(type))hp=120;
 if(type==='big_computer')hp=250;
 if(type==='bed'||type==='bunker_bed'){width=54;height=50;}
 if(type==='computer'){width=56;height=44;}
 if(type==='safe'){width=43;height=54;}
 if(type==='toilet'){width=50;height=56;}
 if(type==='sofa'){width=height=52;}
 const e:Entity={id:newId(w),type,kind,x,y,rotation:0,width,height,radius,hp,maxHp:hp,owner,created:w.time,active:true,variation:Math.floor(random(w,'world')*8),
  inventory:Array(4).fill(null),outputs:Array(4).fill(null),jobs:[],fuel:0,fuelLeft:0,work:0,selectedResource:'stone',growAt:0,harvests:0,regenAt:0,yieldLeft:type==='tree'?60:type.endsWith('node')?60:8,
  open:false,switchOn:false,signal:false,channels:[false,false,false,false],timerIndex:0,timerPhase:0,color:0,fuse:type==='dynamite'?5:-1,activated:0,ai:null,attributed:false,deployment:0,contacts:[]};
 if(kind==='ghoul'||kind==='robot')e.ai={mode:'wander',target:null,home:{x,y},waypoint:{x,y},nextThink:0,cooldown:0,lastSeen:0,dodge:0,path:[]};
 if(type.endsWith('_seed'))e.growAt=w.time+(type==='tree_seed'?BALANCE.treeGrowth:BALANCE.fruitGrowth);
 if(kind==='robot'&&owner){e.deployment=BALANCE.robotDeploymentSeconds;e.maxHp=e.hp=type==='hal_bot'?400:hp/2;}
 return e;
}
export function blocksActor(e:Entity):boolean {return e.active&&(e.kind==='structure'||e.kind==='station'||e.kind==='container'||e.kind==='furniture'&&!['sleeping_bag','wooden_spike','wood_spike'].includes(e.type)||e.kind==='resource'&&e.radius>0);}
export function blocksShot(e:Entity):boolean {return blocksActor(e)&&!e.type.includes('low_')&&(e.kind!=='resource'||e.type.endsWith('node'));}
export function blocksSight(e:Entity):boolean {return blocksShot(e)&&e.kind==='structure';}
export function fillLoot(w:World,e:Entity,city=false):void {
 const pools:Record<string,[string,number,number][]>= {
  crate:[['wood',15,40],['stone',8,25],['junk',1,3],['can',1,2],['nails',10,45],['orange_seed',1,2],['tomato_seed',1,2],['electronic_parts',1,1]],
  cupboard:[['leather',1,3],['animal_fat',1,2],['string',1,2],['can',1,2],['orange',2,4],['junk',1,3]],
  sink:[['chemical_component',1,3],['syringe',1,3],['junk',1,1]],toilet:[['syringe',1,2],['chemical_component',1,2]],
  safe:[['alloys',2,4],['energy_cells',3,6],['heavy_bullet',5,20],['bullet',10,25],['electronic_parts',1,2]],
  vending_machine:[['soda',1,3],['tomato_soup',1,2],['crisps',1,3]],garbage:[['junk',1,4],['rotten_orange',1,4],['can',1,2]],
  fridge:[['orange',2,6],['raw_steak',1,3],['tomato',2,4]]
 };
 const pool=pools[e.type]||pools.crate;
 const rolls=e.type==='safe'?4:1+Math.floor(random(w,'loot')*4);
 e.inventory=Array(4).fill(null);
 for(let i=0;i<rolls;i++){const [id,min,max]=pool[Math.floor(random(w,'loot')*pool.length)];add(e.inventory,stack(w,id,min+Math.floor(random(w,'loot')*(max-min+1))));}
 if(city&&e.type==='crate'&&random(w,'loot')<.35)add(e.inventory,stack(w,'energy_cells',2));
 e.regenAt=w.time+BALANCE.lootRefill;
}
export const SALVAGE:Record<string,Record<string,number>>={
 bed:{leather:5,wood:50},bunker_bed:{leather:5,animal_fat:3,shaped_metal:3},sofa:{leather:2,wood:24,string:1},table:{shaped_metal:2},
 computer:{junk:3,energy_cells:2,shaped_metal:1,electronic_parts:1},big_computer:{shaped_metal:4,electronic_parts:4,energy_cells:4,big_wires:2},
 office_computer:{shaped_metal:4,junk:3,electronic_parts:1,small_wire:1},television:{shaped_metal:4,junk:3,electronic_parts:1,small_wire:1},fridge:{shaped_metal:4,sulfur:4},
 sink:{shaped_metal:2,wood:37},toilet:{shaped_metal:1,stone:25},safe:{shaped_metal:8,sulfur:3},crate:{wood:10},cupboard:{wood:25},
 vending_machine:{shaped_metal:4,electronic_parts:1},red_barrel:{gasoline:2},green_barrel:{uranium:2},garbage:{junk:2}
};
export function storageAccept(e:Entity,id:string):boolean {return e.type==='wood_chest'?!FOOD[id]:true;}
