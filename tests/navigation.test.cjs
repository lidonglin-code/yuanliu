const test=require('node:test'),assert=require('node:assert/strict');
const create=require('../dist/navigation.js');
function browser(){
 const entries=[{url:'http://localhost/#today',state:null}],events=new Map();let index=0,context={filter:'all'},renders=0;
 const win={scrollY:0,location:{href:entries[0].url,hash:'#today'},document:{getElementById:()=>({focus(){}})},scrollTo({top}){this.scrollY=top},requestAnimationFrame:fn=>{fn();return 1},cancelAnimationFrame(){},addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:name=>events.delete(name)};
 const move=url=>{win.location.href=new URL(url,win.location.href).href;win.location.hash=new URL(win.location.href).hash;};
 win.history={scrollRestoration:'auto',get state(){return entries[index].state},replaceState(state,unused,url){move(url);entries[index]={url:win.location.href,state}},pushState(state,unused,url){move(url);entries.splice(++index);entries.push({url:win.location.href,state})}};
 const nav=create({win,getContext:()=>({...context}),render:saved=>{renders++;context=saved||{filter:'all'}}});
 const traverse=direction=>{index+=direction;move(entries[index].url);events.get('popstate')();events.get('hashchange')();};
 return{win,nav,entries,events,traverse,setContext:value=>context=value,context:()=>context,renders:()=>renders};
}
test('navigation enters pages at top, avoids duplicate entries and restores history once with context and scroll',()=>{
 const h=browser();h.nav.start();h.win.scrollY=760;h.setContext({filter:'today'});h.nav.go('#projects');assert.equal(h.win.scrollY,0);assert.equal(h.entries.length,2);
 h.nav.go('#projects');assert.equal(h.entries.length,2);const before=h.renders();h.traverse(-1);assert.equal(h.renders(),before+1);assert.equal(h.win.scrollY,760);assert.equal(h.context().filter,'today');
 h.traverse(1);assert.equal(h.win.location.hash,'#projects');assert.equal(h.win.scrollY,0);h.nav.destroy();assert.equal(h.events.size,0);assert.equal(h.win.history.scrollRestoration,'auto');
});
test('within-page tabs preserve scroll and canonical project URLs replace rather than add a second entry',()=>{
 const h=browser();h.nav.start();h.nav.go('#project-123');h.nav.setHash('#project-123?tab=modules&module=demand',{replace:true});assert.equal(h.entries.length,2);
 h.win.scrollY=220;h.nav.go('#month',{keepScroll:true,context:{date:'2026-10-01'}});assert.equal(h.win.scrollY,220);assert.equal(h.context().date,'2026-10-01');
 h.traverse(-1);assert.equal(h.win.location.hash,'#project-123?tab=modules&module=demand');assert.equal(h.win.scrollY,220);h.nav.destroy();
});
