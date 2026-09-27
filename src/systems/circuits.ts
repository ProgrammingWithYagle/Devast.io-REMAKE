import { BALANCE } from '../content';
import { distance } from '../core/math';
import type { Game } from '../core/game';
import type { Entity } from '../core/model';

export function gateValue(type:string,inputs:boolean[]):boolean {const n=inputs.filter(Boolean).length;switch(type){case 'gate_or':return n>0;case 'gate_and':return inputs.length===3&&n===3;case 'gate_xor':return n===1;case 'gate_not':return !inputs[0];default:return false;}}
const directions=[[0,-1],[1,0],[0,1],[-1,0]];
const gate=(e:Entity)=>['gate_or','gate_and','gate_not','gate_xor'].includes(e.type)||e.type==='gate_timer'&&!!e.pulseSeconds;
export function inputPorts(e:Entity){return(e.type==='gate_not'||e.pulseSeconds?[3]:[0,2,3]).map(n=>(n+e.rotation)%4);}
export function outputPorts(e:Entity){return(e.type==='gate_not'||e.pulseSeconds?[0,1,2]:[1]).map(n=>(n+e.rotation)%4);}
class Union {
 parent=new Map<string,string>();
 find(a:string):string{if(!this.parent.has(a))this.parent.set(a,a);const p=this.parent.get(a)!;if(p===a)return a;const r=this.find(p);this.parent.set(a,r);return r;}
 join(a:string,b:string){const pa=this.find(a),pb=this.find(b);if(pa!==pb)this.parent.set(pa,pb);}
}
export function updateCircuits(game:Game,dt:number){
 const parts=game.world.entities.filter(e=>e.active&&(e.kind==='circuit'||e.type==='automatic_door'||e.type==='cable_wall'));
 const u=new Union(),grid=new Map(parts.map(e=>[`${Math.round((e.x-32)/64)},${Math.round((e.y-32)/64)}`,e]));
 const key=(e:Entity,d:number)=>`${e.id}:${d}`;
 for(const e of parts){const x=Math.round((e.x-32)/64),y=Math.round((e.y-32)/64);
  for(let d=0;d<4;d++){const [dx,dy]=directions[d],other=grid.get(`${x+dx},${y+dy}`);u.find(key(e,d));if(other)u.join(key(e,d),key(other,(d+2)%4));}
  if(e.type==='cable_bridge'){u.join(key(e,0),key(e,2));u.join(key(e,1),key(e,3));}
  else if(!gate(e))for(let d=1;d<4;d++)u.join(key(e,0),key(e,d));
 }
 const driven=new Set<string>();
 for(const e of parts){let value=false;
  if(e.type==='switch')value=e.switchOn;
  if(e.type==='platform')value=distance(e,game.player)<32||game.near(e,34).some(a=>a.id!==e.id&&['drop','ghoul','robot'].includes(a.kind)&&distance(a,e)<34);
  if(e.type==='gate_timer'&&!e.pulseSeconds){e.timerPhase=(e.timerPhase+dt)%BALANCE.timerPeriods[e.timerIndex];value=e.timerPhase<BALANCE.timerPeriods[e.timerIndex]/2;}
  if(gate(e))value=e.signal;
  const ports=gate(e)?outputPorts(e):[0,1,2,3];if(value)for(const d of ports)driven.add(u.find(key(e,d)));
  if(['switch','platform','gate_timer'].includes(e.type))e.signal=value;
 }
 // Previous-tick gate outputs feed the next tick. Feedback is bounded, deterministic, and serialized.
 for(const e of parts){e.channels=[0,1,2,3].map(d=>driven.has(u.find(key(e,d))));
  if(e.pulseSeconds){const input=inputPorts(e).some(d=>e.channels[d]);e.timerPhase=input&&!e.inputSignal?e.pulseSeconds:Math.max(0,e.timerPhase-dt);e.inputSignal=input;e.signal=e.timerPhase>0;}
  else if(gate(e))e.signal=gateValue(e.type,inputPorts(e).map(d=>e.channels[d]));
  else if(!['switch','platform','gate_timer'].includes(e.type))e.signal=e.channels.some(Boolean);
  if(e.type==='automatic_door')game.toggleDoor(e,e.signal);
 }
}
