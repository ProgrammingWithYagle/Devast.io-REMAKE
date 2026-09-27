export type Id = string;
export type DamageKind = 'melee'|'ballistic'|'energy'|'explosive'|'environment';
export interface Vec { x:number; y:number }
export interface Stack { uid:Id; item:Id; quantity:number; freshness:number; loaded:number }
export type Inventory = (Stack|null)[];
export interface Job { id:Id; recipe:Id; remaining:number; total:number; output:number; reserved:Stack[] }
export interface Action { kind:'consume'|'reload'|'throw'; stack:Id; remaining:number; total:number; ammo?:Stack[]; aim:number }
export interface Player extends Vec {
 id:Id; owner:Id; name:string; aim:number; hp:number; hunger:number; warmth:number; energy:number; radiation:number;
 inventory:Inventory; equipped:Stack|null; selected:number; xp:number; level:number; points:number; unlocked:Id[]; upgrades:Id[];
 age:number; lastDamage:number; energyDelay:number; exhausted:boolean; cooldown:number; action:Action|null; jobs:Job[];
 effects:{ghoul:number;boost:number;withdrawal:number;poison:number}; provoked:Id[]; dead:boolean; deathCause:string;
 kills:number; distance:number; milestones:Id[]; spawn:Vec;
}
export interface AiState { mode:'wander'|'chase'|'attack'|'return'; target:Id|null; home:Vec; waypoint:Vec; nextThink:number; cooldown:number; lastSeen:number; dodge:number; path:Vec[]; retaliation?:Id|null }
export interface Entity extends Vec {
 id:Id; type:Id; kind:'resource'|'crop'|'structure'|'station'|'container'|'furniture'|'ghoul'|'robot'|'drop'|'floor'|'circuit'|'explosive';
 rotation:number; width:number; height:number; radius:number; hp:number; maxHp:number; owner:Id|null; created:number;
 active:boolean; variation:number; inventory:Inventory; outputs:Inventory; jobs:Job[];
 fuel:number; fuelLeft:number; work:number; selectedResource:Id; growAt:number; harvests:number; regenAt:number; yieldLeft:number;
 open:boolean; switchOn:boolean; signal:boolean; channels:boolean[]; timerIndex:number; timerPhase:number; color:number;
 fuse:number; activated:number; ai:AiState|null; attributed:boolean; deployment:number; contacts?:Id[]; tag?:string; pulseSeconds?:number; inputSignal?:boolean;
}
export interface Projectile extends Vec { id:Id; owner:Id; vx:number; vy:number; remaining:number; damage:number; structureDamage:number; kind:DamageKind; weapon:Id; recover:Id|null; fuse:number; hitIds:Id[] }
export interface Region { id:Id; name:string; kind:'city'|'house'|'cave'|'bunker'|'road'; x:number;y:number;width:number;height:number;radiation:number }
export interface World { schema:2; contentVersion:string; id:Id; name:string; seed:string; tick:number; time:number; nextId:number; rng:{world:number;loot:number;ai:number}; player:Player; entities:Entity[]; projectiles:Projectile[]; regions:Region[]; discovered:string[]; nextSpawn:number; autosaveClock:number }
export interface Intent { x:number;y:number;sprint:boolean;aim:number;attack:boolean }
export interface GameEvent { kind:'sound'|'message'|'hit'|'loot'|'death'|'level'|'explosion'; text?:string; x?:number;y?:number; value?:number; sound?:string; color?:string }
export interface ItemDef { id:Id;name:string;category:string;stack:number;placeable:boolean;armor:boolean;icon?:string;world?:string;pivot:number[];rotationOffset:number;damageStates?:string[];worldFrame?:number[];worldFrames?:number[][] }
export interface Recipe { id:Id;name:string;station:Id;ingredients:{item_id:Id;quantity:number}[];output_quantity:number;required_level:number;skill_points:number;craft_seconds:number;confidence:string;notes:string }
export interface Weapon { id:Id;damage:number;pellets:number;ammo:Id|null;magazine:number;rate:number;range:number;speed:number;spread:number;reload:number;energy:number;kind:DamageKind }
