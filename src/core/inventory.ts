import { ITEMS,shelfLife } from '../content';
import { newId } from './math';
import type { World,Stack,Inventory } from './model';
export const count=(inv:Inventory,id:string)=>inv.reduce((n,s)=>n+(s?.item===id?s.quantity:0),0);
function uniqueUid(inv:Inventory,id:string){if(!inv.some(s=>s?.uid===id))return id;const base=id.replace(/~\d+$/,'').slice(0,100);let n=1;while(inv.some(s=>s?.uid===`${base}~${n}`))n++;return `${base}~${n}`;}
export function stack(w:World,item:string,quantity=1,loaded=0):Stack {if(!ITEMS[item])throw Error(`Unknown item ${item}`);return {uid:newId(w,'i'),item,quantity,freshness:shelfLife(item),loaded};}
export function add(inv:Inventory,incoming:Stack,accept:(s:Stack)=>boolean=()=>true):number {
 if(!accept(incoming))return incoming.quantity;
 const limit=ITEMS[incoming.item]?.stack??1;let remaining=incoming.quantity;
 if(limit>1&&incoming.loaded===0)for(const slot of inv){if(slot?.item===incoming.item&&slot.loaded===0){const n=Math.min(limit-slot.quantity,remaining);if(n>0){slot.quantity+=n;slot.freshness=slot.freshness<0?incoming.freshness:incoming.freshness<0?slot.freshness:Math.min(slot.freshness,incoming.freshness);remaining-=n;}if(!remaining)return 0;}}
 for(let i=0;i<inv.length&&remaining;i++)if(!inv[i]){const n=Math.min(limit,remaining);inv[i]={...incoming,uid:uniqueUid(inv,incoming.uid),quantity:n};remaining-=n;}
 return remaining;
}
export function remove(inv:Inventory,item:string,quantity:number):Stack[]|null {
 if(count(inv,item)<quantity)return null;const taken:Stack[]=[];for(let i=0;i<inv.length&&quantity;i++){const s=inv[i];if(s?.item!==item)continue;const n=Math.min(s.quantity,quantity);taken.push({...s,quantity:n});s.quantity-=n;quantity-=n;if(!s.quantity)inv[i]=null;}return taken;
}
export function reserve(inv:Inventory,ingredients:{item_id:string;quantity:number}[]):Stack[]|null {
 const combined=new Map<string,number>();for(const x of ingredients)combined.set(x.item_id,(combined.get(x.item_id)||0)+x.quantity);
 if([...combined].some(([id,n])=>count(inv,id)<n))return null;
 return [...combined].flatMap(([id,n])=>remove(inv,id,n)!);
}
export function transfer(from:Inventory,index:number,to:Inventory,quantity=Infinity,accept?:(s:Stack)=>boolean):number {
 const s=from[index];if(!s)return 0;const requested=Math.min(s.quantity,quantity);const incoming={...s,quantity:requested};const remainder=add(to,incoming,accept);const moved=requested-remainder;s.quantity-=moved;if(!s.quantity)from[index]=null;return moved;
}
export function moveSlot(inv:Inventory,from:number,to:number,split=false):boolean {
 const a=inv[from],b=inv[to];if(!a||from===to||to<0||to>=inv.length)return false;
 if(!b){const n=split?Math.ceil(a.quantity/2):a.quantity;inv[to]={...a,uid:split&&n<a.quantity?uniqueUid(inv,a.uid):a.uid,quantity:n};a.quantity-=n;if(!a.quantity)inv[from]=null;return true;}
 if(a.item===b.item&&ITEMS[a.item].stack>1){const n=Math.min(split?Math.ceil(a.quantity/2):a.quantity,ITEMS[a.item].stack-b.quantity);if(!n)return false;b.quantity+=n;b.freshness=b.freshness<0?a.freshness:a.freshness<0?b.freshness:Math.min(a.freshness,b.freshness);a.quantity-=n;if(!a.quantity)inv[from]=null;return true;}
 if(split)return false;[inv[from],inv[to]]=[inv[to],inv[from]];return true;
}
export function ageInventory(inv:Inventory,dt:number):void {for(const s of inv){if(!s||s.freshness<0)continue;s.freshness=Math.max(0,s.freshness-dt);if(s.freshness===0){const rotten=s.item==='cooked_steak'||s.item==='raw_steak'?'rotten_steak':s.item==='crisps'?'expired_crisps':`rotten_${s.item}`;if(ITEMS[rotten])s.item=rotten;s.freshness=-1;}}}
