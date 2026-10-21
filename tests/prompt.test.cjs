const test=require('node:test'),assert=require('node:assert/strict'),P=require('../dist/prompt-model.js');
test('custom categories and normalized tags are preserved and searchable',()=>{
 const s={prompts:[]};const p=P.save(s,'',{title:'  访谈提纲 ',body:'明确培训目标',category:'业务访谈',tags:'HRBP，访谈, HRBP; 管理者'},'p');
 assert.deepEqual(p.tags,['HRBP','访谈','管理者']);assert.equal(p.category,'业务访谈');assert(P.matches(p,'hrbp 培训'));assert(P.matches(p,'业务访谈'));assert(!P.matches(p,'不存在'));
});
test('editing keeps identity and only the last different version; restore can be reversed',()=>{
 const s={prompts:[]};P.save(s,'',{title:'原名',body:'原文',category:'旧分类',tags:'旧标签'},'p');
 P.save(s,'p',{title:'新名',body:'新文',category:'新分类',tags:'新标签'},'unused');const prior=s.prompts[0].previousVersion;
 P.save(s,'p',{title:'新名',body:'新文',category:'新分类',tags:'新标签'},'unused');assert.deepEqual(s.prompts[0].previousVersion,prior);
 P.restore(s,'p');assert.equal(s.prompts[0].body,'原文');assert.equal(s.prompts[0].category,'旧分类');assert.equal(s.prompts[0].previousVersion.body,'新文');
 P.restore(s,'p');assert.equal(s.prompts[0].body,'新文');assert.equal(s.prompts.length,1);assert.equal(s.prompts[0].id,'p');assert(!s.prompts[0].previousVersion.previousVersion);
});
test('legacy prompts become editable records without losing existing data or pins',()=>{
 const own={id:'own',title:'自己的提示词',body:'正文',previousVersion:{title:'旧标题',body:'旧正文'}};
 const state={prompts:[own],promptPins:['seed-needs'],notes:[{id:'note'}]};
 P.initialize(state);assert.equal(state.prompts.length,7);assert.equal(state.prompts[0],own);assert.deepEqual(state.promptPins,['seed-needs']);assert.deepEqual(state.notes,[{id:'note'}]);
 const prompt=state.prompts.find(p=>p.id==='seed-needs');const before=prompt.body;
 P.save(state,prompt.id,{...prompt,body:'直接修改正文'},'unused');assert.equal(state.prompts.length,7);assert.equal(prompt.previousVersion.body,before);
 const reloaded=JSON.parse(JSON.stringify(state));P.initialize(reloaded);assert.equal(reloaded.prompts.length,7);assert.equal(reloaded.prompts.find(p=>p.id===prompt.id).body,'直接修改正文');
 reloaded.prompts=reloaded.prompts.filter(p=>p.id!==prompt.id);P.initialize(reloaded);assert(!reloaded.prompts.some(p=>p.id===prompt.id));
 reloaded.prompts=[];P.initialize(reloaded);assert.equal(reloaded.prompts.length,0);
});
test('migration preserves an existing record with a starter ID',()=>{
 const state={prompts:[{id:'seed-needs',title:'已修改标题',body:'已修改正文'}]};P.initialize(state);
 assert.equal(state.prompts.length,6);assert.equal(state.prompts[0].body,'已修改正文');
});
test('pinning works for built-in and saved prompts without editing their content',()=>{
 const s={prompts:[]};const catalog=[{id:'mine',body:'私人'}, {id:'seed-needs',body:'参考'}];assert(P.togglePin(s,'seed-needs'));assert.equal(P.sorted(catalog,s.promptPins)[0].id,'seed-needs');assert.equal(catalog[0].id,'mine');assert.equal(P.togglePin(s,'seed-needs'),false);assert.equal(s.prompts.length,0);
});
test('empty input and missing edits fail without creating a record',()=>{
 const s={prompts:[]};assert.throws(()=>P.save(s,'',{title:' ',body:'x'},'p'));assert.throws(()=>P.save(s,'missing',{title:'x',body:'x'},'p'));assert.throws(()=>P.restore(s,'missing'));assert.equal(s.prompts.length,0);
});
