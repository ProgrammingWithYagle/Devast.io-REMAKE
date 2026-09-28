import type {Blueprint,Component} from './blueprints';

// These are physical circuits: every connection occupies visible cable tiles and uses
// the same simulation as player-built logic. No door reads a password or switch list.
class Board {
 readonly cells:string[][];readonly parts:Component[]=[];
 constructor(readonly id:string,readonly name:string,width:number,height:number){this.cells=Array.from({length:height},(_,y)=>Array.from({length:width},(_,x)=>x===0||y===0||x===width-1||y===height-1?'#':','));}
 tile(x:number,y:number,type:string){this.cells[y][x]=type;return this;}
 add(type:string,x:number,y:number,rotation=0,tag?:string,pulseSeconds?:number){const old=this.parts.find(c=>c.x===x&&c.y===y);if(old){if(type==='cable')return this;throw Error(`Overlapping circuit in ${this.id}: ${x},${y}`);}this.cells[y][x]=',';this.parts.push({type,x,y,rotation,tag:tag?`${this.id}-${tag}`:undefined,pulseSeconds});return this;}
 wire(...points:[number,number][]){for(let i=1;i<points.length;i++){let [x,y]=points[i-1];const [tx,ty]=points[i];if(x!==tx&&y!==ty)throw Error('Diagonal cable');this.add('cable',x,y);while(x!==tx||y!==ty){x+=Math.sign(tx-x);y+=Math.sign(ty-y);this.add('cable',x,y);}}return this;}
 finish():Blueprint{return {id:this.id,name:this.name,wall:'stone_wall',floor:'stone_floor',rows:this.cells.map(r=>r.join('')),components:this.parts};}
}

export function computerComplex():Blueprint {
 const b=new Board('city_2','Computer complex',21,22);
 for(let x=1;x<20;x++)b.tile(x,8,'M');
 b.tile(9,21,'D').tile(10,21,'D').tile(1,1,'b').tile(2,1,'k').tile(18,1,'b').tile(19,2,'c');
 for(const [x,y] of [[6,3],[14,3],[6,6],[14,6]])b.add('big_computer',x,y);
 for(const [i,x] of [4,6,8,12,14,16].entries())b.add('switch',x,19,0,`switch-${i+1}`);
 // First and fourth inputs are inverted: red, green, green, red, green, green.
 for(const x of [4,12])b.add('gate_not',x,18,3);
 for(const [left,middle,right] of [[4,6,8],[12,14,16]]){
  b.add('gate_and',middle,16,3);
  b.wire([left,17],[left,16],[middle-1,16]);
  b.wire([middle,18],[middle,17]);
  b.wire([right,18],[right,16],[middle+1,16]);
 }
 b.add('gate_and',10,12,3);
 b.wire([6,15],[6,12],[9,12]);
 b.wire([6,14],[10,14],[10,13]);
 b.wire([14,15],[14,12],[11,12]);
 b.add('gate_or',10,10,3).wire([10,11],[10,11]);
 b.add('platform',13,10,0,'spear-platform').wire([12,10],[11,10]);
 b.wire([10,9],[10,9]).add('automatic_door',10,8,0,'computer-door').add('automatic_door',9,8,0,'computer-door-left');
 // Lamps and additional storage sit away from the comparator's input nets.
 b.add('lamp',9,7).add('lamp',10,7);
 return b.finish();
}

