import { DATA } from '../content';
export interface Settings {music:number;effects:number;ui:number;zoom:number;quality:number;particles:boolean;showHints:boolean}
export const defaultSettings:Settings={music:.32,effects:.65,ui:.55,zoom:1,quality:1,particles:true,showHints:true};
export function readSettings(value:unknown):Settings {const s={...defaultSettings};if(!value||typeof value!=='object')return s;const input=value as Record<string,unknown>;for(const key of ['music','effects','ui','zoom','quality'] as const){const v=input[key];if(typeof v==='number'&&Number.isFinite(v)){const bounds=key==='zoom'?[.65,1.6]:key==='quality'?[.5,2]:[0,1];s[key]=Math.max(bounds[0],Math.min(bounds[1],v));}}for(const key of ['particles','showHints'] as const)if(typeof input[key]==='boolean')s[key]=input[key];return s;}
export class AudioSystem {
 private voices:HTMLAudioElement[]=[];private music:HTMLAudioElement|null=null;private ambience:HTMLAudioElement|null=null;private started=false;private paused=false;private track=0;private lastGeiger=0;
 constructor(public settings:Settings){}
 start(){if(this.started)return;this.started=true;this.nextTrack();if(DATA.audio.ambient8){this.ambience=new Audio(DATA.audio.ambient8);this.ambience.loop=true;this.ambience.volume=this.settings.effects*.12;if(!this.paused)this.ambience.play().catch(()=>{});}}
 private nextTrack(){const tracks=DATA.audio.music as string[];if(!tracks.length)return;this.music=new Audio(tracks[this.track++%tracks.length]);this.music.volume=this.settings.music;this.music.addEventListener('ended',()=>this.nextTrack());if(!this.paused)this.music.play().catch(()=>{});}
 effect(id:string,distance=0){if(!this.started||this.paused)return;const source=(DATA.audio as Record<string,unknown>)[id];if(typeof source!=='string')return;this.voices=this.voices.filter(v=>!v.ended&&!v.paused);if(this.voices.length>=16){this.voices[0].pause();this.voices.shift();}const audio=new Audio(source);const ui=['button','open','craft','skill','levelup','play'].includes(id);audio.volume=(ui?this.settings.ui:this.settings.effects)*Math.max(0,1-distance/900);if(!audio.volume)return;audio.play().catch(()=>{});this.voices.push(audio);}
 update(settings:Settings){this.settings=settings;if(this.music)this.music.volume=settings.music;if(this.ambience)this.ambience.volume=settings.effects*.12;}
 radiation(value:number,now:number){if(value<8||now-this.lastGeiger<2200-7*value)return;this.lastGeiger=now;this.effect('geiger');}
 pause(value:boolean){this.paused=value;if(value){this.music?.pause();this.ambience?.pause();for(const v of this.voices)v.pause();}else{this.music?.play().catch(()=>{});this.ambience?.play().catch(()=>{});}}
}
