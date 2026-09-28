// Code-drawn held/worn roles, using the supplied inventory art as silhouette/palette reference.
// These remain explicitly documented replacement artwork, not recovered original animation frames.
type Ctx=CanvasRenderingContext2D;
function shape(c:Ctx,points:number[][],color:string){c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();c.stroke();}
function box(c:Ctx,x:number,y:number,w:number,h:number,color:string,r=2){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();c.stroke();}
function oval(c:Ctx,x:number,y:number,rx:number,ry:number,color:string){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();c.stroke();}
function hood(c:Ctx,color:string,trim?:string){c.fillStyle=color;c.beginPath();c.arc(-2,0,26,Math.PI*.23,Math.PI*1.77);c.lineTo(11,-16);c.quadraticCurveTo(3,0,11,16);c.closePath();c.fill();c.stroke();if(trim){c.strokeStyle=trim;c.lineWidth=4;c.beginPath();c.arc(-2,0,22,Math.PI*.28,Math.PI*1.72);c.stroke();c.strokeStyle='#161c18';c.lineWidth=3;}}
function visor(c:Ctx,color:string,x=7){box(c,x,-17,15,34,color,5);c.strokeStyle='#d1d8ce55';c.lineWidth=1;c.beginPath();c.moveTo(x+3,-12);c.lineTo(x+3,10);c.stroke();c.strokeStyle='#161c18';c.lineWidth=3;}
export function drawOutfit(c:Ctx,id:string){c.save();c.strokeStyle='#161c18';c.lineWidth=3;c.lineJoin='round';
 if(id==='camouflage_gear'){for(let i=0;i<13;i++){const a=i*2.4,r=18+i%3*4;c.save();c.translate(Math.cos(a)*r,Math.sin(a)*r);c.rotate(a);oval(c,0,0,11,5,i%2?'#466a39':'#697c42');c.restore();}c.restore();return;}
 if(id==='headscarf'){hood(c,'#927049','#bb9263');shape(c,[[-22,-11],[-35,-20],[-33,-7],[-25,0]],'#8e6944');box(c,14,-14,6,28,'#927049',2);}
 else if(id==='chapka'){hood(c,'#513e33','#a87e65');oval(c,-1,-25,15,7,'#654d3c');oval(c,-1,25,15,7,'#654d3c');}
 else if(id==='winter_coat'){hood(c,'#879d9c','#e1e5db');oval(c,8,-25,12,8,'#c7d0c8');oval(c,8,25,12,8,'#c7d0c8');c.strokeStyle='#f1efe3';c.lineWidth=5;c.beginPath();c.arc(0,0,22,Math.PI*.32,Math.PI*1.68);c.stroke();}
 else if(['radiation_mask','min_radiation_suit','radiation_suit'].includes(id)){
  if(id!=='radiation_mask')hood(c,id==='radiation_suit'?'#b4a854':'#427c5c',id==='radiation_suit'?'#ddd7b8':undefined);
  oval(c,16,0,11,19,'#678773');for(const y of [-16,16])box(c,19,y-5,12,10,'#39413a',3);
  if(id==='radiation_suit'){visor(c,'#273944');oval(c,-14,0,7,7,'#e5cf67');c.fillStyle='#2a3024';c.font='bold 12px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('☢',-14,0);}
  else for(const y of [-8,8])oval(c,13,y,5,5,'#b3c7bc');
 }
 else if(id==='leather_jacket'){hood(c,'#41483a','#62664d');for(const y of [-25,25])oval(c,8,y,12,8,'#41483a');shape(c,[[-19,-15],[-4,-9],[-16,7]],'#2e352d');}
 else if(id==='kevlar_suit'){hood(c,'#292c42','#424960');for(const y of [-25,25])oval(c,3,y,11,7,'#464b45');visor(c,'#30434d',9);box(c,-18,-2,24,4,'#202634',1);}
 else if(id==='swat_suit'){hood(c,'#303633','#4b514d');visor(c,'#77817d',7);box(c,-22,-6,20,12,'#252c29',2);for(const y of [-24,24])box(c,-4,y-4,12,8,'#555c54',3);}
 else if(id==='protective_suit'){hood(c,'#495f4c','#647662');visor(c,'#233541',5);for(const y of [-26,26])oval(c,7,y,13,8,'#465648');}
 else if(id==='metal_helmet'){hood(c,'#89908b','#acb1a8');shape(c,[[-14,-23],[-4,-28],[6,-23],[0,-15],[-6,-8]],'#747c79');box(c,17,-3,9,6,'#9a9e96',1);for(const y of [-18,0,18]){c.fillStyle='#505955';c.beginPath();c.arc(-12,y,1.5,0,Math.PI*2);c.fill();}}
 else if(id==='welding_helmet'){hood(c,'#654139','#906650');box(c,4,-21,20,42,'#79534b',5);visor(c,'#202d31',8);}
 else if(id==='gladiator_helmet'){hood(c,'#694b42','#916b56');visor(c,'#283036',6);shape(c,[[15,-4],[28,-4],[28,4],[15,4]],'#8a6253');for(const y of [-13,13]){c.fillStyle='#aa8170';c.beginPath();c.arc(22,y,1.5,0,Math.PI*2);c.fill();}}
 else if(id==='power_armor'){hood(c,'#8d9c9b','#b0b7ab');box(c,8,-24,19,48,'#936a50',6);for(const y of [-12,0,12])box(c,13,y-2,11,4,'#252f2c',1);box(c,-30,-5,15,10,'#c2b680',2);for(const y of [-22,22])oval(c,-10,y,4,4,'#b4c0b2');}
 else if(id==='tesla_armor'){hood(c,'#343b34','#6b7252');for(const y of [-25,25])oval(c,1,y,12,7,'#4b5349');visor(c,'#9d9e74',7);box(c,18,-10,8,20,'#1d2926',3);c.strokeStyle='#788068';c.lineWidth=2;c.beginPath();c.moveTo(-18,-16);c.quadraticCurveTo(-6,-4,-18,16);c.stroke();}
 c.restore();
}

export function drawHeld(c:Ctx,id:string){c.save();c.strokeStyle='#172019';c.lineWidth=3;c.lineJoin='round';c.translate(16,19);
 if(id==='bow'||id==='crossbow'){
  if(id==='crossbow')box(c,-1,-4,48,8,'#766349');c.strokeStyle='#222c21';c.lineWidth=7;c.beginPath();c.moveTo(24,-25);c.quadraticCurveTo(43,0,24,25);c.stroke();c.strokeStyle='#8b7852';c.lineWidth=3;c.stroke();c.strokeStyle='#d1ceae';c.lineWidth=1.5;c.beginPath();c.moveTo(24,-25);c.lineTo(18,0);c.lineTo(24,25);c.stroke();c.strokeStyle='#222c21';c.lineWidth=2;c.beginPath();c.moveTo(8,0);c.lineTo(48,0);c.stroke();shape(c,[[48,-3],[55,0],[48,3]],'#9b9f8c');
 }else if(id==='grenade'){
  oval(c,14,0,9,12,'#5d6b44');box(c,10,-14,8,5,'#909d86',1);c.strokeStyle='#202a22';c.lineWidth=2;c.beginPath();c.moveTo(8,-5);c.lineTo(20,-5);c.moveTo(6,2);c.lineTo(22,2);c.moveTo(10,8);c.lineTo(18,8);c.stroke();oval(c,21,-12,4,4,'#84917b');
 }else if(id==='spear'){
  box(c,-5,-2,76,4,'#938057',1);shape(c,[[66,-6],[84,0],[66,6]],'#a9aea3');
 }else if(id.includes('pickaxe')){
  c.rotate(-.35);box(c,-2,-3,44,6,'#88724d',2);const color=id==='sulfur_pickaxe'?'#b3a251':id==='metal_pickaxe'?'#a2aaa5':'#888d83';shape(c,[[30,-4],[25,-22],[32,-27],[38,-18],[44,4],[44,22],[39,28],[36,7]],color);
 }else if(id==='hatchet'||id.includes('_axe')){
  c.rotate(-.4);box(c,-3,-3,45,7,'#8b7151',2);shape(c,[[31,-3],[26,-19],[42,-24],[49,-18],[44,11],[34,10]],id==='sulfur_axe'?'#b7a04e':id==='metal_axe'?'#a1aaa2':'#83897e');c.strokeStyle='#c3c6ae';c.lineWidth=2;c.beginPath();c.moveTo(44,-17);c.lineTo(40,7);c.stroke();
 }else if(id==='hammer'||id==='repair_hammer'){
  c.rotate(-.3);box(c,-4,-3,41,7,'#947653',2);box(c,28,-17,15,32,id==='repair_hammer'?'#aa8870':'#8b9997',3);if(id==='repair_hammer')box(c,31,-12,9,5,'#d1bd91',1);
 }else{
  const laser=id.startsWith('laser'),pistol=['9mm','desert_eagle','laser_pistol'].includes(id),sniper=id.includes('sniper'),shotgun=['shotgun','sawed_off'].includes(id),length=sniper?75:pistol?32:id==='sawed_off'?39:56;
  const wood=id==='ak47'||shotgun,color=laser?'#536d65':id==='desert_eagle'?'#a0a79f':'#4c5753';
  box(c,-5,-5,16,10,wood?'#956443':'#353f39',2);box(c,9,-6,length-14,12,color,2);box(c,length-6,-3,sniper?19:9,6,'#293732',1);
  if(wood)box(c,25,-5,14,10,'#966c47',2);
  if(id==='mp5'||id==='ak47'||laser&&!pistol)shape(c,[[14,6],[23,6],[28,20],[17,19]],laser?'#354d3b':'#333e39');
  else box(c,5,5,9,15,wood?'#735339':'#2c3732',2);
  if(sniper){box(c,12,-11,23,7,laser?'#455f49':'#303b37',3);oval(c,15,-7,3,5,'#9cb5a0');}
  if(shotgun){c.strokeStyle='#9da59b';c.lineWidth=1.5;c.beginPath();c.moveTo(length*.5,0);c.lineTo(length+3,0);c.stroke();}
  if(laser){c.fillStyle='#8fbd72';c.fillRect(19,-2,Math.max(7,length-33),3);oval(c,13,0,5,5,'#90b884');}
  if(id==='nail_gun'){box(c,2,-13,29,9,'#b39951',3);oval(c,11,13,10,9,'#65776d');}
 }
 c.restore();
}