export function logicVault():Blueprint {
 const b=new Board('city_7','Logic vault',24,31);
 b.tile(0,13,'D').tile(0,14,'D');
 for(let x=1;x<23;x++)b.tile(x,18,'M');
 for(let x=1;x<23;x++)b.tile(x,26,'M');
 b.add('switch',5,10,0,'switch-1').add('switch',1,13,0,'switch-2').add('switch',5,17,0,'switch-3').add('switch',18,10,0,'switch-4').add('switch',10,10,0,'switch-5');
 b.add('gate_and',5,13).add('gate_not',3,13).add('gate_not',5,15,3);
 b.wire([5,11],[5,12]).wire([2,13],[2,13]).wire([4,13],[4,13]).wire([5,16],[5,16]).wire([5,14],[5,14]);
 b.add('gate_and',10,13).add('gate_not',10,15,3);
 b.wire([6,13],[9,13]).wire([10,11],[10,12]).wire([10,14],[10,14]);
 // Visible edge-triggered five-second relay reproduces the documented trap route.
 // Free-running craftable timers retain their normal four speed settings.
 b.add('gate_timer',14,13,0,'trap-relay',5).add('gate_or',18,13).add('gate_and',20,13).add('gate_not',20,15,3);
 b.wire([11,13],[13,13]).wire([15,13],[17,13]).wire([18,11],[18,12]).wire([19,13],[19,13]).wire([20,14],[20,14]);
 b.wire([12,13],[12,7],[20,7],[20,12]);
 b.wire([21,13],[22,13],[22,17],[20,17]).add('automatic_door',20,18,0,'trap-door');
 for(const [i,x] of [7,10,13].entries())b.add('platform',x,21,0,`platform-${i+1}`);
 b.add('gate_and',10,24,1).wire([7,22],[7,24],[9,24]).wire([10,22],[10,23]).wire([13,22],[13,24],[11,24]);
 b.wire([10,25],[10,25]).add('automatic_door',10,26,0,'vault-door');
 b.tile(3,28,'S').tile(5,28,'S').tile(16,28,'c').tile(20,28,'b');
 b.tile(2,2,'c').tile(3,2,'b').tile(18,2,'B').tile(20,2,'k');
 return b.finish();
}

// House 9's two wings, three garden switches, protected store, paired entrance
// plates and southern bathroom come from the supplied plan. Exact hidden wiring
// is unresolved; these visible circuits deliberately require all three switches
// for the store and both plates for the main entrance.
export function protectedHouse():Blueprint {
 const b=new Board('house_9','Protected house',18,17);
 for(const row of b.cells)row.fill(' ');
 const room=(x:number,y:number,width:number,height:number)=>{for(let dy=0;dy<height;dy++)for(let dx=0;dx<width;dx++)b.tile(x+dx,y+dy,dx===0||dy===0||dx===width-1||dy===height-1?'#':',');};
 room(0,1,8,11);room(7,1,11,12);room(11,12,7,5);
 for(let y=2;y<=7;y++)for(let x=1;x<=6;x++)b.tile(x,y,' ');
 b.tile(0,5,'D');for(let x=1;x<=6;x++)b.tile(x,8,'M');
 for(const [i,x]of [1,3,5].entries())b.add('switch',x,3,0,`store-switch-${i+1}`);
 b.add('gate_and',3,6,1).wire([1,4],[1,6],[2,6]).wire([3,4],[3,5]).wire([5,4],[5,6],[4,6]);
 b.wire([3,7],[3,7]).add('automatic_door',3,8,0,'store-door');
 b.tile(1,10,'S').tile(5,10,'c');
 for(const [i,x]of [9,15].entries())b.add('platform',x,0,0,`entry-platform-${i+1}`).add('cable_wall',x,1);
 b.add('lamp',8,0).add('lamp',16,0);
 b.add('gate_and',12,4,3).wire([9,2],[9,4],[11,4]).wire([15,2],[15,4],[13,4]);
 // Duplicate the right-hand plate onto the AND's third input, keeping the
 // three-port gate rule consistent with craftable player-built gates.
 b.wire([15,4],[15,5],[12,5]);
 b.wire([12,3],[12,2]).add('automatic_door',12,1,0,'entry-door').add('automatic_door',13,1,0,'entry-door-right');
 b.tile(8,6,'P').tile(9,8,'B').tile(9,9,'B').tile(12,8,'T').tile(15,8,'o').tile(15,10,'c').tile(16,6,'k');
 b.tile(14,12,'D').tile(12,13,'k').tile(12,14,'t').tile(16,14,'S');
 return {...b.finish(),floor:'wood_floor'};
}
