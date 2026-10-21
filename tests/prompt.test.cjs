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
test('loading, restoring and reloading retain only user records, including edited legacy starters',()=>{
 const own={id:'own',title:'自己的提示词',body:'正文',previousVersion:{title:'旧标题',body:'旧正文'}};
 const legacy={id:'seed-needs',title:'已修改标题',body:'已修改正文'};
 const state={prompts:[own,legacy],promptPins:['seed-needs'],notes:[{id:'note'}]};
 P.initialize(state);assert.equal(state.prompts.length,2);assert.equal(state.prompts[0],own);assert.equal(state.prompts[1],legacy);assert.deepEqual(state.promptPins,['seed-needs']);assert.deepEqual(state.notes,[{id:'note'}]);
 P.save(state,legacy.id,{...legacy,body:'再次修改'},'unused');assert.equal(legacy.previousVersion.body,'已修改正文');
 const reloaded=JSON.parse(JSON.stringify(state));P.initialize(reloaded);assert.equal(reloaded.prompts.length,2);assert.equal(reloaded.prompts[1].body,'再次修改');
 reloaded.prompts=[];P.initialize(reloaded);assert.equal(reloaded.prompts.length,0);
});
test('new prompt collections start empty with or without old initialization flags',()=>{
 for(const state of [{},{prompts:[]},{prompts:[],promptLibraryInitialized:1}]){P.initialize(state);assert.deepEqual(state.prompts,[]);P.initialize(state);assert.deepEqual(state.prompts,[]);}
});
test('pinning works for legacy and saved prompts without editing their content',()=>{
 const s={prompts:[]};const catalog=[{id:'mine',body:'私人'}, {id:'seed-needs',body:'参考'}];assert(P.togglePin(s,'seed-needs'));assert.equal(P.sorted(catalog,s.promptPins)[0].id,'seed-needs');assert.equal(catalog[0].id,'mine');assert.equal(P.togglePin(s,'seed-needs'),false);assert.equal(s.prompts.length,0);
});
test('empty input and missing edits fail without creating a record',()=>{
 const s={prompts:[]};assert.throws(()=>P.save(s,'',{title:' ',body:'x'},'p'));assert.throws(()=>P.save(s,'missing',{title:'x',body:'x'},'p'));assert.throws(()=>P.restore(s,'missing'));assert.equal(s.prompts.length,0);
});
