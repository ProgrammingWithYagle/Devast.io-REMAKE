import { armorFor,BALANCE,DATA,EXPLOSIVES,FOOD,GHOULS,ITEMS,RECIPES,ROBOTS,STATIONS,WEAPONS,label } from '../content';
import { add,ageInventory,count,moveSlot,remove,reserve,stack,transfer } from './inventory';
import { clamp,circleRect,distance,entityRect,newId,random,segmentCircle,segmentRect,snap,SpatialHash } from './math';
import type { DamageKind,Entity,GameEvent,Intent,Inventory,Stack,Vec,World } from './model';
import { blocksActor,blocksShot,blocksSight,createEntity,fillLoot,SALVAGE,storageAccept } from '../world/entities';
import { createPlayer } from '../world/generate';
import { updateSurvival,consume,beginReload,updateAction } from '../systems/survival';
import { updateProduction,craft,unlock,addFuel } from '../systems/production';
import { updateCombat,attack,explode } from '../systems/combat';
import { updateActors } from '../systems/ai';
import { updateCircuits } from '../systems/circuits';

export class Game {
 readonly spatial=new SpatialHash();readonly byId=new Map<string,Entity>();events:GameEvent[]=[];paused=false;navigationRevision=0;
 private explosionQueue:{point:Vec;type:string;owner:string}[]=[];private resolvingExplosions=false;
 constructor(public world:World){this.rebuild();}
 get player(){return this.world.player;}
 rebuild(){this.navigationRevision++;this.byId.clear();for(const e of this.world.entities){this.byId.set(e.id,e);if(e.active)this.spatial.insert(e);}}
 emit(event:GameEvent){this.events.push(event);if(this.events.length>160)this.events.shift();}
 message(text:string){this.emit({kind:'message',text});}
 explosion(point:Vec,type:string,owner:string){this.explosionQueue.push({point:{x:point.x,y:point.y},type,owner});if(this.resolvingExplosions)return;this.resolvingExplosions=true;try{while(this.explosionQueue.length){const event=this.explosionQueue.shift()!;explode(this,event.point,event.type,event.owner);}}finally{this.resolvingExplosions=false;}}
 sound(sound:string,p:Vec=this.player){this.emit({kind:'sound',sound,x:p.x,y:p.y});}
 addEntity(e:Entity){this.navigationRevision++;this.world.entities.push(e);this.byId.set(e.id,e);if(e.active)this.spatial.insert(e);return e;}
 create(type:string,x:number,y:number,owner:string|null=null){return this.addEntity(createEntity(this.world,type,x,y,owner));}
 near(p:Vec,r:number){return this.spatial.query(p.x,p.y,r).filter(e=>distance(p,e)<=r+Math.max(e.width,e.height)/2);}
 reach(e:Entity){const r=entityRect(e);return Math.hypot(Math.max(0,Math.abs(this.player.x-r.x)-r.width/2),Math.max(0,Math.abs(this.player.y-r.y)-r.height/2))<=BALANCE.interactRange&&!this.lineBlocked(this.player,e,false,e.id);}
 isNight(){return this.world.time%960>=480;}
 inShelter(p:Vec){return this.world.regions.some(r=>r.id!=='city'&&r.kind!=='road'&&p.x>r.x+32&&p.x<r.x+r.width-32&&p.y>r.y+32&&p.y<r.y+r.height-32)&&this.near(p,48).some(e=>e.kind==='floor'&&!e.owner&&Math.abs(e.x-p.x)<=32&&Math.abs(e.y-p.y)<=32);}
 selected(){return this.player.inventory[this.player.selected]||null;}
 move(p:Vec,dx:number,dy:number,r:number,ignore?:string):boolean {
  const start={...p};for(const axis of ['x','y'] as const){const d=axis==='x'?dx:dy;const next={x:p.x,y:p.y};next[axis]=clamp(next[axis]+d,r+16,BALANCE.worldSize-r-16);
   const blocked=this.near(next,r+96).some(e=>e.id!==ignore&&blocksActor(e)&&(e.radius?distance(e,next)<r+e.radius:circleRect(next,r,entityRect(e))));if(!blocked)p[axis]=next[axis];
  }return distance(start,p)>0.001;
 }
 lineBlocked(a:Vec,b:Vec,sight=false,ignore?:string):boolean {return this.near({x:(a.x+b.x)/2,y:(a.y+b.y)/2},distance(a,b)/2+100).some(e=>e.id!==ignore&&(sight?blocksSight(e):blocksShot(e))&&(e.radius?segmentCircle(a,b,e,e.radius)!==null:segmentRect(a,b,entityRect(e))!==null));}
 step(intent:Intent,dt=BALANCE.step){
  if(this.paused||this.player.dead)return;
  const w=this.world,p=this.player;w.tick++;w.time+=dt;p.age+=dt;w.autosaveClock+=dt;p.aim=intent.aim;p.cooldown=Math.max(0,p.cooldown-dt);
  const length=Math.hypot(intent.x,intent.y);const sprint=intent.sprint&&p.energy>0&&!p.exhausted&&length>0;
  let speed=BALANCE.walkSpeed*(sprint?BALANCE.sprintMultiplier:1);
  if(p.action||p.jobs.length)speed*=.65;
  if(this.near(p,35).some(e=>(e.type==='wooden_spike'||e.type==='wood_spike')&&e.activated>0&&distance(e,p)<32))speed*=BALANCE.spikeSpeedMultiplier;
  if(p.effects.boost>0)speed*=1.5;else if(p.effects.withdrawal>0)speed*=.7;
  speed*=armorFor(p.equipped?.item).speed;
  const start={x:p.x,y:p.y};if(length)this.move(p,intent.x/length*speed*dt,intent.y/length*speed*dt,BALANCE.playerRadius);p.distance+=distance(start,p);
  if(sprint){p.energy=clamp(p.energy-BALANCE.sprintCost*dt);p.energyDelay=BALANCE.energyDelay;}
  updateAction(this,dt);if(intent.attack&&!p.action)attack(this);
  updateCombat(this,dt);updateSurvival(this,dt);updateProduction(this,dt);updateActors(this,dt);
  if(w.tick%6===0)updateCircuits(this,dt*6);
  if(w.tick%60===0){this.ecology(1);const cell=`${Math.floor(p.x/256)},${Math.floor(p.y/256)}`;if(!w.discovered.includes(cell))w.discovered.push(cell);}
  if(p.hp<=0&&!p.dead){p.hp=0;p.dead=true;this.emit({kind:'death',text:p.deathCause});}
 }
 xp(amount:number){const p=this.player;p.xp+=amount;while(p.level+1<DATA.xp.length&&p.xp>=DATA.xp[p.level+1]){p.level++;p.points++;this.emit({kind:'level',text:`Level ${p.level} · +1 skill point`});this.sound('levelup');}}
 give(item:string,n:number,freshness?:number){const s=stack(this.world,item,n);if(freshness!==undefined)s.freshness=freshness;const left=add(this.player.inventory,s);if(left)this.drop({...s,quantity:left},this.player);this.emit({kind:'loot',text:`+${n} ${label(item)}`,x:this.player.x,y:this.player.y});}
 drop(s:Stack,p:Vec){const e=createEntity(this.world,s.item,p.x,p.y);e.kind='drop';e.width=e.height=22;e.radius=0;e.inventory=[structuredClone(s)];e.outputs=[];e.jobs=[];e.regenAt=this.world.time+BALANCE.groundLifetime;return this.addEntity(e);}
 dropSlot(index:number,split=false){const s=this.player.inventory[index];if(!s)return;const n=split?Math.ceil(s.quantity/2):s.quantity;this.drop({...s,uid:newId(this.world,'i'),quantity:n},{x:this.player.x+Math.cos(this.player.aim)*45,y:this.player.y+Math.sin(this.player.aim)*45});s.quantity-=n;if(!s.quantity)this.player.inventory[index]=null;this.sound('drag');}
 rearrange(from:number,to:number,split=false){return moveSlot(this.player.inventory,from,to,split);}
 transfer(e:Entity,index:number,toPlayer:boolean,output=false,split=false){if(!e.active||!this.reach(e))return 0;const storage=output?e.outputs:e.inventory;const from=toPlayer?storage:this.player.inventory;const to=toPlayer?this.player.inventory:storage;const n=from[index]?.quantity??0;const moved=transfer(from,index,to,split?Math.ceil(n/2):n,toPlayer?undefined:s=>storageAccept(e,s.item));if(moved)this.sound('drag');return moved;}
 nearest(pickupOnly=false):Entity|undefined {const p=this.player;return this.near(p,BALANCE.interactRange+120).filter(e=>this.reach(e)&&(
  pickupOnly?e.kind==='drop':e.kind==='drop'||e.kind==='station'||e.kind==='container'||e.type.endsWith('_bush')||e.type.endsWith('door')||['switch','lamp','gate_timer','platform','sleeping_bag','boletus','russula','amanita','rare_flower'].includes(e.type)))
  .sort((a,b)=>{const pa=a.kind==='drop'?1:0,pb=b.kind==='drop'?1:0;return pa-pb||distance(p,a)-distance(p,b);})[0];}
 interact(e=this.nearest()):Entity|undefined {
  if(!e||!this.reach(e)||!e.active)return;
  if(e.kind==='drop'){for(let i=0;i<e.inventory.length;i++)transfer(e.inventory,i,this.player.inventory);if(e.inventory.every(s=>!s)){e.active=false;this.spatial.remove(e);}else this.message('Your inventory is full.');this.sound('open');}
  else if(e.type.endsWith('door')&&e.type!=='automatic_door'){this.toggleDoor(e,!e.open);}
  else if(e.type==='switch'){e.switchOn=!e.switchOn;this.sound('button');}
  else if(e.type==='gate_timer'){e.timerIndex=(e.timerIndex+1)%4;this.sound('button');}
  else if(e.type==='lamp'){e.color=(e.color+1)%5;this.sound('button');}
  else if(e.kind==='crop'||['boletus','russula','amanita','rare_flower'].includes(e.type)){this.harvest(e,'fists');}
  else if(e.type==='sleeping_bag'){this.message('This sleeping bag will preserve your progress for one revival.');}
  else if(e.kind==='station'||e.kind==='container'){this.sound('open');return e;}
 }
 toggleDoor(e:Entity,open:boolean):boolean {
  if(e.open===open)return true;const previous=e.open;e.open=open;const r=entityRect(e);
  const occupied=circleRect(this.player,BALANCE.playerRadius,r)||this.near(e,100).some(other=>other.id!==e.id&&((other.kind==='ghoul'||other.kind==='robot')?circleRect(other,other.radius,r):blocksActor(other)&&circleRect({x:r.x,y:r.y},Math.min(r.width,r.height)/2,entityRect(other))));
  if(occupied){e.open=previous;return false;}this.navigationRevision++;this.spatial.insert(e);this.sound('open',e);return true;
 }
 canPlace(type:string,x:number,y:number,rotation=0):{ok:boolean;reason:string} {
  if(!ITEMS[type]?.placeable)return {ok:false,reason:'This item cannot be placed.'};
  const e=createEntityPreview(type,snap(x),snap(y),rotation);if(distance(this.player,e)>230)return {ok:false,reason:'Too far away'};
  if(e.x<64||e.y<64||e.x>BALANCE.worldSize-64||e.y>BALANCE.worldSize-64)return {ok:false,reason:'Outside the world'};
  const rect=entityRect(e);if(circleRect(this.player,BALANCE.playerRadius,rect))return {ok:false,reason:'Step away from the preview'};
  for(const other of this.near(e,Math.max(e.width,e.height)+60)){
   if(other.kind==='drop')continue;if(other.kind==='floor'&&e.kind!=='floor')continue;if(other.kind==='floor'&&e.kind==='floor'&&other.owner===null)continue;
   const rr=entityRect(other);if(Math.abs(rect.x-rr.x)<(rect.width+rr.width)/2-3&&Math.abs(rect.y-rr.y)<(rect.height+rr.height)/2-3)return {ok:false,reason:'The space is occupied'};
  }
  return {ok:true,reason:'Place'};
 }
 place(x:number,y:number,rotation=0):boolean {const s=this.selected();if(!s)return false;x=snap(x);y=snap(y);const valid=this.canPlace(s.item,x,y,rotation);if(!valid.ok){this.message(valid.reason);return false;}const e=this.create(s.item,x,y,this.player.owner);e.rotation=rotation;this.spatial.insert(e);s.quantity--;if(!s.quantity)this.player.inventory[this.player.selected]=null;this.sound('craft');if(!this.player.milestones.includes(e.type))this.player.milestones.push(e.type);return true;}
 harvest(e:Entity,tool:string){
  if(!e.active)return;const w=this.world;let item='',amount=1,xp=0;
  if(e.kind==='crop'){
   if(e.growAt>w.time){this.message('This plant is still growing.');return;}
   if(e.type==='tree_seed'){e.type='tree';e.kind='resource';e.maxHp=e.hp=120;e.radius=24;this.spatial.insert(e);return;}
   item=e.type.startsWith('orange')?'orange':'tomato';amount=3;xp=31;e.growAt=w.time+BALANCE.fruitGrowth;e.harvests++;
   if(random(w)<.15)this.give(`${item}_seed`,1);
   if(e.owner&&e.harvests>=BALANCE.fruitHarvests){e.active=false;this.spatial.remove(e);}
  }else if(['boletus','russula','amanita','rare_flower'].includes(e.type)){item=e.type;xp=e.type==='rare_flower'?625:25;e.active=false;e.regenAt=w.time+BALANCE.resourceRegrowth;this.spatial.remove(e);}
  else if(['boar','deer'].includes(e.type)){
   if(!['hatchet','metal_axe','sulfur_axe'].includes(tool))return;
   item='raw_steak';xp=tool==='hatchet'?25:tool==='metal_axe'?75:100;e.yieldLeft-=2;
   this.give('leather',1);if(e.yieldLeft%4===0){this.give('animal_tendon',1);this.give('animal_fat',1);}if(e.yieldLeft<=0)this.deplete(e);
  }else{
   const axe=['fists','hatchet','metal_axe','sulfur_axe'].indexOf(tool),pick=['hatchet','stone_pickaxe','metal_pickaxe','sulfur_pickaxe'].indexOf(tool);
   if(e.type==='tree'&&axe>=0){item='wood';amount=[1,2,4,5][axe];xp=[3,6,12,15][axe];if(random(w)<.025)this.give('acorn',1);}
   if(e.type==='stone_node'&&pick>=0){item='stone';amount=[1,3,5,7][pick];xp=[9,28,43,46][pick];}
   if(e.type==='iron_node'&&pick>=1){item='iron';amount=pick;xp=25*pick;}
   if(e.type==='sulfur_node'&&pick>=2){item='sulfur';amount=pick-1;xp=pick===2?43:87;}
   if(e.type==='uranium_node'&&pick===3){item='uranium';amount=1;xp=87;}
   if(!item)return;
   if(item==='wood'||item==='stone')amount*=1+Math.floor(random(w)*3);
   e.yieldLeft-=amount;e.hp=clamp(e.maxHp*e.yieldLeft/60,0,e.maxHp);if(e.yieldLeft<=0)this.deplete(e);
  }
  if(item){this.give(item,amount);this.xp(xp);this.sound(item==='wood'?'wood-impact':item==='stone'||item==='iron'?'stone-impact':'pillow-impact',e);this.emit({kind:'hit',x:e.x,y:e.y,value:amount,color:'#dbc557'});}
 }
 deplete(e:Entity){e.active=false;e.regenAt=this.world.time+BALANCE.resourceRegrowth;this.spatial.remove(e);}
 damageEntity(e:Entity,amount:number,kind:DamageKind='melee',owner?:string,attacker?:string){if(!e.active||amount<=0)return;e.hp-=amount;if(e.ai&&(attacker||owner===this.player.owner)&&owner!==e.owner){e.ai.retaliation=attacker||'player';e.ai.lastSeen=this.world.time;}if(owner===this.player.owner){e.attributed=true;if(e.kind==='ghoul'){if(!this.player.provoked.includes(e.type))this.player.provoked.push(e.type);this.player.effects.ghoul=0;}}
  this.emit({kind:'hit',x:e.x,y:e.y,value:Math.round(amount),color:kind==='energy'?'#96edc3':'#f5d67b'});if(e.hp<=0)this.destroy(e);
 }
 destroy(e:Entity){if(!e.active)return;this.navigationRevision++;e.active=false;this.spatial.remove(e);const w=this.world;
  for(const s of [...e.inventory,...e.outputs,...e.jobs.flatMap(j=>j.reserved)])if(s)this.drop(s,{x:e.x+(random(w)-.5)*36,y:e.y+(random(w)-.5)*36});e.inventory=[];e.outputs=[];e.jobs=[];
  const fuel=STATIONS[e.type]?.fuel;if(fuel&&e.fuel)this.drop(stack(w,fuel,e.fuel),e);e.fuel=0;e.fuelLeft=0;
  const drops=e.kind==='ghoul'?GHOULS[e.type]?.drop:!e.owner?SALVAGE[e.type]:undefined;
  if(drops)for(const [id,n] of Object.entries(drops)){const quantity=n??1;if(ITEMS[id])this.drop(stack(w,id,quantity),e);}
  if(e.kind==='ghoul'&&e.attributed){this.xp(GHOULS[e.type].listed_xp);this.player.kills++;}
  else if(!e.owner&&['computer','big_computer','office_computer','television'].includes(e.type))this.xp(81);
  if(!e.owner&&SALVAGE[e.type]&&(e.kind==='container'||e.kind==='furniture'))e.regenAt=w.time+BALANCE.lootRefill;
  if(EXPLOSIVES[e.type])this.explosion(e,e.type,e.owner||'environment');
  this.sound(e.type.includes('wall')?'stone-destroy':e.type==='tree'?'wood-destroy3':'metal-destroy2',e);
 }
 ecology(dt:number){const w=this.world;ageInventory(this.player.inventory,dt);for(const e of [...w.entities]){
  if(!e.active&&e.regenAt>0&&w.time>=e.regenAt&&['resource','furniture','container'].includes(e.kind)){
   const blocked=(!e.owner&&e.kind!=='resource'&&distance(e,this.player)<600)||this.near(e,Math.max(e.width,e.height)/2+64).some(o=>(o.kind==='floor'&&(e.kind==='resource'||!!o.owner)||blocksActor(o))&&overlaps(e,o));if(!blocked){e.active=true;e.hp=e.maxHp;e.yieldLeft=['boar','deer'].includes(e.type)?8:60;e.regenAt=0;if(e.kind==='container')fillLoot(w,e,w.regions.some(r=>r.id==='city'&&e.x>r.x&&e.x<r.x+r.width&&e.y>r.y&&e.y<r.y+r.height));this.spatial.insert(e);}else e.regenAt=w.time+60;
  }if(!e.active)continue;
  if(e.kind==='drop'){ageInventory(e.inventory,dt);if(w.time>=e.regenAt){e.active=false;this.spatial.remove(e);}}
  else if(e.type!=='fridge')ageInventory(e.inventory,dt);
  if(e.kind==='container'&&!e.owner&&e.regenAt>0&&w.time>=e.regenAt&&e.inventory.every(s=>!s)&&distance(e,this.player)>600)fillLoot(w,e,w.regions.some(r=>r.id==='city'&&e.x>r.x&&e.x<r.x+r.width&&e.y>r.y&&e.y<r.y+r.height));
  if(e.type==='tree_seed'&&w.time>=e.growAt){e.type='tree';e.kind='resource';e.hp=e.maxHp=120;e.radius=24;e.width=e.height=48;e.yieldLeft=60;this.spatial.insert(e);}
  if(e.type==='campfire'&&w.time-e.created>=BALANCE.campfireLifetime)this.destroy(e);
 }
 }
 useSelected(){const s=this.selected();if(!s)return;if(ITEMS[s.item].armor){const old=this.player.equipped;this.player.equipped=s;this.player.inventory[this.player.selected]=old;this.sound('skill');return;}if(s.item==='c4_trigger'){for(const e of this.world.entities)if(e.active&&e.type==='c4'&&e.owner===this.player.owner)this.destroy(e);return;}consume(this,s);}
 unequip(){const p=this.player;if(!p.equipped)return true;const i=p.inventory.findIndex(s=>!s);if(i<0)return false;p.inventory[i]=p.equipped;p.equipped=null;return true;}
 reload(){return beginReload(this);}
 craft(id:string,station?:Entity){return craft(this,id,station);}
 unlock(id:string){return unlock(this,id);}
 fuel(e:Entity){return addFuel(this,e);}
 respawn(useBag=false){const w=this.world,p=this.player;const bag=w.entities.find(e=>e.active&&e.type==='sleeping_bag'&&e.owner===p.owner);if(useBag&&!bag)return false;
  for(const s of [...p.inventory,p.equipped,...p.jobs.flatMap(j=>j.reserved),...(p.action?.ammo||[])])if(s)this.drop(s,p);
  if(useBag&&bag){bag.active=false;this.spatial.remove(bag);p.x=bag.x;p.y=bag.y+64;p.hp=p.hunger=p.warmth=p.energy=127.5;p.radiation=0;p.inventory=Array(p.inventory.length).fill(null);p.equipped=null;p.jobs=[];p.action=null;p.dead=false;p.effects.ghoul=0;p.effects.boost=0;p.lastDamage=w.time;}
  else{const level=Math.floor(p.level/2),kit=DATA.respawn[Math.min(p.level,30)];const next=createPlayer(p.name,`owner-${w.nextId++}`);next.level=level;next.xp=DATA.xp[level];next.points=level;w.player=next;for(const [id,n] of Object.entries(kit.items)){if(!n||!ITEMS[id])continue;const loaded=(kit.loaded_rounds as Record<string,number>)[id]||0;const s=stack(w,id,n,loaded);const left=add(next.inventory,s);if(left)this.drop({...s,quantity:left},next);}}
  return true;
 }
}
function createEntityPreview(type:string,x:number,y:number,rotation:number):Entity {
 const dummy={nextId:0,time:0,rng:{world:1}} as World;const e=createEntity(dummy,type,x,y);e.rotation=rotation;return e;
}
function overlaps(a:Entity,b:Entity):boolean {
 if(a.radius&&b.radius)return distance(a,b)<a.radius+b.radius;
 if(a.radius)return circleRect(a,a.radius,entityRect(b));
 if(b.radius)return circleRect(b,b.radius,entityRect(a));
 const ar=entityRect(a),br=entityRect(b);return Math.abs(ar.x-br.x)<(ar.width+br.width)/2&&Math.abs(ar.y-br.y)<(ar.height+br.height)/2;
}
