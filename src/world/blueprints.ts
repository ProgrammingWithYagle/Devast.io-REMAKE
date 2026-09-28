// Authored tile transcriptions of Stage 1 House 1 through House 10 and the nine-building city overview.
// Decorative pixels and exact tile measurements are not asserted to match the original server map.
import {computerComplex,logicVault,protectedHouse} from './puzzles';
export interface Component {type:string;x:number;y:number;rotation?:number;tag?:string;pulseSeconds?:number}
export interface Blueprint {id:string;name:string;rows:string[];wall?:string;floor?:string;components?:Component[]}
export const HOUSES:Blueprint[]=[
 {id:'house_1',name:'Abandoned residence',rows:[
 '  ###  #####DD#','  #,,###B,b#,,#','  #,T,b#,,,#,,#','###k,,,#,,,D,,#','#B#,,,,#,,#####','#,D,,,,,,,##gS#','#,D,,,,#,,D,,b#','#,##,,,#####D##','#g#o,,b#       ','#,##,c,#       ','###,T,b#       ','  ##DD##       ']},
 {id:'house_2',name:'Divided residence',rows:[
 '    ##D####','#####k,,,t#','#,,,###D###','D,,,D,,,b,#','#,,,D,,,B,#','##D######D#',' #,,,,,,,,#',' #b,,V,,o,#',' #b,,T,,o,D',' #b,,,,,,,#',' ######D###']},
 {id:'house_3',name:'Boxing ring',rows:[
 '###########','#,,,b,v,,,#','#=LLLdLLL=#','#=L.....L=#','#=L.....L=#','#=L.....L=#','#=LLLdLLL=#','#,s,,,,,s,#','###DDDD####','#PP,,,,,PP#','####DD#####'],components:[
 {type:'lamp',x:1,y:1},{type:'lamp',x:9,y:1},{type:'lamp',x:1,y:7},{type:'lamp',x:9,y:7}]},
 {id:'house_4',name:'Wooden hut',wall:'wood_wall',rows:[
 '####DD####','#PV,,,bB,#','#o,,,,,,,#','D,,,,,,,,D','#k,,,s,,b#','#t,,,,,,,#','####DD####'],components:[{type:'lamp',x:4,y:4}]},
 {id:'house_5',name:'Wooden corner house',wall:'wood_wall',rows:[
 '####DD###','#o,,,,b##','#T,,,,,,D','#P,o,,,,D','#b,,,,,k#','#########']},
 {id:'house_6',name:"Shrink's office",rows:[
 ',,,,,,,      ','#MMAAMM#,kk,#','#,,,,,,D,,,,#','#oTT,o#,,t,,#','#,TT,,###D###','#,,,,,#     #','###D###     #','#,,,,,#     #','#,b,,,#     #','D,T,,,s     #','#,,o,,b     #','##DD###     #'],components:[
 {type:'lamp',x:1,y:0},{type:'platform',x:2,y:0},{type:'cable',x:3,y:0},{type:'cable',x:4,y:0},{type:'platform',x:5,y:0},{type:'lamp',x:6,y:0},
 {type:'lamp',x:1,y:2},{type:'platform',x:2,y:2},{type:'cable',x:3,y:2},{type:'cable',x:4,y:2},{type:'cable',x:5,y:2},{type:'lamp',x:6,y:2},
 ...[3,4,5,6,7,8].map(y=>({type:'cable_wall',x:6,y}))]},
 {id:'house_7',name:'Courtyard residence',rows:[
 ' ##DD#########',' #      #t,k,#','##DD### #,,,,#','#b,,,,# ##D###','#oT,V,D,,,,B,#','#o,,,,#D######','D,,,,,D,,#g,S#','#,,,,,##D#,,,#','###D####D#####','#k,,,,#r,,,,,D','D,,,,,#,,,,,,#','#bbb,,########','##############']},
 {id:'house_8',name:'Internet cafe',rows:[
 '#################','#,PPPP,,#o,o,,,,#','#,oooo,,#v,,,,,,#','#v,,,,,,A,,,,,,,D','###D####A###DD###','#k,#,ooo#T,,b,b,#','#t,#,PPP#===s,V,#','##########D######','         #S,k#   ','         #g,b#   ','         #####   '],components:[{type:'cable_wall',x:8,y:5},{type:'cable_wall',x:8,y:6}]},
 {id:'house_9',name:'Protected house',rows:[
 '     #p p#   ','#####MAAM#   ','#,,,##c,,##  ','#,bb##,G,,## ','#sss##,,,,k# ','#MMM##c,,,,# ','#=n,DD,B,,,# ','#S,=G#B,T,,# ','########D### ','     #k,,,t# ','     #,,,,S# ','     #######']},
 {id:'house_10',name:'Northern office',rows:[
 '#####D#####     #','#b,,B,,,k,#D#####','#b,,,,,,k,#b,,,,#','#P,,,T,,,,#,,,t,#','#b,,,,,,,,#,,,k,#','#P,o,b,,,,#,,,###','########D#D,,,b#','       ####DD###']}
];
export const CITY:Blueprint[]=[
 {id:'city_1',name:'West outpost',rows:['######','#cc..#','#....#','#b.k.#','##DD##']},
 {id:'city_2',name:'Computer complex',rows:[
 '   ###########   ','   #bk..#b...#   ','   #....#..k.#   ','####D###D######  ','#k............## ','#......b.......# ','#...###AA###..c# ','#c..#C=CC=C#..b# ','##..#C=CC=C#..## ',' #..#======#..#  ',' #..#ssssss#..#  ',' #..##A==A##..#  ',' #............#  ',' #B...........#  ',' ######DD######  ']},
 {id:'city_3',name:'Vault house',wall:'metal_wall',rows:['##########','#k...M.b.#','#....M...#','#....A.SS#','#B...M...#','###DD#####']},
 {id:'city_4',name:'Old apartments',rows:['#########','#B,,#c,,#','#,T,D,,,D','#k,b#,,,#','#####D###']},
 {id:'city_5',name:'Switch house',rows:[
 '      ,    ','   ###m### ','   #bB,,,# ','####,,,,,# ','#bS#,,,,,# ','#,,#l#,,,# ','#,,#,#,,,m,','#S,A=P,,,m,','####s#B,,# ','   #p#,,,# ','   ###mm## '],components:[
 {type:'lamp',x:6,y:0},{type:'lamp',x:10,y:6},{type:'lamp',x:10,y:7},{type:'lamp',x:6,y:9},{type:'lamp',x:7,y:9}]},
 {id:'city_6',name:'Grand residence',rows:[
 '  #######      ','  #g,c,,###    ','###,,,T,,,#####','#c,,,,,o,,#B,b#','#,,T,###D##,,,#','#b,,,D,,,,D,c,#','###D##,o,o###D#','  #B,#,,,,#k,t#','  #,,D,,,,D,,,#','  #b,##D####D##','  ####b,,,c,,# ','     ###DD#### ']},
 {id:'city_7',name:'Logic vault',rows:[
 '###############','#sss==nG====,b#','#MMMMMAMMMMMM,#','#S=CC#,,,,,,M,#','#MMMM#,sss,,M,#','#,,,,#,,T,,,M,#','#c,,,G,,,,,,M,#','#c,,,M,ppp,,M,#','#,,,,M,,,,,,M,#','#b,,,#,,,,,,M,#','######DD#######']},
 {id:'city_8',name:'South residence',rows:['###########','#k,b,#c,,,#','#,,,,D,,,,#','###D##,,T,#','#B,,b#,,,,D','#,,,,D,,b,#','#####DD####']},
 {id:'city_9',name:'Refinery',wall:'metal_wall',rows:['########','#r,r#r,#','#,,,D,,#','#r,r#r,#','###DD###']}
];
export const CAVE:Blueprint={id:'cave',name:'Stone cave',wall:'cave_wall',floor:'cave_floor',rows:[
 '  XXXXXXXXXXX         ',' XX.........XXX       ',' X...XX.......XX      ','XX...XXXXX.....XXXXXXX','X.....XXXXXX...X.....X','X......XXX.....X.B.B.X','XX.....XXXXX..XX.....X',' XXX.....XXXX.XX..b..X','   XX......XX.XX.c.S.X','    XXXX......D......X','       XXXX..XXXXXXDXX','          XX..XX      ','           X..X       '
]};
CITY[1]=computerComplex();
CITY[6]=logicVault();
HOUSES[8]=protectedHouse();
