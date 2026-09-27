import type { Vec,World,Entity } from './model';
export const clamp=(v:number,min=0,max=255)=>Math.max(min,Math.min(max,v));
export const distance=(a:Vec,b:Vec)=>Math.hypot(a.x-b.x,a.y-b.y);
export const snap=(v:number,tile=64)=>Math.floor(v/tile)*tile+tile/2;
export function hashSeed(s:string):number {let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return h>>>0||1;}
export function random(w:World,stream:keyof World['rng']='loot'):number {let n=w.rng[stream];n^=n<<13;n^=n>>>17;n^=n<<5;w.rng[stream]=n>>>0||1;return (n>>>0)/4294967296;}
export const newId=(w:World,prefix='e')=>`${prefix}${w.nextId++}`;
export function entityRect(e:Entity) {let width=e.width,height=e.height;const rotation=((e.rotation%4)+4)%4;if(rotation%2)[width,height]=[height,width];if(e.open){const leaf=8,offset=(e.width-leaf)/2,angle=rotation*Math.PI/2;return {x:e.x-Math.cos(angle)*offset,y:e.y-Math.sin(angle)*offset,width:rotation%2?e.width:leaf,height:rotation%2?leaf:e.width};}return {x:e.x,y:e.y,width,height};}
export function circleRect(p:Vec,r:number,rect:{x:number;y:number;width:number;height:number}):boolean {const x=clamp(p.x,rect.x-rect.width/2,rect.x+rect.width/2),y=clamp(p.y,rect.y-rect.height/2,rect.y+rect.height/2);return (p.x-x)**2+(p.y-y)**2<r*r;}
export function segmentRect(a:Vec,b:Vec,rect:{x:number;y:number;width:number;height:number}):number|null {
 let lo=0,hi=1; for(const [p,d,min,max] of [[a.x,b.x-a.x,rect.x-rect.width/2,rect.x+rect.width/2],[a.y,b.y-a.y,rect.y-rect.height/2,rect.y+rect.height/2]]){
  if(Math.abs(d)<1e-9){if(p<min||p>max)return null;}else{let t1=(min-p)/d,t2=(max-p)/d;if(t1>t2)[t1,t2]=[t2,t1];lo=Math.max(lo,t1);hi=Math.min(hi,t2);if(lo>hi)return null;}
 }return lo;
}
export function segmentCircle(a:Vec,b:Vec,c:Vec,r:number):number|null {const dx=b.x-a.x,dy=b.y-a.y,fx=a.x-c.x,fy=a.y-c.y,A=dx*dx+dy*dy;if(!A)return distance(a,c)<=r?0:null;const B=2*(fx*dx+fy*dy),C=fx*fx+fy*fy-r*r,D=B*B-4*A*C;if(C<=0)return 0;if(D<0)return null;const t=(-B-Math.sqrt(D))/(2*A);return t>=0&&t<=1?t:null;}
// A moving circle sweeps a rounded rectangle, not the larger square-cornered
// bounding box. The latter incorrectly traps actors beside an open door corner.
export function sweptCircleRect(a:Vec,b:Vec,r:number,rect:{x:number;y:number;width:number;height:number}):boolean {
 if(segmentRect(a,b,{...rect,width:rect.width+2*r})!==null||segmentRect(a,b,{...rect,height:rect.height+2*r})!==null)return true;
 for(const dx of [-1,1])for(const dy of [-1,1])if(segmentCircle(a,b,{x:rect.x+dx*rect.width/2,y:rect.y+dy*rect.height/2},r)!==null)return true;
 return false;
}
export class SpatialHash {
 private cells=new Map<string,Set<Entity>>(); private keys=new Map<string,string[]>();
 constructor(readonly size=160){}
 insert(e:Entity){this.remove(e);const r=Math.max(e.width,e.height,e.radius*2)/2;const keys=[];for(let x=Math.floor((e.x-r)/this.size);x<=Math.floor((e.x+r)/this.size);x++)for(let y=Math.floor((e.y-r)/this.size);y<=Math.floor((e.y+r)/this.size);y++){const k=`${x},${y}`;let bucket=this.cells.get(k);if(!bucket){bucket=new Set();this.cells.set(k,bucket);}bucket.add(e);keys.push(k);}this.keys.set(e.id,keys);}
 remove(e:Entity){for(const k of this.keys.get(e.id)||[])this.cells.get(k)?.delete(e);this.keys.delete(e.id);}
 query(x:number,y:number,r:number):Entity[]{const result=new Set<Entity>();for(let cx=Math.floor((x-r)/this.size);cx<=Math.floor((x+r)/this.size);cx++)for(let cy=Math.floor((y-r)/this.size);cy<=Math.floor((y+r)/this.size);cy++)for(const e of this.cells.get(`${cx},${cy}`)||[])if(e.active)result.add(e);return [...result];}
}
