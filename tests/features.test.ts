import {describe,it,expect} from 'vitest';
import {BALANCE,DATA,EXPLOSIVES,FOOD,GHOULS,ITEMS,RECIPES,STATIONS,WEAPONS,armorFor} from '../src/content';
import {Game} from '../src/core/game';
import {add,count,stack} from '../src/core/inventory';
import {blankWorld} from '../src/world/generate';
import {updateProduction} from '../src/systems/production';
import {consume,updateAction,updateSurvival,hurtPlayer} from '../src/systems/survival';
import {updateActors,findPath,pathBlocked} from '../src/systems/ai';
import {attack,updateCombat} from '../src/systems/combat';
import {decode,envelope} from '../src/persistence/saves';
const fixture=()=>{const g=new Game(blankWorld('controlled-acceptance'));g.world.nextSpawn=100000;return g;};
const give=(g:Game,id:string,n=1,loaded=0)=>{expect(add(g.player.inventory,stack(g.world,id,n,loaded))).toBe(0);};

describe('all recipes execute in their documented station context',()=>{
 for(const recipe of Object.values(RECIPES))it(recipe.id,()=>{
  const g=fixture();g.player.inventory=Array(32).fill(null);g.player.level=79;g.player.unlocked=Object.keys(RECIPES);
  for(const input of recipe.ingredients)give(g,input.item_id,input.quantity);
  const station=recipe.station==='hand'?undefined:g.create(recipe.station,g.player.x+105,g.player.y,g.player.owner);
  if(station)station.fuel=255;
  expect(g.craft(recipe.id,station)).toBe(true);
  for(let t=0;t<recipe.craft_seconds+1;t+=.1)updateProduction(g,.1);
  expect(station?.jobs||g.player.jobs).toHaveLength(0);
  expect(count(station?.outputs||g.player.inventory,recipe.id)).toBe(recipe.output_quantity);
  for(const input of recipe.ingredients)if(input.item_id!==recipe.id)expect(count(g.player.inventory,input.item_id)).toBe(0);
 });
});

describe('farming, food and late automation',()=>{
 it('allows six ripe harvests from a planted fruit bush and grows an acorn seed into a harvestable tree',()=>{
  const g=fixture(),crop=g.create('orange_seed',g.player.x+80,g.player.y,g.player.owner);
  g.harvest(crop,'fists');expect(count(g.player.inventory,'orange')).toBe(0);
  for(let i=0;i<6;i++){g.world.time=crop.growAt;g.harvest(crop,'fists');expect(count(g.player.inventory,'orange')).toBe((i+1)*3);}
  expect(crop.active).toBe(false);const tree=g.create('tree_seed',g.player.x-80,g.player.y,g.player.owner);g.world.time=tree.growAt;g.ecology(0);expect(tree.type).toBe('tree');g.harvest(tree,'hatchet');expect(count(g.player.inventory,'wood')).toBeGreaterThan(0);
 });
 it('refrigerates stored food while inventory food spoils, and leaves shaped uranium inert',()=>{
  const g=fixture();give(g,'orange',1);g.player.inventory[0]!.freshness=.5;const fridge=g.create('fridge',g.player.x+90,g.player.y,g.player.owner);fridge.inventory[0]=stack(g.world,'orange',1);fridge.inventory[0].freshness=.5;g.ecology(1);expect(g.player.inventory[0]?.item).toBe('rotten_orange');expect(fridge.inventory[0]?.freshness).toBe(.5);
  g.player.inventory.fill(null);give(g,'shaped_uranium',10);updateSurvival(g,1);expect(g.player.radiation).toBe(0);give(g,'uranium',10);updateSurvival(g,1);expect(g.player.radiation).toBeGreaterThan(0);
 });
 for(const [mineral,seconds,min,max]of [['stone',80,125,200],['iron',120,7,15],['sulfur',240,5,10],['uranium',240,3,5]] as const)it(`extracts ${mineral} with saved partial work and gasoline`,async()=>{
  const g=fixture(),e=g.create('extractor',g.player.x+100,g.player.y,g.player.owner);e.selectedResource=mineral;e.fuel=1;for(let i=0;i<seconds/2;i++)updateProduction(g,1);
  const loaded=new Game(await decode(await envelope(g.world))),copy=loaded.byId.get(e.id)!;for(let i=seconds/2;i<seconds;i++)updateProduction(loaded,1);expect(count(copy.outputs,mineral)).toBeGreaterThanOrEqual(min);expect(count(copy.outputs,mineral)).toBeLessThanOrEqual(max);expect(copy.fuel).toBe(0);expect(copy.fuelLeft).toBeGreaterThan(0);
 });
 it('feeds only in range while powered and irradiates the owner near uranium construction',()=>{
  const g=fixture(),f=g.create('feeder',g.player.x+80,g.player.y,g.player.owner);g.player.hunger=100;updateProduction(g,1);expect(g.player.hunger).toBe(100);f.fuel=1;updateProduction(g,1);expect(g.player.hunger).toBe(104);g.player.x+=400;updateProduction(g,1);expect(g.player.hunger).toBe(104);g.create('uranium_wall',g.player.x+80,g.player.y,g.player.owner);updateSurvival(g,1);expect(g.player.radiation).toBeGreaterThan(0);
 });
 it('commits medicine after its action and preserves withdrawal until antidote treatment',()=>{
  const g=fixture();g.player.hp=100;give(g,'bandage');consume(g,g.player.inventory[0]!);updateAction(g,.9);expect(g.player.hp).toBe(100);updateAction(g,.2);expect(g.player.hp).toBe(160);
  give(g,'lapadone');consume(g,g.player.inventory[0]!);updateAction(g,2);expect(g.player.effects.boost).toBe(240);g.player.effects.boost=.1;updateSurvival(g,.2);expect(g.player.effects.withdrawal).toBeGreaterThan(479);
  give(g,'antidote');consume(g,g.player.inventory[0]!);updateAction(g,2);expect(Object.values(g.player.effects).every(n=>n===0)).toBe(true);
 });
});

