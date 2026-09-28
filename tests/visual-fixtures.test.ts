import fs from 'node:fs';
import {it,expect} from 'vitest';
import {Game} from '../src/core/game';
import {blankWorld} from '../src/world/generate';
import {envelope,decode} from '../src/persistence/saves';
import {stack} from '../src/core/inventory';
import {DATA} from '../src/content';

it('writes clearly labeled controlled saves for in-game visual review',async()=>{
 const furniture=['bed','bed','bunker_bed','sofa','sofa','sofa','sofa','sofa','table','table','computer','big_computer','safe','sink','toilet','television','office_computer','wood_chest','fridge'];
 const groups:Record<string,string[]>={furniture,stations:['workbench','research_bench','tesla_bench','campfire','firepit','smelter','weaving_machine','welding_machine','compost','agitator','extractor','feeder']};
 fs.mkdirSync('artifacts/visual',{recursive:true});
 for(const [name,items]of Object.entries(groups)){
  const g=new Game(blankWorld(`visual-${name}`,`CONTROLLED VISUAL REVIEW — ${name}`));g.world.nextSpawn=10000;g.player.x=1056;g.player.y=4128;
  const columns=name==='stations'?4:6,spacing=name==='stations'?240:128;
  for(let y=6;y<=11;y++)for(let x=10;x<=22;x++)g.create('wood_floor',x*64+32,3500+y*64);
  items.forEach((id,i)=>{const e=g.create(id,1056-(columns-1)*spacing/2+(i%columns)*spacing,3910+Math.floor(i/columns)*128);e.variation=id==='sofa'?i-3:id==='bed'?i:id==='table'?i-8:0;});
  g.player.inventory=[stack(g.world,'hammer',1),stack(g.world,'orange',10),...Array(4).fill(null)];
  const data=await envelope(g.world);expect((await decode(data)).name).toBe(g.world.name);fs.writeFileSync(`artifacts/visual/${name}.devastsave`,JSON.stringify(data));
 }
 const g=new Game(blankWorld('final-ui','CONTROLLED UI REVIEW'));
 g.world.nextSpawn=1e8;g.world.time=100;g.player.x=4096;g.player.y=4096;g.player.level=35;g.player.xp=DATA.xp[35];g.player.points=8;g.player.hp=155;g.player.warmth=150;g.player.radiation=50;g.player.hunger=120;
 g.player.upgrades=['inventory_1','inventory_2','inventory_3','inventory_4','inventory_5','builder_1'];g.player.unlocked=DATA.recipes.map(r=>r.id);
 g.player.inventory=['bandage','radaway','lapadone','wood_wall','orange_seed','cable','nails','repair_hammer','9mm','bullet','winter_coat','grenade','wood','orange'].map(id=>stack(g.world,id,['wood_wall','cable','nails','bullet','wood','orange'].includes(id)?20:1));g.player.inventory[8]!.loaded=5;g.player.equipped=stack(g.world,'tesla_armor');
 for(let x=-5;x<=5;x++)for(let y=-4;y<=4;y++)g.create('wood_floor',4096+x*64,4096+y*64,g.player.owner);
 const chest=g.create('wood_chest',4016,4096,g.player.owner);chest.inventory[0]=stack(g.world,'stone',30);
 g.create('fridge',3936,4224,g.player.owner);const fire=g.create('firepit',4192,4160,g.player.owner);fire.fuel=30;
 const feeder=g.create('feeder',4192,4032,g.player.owner);feeder.fuel=1;const extractor=g.create('extractor',4352,4160,g.player.owner);extractor.fuel=2;extractor.selectedResource='iron';
 g.create('switch',4096,3936,g.player.owner);g.create('cable',4160,3936,g.player.owner);g.create('lamp',4224,3936,g.player.owner);
 const wall=g.create('wood_wall',4352,4032,g.player.owner);wall.hp=wall.maxHp*.5;
 fs.writeFileSync('artifacts/visual/final-ui.devastsave',JSON.stringify(await envelope(g.world)));
 g.player.hp=0;g.player.dead=true;g.player.deathCause='Controlled death-screen review';g.create('sleeping_bag',4096,4224,g.player.owner);
 fs.writeFileSync('artifacts/visual/death-ui.devastsave',JSON.stringify(await envelope(g.world)));

 const controls=new Game(blankWorld('installed-controls','CONTROLLED INSTALLED INPUT REVIEW'));
 controls.world.nextSpawn=1e8;controls.world.time=500;controls.player.x=4128;controls.player.y=4128;
 controls.player.level=35;controls.player.xp=DATA.xp[35];controls.player.points=8;controls.player.hunger=130;controls.player.warmth=200;
 controls.player.upgrades=[...g.player.upgrades];controls.player.unlocked=DATA.recipes.map(r=>r.id);controls.player.equipped=stack(controls.world,'tesla_armor');
 controls.player.inventory=[['wood_wall',20],['orange_seed',1],['repair_hammer',1],['nails',20],['wood',60],['stone',20],['iron',4],['raw_steak',1],['energy_cells',10],['gasoline',2],['bullet',30],['9mm',1],['orange',10],['grenade',1]].map(([id,n])=>stack(controls.world,String(id),Number(n)));controls.player.inventory[11]!.loaded=5;
 for(let x=-5;x<=5;x++)for(let y=-4;y<=4;y++)controls.create('wood_floor',4128+x*64,4128+y*64,controls.player.owner);
 controls.create('switch',4128,4064,controls.player.owner);controls.create('cable',4192,4064,controls.player.owner);controls.create('lamp',4256,4064,controls.player.owner);
 const repair=controls.create('wood_wall',4192,4128,controls.player.owner);repair.hp=repair.maxHp/2;
 controls.create('firepit',4064,4192,controls.player.owner).fuel=20;controls.create('feeder',4128,4224,controls.player.owner).fuel=20;
 const machine=controls.create('extractor',4256,4192,controls.player.owner);machine.fuel=2;machine.selectedResource='iron';
 controls.create('sleeping_bag',4000,4256,controls.player.owner);
 for(const name of ['interaction-ui','bag-ui']){
  if(name==='bag-ui'){controls.player.hp=0;controls.player.dead=true;controls.player.deathCause='Controlled sleeping-bag review';}
  const saved=await envelope(controls.world);expect((await decode(saved)).name).toBe(controls.world.name);fs.writeFileSync(`artifacts/visual/${name}.devastsave`,JSON.stringify(saved));
 }
});
