import fs from 'node:fs';
import {it,expect} from 'vitest';
import {Game} from '../src/core/game';
import {generateWorld} from '../src/world/generate';
import {IndustryPlaythrough} from './industry-driver';
import {envelope,decode} from '../src/persistence/saves';
it('completes ordinary first-night survival and research from two stones without grants',async()=>{
 const industry=process.env.DEVAST_ACCEPTANCE_STAGE==='industry';
 const game=new Game(industry?await decode(JSON.parse(fs.readFileSync(process.env.DEVAST_ACCEPTANCE_SAVE||'artifacts/validation/research-playthrough.devastsave','utf8'))):generateWorld('stage2-acceptance','Acceptance world'));const controller=new IndustryPlaythrough(game);let error:unknown;const checkpoints:Promise<void>[]=[];
 fs.mkdirSync('artifacts/validation',{recursive:true});const liveFile=`artifacts/validation/${industry?'industry':'first-night'}-live.json`;controller.onNote=entry=>fs.writeFileSync(liveFile,JSON.stringify({updated:new Date().toISOString(),...entry,health:game.player.hp,level:game.player.level,position:{x:game.player.x,y:game.player.y},inventory:game.player.inventory,equipped:game.player.equipped}));
 controller.checkpoint=label=>{const world=structuredClone(game.world);checkpoints.push(envelope(world).then(save=>{fs.mkdirSync('artifacts/validation/milestones',{recursive:true});fs.writeFileSync(`artifacts/validation/milestones/${label}-${Math.round(world.time)}.devastsave`,JSON.stringify(save));}));};
 try{if(industry){controller.resumeCamp();controller.note(`Loaded ordinary checkpoint at ${Math.round(game.world.time)} seconds`);if(process.env.DEVAST_ACCEPTANCE_PHASE==='tesla')controller.finishTesla();else if(process.env.DEVAST_ACCEPTANCE_PHASE==='city')controller.cityAndTesla();else controller.industry();}else{const camp=controller.camp();controller.registerCamp(camp.bench,camp.fire);controller.research();controller.surviveFirstNight(controller.fire!);}}catch(e){error=e;}
 await Promise.all(checkpoints);
 const runId=new Date().toISOString().replaceAll(':','-'),directory=`artifacts/validation/runs/${runId}`;fs.mkdirSync(directory,{recursive:true});const report=JSON.stringify({mode:'Automated ordinary game commands, accelerated wall-clock execution, unchanged 60 Hz simulation and balance. No debug grants.',seed:game.world.seed,time:game.world.time,player:game.player,trace:controller.trace,error:error instanceof Error?error.message:null},null,2),saved=JSON.stringify(await envelope(game.world));
 fs.writeFileSync(`${directory}/report.json`,report);fs.writeFileSync(`${directory}/world.devastsave`,saved);
 fs.writeFileSync(`artifacts/validation/${industry?'industry':'first-night'}-latest.json`,report);
 if(!error){fs.writeFileSync(`artifacts/validation/${industry?'industry':'first-night'}.json`,report);fs.writeFileSync(`artifacts/validation/${industry?'industry':'research'}-playthrough.devastsave`,saved);}
 if(error)throw error;expect(game.player.dead).toBe(false);expect(game.world.time).toBeGreaterThanOrEqual(960);expect(game.player.milestones).toContain('workbench');expect(game.player.milestones).toContain('campfire');expect(game.player.milestones).toContain('research_bench');
 if(industry)expect(game.player.equipped?.item).toBe('tesla_armor');
},600000);
