import raw from './generated/content.json';
import type { ItemDef,Recipe,Weapon,DamageKind } from '../core/model';
export const VERSION='0.2.0';
export const DATA=raw;
export const ITEMS=Object.fromEntries((raw.items as ItemDef[]).map(x=>[x.id,x]));
export const RECIPES=Object.fromEntries((raw.recipes as Recipe[]).map(x=>[x.id,x]));
export const STATIONS=Object.fromEntries(raw.stations.map(x=>[x.id,x]));
export const STRUCTURES=Object.fromEntries(raw.construction.map(x=>[x.id,x]));
export const FOOD=Object.fromEntries(raw.foods.map(x=>[x.id,x]));
export const GHOULS=Object.fromEntries(raw.ghouls.map(x=>[x.id,x]));
export const CIRCUIT_IDS=new Set(raw.recipes.filter(x=>x.station==='welding_machine').map(x=>x.id));
export const ROBOTS=new Set(['lapabot','hal_bot','tesla_bot']);
export const EXPLOSIVES:Record<string,{actor:number;structure:number;radius:number;fuse:number}>={
 landmine:{actor:200,structure:400,radius:125,fuse:-1},dynamite:{actor:180,structure:1400,radius:165,fuse:5},c4:{actor:255,structure:6000,radius:205,fuse:-1},
 grenade:{actor:120,structure:800,radius:135,fuse:2.8},red_barrel:{actor:240,structure:900,radius:170,fuse:-1},green_barrel:{actor:300,structure:1500,radius:210,fuse:-1},
 explosive_ghoul:{actor:120,structure:1200,radius:140,fuse:-1},tesla_bot:{actor:180,structure:2000,radius:165,fuse:-1}
};
// Every unmeasured constant in this block is an explicit remake working choice. See docs/DIFFERENCES.md.
export const BALANCE={
 step:1/60,tile:64,worldSize:8192,playerRadius:20,walkSpeed:155,sprintMultiplier:1.65,
 maxGauge:255,daySeconds:480,nightSeconds:480,hungerLoss:1.2,nightCold:3.5,fireWarmth:5,dayWarmth:5,
 sprintCost:28,energyRecovery:14,energyDelay:0.55,regenDelay:10,regen:1.5,starveDamage:3,coldDamage:4,
 radiationThreshold:180,radiationDamage:5,radiationDecay:2,radiationCity:8,fireRadius:125,lampRadius:210,
 initialSlots:6,interactRange:115,meleeReach:90,woodFuelSeconds:480/35,gasolineSeconds:120,extractorFuelSeconds:480,cellSeconds:30,feederCellSeconds:28800/255,
 campfireLifetime:960,fruitGrowth:180,fruitHarvests:6,treeGrowth:300,resourceRegrowth:960,lootRefill:1920,
 foodLifetime:720,soupLifetime:2400,rawMeatLifetime:480,groundLifetime:1920,autosaveSeconds:120,
 ghoulSpeeds:{normal_ghoul:160,fast_ghoul:215,explosive_ghoul:145,radioactive_ghoul:150,armored_ghoul:90} as Record<string,number>,
 timerPeriods:[8,4,2,1],armoredStructureMultiplier:12,ghoulStructureMultiplier:4,
 feederRate:4,feederRadius:128,uraniumWallHP:10000,uraniumDoorHP:8500,uraniumRadius:180,uraniumIntensity:6,
 unmeasuredFoodHunger:5,unmeasuredFoodEnergy:2,spikeSpeedMultiplier:.45,trapAvoidChance:.7,spikeLifetime:20,
 robotDeploymentSeconds:8,lapabotDamage:12
};
export const WEAPONS:Record<string,Weapon>=Object.fromEntries(raw.combat.map(w=>{
 const ranged=w.magazine!==null; const laser=w.id.startsWith('laser'); const shotgun=['shotgun','sawed_off'].includes(w.id);
 return [w.id,{id:w.id,damage:w.damage_per_projectile_or_hit,pellets:w.pellets_per_shot,ammo:w.ammo,magazine:w.magazine??0,
 rate:w.shots_or_hits_per_second??(w.id==='fists'?2:w.id==='spear'?0.5:1.25),range:ranged?(w.id==='sawed_off'?350:shotgun?550:w.id.includes('sniper')?1400:900):BALANCE.meleeReach,
 speed:laser?1400:w.id==='spear'?420:['bow','crossbow'].includes(w.id)?600:1050,spread:shotgun?0.24:0.018,reload:w.id==='bow'?1.25:w.id==='crossbow'?2.2:w.id.includes('sniper')?3:2,
 energy:ranged?(w.id==='crossbow'?30:2):w.id==='fists'?1:4,kind:(laser?'energy':ranged?'ballistic':'melee') as DamageKind}];
}));
export interface Armor { melee:number;ballistic:number;energy:number;explosive:number;warmth:number;radiation:number;speed:number }
const baseArmor:Armor={melee:0,ballistic:0,energy:0,explosive:0,warmth:0,radiation:0,speed:1};
const armorChoices:Record<string,Partial<Armor>>={
 metal_helmet:{melee:.2},welding_helmet:{melee:.4,speed:.96},gladiator_helmet:{melee:.6,ballistic:.15,explosive:.2,speed:.92},
 leather_jacket:{ballistic:.25,warmth:.5},kevlar_suit:{ballistic:.45,speed:.95},swat_suit:{ballistic:.75,melee:.2,speed:.85},
 protective_suit:{explosive:.8,warmth:.5,speed:.85},power_armor:{energy:.45,melee:.1,ballistic:.1,explosive:.2,warmth:.5,radiation:.2},tesla_armor:{energy:.8,melee:.2,ballistic:.25,explosive:.5,warmth:1.1,radiation:.4,speed:.92},
 headscarf:{warmth:1},chapka:{warmth:2},winter_coat:{warmth:3.5},radiation_mask:{radiation:.5},min_radiation_suit:{radiation:.75,speed:.95},radiation_suit:{radiation:.92,speed:.9},camouflage_gear:{}
};
export const armorFor=(id?:string):Armor=>({...baseArmor,...(id?armorChoices[id]:{})});
export function shelfLife(id:string):number { return id.startsWith('rotten')?-1:id==='tomato_soup'?BALANCE.soupLifetime:id==='raw_steak'?BALANCE.rawMeatLifetime:FOOD[id]?BALANCE.foodLifetime:-1; }
export function label(id:string):string{return ITEMS[id]?.name||id.replaceAll('_',' ');}
