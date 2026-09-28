import { DATA,ITEMS,RECIPES,VERSION,WEAPONS } from '../content';
import type { World } from '../core/model';
export const MANUAL_SLOTS=12,AUTO_SLOTS=3;
export interface Envelope {schema:2;version:string;snapshot:string;worldId:string;savedAt:number;checksum:string;payload:string}
export interface Slot {key:string;name:string;current:Envelope;previous:Envelope|null;thumbnail:string;level:number;day:number;age:number;worldName:string}
export interface Loaded {world:World;recovered:boolean;slot:Slot}
export function canonical(world:World):string{return JSON.stringify(world);}
export async function checksum(text:string){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');}
function assert(ok:unknown,message:string):asserts ok{if(!ok)throw Error(`Invalid save: ${message}`);}
const finite=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
export function validateWorld(value:unknown):World {
 assert(value&&typeof value==='object','missing world');const w=value as World;
 assert(w.schema===2,'unsupported world schema');assert(typeof w.id==='string'&&w.id.length<160,'world identity');assert(typeof w.seed==='string'&&w.seed.length<=128,'seed');assert(typeof w.name==='string'&&w.name.length<=80,'world name');
 assert(Number.isSafeInteger(w.tick)&&w.tick>=0&&finite(w.time,0,1e10),'simulation clock');assert(Number.isSafeInteger(w.nextId)&&w.nextId>0,'entity counter');
 assert(typeof w.contentVersion==='string'&&finite(w.nextSpawn,0,1e10)&&finite(w.autosaveClock,0,1e10),'world clocks');
 assert(w.rng&&['world','loot','ai'].every(k=>Number.isInteger(w.rng[k as keyof typeof w.rng])&&finite(w.rng[k as keyof typeof w.rng],0,4294967295)),'random streams');
 assert(Array.isArray(w.entities)&&w.entities.length<25000,'entity limit');assert(Array.isArray(w.projectiles)&&w.projectiles.length<2048,'projectile limit');assert(Array.isArray(w.regions)&&w.regions.length<500,'regions');assert(Array.isArray(w.discovered)&&w.discovered.length<2048,'discovery');
 const inv=(value:unknown,max=32)=>{assert(Array.isArray(value)&&value.length<=max,'inventory');for(const s of value){if(s===null)continue;assert(s&&typeof s.uid==='string'&&s.uid.length<150&&ITEMS[s.item],'item identity');assert(Number.isInteger(s.quantity)&&s.quantity>0&&s.quantity<=ITEMS[s.item].stack,'stack quantity');assert(finite(s.freshness,-1,1e8),'freshness');assert(Number.isInteger(s.loaded)&&s.loaded>=0&&s.loaded<=(WEAPONS[s.item]?.magazine||0),'loaded ammunition');}};
 const vec=(p:{x:number;y:number})=>assert(p&&finite(p.x,-4096,12288)&&finite(p.y,-4096,12288),'position');
 const jobs=(list:unknown)=>{assert(Array.isArray(list)&&list.length<=4,'crafting queue');for(const j of list){assert(RECIPES[j.recipe]&&finite(j.remaining,0,1e7)&&finite(j.total,.01,1e7)&&j.remaining<=j.total+.001,'crafting job');assert(Number.isInteger(j.output)&&j.output>0&&j.output<=1020,'crafting output');inv(j.reserved,32);}};
 const p=w.player;assert(p&&p.id==='player'&&typeof p.owner==='string'&&typeof p.name==='string'&&p.name.length<=80,'player identity');vec(p);vec(p.spawn);for(const k of ['hp','hunger','warmth','energy','radiation'] as const)assert(finite(p[k],0,255),`player ${k}`);
 assert(Number.isInteger(p.level)&&p.level>=0&&p.level<DATA.xp.length&&finite(p.xp,0,1e12)&&Number.isInteger(p.points)&&p.points>=0&&p.points<10000,'player progression');
 assert(Array.isArray(p.unlocked)&&p.unlocked.length<=200&&p.unlocked.every(id=>RECIPES[id]),'research');assert(Array.isArray(p.upgrades)&&p.upgrades.every(id=>DATA.upgrades.some(u=>u.id===id)),'upgrades');
 inv(p.inventory);inv([p.equipped]);jobs(p.jobs);assert(finite(p.age,0,1e10)&&finite(p.cooldown,0,10000),'player clocks');
 assert(p.inventory.length>=6&&Number.isInteger(p.selected)&&p.selected>=-1&&p.selected<p.inventory.length&&(!p.equipped||ITEMS[p.equipped.item].armor),'equipment and selection');
 assert(finite(p.aim,-1e10,1e10)&&finite(p.lastDamage,-1000,1e10)&&finite(p.energyDelay,0,10000)&&typeof p.exhausted==='boolean'&&typeof p.dead==='boolean'&&typeof p.deathCause==='string'&&finite(p.kills,0,1e10)&&finite(p.distance,0,1e12),'player state');
 assert(p.effects&&['ghoul','boost','withdrawal','poison'].every(k=>finite(p.effects[k as keyof typeof p.effects],0,1e8)),'status effects');assert(Array.isArray(p.provoked)&&p.provoked.length<=5&&p.provoked.every(id=>DATA.ghouls.some(g=>g.id===id)),'provocation');assert(Array.isArray(p.milestones)&&p.milestones.length<500&&p.milestones.every(id=>typeof id==='string'),'milestones');
 if(p.action){assert(['consume','reload','throw'].includes(p.action.kind)&&typeof p.action.stack==='string'&&finite(p.action.remaining,0,1e7)&&finite(p.action.total,.01,1e7)&&p.action.remaining<=p.action.total&&finite(p.action.aim,-1e10,1e10),'action');if(p.action.ammo)inv(p.action.ammo);}
 const ids=new Set<string>();for(const e of w.entities){assert(typeof e.id==='string'&&!ids.has(e.id)&&e.id.length<100,'duplicate entity');ids.add(e.id);assert(ITEMS[e.type]&&['resource','crop','structure','station','container','furniture','ghoul','robot','drop','floor','circuit','explosive'].includes(e.kind),'entity type');vec(e);assert(finite(e.hp,-1e7,1e7)&&finite(e.maxHp,1,1e7),'entity health');assert(finite(e.width,0,1024)&&finite(e.height,0,1024)&&finite(e.radius,0,512),'collision shape');inv(e.inventory);inv(e.outputs);jobs(e.jobs);
  for(const key of ['fuel','fuelLeft','work','growAt','harvests','regenAt','yieldLeft','timerPhase','activated','deployment'] as const)assert(finite(e[key],key==='yieldLeft'?-255:0,1e10),`entity ${key}`);
  assert(finite(e.fuse,-1,1e8)&&Number.isInteger(e.timerIndex)&&e.timerIndex>=0&&e.timerIndex<4&&Array.isArray(e.channels)&&e.channels.length===4&&e.channels.every(v=>typeof v==='boolean'),'circuit / fuse');
  assert(['active','open','switchOn','signal','attributed'].every(k=>typeof e[k as keyof typeof e]==='boolean')&&finite(e.rotation,-1e6,1e6)&&(e.owner===null||typeof e.owner==='string')&&finite(e.created,0,1e10)&&Number.isInteger(e.color)&&e.color>=0&&e.color<5&&finite(e.variation,0,100)&&['stone','iron','sulfur','uranium'].includes(e.selectedResource),'entity state');
  if(e.contacts)assert(Array.isArray(e.contacts)&&e.contacts.length<128&&e.contacts.every(id=>typeof id==='string'),'trap contacts');
  if(e.tag!==undefined)assert(typeof e.tag==='string'&&e.tag.length<160,'entity tag');
  if(e.pulseSeconds!==undefined)assert(finite(e.pulseSeconds,.01,10000),'relay duration');
  if(e.inputSignal!==undefined)assert(typeof e.inputSignal==='boolean','relay input');
  if(e.ai){assert(Array.isArray(e.ai.path)&&e.ai.path.length<=500&&['wander','chase','attack','return'].includes(e.ai.mode),'navigation path');e.ai.path.forEach(vec);vec(e.ai.home);vec(e.ai.waypoint);assert(['cooldown','nextThink','lastSeen','dodge'].every(k=>finite(e.ai![k as 'cooldown'],0,1e10)),'AI clocks');}
 }
 for(const e of w.entities)if(e.ai?.target)assert(e.ai.target==='player'||ids.has(e.ai.target),'AI target reference');
 for(const b of w.projectiles){vec(b);assert(finite(b.vx,-1e5,1e5)&&finite(b.vy,-1e5,1e5)&&finite(b.remaining,-1e4,1e6)&&finite(b.damage,0,1e6)&&finite(b.structureDamage,0,1e6)&&finite(b.fuse,-1,10000)&&ITEMS[b.weapon]&&(b.recover===null||ITEMS[b.recover])&&typeof b.id==='string'&&typeof b.owner==='string'&&['melee','ballistic','energy','explosive','environment'].includes(b.kind)&&Array.isArray(b.hitIds)&&b.hitIds.length<25000&&b.hitIds.every(id=>typeof id==='string'),'projectile');}
 for(const r of w.regions){vec(r);assert(finite(r.width,0,8192)&&finite(r.height,0,8192)&&finite(r.radiation,0,1000)&&typeof r.id==='string'&&typeof r.name==='string'&&['city','house','cave','bunker','road'].includes(r.kind),'region');}
 assert(w.discovered.every(cell=>typeof cell==='string'&&/^\d{1,2},\d{1,2}$/.test(cell)),'discovery cells');
 // Reject non-finite fields, prototype-shaped payloads, and arbitrary objects before rebuilding any runtime indexes.
 const walk=(v:unknown,depth=0)=>{assert(depth<24,'nesting limit');if(typeof v==='number')assert(Number.isFinite(v),'non-finite number');else if(typeof v==='string')assert(v.length<1000,'string limit');else if(v&&typeof v==='object')for(const [k,n] of Object.entries(v)){assert(!['__proto__','prototype','constructor'].includes(k),'reserved key');walk(n,depth+1);}};walk(w);
 return w;
}
export async function envelope(world:World):Promise<Envelope>{const payload=canonical(validateWorld(world));return {schema:2,version:VERSION,snapshot:crypto.randomUUID(),worldId:world.id,savedAt:Date.now(),checksum:await checksum(payload),payload};}
export async function decode(value:unknown):Promise<World>{assert(value&&typeof value==='object','missing envelope');const e=value as Envelope;assert(e.schema===2||(e.schema as number)===1,'this save belongs to a newer or unsupported version');assert(typeof e.payload==='string'&&e.payload.length<24_000_000,'payload size');assert(await checksum(e.payload)===e.checksum,'checksum mismatch');const world=JSON.parse(e.payload);
 if((e.schema as number)===1){assert(world.schema===1,'legacy schema');world.schema=2;world.contentVersion ||=VERSION;world.autosaveClock ||=0;world.player.milestones ||= [];}
 return validateWorld(world);
}
export class SaveStore {
 private db:Promise<IDBDatabase>;private serial:Promise<unknown>=Promise.resolve();
 constructor(name='devast-remake-saves',private fault?:'abort'){
  this.db=new Promise((resolve,reject)=>{const r=indexedDB.open(name,1);r.onupgradeneeded=()=>{r.result.createObjectStore('slots',{keyPath:'key'});r.result.createObjectStore('meta');};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Close the other game window to update save storage.'));});
 }
 private async read<T>(store:string,key:IDBValidKey):Promise<T|undefined>{const db=await this.db;return new Promise((resolve,reject)=>{const r=db.transaction(store).objectStore(store).get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
 async list(includeDeleted=false):Promise<Slot[]>{const db=await this.db;return new Promise((resolve,reject)=>{const r=db.transaction('slots').objectStore('slots').getAll();r.onsuccess=()=>resolve(r.result.filter((s:Slot)=>includeDeleted||!s.key.startsWith('trash-')));r.onerror=()=>reject(r.error);});}
 async save(key:string,world:World,name:string,thumbnail=''):Promise<Slot>{const snapshot=structuredClone(world);const run=async()=>{
  assert(/^(manual-(?:[1-9]|1[0-2])|auto-[0-2])$/.test(key),'slot name');const current=await envelope(snapshot),db=await this.db;
  // Validation uses asynchronous hashing outside the transaction. Compare the read
  // generation again inside the write transaction so another window cannot make
  // the recovery copy stale between validation and commit.
  for(let attempt=0;attempt<8;attempt++){
   const old=await this.read<Slot>('slots',key);let previous:Envelope|null=null;
   if(old)for(const candidate of [old.current,old.previous])if(candidate)try{await decode(candidate);previous=candidate;break;}catch{}
   const slot:Slot={key,name:name.trim().slice(0,60)||snapshot.name,current,previous,thumbnail,level:snapshot.player.level,day:Math.floor(snapshot.time/960)+1,age:snapshot.player.age,worldName:snapshot.name};
   const committed=await new Promise<boolean>((resolve,reject)=>{const tx=db.transaction(['slots','meta'],'readwrite'),slots=tx.objectStore('slots');let retry=false;
    const read=slots.get(key);read.onsuccess=()=>{const latest=read.result as Slot|undefined;if(latest?.current.snapshot!==old?.current.snapshot){retry=true;return;}try{slots.put(slot);tx.objectStore('meta').put(key,'continue');if(this.fault==='abort')tx.abort();}catch(e){tx.abort();reject(e);}};
    tx.oncomplete=()=>resolve(!retry);tx.onabort=()=>reject(tx.error||Error('Save interrupted; previous generation retained.'));tx.onerror=()=>reject(tx.error);
   });if(committed)return slot;
  }throw Error('Another game window is saving this slot. Please try again.');
 };const result=this.serial.then(run);this.serial=result.catch(()=>{});return result;}
 async load(key:string):Promise<Loaded>{const slot=await this.read<Slot>('slots',key);if(!slot)throw Error('This save slot is empty.');let first:unknown;
  for(const [index,candidate] of [slot.current,slot.previous].entries())if(candidate)try{const world=await decode(candidate);await this.markContinue(key);return {world,recovered:index===1,slot};}catch(e){first ||=e;}
  throw first||Error('No valid save generation found.');
 }
 private async markContinue(key:string){const db=await this.db;await new Promise<void>((resolve,reject)=>{const t=db.transaction('meta','readwrite');t.objectStore('meta').put(key,'continue');t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error);});}
 async continue():Promise<Loaded>{const key=await this.read<string>('meta','continue');if(key)try{return await this.load(key);}catch{}for(const s of (await this.list()).sort((a,b)=>b.current.savedAt-a.current.savedAt))try{return await this.load(s.key);}catch{}throw Error('No valid saved world is available.');}
 async export(key:string):Promise<string>{const {slot,recovered}=await this.load(key);return JSON.stringify(recovered?slot.previous:slot.current);}
 async import(text:string,key:string,name='Imported world'){if(text.length>24_000_000)throw Error('This save file is too large.');const world=await decode(JSON.parse(text));return this.save(key,world,name);}
 async trash(key:string){const db=await this.db;await new Promise<void>((resolve,reject)=>{const t=db.transaction('slots','readwrite'),s=t.objectStore('slots'),r=s.get(key);r.onsuccess=()=>{if(r.result){s.put({...r.result,key:`trash-${key}`});s.delete(key);}};t.oncomplete=()=>resolve();t.onabort=()=>reject(t.error||Error('Deletion interrupted.'));t.onerror=()=>reject(t.error);});}
 async restore(key:string){const db=await this.db;await new Promise<void>((resolve,reject)=>{const t=db.transaction('slots','readwrite'),s=t.objectStore('slots'),r=s.get(`trash-${key}`);let error:Error|undefined;
  r.onsuccess=()=>{const slot=r.result;if(!slot){error=Error('No deleted save is available for this slot.');return;}const occupied=s.get(key);occupied.onsuccess=()=>{if(occupied.result){error=Error('This slot is occupied.');return;}s.put({...slot,key});s.delete(`trash-${key}`);};};
  t.oncomplete=()=>error?reject(error):resolve();t.onabort=()=>reject(t.error||Error('Restoration interrupted.'));t.onerror=()=>reject(t.error);
 });}
 async close(){(await this.db).close();}
}