describe('enemy families, equipment and hazards',()=>{
 for(const def of Object.values(GHOULS))it(`${def.id} respects its age threshold and can be provoked earlier`,()=>{
  const g=fixture();g.world.time=500;g.player.age=def.hostility_after_player_minutes*60-1;const e=g.create(def.id,g.player.x+160,g.player.y);updateActors(g,.01);expect(e.ai?.target).toBeNull();g.player.age+=2;updateActors(g,.01);expect(e.ai?.target).toBe('player');g.player.effects.ghoul=100;updateActors(g,.01);expect(e.ai?.target).toBeNull();g.player.age=0;g.damageEntity(e,1,'melee',g.player.owner);updateActors(g,.01);expect(e.ai?.target).toBe('player');
 });
 for(const id of ['hal_bot','tesla_bot'])it(`${id} defends its owner against a nearby ghoul`,()=>{
  const g=fixture();g.world.time=500;const bot=g.create(id,g.player.x+250,g.player.y,g.player.owner);bot.deployment=0;const enemy=g.create('armored_ghoul',bot.x+60,bot.y);updateActors(g,.1);expect(enemy.hp).toBeLessThan(800);expect(bot.ai?.target).toBe(enemy.id);
 });
 for(const [id,kind]of [['metal_helmet','melee'],['leather_jacket','ballistic'],['power_armor','energy'],['protective_suit','explosive']] as const)it(`${id} mitigates its intended damage family`,()=>{
  const g=fixture();g.player.equipped=stack(g.world,id,1);hurtPlayer(g,100,kind,'Controlled test');expect(g.player.hp).toBeCloseTo(255-100*(1-armorFor(id)[kind]));
 });
 it('recovers a thrown spear and triggers only the owner’s remote C4',()=>{
  const g=fixture();give(g,'spear');g.player.selected=0;attack(g);updateAction(g,2.1);expect(count(g.player.inventory,'spear')).toBe(0);for(let i=0;i<200;i++)updateCombat(g,.02);expect(g.world.entities.some(e=>e.active&&e.kind==='drop'&&e.type==='spear')).toBe(true);
  const own=g.create('c4',5000,5000,g.player.owner),other=g.create('c4',6000,6000,'other');give(g,'c4_trigger');g.player.selected=0;g.useSelected();expect(own.active).toBe(false);expect(other.active).toBe(true);
 });
 it('finds a route when a rock intersects the segment between two otherwise free grid centers',()=>{
  const g=fixture();g.create('stone_node',1170,4030);const from={x:1120,y:4054},to={x:1120,y:3968};const path=findPath(g,from,to,20);expect(path.length).toBeGreaterThan(1);let previous=from;for(const p of path){expect(pathBlocked(g,previous,p,20)).toBe(false);previous=p;}
 });
 it('escapes a valid narrow passage between a wide research bench and a campfire',()=>{
  const g=fixture(),from={x:1202.79,y:4130.23},to={x:1091,y:4327};g.create('workbench',1120,4128);g.create('campfire',1248,4064);g.create('research_bench',1184,4192);for(let y=3808;y<=4128;y+=64)g.create('stone_wall',1312,y);
  // The 24-pixel channel for the actor centre at x=1184 is a real exit.
  // Adding a rock at (1170,4030) seals it and correctly makes this layout impassable.
  expect(pathBlocked(g,from,{x:1184,y:4130},20)).toBe(false);
  expect(pathBlocked(g,{x:1184,y:4130},{x:1184,y:3968},20)).toBe(false);
  const path=findPath(g,from,to,20);expect(path.length).toBeGreaterThan(0);let previous=from;for(const point of path){expect(pathBlocked(g,previous,point,20)).toBe(false);previous=point;}expect(path.at(-1)).toEqual(to);
 });
});
