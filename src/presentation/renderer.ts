import { BALANCE,DATA,ITEMS,WEAPONS } from '../content';
import type { Game } from '../core/game';
import type { Entity,GameEvent,Vec } from '../core/model';
import { clamp,distance,entityRect } from '../core/math';
import { blocksSight } from '../world/entities';
import { drawHeld,drawOutfit } from './equipment';
import { inputPorts,outputPorts } from '../systems/circuits';
import type { Settings } from './audio';

interface Fx {x:number;y:number;life:number;total:number;text:string;color:string;radius:number}
export class Renderer {
 ctx:CanvasRenderingContext2D;images=new Map<string,HTMLImageElement>();width=0;height=0;zoom=1;camera={x:0,y:0};fx:Fx[]=[];hover:Entity|null=null;occlusion=true;
 preview:{type:string;x:number;y:number;rotation:number;ok:boolean}|null=null;private light=document.createElement('canvas');private frame=0;private last=0;
 constructor(readonly canvas:HTMLCanvasElement,public settings:Settings){this.ctx=canvas.getContext('2d',{alpha:false})!;this.resize();}
 async load(){const paths=new Set<string>();for(const i of DATA.items){if(i.icon)paths.add(i.icon);if(i.world)paths.add(i.world);const states=(i as {damageStates?:string[]}).damageStates;if(states)for(const p of states)paths.add(p);}await Promise.all([...paths].map(path=>new Promise<void>(resolve=>{const i=new Image();i.onload=()=>{this.images.set(path,i);resolve();};i.onerror=()=>resolve();i.src=path;})));}
 resize(width=window.innerWidth,height=window.innerHeight){const scale=Math.min(2,window.devicePixelRatio||1)*this.settings.quality;this.width=width;this.height=height;this.canvas.width=Math.round(this.width*scale);this.canvas.height=Math.round(this.height*scale);this.canvas.style.width=`${this.width}px`;this.canvas.style.height=`${this.height}px`;this.light.width=this.canvas.width;this.light.height=this.canvas.height;}
 screenToWorld(x:number,y:number):Vec{return {x:(x-this.width/2)/this.zoom+this.camera.x,y:(y-this.height/2)/this.zoom+this.camera.y};}
 image(path:string|undefined,x:number,y:number,width:number,height=width,angle=0,alpha=1,frame?:number[]){const image=path?this.images.get(path):null;if(!image)return false;const c=this.ctx;c.save();c.translate(x,y);c.rotate(angle);c.globalAlpha*=alpha;if(frame)c.drawImage(image,frame[0],frame[1],frame[2],frame[3],-width/2,-height/2,width,height);else c.drawImage(image,-width/2,-height/2,width,height);c.restore();return true;}
 event(e:GameEvent){if(e.x===undefined||e.y===undefined||!this.settings.particles)return;if(e.kind==='hit'||e.kind==='explosion')this.fx.push({x:e.x,y:e.y,life:e.kind==='explosion'?.55:.75,total:e.kind==='explosion'?.55:.75,text:e.kind==='hit'?`${e.value}`:'',color:e.color||'#ffc460',radius:e.kind==='explosion'?e.value||120:0});}
 draw(game:Game,now:number,menu=false){const c=this.ctx,w=game.world,p=game.player,dt=Math.min(.05,(now-this.last)/1000||0);this.last=now;this.frame++;this.zoom=this.settings.zoom;this.camera={x:p.x,y:p.y};const scale=this.canvas.width/this.width;
  c.setTransform(scale,0,0,scale,0,0);c.fillStyle='#46674e';c.fillRect(0,0,this.width,this.height);c.translate(this.width/2,this.height/2);c.scale(this.zoom,this.zoom);c.translate(-p.x,-p.y);
  const rx=this.width/2/this.zoom,ry=this.height/2/this.zoom;const view=game.near(p,Math.hypot(rx,ry)+200).filter(e=>Math.abs(e.x-p.x)<rx+e.width+150&&Math.abs(e.y-p.y)<ry+e.height+150);
  this.terrain(game,p.x-rx,p.y-ry,rx*2,ry*2);
  for(const e of view)if(e.kind==='floor')this.entity(e,game);
  for(const e of view)if(!['floor','ghoul','robot'].includes(e.kind)&&e.type!=='tree')this.entity(e,game);
  for(const e of view)if(e.kind==='ghoul'||e.kind==='robot')this.entity(e,game);
  this.player(game);
  for(const e of view)if(e.type==='tree')this.entity(e,game);
  for(const b of w.projectiles){c.strokeStyle=b.kind==='energy'?'#b2ffc8':b.weapon==='spear'?'#ad976d':'#f1db80';c.lineWidth=b.weapon==='spear'?5:3;c.beginPath();const speed=Math.hypot(b.vx,b.vy)||1;c.moveTo(b.x-b.vx/speed*(b.weapon==='spear'?40:16),b.y-b.vy/speed*(b.weapon==='spear'?40:16));c.lineTo(b.x,b.y);c.stroke();}
  if(this.preview){const q=this.preview,e={...createVisual(q.type,q.x,q.y),rotation:q.rotation};c.save();c.globalAlpha=.65;this.entity(e,game);c.strokeStyle=q.ok?'#a8d976':'#ef6452';c.lineWidth=3;c.setLineDash([7,4]);const r=entityRect(e);c.strokeRect(r.x-r.width/2,r.y-r.height/2,r.width,r.height);c.restore();}
  for(const f of this.fx){f.life-=dt;if(f.radius){const k=1-f.life/f.total;c.globalAlpha=f.life/f.total*.7;c.fillStyle='#ffc154';c.beginPath();c.arc(f.x,f.y,f.radius*k,0,Math.PI*2);c.fill();c.strokeStyle='#fff2a2';c.lineWidth=4;c.stroke();c.globalAlpha=1;}else{c.font='bold 16px Trebuchet MS';c.textAlign='center';c.lineWidth=3;c.strokeStyle='#17241c';c.fillStyle=f.color;c.strokeText(f.text,f.x,f.y-30-(1-f.life/f.total)*35);c.fillText(f.text,f.x,f.y-30-(1-f.life/f.total)*35);}}
  this.fx=this.fx.filter(f=>f.life>0);
  if(this.hover&&!menu&&this.hover.active){const e=this.hover;c.font='bold 12px Trebuchet MS';c.textAlign='center';c.fillStyle='#111c17dd';const name=ITEMS[e.type]?.name||e.type;const length=c.measureText(name).width;c.fillRect(e.x-length/2-10,e.y-e.height/2-37,length+20,24);c.fillStyle='#eee4c6';c.fillText(name,e.x,e.y-e.height/2-20);if(e.hp<e.maxHp){c.fillStyle='#172018';c.fillRect(e.x-30,e.y-e.height/2-9,60,5);c.fillStyle='#ddaa52';c.fillRect(e.x-30,e.y-e.height/2-9,60*e.hp/e.maxHp,5);}}
  c.setTransform(scale,0,0,scale,0,0);this.lighting(game,view);
  if(p.effects.poison>0){c.fillStyle='#a663a517';c.fillRect(0,0,this.width,this.height);}
  if(p.hp<70&&!menu){const g=c.createRadialGradient(this.width/2,this.height/2,this.height*.2,this.width/2,this.height/2,this.height*.8);g.addColorStop(0,'#60000000');g.addColorStop(1,'#800f0f66');c.fillStyle=g;c.fillRect(0,0,this.width,this.height);}
  if(menu){c.fillStyle='#08150da3';c.fillRect(0,0,this.width,this.height);}
 }
 private terrain(game:Game,x:number,y:number,width:number,height:number){const c=this.ctx;
  for(let tx=Math.floor(x/128);tx<=Math.ceil((x+width)/128);tx++)for(let ty=Math.floor(y/128);ty<=Math.ceil((y+height)/128);ty++){
   const hash=((tx*73856093)^(ty*19349663))>>>0;c.fillStyle=hash%3===0?'#4c6b501c':'#35544025';const xx=tx*128+(hash%93),yy=ty*128+((hash>>>8)%93);c.beginPath();c.ellipse(xx,yy,15+hash%30,7+(hash>>>10)%20,hash,0,Math.PI*2);c.fill();
   c.strokeStyle='#355541';c.lineWidth=1;c.beginPath();c.moveTo(xx+40,yy);c.lineTo(xx+38,yy-5);c.moveTo(xx+40,yy);c.lineTo(xx+43,yy-7);c.stroke();
  }
  for(const r of game.world.regions)if(r.kind==='road'){c.fillStyle='#424741';c.fillRect(r.x,r.y,r.width,r.height);c.strokeStyle='#8d937754';c.lineWidth=2;c.setLineDash([18,32]);c.beginPath();if(r.width>r.height){c.moveTo(r.x,r.y+r.height/2);c.lineTo(r.x+r.width,r.y+r.height/2);}else{c.moveTo(r.x+r.width/2,r.y);c.lineTo(r.x+r.width/2,r.y+r.height);}c.stroke();c.setLineDash([]);}
  c.strokeStyle='#243f32';c.lineWidth=28;c.strokeRect(0,0,BALANCE.worldSize,BALANCE.worldSize);
 }
 private entity(e:Entity,game:Game){const c=this.ctx,item=ITEMS[e.type];if(!e.active)return;const angle=e.kind==='ghoul'||e.kind==='robot'?e.rotation:e.rotation*Math.PI/2;
  if(e.kind==='floor'){if(item?.world&&e.type==='wood_floor'){this.image(item.world,e.x,e.y,64,64,angle,1,item.worldFrame);}else{c.fillStyle=e.type==='cave_floor'?'#4b514b':e.type==='golden_floor'?'#827144':e.type==='red_floor'?'#875a51':e.type.includes('wood')?'#a09272':'#737670';c.fillRect(e.x-32,e.y-32,64,64);c.strokeStyle='#252d262f';c.lineWidth=1;c.strokeRect(e.x-32,e.y-32,64,64);if(e.type.includes('wood')){c.strokeStyle='#343a3044';for(let i=-24;i<30;i+=16){c.beginPath();c.moveTo(e.x-32,e.y+i);c.lineTo(e.x+32,e.y+i);c.stroke();}}}return;}
  if(e.kind==='drop'){const s=e.inventory.find(Boolean);if(!s)return;const def=ITEMS[s.item],path=def.world||def.icon,frame=def.world?def.worldFrame:undefined,sprite=path?this.images.get(path):undefined;const ratio=frame?frame[2]/frame[3]:sprite?sprite.width/sprite.height:1;c.fillStyle='#263d3255';c.beginPath();c.ellipse(e.x+2,e.y+7,15,8,0,0,Math.PI*2);c.fill();if(!def.world&&WEAPONS[s.item]){const bow=['bow','crossbow'].includes(s.item),long=s.item.includes('sniper')||s.item==='spear',pistol=['9mm','desert_eagle','laser_pistol'].includes(s.item);c.save();c.translate(e.x,e.y);c.rotate(-.35);const size=long?.4:bow?.5:.6;c.scale(size,size);c.translate(-(long?55:bow?48:pistol?35:43),-19);drawHeld(c,s.item);c.restore();}else if(!def.world&&def.armor){c.save();c.translate(e.x,e.y);c.scale(.47,.47);drawOutfit(c,s.item);c.restore();}else if(!this.image(path,e.x,e.y,Math.min(30,30*ratio),Math.min(30,30/ratio),0,1,frame)){this.crate(e.x,e.y,22,22,'#907a52');}if(s.quantity>1){c.fillStyle='#efe8c6';c.strokeStyle='#15291c';c.font='bold 10px Tahoma';c.textAlign='right';c.lineWidth=3;c.strokeText(String(s.quantity),e.x+16,e.y+17);c.fillText(String(s.quantity),e.x+16,e.y+17);}return;}
  if(e.kind==='crop'){const mature=e.growAt<=game.world.time;const scale=mature?1:.4+.4*clamp(1-(e.growAt-game.world.time)/BALANCE.fruitGrowth,0,1);c.save();c.translate(e.x,e.y);c.scale(scale,scale);for(let i=0;i<8;i++){const a=i*2.4,r=13+i%3*4;this.leaf(Math.cos(a)*r,Math.sin(a)*r,a,20);}if(mature)for(let i=0;i<3;i++){c.fillStyle=e.type.startsWith('orange')?'#d8a349':'#ce634d';c.strokeStyle='#14251d';c.lineWidth=3;c.beginPath();c.arc(Math.cos(i*2.1)*17,Math.sin(i*2.1)*17,8,0,Math.PI*2);c.fill();c.stroke();}c.restore();return;}
  if(e.kind==='circuit'){this.circuit(e,game);return;}
  if(e.type==='tree'){this.image(item.world,e.x,e.y,142,142,e.variation*.7,distance(e,game.player)<85?.55:1);return;}
  if(e.kind==='ghoul'||e.kind==='robot'){const size=e.type==='armored_ghoul'?72:e.kind==='robot'?65:57;const path=item?.world||item?.icon,sprite=path?this.images.get(path):undefined,ratio=sprite?sprite.width/sprite.height:1;c.save();c.globalAlpha=e.deployment>0?.55:1;if(!this.image(path,e.x,e.y,Math.min(size,size*ratio),Math.min(size,size/ratio),angle))this.actor(e.x,e.y,angle,e.kind==='robot'?'#7a9195':'#948746');c.restore();if(e.hp<e.maxHp){c.fillStyle='#13251c';c.fillRect(e.x-24,e.y-41,48,5);c.fillStyle=e.kind==='robot'?'#6bbdc2':'#ce694b';c.fillRect(e.x-23,e.y-40,46*e.hp/e.maxHp,3);}return;}
  if(e.type==='sulfur_node'){this.rock(e.x,e.y,38,'#a3974c',e.variation);return;}
  if(e.type==='cave_wall'){this.rock(e.x,e.y,47,'#646962',e.variation);return;}
  if(e.type==='sleeping_bag'){this.crate(e.x,e.y,42,57,'#72865b');c.fillStyle='#b8bd9d';c.fillRect(e.x-15,e.y-20,30,16);return;}
  if(e.type==='wooden_spike'||e.type==='wood_spike'){for(let i=0;i<5;i++){c.fillStyle=e.activated?'#ac7349':'#776c48';c.strokeStyle='#243126';c.lineWidth=2;c.beginPath();c.moveTo(e.x-22+i*10,e.y+15);c.lineTo(e.x-17+i*10,e.y-16);c.lineTo(e.x-12+i*10,e.y+15);c.fill();c.stroke();}return;}
  let path=item?.world;const states=item?.damageStates;if(states?.length&&e.hp/e.maxHp<.75)path=states[Math.min(2,Math.floor((.75-e.hp/e.maxHp)*4))];
  let width=e.width,height=e.height;
  if(e.kind==='resource'){const size=e.type==='boar'||e.type==='deer'?96:e.type.endsWith('node')?91:35,sprite=path?this.images.get(path):undefined,ratio=item?.worldFrame?item.worldFrame[2]/item.worldFrame[3]:sprite?sprite.width/sprite.height:1;width=Math.min(size,size*ratio);height=Math.min(size,size/ratio);}
  else if(e.kind==='station'){width=e.width+12;const image=path?this.images.get(path):undefined;height=item?.worldFrame?width*item.worldFrame[3]/item.worldFrame[2]:image?width*image.height/image.width:e.height;}
  else if(e.type==='red_barrel'||e.type==='green_barrel'){width=height=50;}
  else if(e.type==='uranium_wall'||e.type==='uranium_door'){this.crate(e.x,e.y,64,64,'#7d9155',angle);if(path)this.image(path,e.x,e.y,47,47,angle);return;}
  else if(e.open){const r=entityRect(e);this.crate(r.x,r.y,r.width,r.height,e.type.includes('metal')?'#626965':'#837352');return;}
  const smelting=e.type==='smelter'&&e.jobs.length>0&&(e.fuelLeft>0||e.fuel>0);
  if(!this.image(path,e.x+(smelting?Math.sin(game.world.time*29)*.7:0),e.y,width,height,angle,1,item?.worldFrames?.[e.variation%item.worldFrames.length]||item?.worldFrame)){
   const color=e.type==='safe'?'#4c6264':e.type==='weaving_machine'?'#8d815e':e.type==='vending_machine'?'#8e5143':e.type.includes('metal')?'#67736e':e.type.includes('stone')?'#787b72':'#827359';this.crate(e.x,e.y,width,height,color,angle);
   if(e.kind==='station'){c.fillStyle='#253d37';c.fillRect(e.x-17,e.y-11,34,22);c.fillStyle='#a7b06a';c.fillRect(e.x-11,e.y-6,22,12);}
  }
  if(smelting){c.fillStyle='#f3a645';c.shadowBlur=8;c.shadowColor='#e58939';c.beginPath();c.arc(e.x+width*.34,e.y+height*.22,3,0,Math.PI*2);c.fill();c.shadowBlur=0;}
  if(['campfire','firepit'].includes(e.type)&&(e.fuelLeft>0||e.fuel>0)){c.save();c.translate(e.x,e.y);for(let i=0;i<3;i++){c.fillStyle=i===0?'#e87536':i===1?'#f4b952':'#ffe192';c.beginPath();const flick=Math.sin(game.world.time*13+i)*4;c.moveTo(-13+i*4,7);c.quadraticCurveTo(-16+i*4,-4,4+flick,-28+i*6);c.quadraticCurveTo(1,-6,13-i*3,8);c.fill();}c.restore();}
  if(e.kind==='station'&&e.jobs.length){c.fillStyle='#172820';c.fillRect(e.x-27,e.y+e.height/2+7,54,5);c.fillStyle='#d3b654';c.fillRect(e.x-26,e.y+e.height/2+8,52*(1-e.jobs[0].remaining/e.jobs[0].total),3);}
 }
 private circuit(e:Entity,game:Game){const c=this.ctx,dirs=[[0,-1],[1,0],[0,1],[-1,0]];c.save();c.translate(e.x,e.y);
  if(e.type==='cable'||e.type==='cable_bridge'){
   const nearby=game.near(e,70).filter(o=>o.id!==e.id&&(o.kind==='circuit'||o.type==='automatic_door'||o.type==='cable_wall'));
   const connected=dirs.map(([dx,dy])=>nearby.some(o=>Math.abs(o.x-e.x-dx*64)<1&&Math.abs(o.y-e.y-dy*64)<1));
   const arm=(d:number)=>{const [dx,dy]=dirs[d];c.beginPath();c.moveTo(0,0);if(e.type==='cable_bridge'&&d%2===0){c.moveTo(0,dy*32);c.lineTo(0,dy*10);c.quadraticCurveTo(11,dy*9,11,0);}else c.lineTo(dx*32,dy*32);c.strokeStyle='#242c22';c.lineWidth=11;c.stroke();c.strokeStyle=e.channels?.[d]?'#dfb959':'#896543';c.lineWidth=6;c.stroke();};
   for(const d of [1,3,0,2])if(connected[d])arm(d);if(!connected.some(Boolean)){c.fillStyle='#896543';c.strokeStyle='#242c22';c.lineWidth=3;c.beginPath();c.arc(0,0,6,0,Math.PI*2);c.fill();c.stroke();}c.restore();return;
  }
  c.rotate(e.rotation*Math.PI/2);
  c.fillStyle=e.type==='lamp'?(e.signal?'#e7dd90':'#676d5e'):'#6e7668';c.strokeStyle='#152820';c.lineWidth=3;c.beginPath();c.roundRect(-22,-22,44,44,7);c.fill();c.stroke();
  c.fillStyle=e.type==='switch'?(e.switchOn?'#59954b':'#b44036'):e.signal?'#dcbb50':'#344d36';c.beginPath();c.arc(0,0,e.type==='switch'?12:7,0,Math.PI*2);c.fill();c.strokeStyle='#293228';c.lineWidth=2;c.stroke();
  const symbol:Record<string,string>={gate_and:'∧',gate_or:'∨',gate_not:'¬',gate_xor:'⊻',gate_timer:'◷',platform:'Ⅱ',lamp:'✦'};if(symbol[e.type]){c.fillStyle='#1c3025';c.font='bold 26px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(symbol[e.type],0,0);}
  if(e.type.startsWith('gate_')&&(e.type!=='gate_timer'||e.pulseSeconds)){for(const [ports,color]of [[inputPorts(e),'#e1ba69'],[outputPorts(e),'#c85b49']] as const){c.fillStyle=color;for(const d of ports){const [dx,dy]=dirs[(d-e.rotation+4)%4];c.fillRect(dx*25-4,dy*25-4,8,8);}}}
  if(e.type==='gate_timer'){c.fillStyle=e.pulseSeconds?'#bca3d5':['#73a9ce','#73ae66','#d09158','#cc6255'][e.timerIndex];c.beginPath();c.arc(15,15,5,0,Math.PI*2);c.fill();if(e.pulseSeconds){c.fillStyle='#eef0d9';c.font='bold 9px sans-serif';c.fillText(`${e.pulseSeconds}s`,0,15);}}
  c.restore();
 }
 private actor(x:number,y:number,angle:number,color='#dec346'){const c=this.ctx;c.save();c.translate(x,y);c.rotate(angle);c.fillStyle='#1b302638';c.beginPath();c.ellipse(3,5,30,24,0,0,Math.PI*2);c.fill();c.strokeStyle='#10251a';c.lineWidth=3.5;
  for(const sign of [-1,1]){c.fillStyle=color;c.beginPath();c.ellipse(13,sign*24,11,8,.5*sign,0,Math.PI*2);c.fill();c.stroke();}
  c.fillStyle=color;c.beginPath();c.arc(0,0,23,0,Math.PI*2);c.fill();c.stroke();for(const sign of [-1,1]){c.fillStyle='#101611';c.beginPath();c.arc(13,sign*9,6.5,0,Math.PI*2);c.fill();c.fillStyle='#fffbed';c.beginPath();c.arc(15,sign*9-2,2.5,0,Math.PI*2);c.fill();}c.restore();}
 player(game:Game){const p=game.player,c=this.ctx,s=game.selected(),a=p.aim;this.actor(p.x,p.y,a,p.effects.boost>0?'#b27ca9':p.effects.ghoul>0?'#b6c884':'#dec346');
  c.save();c.translate(p.x,p.y);c.rotate(a);if(p.equipped)drawOutfit(c,p.equipped.item);c.restore();
  if(s&&s.item!=='fists'&&(WEAPONS[s.item]||['spear','grenade'].includes(s.item))){const weapon=WEAPONS[s.item];c.save();c.translate(p.x,p.y);const period=weapon?1/weapon.rate:1,phase=clamp((period-p.cooldown)/.22,0,1);c.rotate(a+(p.cooldown>0&&weapon&&!weapon.magazine?Math.sin(phase*Math.PI)*.65:0));drawHeld(c,s.item);c.restore();}
  if(p.action){c.strokeStyle='#eedc86';c.lineWidth=3;c.beginPath();c.arc(p.x,p.y,31,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-p.action.remaining/p.action.total));c.stroke();}
 }
 private leaf(x:number,y:number,angle:number,size:number){const c=this.ctx;c.save();c.translate(x,y);c.rotate(angle);c.fillStyle='#60804d';c.strokeStyle='#1b2e21';c.lineWidth=3;c.beginPath();c.ellipse(0,0,size/2,size/3,0,0,Math.PI*2);c.fill();c.stroke();c.restore();}
 private rock(x:number,y:number,r:number,color:string,variation:number){const c=this.ctx;c.fillStyle=color;c.strokeStyle='#192b21';c.lineWidth=4;c.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,rr=r*(.85+.12*Math.sin(i*3+variation));const px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr;if(!i)c.moveTo(px,py);else c.lineTo(px,py);}c.closePath();c.fill();c.stroke();c.fillStyle='#ffffff0c';c.beginPath();c.moveTo(x-r*.65,y-r*.5);c.lineTo(x,y);c.lineTo(x+r*.35,y-r*.7);c.fill();}
 private crate(x:number,y:number,w:number,h:number,color:string,angle=0){const c=this.ctx;c.save();c.translate(x,y);c.rotate(angle);c.fillStyle='#19332640';c.fillRect(-w/2+4,-h/2+5,w,h);c.fillStyle=color;c.strokeStyle='#1c2b21';c.lineWidth=3;c.beginPath();c.roundRect(-w/2,-h/2,w,h,3);c.fill();c.stroke();c.fillStyle='#ffffff13';c.fillRect(-w/2+5,-h/2+5,w-10,5);c.fillStyle='#00000017';c.fillRect(-w/2+5,h/2-11,w-10,6);c.restore();}
 private lighting(game:Game,view:Entity[]){const c=this.ctx,w=game.world,t=w.time%960,night=t>=480;const darkness=night?.72:.04;const lc=this.light.getContext('2d')!,scale=this.canvas.width/this.width;
  lc.setTransform(1,0,0,1,0,0);lc.clearRect(0,0,this.light.width,this.light.height);lc.fillStyle=`rgba(5,14,24,${darkness})`;lc.fillRect(0,0,this.light.width,this.light.height);lc.globalCompositeOperation='destination-out';
  const light=(x:number,y:number,r:number,strength:number)=>{const sx=((x-this.camera.x)*this.zoom+this.width/2)*scale,sy=((y-this.camera.y)*this.zoom+this.height/2)*scale,rr=r*this.zoom*scale;const g=lc.createRadialGradient(sx,sy,rr*.1,sx,sy,rr);g.addColorStop(0,`rgba(0,0,0,${strength})`);g.addColorStop(1,'rgba(0,0,0,0)');lc.fillStyle=g;lc.fillRect(sx-rr,sy-rr,rr*2,rr*2);};
  light(game.player.x,game.player.y,night?230:500,.85);for(const e of view)if(['campfire','firepit'].includes(e.type)&&(e.fuelLeft>0||e.fuel>0))light(e.x,e.y,210,1);else if(e.type==='lamp'&&e.signal)light(e.x,e.y,BALANCE.lampRadius,1);
  lc.globalCompositeOperation='source-over';c.drawImage(this.light,0,0,this.width,this.height);
  if(!this.occlusion)return;const walls=view.filter(blocksSight).map(entityRect);if(!walls.length)return;
  const p=game.player,range=Math.hypot(this.width,this.height)/this.zoom;const rays=new Set<number>();for(let i=0;i<100;i++)rays.add(i/100*Math.PI*2);
  const ray=(a:number)=>rays.add((a+Math.PI*2)%(Math.PI*2));
  for(const r of walls)for(const dx of [-r.width/2,r.width/2])for(const dy of [-r.height/2,r.height/2]){const a=Math.atan2(r.y+dy-p.y,r.x+dx-p.x);ray(a-.0001);ray(a);ray(a+.0001);}
  const angles=[...rays].sort((a,b)=>a-b);const points=angles.map(a=>{let best=range;const dx=Math.cos(a),dy=Math.sin(a);for(const r of walls){let lo=0,hi=range;for(const [pos,d,min,max]of [[p.x,dx,r.x-r.width/2,r.x+r.width/2],[p.y,dy,r.y-r.height/2,r.y+r.height/2]]){if(Math.abs(d)<1e-8){if(pos<min||pos>max){lo=range+1;break;}}else{let a=(min-pos)/d,b=(max-pos)/d;if(a>b)[a,b]=[b,a];lo=Math.max(lo,a);hi=Math.min(hi,b);}}if(lo<=hi)best=Math.min(best,lo);}return {x:(p.x+dx*best-this.camera.x)*this.zoom+this.width/2,y:(p.y+dy*best-this.camera.y)*this.zoom+this.height/2};});
  c.save();c.fillStyle='#0d181cdb';c.beginPath();c.rect(0,0,this.width,this.height);for(let i=points.length-1;i>=0;i--){const q=points[i];if(i===points.length-1)c.moveTo(q.x,q.y);else c.lineTo(q.x,q.y);}c.closePath();c.fill('evenodd');c.restore();
 }
 minimap(canvas:HTMLCanvasElement,game:Game,full=false){const c=canvas.getContext('2d')!,size=canvas.width;c.fillStyle='#223b2d';c.fillRect(0,0,size,size);const ratio=size/BALANCE.worldSize;
  for(const r of game.world.regions){c.fillStyle=r.id==='city'?'#758057':r.kind==='road'?'#4d5548':r.kind==='cave'?'#70736b':'#8b8974';c.fillRect(r.x*ratio,r.y*ratio,Math.max(2,r.width*ratio),Math.max(2,r.height*ratio));}
  if(full){c.fillStyle='#111d16cc';const seen=new Set(game.world.discovered);for(let x=0;x<32;x++)for(let y=0;y<32;y++)if(!seen.has(`${x},${y}`))c.fillRect(x*size/32,y*size/32,size/32+1,size/32+1);}
  c.fillStyle='#e0c250';c.strokeStyle='#18291d';c.lineWidth=2;c.beginPath();c.arc(game.player.x*ratio,game.player.y*ratio,full?5:3,0,Math.PI*2);c.fill();c.stroke();
  for(const e of game.world.entities)if(e.active&&e.owner===game.player.owner&&e.kind==='station'){c.fillStyle='#b9d8b4';c.fillRect(e.x*ratio-1,e.y*ratio-1,2,2);}
 }
 thumbnail():string{const c=document.createElement('canvas');c.width=240;c.height=135;c.getContext('2d')!.drawImage(this.canvas,0,0,240,135);return c.toDataURL('image/jpeg',.6);}
}
function createVisual(type:string,x:number,y:number):Entity {return {id:'preview',type,x,y,active:true,kind:ITEMS[type]?.category==='Building'?'structure':ITEMS[type]?.category==='Stations'?'station':'furniture',width:['research_bench','tesla_bench','smelter'].includes(type)?192:64,height:64,radius:0,hp:100,maxHp:100,rotation:0,variation:0,inventory:[],outputs:[],jobs:[],fuel:0,fuelLeft:0,owner:null,open:false} as unknown as Entity;}
