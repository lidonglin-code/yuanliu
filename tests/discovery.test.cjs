const {test}=require('node:test'),assert=require('node:assert/strict'),M=require('../dist/discovery-model.js');
test('daily selection stays fixed across reloads and skips unvisited dates without invented history',()=>{
 const state={tasks:[{id:'existing'}]};const first=M.ensure(state,'2026-09-25');assert.equal(state.dailyReadings.length,1);
 assert.equal(M.ensure(state,'2026-09-25'),first);const restored=JSON.parse(JSON.stringify(state));assert.deepEqual(M.ensure(restored,'2026-09-25'),first);
 const second=M.ensure(state,'2026-10-01');assert.notEqual(first.article.id,second.article.id);assert.equal(state.dailyReadings.length,2);assert.equal(state.tasks[0].id,'existing');
});
test('seven curated entries are distinct before repeats are explicitly labelled',()=>{
 const state={};const ids=[];for(let i=1;i<=7;i++){const r=M.ensure(state,`2026-10-0${i}`);assert.equal(r.revisit,false);ids.push(r.article.id);}
 assert.equal(new Set(ids).size,7);assert.equal(M.ensure(state,'2026-10-08').revisit,true);
 assert.notEqual(M.forDate(state,'2026-10-08').article.id,M.forDate(state,'2026-10-07').article.id);
});
test('bookmarks are deduplicated, export full content, and can be removed without losing reading history',()=>{
 const state={};const r=M.ensure(state,'2026-09-25');M.save(state,r.article);M.save(state,r.article);assert.equal(state.insights.length,1);
 const restored=JSON.parse(JSON.stringify(state));assert.deepEqual(restored.insights[0].body,r.article.body);assert.equal(M.find(restored,r.article.id).url,r.article.url);
 M.unsave(restored,r.article.id);assert.equal(restored.insights.length,0);assert.equal(M.find(restored,r.article.id).id,r.article.id);
 assert.equal(M.catalog[0].savedAt,undefined);assert.equal(state.memories,undefined);
});
test('every curated reading includes traceable sources, context and a distinct editorial question',()=>{
 for(const a of M.catalog){assert.equal(new URL(a.url).protocol,'https:');assert.ok(a.source&&a.checkedAt&&a.question&&a.example);assert.ok(a.body.length>=3);assert.equal(a.mode,'curated');}
});

test('source links exclude executable schemes and embedded credentials',()=>{
 assert.equal(M.safeUrl('javascript:alert(1)'),'');assert.equal(M.safeUrl('https://user:secret@example.com'),'');
 assert.equal(M.safeUrl(M.catalog[0].url),M.catalog[0].url);
});
