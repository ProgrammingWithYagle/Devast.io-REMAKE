import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve(process.argv[2] || process.env.DEVAST_STAGE1 || '../stage1');
const read = name => JSON.parse(fs.readFileSync(path.join(root, 'data', `${name}.json`), 'utf8'));
const names = ['recipes','combat','food','survival_baseline','ghouls','upgrades','stations','construction','circuits','xp_thresholds','respawn_kits','furniture_salvage','latest_feature_gaps','feature_matrix','uncertainties','gathered_inputs'];
fs.mkdirSync('research', { recursive: true });
fs.mkdirSync('src/content/generated', { recursive: true });
for (const name of names) fs.copyFileSync(path.join(root, 'data', `${name}.json`), `research/${name}.json`);
const sourceManifest = JSON.parse(fs.readFileSync(path.join(root, 'assets/manifest.json'), 'utf8'));
const copied = new Map();
function asset(filename, origin) {
  const a = sourceManifest.find(x => x.name.toLowerCase() === filename.toLowerCase() && (!origin || x.origin === origin));
  if (!a) return undefined;
  const rel = a.path.replace(/^assets\//, '');
  const target = path.join('public/assets', rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (!copied.has(a.asset_id)) {
    fs.copyFileSync(path.join(root, a.path), target);
    const hash = crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex');
    if (hash !== a.sha256) throw Error(`Hash mismatch: ${a.path}`);
    copied.set(a.asset_id, a);
  }
  return `assets/${rel}`;
}

const worlds = {
  tree:'Tree1.png',stone_node:'Rock1.png',iron_node:'Iron Stone.png',uranium_node:'Uarium Rock.png',
  boar:'Boar.png',deer:'Deer.png',workbench:'Workbench.png',research_bench:'Research-Bench.png',
  tesla_bench:'day-workbench3.png',firepit:'Firepit.png',campfire:'Campfire.png',smelter:'Smelter day is of - Copy.png',
  agitator:'Day-agitator1-off.png',extractor:'Day-extractor-off.png',feeder:'Day-feeder-off.png',compost:'Day-composter.png',
  normal_ghoul:'day-ghoul.png',fast_ghoul:'day-ghoul3.png',explosive_ghoul:'day-ghoul4.png',radioactive_ghoul:'day-ghoul2.png',armored_ghoul:'day-ghoul1.png',
  lapabot:'day-lapabot.png',hal_bot:'day-ground-hal-bot.png',tesla_bot:'day-ground-tesla-bot.png',
  wood_wall:'day-wood-wall0.png',stone_wall:'day-stone-wall0.png',metal_wall:'day-steel-wall0.png',
  wood_low_wall:'day-wood-smallwalls-0.png',stone_low_wall:'day-stone-smallwalls-0.png',metal_low_wall:'day-steel-smallwalls-0.png',
  wood_door:'day-wood-door.png',stone_door:'day-stone-door.png',metal_door:'day-steel-door.png',
  wood_low_door:'day-wood-door.png',stone_low_door:'day-stone-door.png',metal_low_door:'day-steel-door.png',
  wood_floor:'day-wood-floor-0.png',light_wood_floor:'day-ground-wood-floor-light.png',
  automatic_door:'day-ground-automatic-door.png',cable_wall:'day-ground-cable_wall.png',
  uranium_wall:'day-ground-uranium-wall.png',uranium_door:'day-ground-uranium-door.png',
  red_barrel:'Day-barel0.png',green_barrel:'Day-barel1.png',
  rare_flower:'day-ground-antidote-flower.png',orange:'Orange.png',tomato:'Tomato.png',
  wood:'Wood-ground.png',stone:'Stone-ground.png',raw_steak:'Nav food.png',cooked_steak:'Cooked Steak.png',
  bed:'Bed.png',bunker_bed:'BunkerBed.png',sofa:'Sofa.png',table:'Table.png',wood_chest:'day-ground-chest.png',
  computer:'SmallComputer.png',office_computer:'TVandPC.png',television:'TVandPC.png',big_computer:'BigComputer.png',safe:'Safe.png',sink:'SinkKitchen.png',toilet:'WC.png',
  orange_seed:'Day-Orange Seed.png',tomato_seed:'day-ground-seed-tomato.png',tree_seed:'day-ground-seed-tree.png',energy_cells:'day-ground-small-energy-cells.png',
  boletus:'Day-ground-Boletus.png',amanita:'Day-ground-Amanita.png',russula:'Day-ground-Russula.png',
};
const aliases = {
 hatchet:'Hachet',stone_pickaxe:'Inv-stone-pickaxe-out',metal_axe:'Inv-steel-axe-out',metal_pickaxe:'Inv-steel-pickaxe-out',
 animal_tendon:'Animal-tendon',animal_fat:'Inv-animal-fat-in',leather:'Leather-boar',electronic_parts:'Electronic-Parts',
 energy_cells:'Small-energy-cells-0',big_wires:'Inv-big-wire-in',wooden_arrow:'Arrow',crossbow_arrow:'Wood-crossarrow',
 bullet:'Bullet-9mm',heavy_bullet:'Bullet-sniper',cartridge:'Bullet-shotgun',shaped_metal:'Shaped Metal',
 winter_coat:'Coat',radiation_mask:'Gaz-mask',min_radiation_suit:'Gaz-protection',radiation_suit:'Radiation-suit',
 power_armor:'Tesla',sawed_off:'Inv-sawed-off-shotgun-in',wood_chest:'Chest',weaving_machine:'Weaving-machine',
 c4_trigger:'Inv-joystick-in',lapadone:'Inv-lapadoine-in',rare_flower:'day-ground-antidote-flower',
 cable:'day-ground-wire0',cable_corner:'day-ground-wire1',cable_t:'day-ground-wire2',cable_cross:'day-ground-wire3',
 cable_bridge:'day-ground-wire4',or_gate:'day-ground-switch-or',and_gate:'day-ground-switch-and',not_gate:'day-ground-switch-reverse',xor_gate:'day-ground-xor',
  pressure_platform:'day-ground-platform',lamp:'day-ground-lamp-white',switch:'day-ground-switch',timer:'day-ground-timer',
 gate_or:'day-ground-switch-or',gate_and:'day-ground-switch-and',gate_not:'day-ground-switch-reverse',gate_xor:'day-ground-xor',gate_timer:'day-ground-timer',platform:'day-ground-platform',
 big_wires:'day-ground-wires',iron:'Inv-iron-in',metal_axe:'Inv-steel-axe-out',golden_floor:'Inv-mustard-floor-in',wooden_spike:'Wood-spike',camouflage_gear:'day-camouflage-gear',medkit:'Inv-medikit-in',crisps:'day-ground-chips',expired_crisps:'Rotten-crisps',
 compost:'day-ground-composter',tesla_bench:'day-workbench3',wood_spike:'Wood-spike',
};
const raw = read('recipes').recipes;
for (const [id,amount,metal,level] of [['uranium_wall',3,2,16],['uranium_door',6,4,16]]) raw.push({id,name:id==='uranium_wall'?'Uranium Wall':'Uranium Door',station:'tesla_bench',ingredients:[{item_id:'shaped_uranium',quantity:amount},{item_id:'shaped_metal',quantity:metal}],output_quantity:1,required_level:level,skill_points:1,craft_seconds:12,confidence:'provisional_stage2_recipe',notes:'Official v0.32 presence, Tesla crafting and owner radiation. Ingredients, level, cost and time are explicit unmeasured working choices.'});
const construction = new Set(read('construction').map(x=>x.id));
const stationIds = new Set(read('stations').map(x=>x.id));
const armorIds = new Set(['headscarf','chapka','winter_coat','radiation_mask','min_radiation_suit','radiation_suit','leather_jacket','kevlar_suit','swat_suit','protective_suit','camouflage_gear','metal_helmet','welding_helmet','gladiator_helmet','power_armor','tesla_armor']);
const medicine = new Set(['bandage','medkit','syringe','radaway','ghoul_drug','lapadone','antidote']);
const circuitIds = new Set(raw.filter(x=>x.station === 'welding_machine').map(x=>x.id));
const materials = new Set(['string','shaped_metal','shaped_uranium','alloys','gasoline','rotten_orange','nails','energy_cells','wooden_arrow','crossbow_arrow','bullet','heavy_bullet','cartridge','can','syringe']);
const combat = read('combat');
const foods = read('food');
const foodIds = new Set(foods.map(x=>x.id));
const ids = new Set([...raw.flatMap(x=>[x.id,...x.ingredients.map(y=>y.item_id)]),...foodIds,...Object.keys(worlds),...combat.map(x=>x.id),'sulfur_node','orange_bush','tomato_bush','crate','cupboard','vending_machine','garbage','cave_wall','cave_floor']);
for(const r of read('respawn_kits').kits) Object.keys(r.items).forEach(id=>ids.add(id));
const assetMap = {};
for (const id of ids) {
 const kebab = id.replaceAll('_','-');
 const icon = asset(`${aliases[id]}.png`) || asset(`Inv-${kebab}-in.png`) || asset(`Inv-${kebab}-out.png`) || asset(`${kebab}.png`) || asset(`${id.replaceAll('_',' ')}.png`);
 const world = worlds[id] ? asset(worlds[id]) : asset(`day-ground-${kebab}.png`, 'official_changelog');
 assetMap[id] = {icon:icon || world,world,pivot:[0.5,0.5],rotationOffset:0,review:'Stage 1 contact sheets + filename role review; runtime review pending'};
}
for (const family of ['wood','stone','metal']) {
 const prefix = family==='metal'?'steel':family;
 for(const kind of ['wall','door','floor']) for(let i=0;i<3;i++) {
  const role = asset(`day-${prefix}-${kind}-broken${i}.png`, 'official_changelog');
  if(role) (assetMap[`${family}_${kind}`].damageStates ||= []).push(role);
 }
}
const levelDefault = {hand:0,workbench:2,weaving_machine:3,research_bench:8,smelter:10,tesla_bench:14,welding_machine:4,agitator:8,compost:6,campfire:0,firepit:0};
if(fs.existsSync('research/asset-overrides.json'))for(const [id,override] of Object.entries(JSON.parse(fs.readFileSync('research/asset-overrides.json','utf8')))){if(!assetMap[id])throw Error(`Unknown asset override ${id}`);Object.assign(assetMap[id],override);}
const choices=[];
const officialOverrides=JSON.parse(fs.readFileSync('research/official-overrides.json','utf8')).recipes;
const recipes = raw.map(r=>{
 const c = {...r};
 const override=officialOverrides.find(o=>o.id===c.id);if(override){Object.assign(c,override.values);c.notes=[c.notes,override.reason].filter(Boolean).join(' ');}
 if (c.ingredients.some(x=>x.quantity === null)) {
   c.ingredients = c.id === 'uranium_wall' ? [{item_id:'shaped_uranium',quantity:3},{item_id:'shaped_metal',quantity:2}] : [{item_id:'shaped_uranium',quantity:6},{item_id:'shaped_metal',quantity:4}];
   choices.push({id:c.id,field:'ingredients',value:c.ingredients,basis:'Provisional v0.32 Tesla construction; weaker than metal. No verified recipe.'});
 }
 for(const [key,value] of Object.entries({required_level:materials.has(c.id)?0:levelDefault[c.station]??6, skill_points:materials.has(c.id)||foodIds.has(c.id)||c.id.endsWith('_seed')?0:1,
   craft_seconds:c.id==='hatchet'?2:c.id==='campfire'?5:construction.has(c.id)?2:materials.has(c.id)?8:stationIds.has(c.id)?20:armorIds.has(c.id)?25:10})) {
  if(c[key] === null){c[key]=value;choices.push({id:c.id,field:key,value,basis:'Explicit Stage 2 working balance; original value unmeasured.'});}
 }
 return c;
});
const items = [...ids].map(id=>{
 let category=materials.has(id)?'Materials':foodIds.has(id)?'Food':armorIds.has(id)?'Clothing':medicine.has(id)?'Medicine':circuitIds.has(id)?'Circuits':stationIds.has(id)?'Stations':construction.has(id)?'Building':combat.some(x=>x.id===id)?'Weapons':['lapabot','hal_bot','tesla_bot'].includes(id)?'Robots':id.endsWith('_seed')?'Farming':['wood_chest','fridge','sleeping_bag','wooden_spike','wood_spike','landmine','dynamite','c4'].includes(id)?'Building':'Materials';
 return {id,name:raw.find(x=>x.id===id)?.name||id.replaceAll('_',' ').replace(/\b\w/g,x=>x.toUpperCase()),category,
 stack:id==='tree_seed'?100:id==='tomato_soup'?5:['raw_steak','cooked_steak','rotten_steak'].includes(id)?10:foodIds.has(id)?20:armorIds.has(id)||combat.some(x=>x.id===id&&x.id!=='spear')||stationIds.has(id)||category==='Robots'?1:255,
 placeable:stationIds.has(id)&&id!=='hand'||construction.has(id)||circuitIds.has(id)||category==='Robots'||id.endsWith('_seed')||['wood_chest','fridge','sleeping_bag','wooden_spike','wood_spike','landmine','dynamite','c4'].includes(id),
 armor:armorIds.has(id),...assetMap[id]};
});
const audio={};
for(const a of sourceManifest.filter(a=>a.origin==='official_audio'))audio[a.name.replace('.mp3','')]=asset(a.name,'official_audio');
audio.geiger=asset('Geiger.mp3');
audio.music=sourceManifest.filter(a=>a.origin==='artist_soundtrack'&&a.name.endsWith('.mp3')).map(a=>asset(a.name,'artist_soundtrack'));
asset('Licence Copyright.txt','artist_soundtrack');
fs.writeFileSync('src/content/generated/content.json',JSON.stringify({items,recipes,combat,foods,ghouls:read('ghouls'),stations:read('stations'),construction:read('construction'),upgrades:read('upgrades'),xp:read('xp_thresholds').map(x=>x.listed_total_xp),respawn:read('respawn_kits').kits,assets:assetMap,audio},null,2));
fs.writeFileSync('research/working-choices.json',JSON.stringify(choices,null,2));
fs.writeFileSync('public/asset-provenance.json',JSON.stringify([...copied.values()],null,2));
fs.writeFileSync('research/asset-map.json',JSON.stringify(assetMap,null,2));
console.log(`Imported ${items.length} items, ${recipes.length} recipes, ${copied.size} original assets; ${choices.length} explicit field choices.`);
