import {describe,it,expect} from 'vitest';
import {Game} from '../src/core/game';
import {blankWorld} from '../src/world/generate';
import {stack,count} from '../src/core/inventory';
import {attack,updateCombat} from '../src/systems/combat';
import {updateAction,hurtPlayer} from '../src/systems/survival';
import {decode,envelope} from '../src/persistence/saves';

function fixture(){const g=new Game(blankWorld());g.world.nextSpawn=10000;return g;}
function fly(g:Game,seconds:number){for(let i=0;i<seconds*120;i++)updateCombat(g,1/120);}

describe('complete ranged weapon families',()=>{
 // Expected per-shot totals from the selected combat table, with all pellets
 // connecting at close range. Only one loaded round may be spent by each trigger.
 for(const [id,damage,capacity] of [
  ['nail_gun',6,100],['bow',40,1],['crossbow',50,1],['9mm',28,20],
  ['desert_eagle',40,7],['mp5',18,30],['ak47',30,30],['sniper',90,10],
  ['shotgun',105,8],['sawed_off',140,8],['laser_pistol',55,12],
  ['laser_submachine',45,30],['laser_sniper',100,10]
 ] as const)it(`${id} applies its shot and spends exactly one round`,()=>{
  const g=fixture(),gun=stack(g.world,id);gun.loaded=capacity;g.player.inventory[0]=gun;g.player.selected=0;
  const target=g.create('armored_ghoul',g.player.x+45,g.player.y);attack(g);fly(g,.5);
  expect(target.hp).toBe(800-damage);expect(gun.loaded).toBe(capacity-1);expect(g.world.projectiles).toHaveLength(0);
 });
 it('does not fire an empty weapon or acquire ammunition from nowhere',()=>{
  const g=fixture();g.player.inventory[0]=stack(g.world,'laser_sniper');g.player.selected=0;attack(g);
  expect(g.world.projectiles).toHaveLength(0);expect(g.player.action).toBeNull();expect(g.player.inventory[0]?.loaded).toBe(0);
 });
});

describe('timed and proximity explosives',()=>{
 it('preserves a half-burned dynamite fuse through save/load and detonates once',async()=>{
  const g=fixture(),charge=g.create('dynamite',2000,2000,g.player.owner),wall=g.create('wood_wall',2000,2000);
  fly(g,2);const loaded=new Game(await decode(await envelope(g.world))),savedCharge=loaded.byId.get(charge.id)!,savedWall=loaded.byId.get(wall.id)!;
  fly(loaded,2.9);expect(savedCharge.active).toBe(true);expect(savedWall.hp).toBe(savedWall.maxHp);
  fly(loaded,.2);expect(savedCharge.active).toBe(false);expect(savedWall.maxHp-savedWall.hp).toBeCloseTo(1400);
  const hp=savedWall.hp;fly(loaded,2);expect(savedWall.hp).toBe(hp);
 });
 it('ignores its owner until another actor triggers a landmine, then damages the owner too',()=>{
  const g=fixture(),mine=g.create('landmine',g.player.x,g.player.y,g.player.owner);fly(g,.2);expect(mine.active).toBe(true);expect(g.player.hp).toBe(255);
  const enemy=g.create('normal_ghoul',g.player.x,g.player.y);fly(g,.1);expect(mine.active).toBe(false);expect(enemy.active).toBe(false);expect(g.player.hp).toBe(55);
 });
 it('commits one thrown grenade, stops it at a wall and waits for its fuse',()=>{
  const g=fixture();g.player.inventory[0]=stack(g.world,'grenade',2);g.player.selected=0;const wall=g.create('wood_wall',g.player.x+400,g.player.y);
  attack(g);updateAction(g,.44);expect(count(g.player.inventory,'grenade')).toBe(2);expect(g.world.projectiles).toHaveLength(0);
  updateAction(g,.02);expect(count(g.player.inventory,'grenade')).toBe(1);fly(g,2.5);expect(g.world.projectiles).toHaveLength(1);expect(wall.maxHp-wall.hp).toBe(15);
  fly(g,.4);expect(g.world.projectiles).toHaveLength(0);expect(wall.maxHp-wall.hp).toBeGreaterThan(600);expect(g.player.hp).toBe(255);
 });
});

describe('documented armor secondary protections',()=>{
 for(const [id,kind]of [['swat_suit','melee'],['gladiator_helmet','ballistic'],['gladiator_helmet','explosive'],['power_armor','melee'],['power_armor','ballistic'],['power_armor','explosive']] as const)it(`${id} also protects against ${kind}`,()=>{
  const g=fixture();g.player.equipped=stack(g.world,id);hurtPlayer(g,100,kind,'Controlled hit');expect(g.player.hp).toBeGreaterThan(155);expect(g.player.hp).toBeLessThan(255);
  const hp=g.player.hp;hurtPlayer(g,10,'environment','Freezing');expect(g.player.hp).toBe(hp-10);
 });
});
