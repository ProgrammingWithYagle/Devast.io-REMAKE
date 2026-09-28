import { BALANCE,DATA,ITEMS,VERSION } from '../content';
import { add,stack } from '../core/inventory';
import { distance,hashSeed,random,snap } from '../core/math';
import type { Entity,Player,World } from '../core/model';
import { CAVE,CITY,HOUSES,type Blueprint } from './blueprints';
import { createEntity,fillLoot } from './entities';
export function createPlayer(name='Survivor',owner='owner-1'):Player {
 return {id:'player',owner,name,x:1056,y:4128,aim:0,hp:255,hunger:255,warmth:255,energy:255,radiation:0,inventory:Array(BALANCE.initialSlots).fill(null),equipped:null,selected:-1,xp:0,level:0,points:0,
  unlocked:DATA.recipes.filter(r=>r.skill_points===0).map(r=>r.id),upgrades:[],age:0,lastDamage:-100,energyDelay:0,exhausted:false,cooldown:0,action:null,jobs:[],effects:{ghoul:0,boost:0,withdrawal:0,poison:0},provoked:[],dead:false,deathCause:'',kills:0,distance:0,milestones:[],spawn:{x:1056,y:4128}};
}
export function blankWorld(seed='afterlight',name='New world'):World {const h=hashSeed(seed);return {schema:2,contentVersion:VERSION,id:`world-${h}-${Date.now()}`,name,seed,tick:0,time:0,nextId:1,rng:{world:h,loot:(h^0x9e3779b9)>>>0,ai:(h^0xa341316c)>>>0},player:createPlayer(),entities:[],projectiles:[],regions:[],discovered:[],nextSpawn:30,autosaveClock:0};}
const symbols:Record<string,string>={D:'wood_door',m:'metal_door',d:'stone_low_door',L:'stone_low_wall',A:'automatic_door',M:'metal_wall',l:'wood_low_wall',B:'bed',o:'sofa',T:'table',b:'crate',k:'sink',t:'toilet',c:'computer',P:'office_computer',V:'television',C:'big_computer',S:'safe',v:'vending_machine',r:'red_barrel',g:'green_barrel',s:'switch',p:'platform','=':'cable',n:'gate_not',G:'gate_and',X:'cave_wall'};
export function placeBlueprint(w:World,b:Blueprint,tx:number,ty:number,city=false):void {
 const width=Math.max(...b.rows.map(r=>r.length))*64,height=b.rows.length*64;
 w.regions.push({id:`${b.id}-${tx}-${ty}`,name:b.name,kind:b.id.startsWith('cave')?'cave':city?'city':'house',x:tx*64,y:ty*64,width,height,radiation:0});
 for(let y=0;y<b.rows.length;y++)for(let x=0;x<b.rows[y].length;x++){
  const c=b.rows[y][x];if(c===' ')continue;const px=(tx+x)*64+32,py=(ty+y)*64+32;
  w.entities.push(createEntity(w,b.floor||(city||c==='.'?'stone_floor':'wood_floor'),px,py));
  if(b.components?.some(part=>part.x===x&&part.y===y))continue;
  let type=c==='#'?b.wall||'stone_wall':symbols[c];if(!type)continue;
  if(type==='bed'&&b.id.startsWith('cave'))type='bunker_bed';
  const e=createEntity(w,type,px,py);if(type==='wood_door'||type==='stone_low_door')e.open=true;
  if(e.kind==='container')fillLoot(w,e,city);
  if(type==='big_computer')e.maxHp=e.hp=300;
  if(type==='gate_not')e.rotation=1;
  if(type==='switch'&&city)e.switchOn=(x%3)!==0;
  w.entities.push(e);
 }
 for(const c of b.components||[]){const e=createEntity(w,c.type,(tx+c.x)*64+32,(ty+c.y)*64+32);e.rotation=c.rotation||0;e.tag=c.tag;e.pulseSeconds=c.pulseSeconds;e.inputSignal=false;w.entities.push(e);}
}
export function generateWorld(seed:string,name:string):World {
 const w=blankWorld(seed,name);w.player.inventory[0]=stack(w,'stone',2);
 // Layout follows the nine-building city overview: central roads, computer complex north, refinery southeast.
 w.regions.push({id:'city',name:'Irradiated city',kind:'city',x:3584,y:1024,width:3584,height:4608,radiation:BALANCE.radiationCity});
 const cityPositions=[[56,33],[64,17],[92,17],[92,30],[75,40],[92,42],[56,56],[84,62],[100,66]];
 CITY.forEach((b,i)=>placeBlueprint(w,b,...cityPositions[i] as [number,number],true));
 for(const [x,y,width,height] of [[54,38,35,2],[81,39,2,50],[87,15,3,40],[54,54,55,2]]) w.regions.push({id:`road-${x}-${y}`,name:'City road',kind:'road',x:x*64,y:y*64,width:width*64,height:height*64,radiation:0});
 const positions=[[20,54],[33,32],[40,87],[10,30],[27,100],[13,87],[104,93],[89,105],[49,111],[7,111]];
 positions.forEach((xy,i)=>placeBlueprint(w,HOUSES[i%HOUSES.length],xy[0],xy[1]));
 placeBlueprint(w,CAVE,13,10);placeBlueprint(w,{...CAVE,id:'cave_south',name:'Southern bunker'},54,94);
 const clear=(x:number,y:number)=>w.regions.some(r=>r.id!=='city'&&x>r.x-80&&x<r.x+r.width+80&&y>r.y-80&&y<r.y+r.height+80)||distance({x,y},w.player)<120;
 const starter:[string,number,number][]=[['tree',940,4100],['tree',1240,4240],['stone_node',1170,4030],['orange_bush',940,4300],['tomato_bush',1090,4370],['orange_bush',1260,4140],['iron_node',820,3980],['boar',1320,4460]];
 const types=['tree','tree','tree','tree','stone_node','stone_node','iron_node','sulfur_node','uranium_node','orange_bush','orange_bush','tomato_bush','boletus','russula','amanita','boar','deer'];
 const radius=(type:string)=>type==='tree'?65:type.endsWith('_node')?46:type.endsWith('_bush')?33:['boar','deer'].includes(type)?43:18;
 const scatter=new Map<string,{x:number;y:number;r:number}[]>();
 const reserve=(type:string,x:number,y:number)=>{const key=`${Math.floor(x/128)},${Math.floor(y/128)}`;const cell=scatter.get(key)||[];cell.push({x,y,r:radius(type)});scatter.set(key,cell);};
 const fits=(type:string,x:number,y:number)=>{const cx=Math.floor(x/128),cy=Math.floor(y/128),r=radius(type);for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++)if(scatter.get(`${cx+dx},${cy+dy}`)?.some(e=>distance(e,{x,y})<e.r+r+10))return false;return true;};
 for(const [type,x,y]of starter)reserve(type,x,y);
 for(let i=0;i<2600;i++){
  const x=160+random(w,'world')*(BALANCE.worldSize-320),y=160+random(w,'world')*(BALANCE.worldSize-320);
  if(clear(x,y))continue;const type=types[Math.floor(random(w,'world')*types.length)];if(!fits(type,x,y))continue;
  const e=createEntity(w,type,x,y);w.entities.push(e);reserve(type,x,y);
 }
 // A viable forest clearing; no items beyond the two original starting stones are granted.
 for(const [type,x,y] of starter)w.entities.push(createEntity(w,type,x,y));
 let flower={x:0,y:0};do{flower={x:300+random(w,'world')*7400,y:300+random(w,'world')*7400};}while(clear(flower.x,flower.y)||!fits('rare_flower',flower.x,flower.y));
 w.entities.push(createEntity(w,'rare_flower',flower.x,flower.y));
 for(let i=0;i<50;i++){const e=createEntity(w,'stone',200+random(w,'world')*7800,200+random(w,'world')*7800);e.kind='drop';e.width=e.height=24;e.inventory=[stack(w,'stone',2)];e.regenAt=w.time+BALANCE.groundLifetime;w.entities.push(e);}
 return w;
}
