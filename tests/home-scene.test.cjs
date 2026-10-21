const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function harness(reduce=false){
 const listeners=()=>({events:new Map(),addEventListener(k,v){this.events.set(k,v)},removeEventListener(k){this.events.delete(k)}});
 const control={...listeners(),setAttribute(k,v){this[k]=v}},host={...listeners(),getBoundingClientRect:()=>({left:0,top:0,width:1400,height:800})};
 let paints=0,id=0;const frames=new Map(),storage=new Map(),observers=[],timers=new Map();
 const ctx=new Proxy({clearRect(){paints++},createRadialGradient(){return{addColorStop(){}}},createLinearGradient(){return{addColorStop(){}}}},{get:(o,k)=>k in o?o[k]:(()=>{})});
 const canvas={getContext:()=>ctx,closest:()=>host,getBoundingClientRect:()=>({width:1400,height:800})};
 const document={...listeners(),hidden:false,documentElement:{dataset:{theme:'dark'}},body:{classList:{toggle(){},remove(){}}}},media={...listeners(),matches:reduce};
 class Observer{constructor(cb){this.cb=cb;observers.push(this)}observe(){}disconnect(){this.disconnected=true}}
 const win=listeners();
 const env={window:win,setTimeout:cb=>{timers.set(++id,cb);return id},clearTimeout:id=>timers.delete(id),document,matchMedia:()=>media,devicePixelRatio:2,ResizeObserver:Observer,IntersectionObserver:Observer,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},requestAnimationFrame:cb=>{frames.set(++id,cb);return id},cancelAnimationFrame:k=>frames.delete(k)};
 vm.runInNewContext(fs.readFileSync(require.resolve('../dist/home-scene.js'),'utf8'),env);
 return{scene:env.window.HomeScene,canvas,control,host,document,media,frames,observers,storage,win,timers,paints:()=>paints};
}
test('home animation runs automatically and releases observers and frames when leaving',()=>{
 const h=harness();h.scene.mount(h.canvas);assert.equal(h.frames.size,1);assert.ok(h.paints()>0);
 h.scene.destroy();assert.equal(h.host.events.size,0);assert.equal(h.document.events.size,0);assert.equal(h.media.events.size,0);assert.ok(h.observers.every(o=>o.disconnected));
 h.scene.mount(h.canvas);assert.equal(h.frames.size,1);h.scene.destroy();assert.equal(h.frames.size,0);
});
test('reduced motion renders a static scene and background tabs stop scheduling animation',()=>{
 const h=harness(true);h.scene.mount(h.canvas);assert.ok(h.paints()>0);assert.equal(h.frames.size,0);
 h.media.matches=false;h.media.events.get('change')();assert.equal(h.frames.size,1);
 h.document.hidden=true;h.document.events.get('visibilitychange')();assert.equal(h.frames.size,0);
 h.document.hidden=false;h.document.events.get('visibilitychange')();assert.equal(h.frames.size,1);
 h.scene.mount(h.canvas,h.control);assert.equal(h.frames.size,1);h.scene.destroy();assert.equal(h.frames.size,0);
});

test('scrolling yields animation work and resumes automatically',()=>{
 const h=harness();h.scene.mount(h.canvas);
 const paints=h.paints();h.win.events.get('scroll')();
 assert.equal(h.frames.size,0);assert.equal(h.paints(),paints);assert.equal(h.storage.size,0);
 h.win.events.get('scroll')();assert.equal(h.timers.size,1);
 const resume=[...h.timers.values()][0];h.timers.clear();resume();assert.equal(h.frames.size,1);
 h.win.events.get('scroll')();h.scene.destroy();
 assert.equal(h.timers.size,0);assert.equal(h.win.events.size,0);assert.equal(h.frames.size,0);
});

test('changing theme redraws a reduced-motion scene without restarting animation',()=>{
 const h=harness(true);h.scene.mount(h.canvas);const before=h.paints();
 h.document.documentElement.dataset.theme='light';h.document.events.get('themechange')();
 assert.equal(h.paints(),before+1);assert.equal(h.frames.size,0);
 h.scene.destroy();assert.equal(h.document.events.has('themechange'),false);
});
