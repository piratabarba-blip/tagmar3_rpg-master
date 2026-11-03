import assert from 'node:assert/strict';
import {positionNameBelowBars} from '../modules/compat/barbrawl-visibility.mjs';
const make=({scale=1,pan=0}={})=>({w:100,h:100,document:{getSize:()=>({width:100,height:100})},
  nameplate:{visible:false,position:{set(x,y){this.x=x;this.y=y;}}},bars:{visible:true,children:[]},
  toLocal:p=>({x:(p.x-pan)/scale,y:(p.y-pan)/scale}),scale,pan});
const bar=(t,y,h,extra={})=>({visible:true,getBounds:()=>({x:t.pan,y:t.pan+y*t.scale,width:100*t.scale,height:h*t.scale}),...extra});
const opts={uiScale:1,border:4};
for(const scale of [.25,1,3])for(const pan of [-1000,0,450]){
 const t=make({scale,pan});
 t.bars.children=[bar(t,-30,10),bar(t,-20,10),bar(t,100,12)];
 positionNameBelowBars(t,true,opts);assert.equal(t.nameplate.position.y,116);
 assert.equal(t.nameplate.position.x,50);assert.equal(t.nameplate.visible,false,'Never reveal a hidden name');
 for(let i=0;i<10;i++)positionNameBelowBars(t,true,opts);
 assert.equal(t.nameplate.position.y,116,'No drift on refresh');
 t.bars.children.push(bar(t,112,15));positionNameBelowBars(t,true,opts);assert.equal(t.nameplate.position.y,131);
 t.bars.children.at(-1).visible=false;positionNameBelowBars(t,true,opts);assert.equal(t.nameplate.position.y,116);
 t.bars.visible=false;positionNameBelowBars(t,true,opts);assert.equal(t.nameplate.position.y,103);
 t.bars.visible=true;positionNameBelowBars(t,false,opts);assert.equal(t.nameplate.position.y,103);
 t.bars.children=[bar(t,-30,10),bar(t,200,10,{visible:false}),bar(t,250,10,{renderable:false}),bar(t,300,10,{alpha:0})];
 positionNameBelowBars(t,true,opts);assert.equal(t.nameplate.position.y,103,'Top bars and hidden bars do not push the name down');
 t.bars.children=[];positionNameBelowBars(t,true,opts);assert.equal(t.nameplate.position.y,103);
}
console.log('PASS: top/bottom stacks, hidden bars, zoom/pan, margins, no drift, native restoration and unchanged name visibility.');
