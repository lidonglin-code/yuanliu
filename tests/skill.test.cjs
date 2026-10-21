const test=require('node:test'),assert=require('node:assert/strict'),M=require('../dist/skill-model.js');
test('invocation copies a skill name or an explicit custom prompt and survives edits',()=>{
 const url='https://github.com/anthropics/skills/tree/main/skills/pptx';
 assert.equal(M.invocation({url}),'/pptx');assert.equal(M.invocation({url:url+'/SKILL.md'}),'/pptx');
 assert.equal(M.invocation({url:'https://github.com/anthropics/skills/tree/main'}),'请使用这个 Skill：https://github.com/anthropics/skills/tree/main');
 assert.equal(M.invocation({url:'https://example.com/tool'}),'请使用这个 Skill：https://example.com/tool');
 const state={skills:[]};M.save(state,'',{url,title:'演示',invokeText:'  请调用 /pptx，制作培训课件。  '},'s');
 assert.equal(M.invocation(state.skills[0]),'请调用 /pptx，制作培训课件。');
 M.save(state,'s',{title:'新名称',url},'unused');assert.equal(M.invocation(state.skills[0]),'请调用 /pptx，制作培训课件。');
 assert.equal(M.invocation(JSON.parse(JSON.stringify(state.skills[0]))),'请调用 /pptx，制作培训课件。');
});
test('a fresh browser receives no default skills and reload stays empty',()=>{
 const state={skills:[],notes:[{id:'old-note'}]};M.initialize(state);
 assert.deepEqual(state.skills,[]);assert.equal(state.notes[0].id,'old-note');
 const saved=JSON.parse(JSON.stringify(state));M.initialize(saved);assert.deepEqual(saved.skills,[]);
});
test('collection initialization keeps existing custom edits and pins, without adding records',()=>{
 const item={id:'sample-skill-pptx',url:'https://example.com/edited-skill',title:'我的修改',status:'active',pinned:true};
 const state={skills:[item,{id:'mine',title:'其他收藏',url:'https://example.com/skill'}],skillSamplesVersion:1};M.initialize(state);
 assert.equal(state.skills.length,2);assert.deepEqual(state.skills[0],item);
 state.skills=[];M.initialize(state);assert.deepEqual(state.skills,[]);
});
test('accept repository and skill directory links and reject executable or credential-bearing URLs',()=>{
 assert.equal(M.link('github.com/owner/repo/'),'https://github.com/owner/repo');
 assert.equal(M.source('https://github.com/owner/repo/tree/main/skills/doc/SKILL.md').name,'doc');
 assert.equal(M.source('https://gitlab.com/group/repo').platform,'GitLab');
 for(const value of ['javascript:alert(1)','data:text/html,hello','file:///tmp/skill','https://user:password@github.com/repo','not a link',''])assert.throws(()=>M.link(value));
});
test('save and edit preserve identity, pin and creation date; prevent duplicates without losing changes',()=>{
 const state={skills:[],notes:[{id:'legacy'}]};M.save(state,'',{title:'课程开发',url:'github.com/owner/repo',category:'培训',tags:'课程，PPT,课程'},'s1');
 const item=state.skills[0],created=item.createdAt;item.pinned=true;
 M.save(state,'s1',{title:'课程设计',url:item.url,description:'编写大纲',status:'active'},'unused');
 assert.equal(state.skills.length,1);assert.equal(item.id,'s1');assert.equal(item.pinned,true);assert.equal(item.createdAt,created);assert.equal(item.status,'active');assert.equal(state.notes.length,1);
 assert.throws(()=>M.save(state,'',{title:'重复',url:'https://github.com/owner/repo/'},'s2'),/已经收藏/);assert.equal(state.skills.length,1);
 assert.throws(()=>M.save(state,'removed',{title:'失效',url:item.url},'s3'));assert.throws(()=>M.save(state,'',{title:' ',url:item.url},'s4'));
});
test('distinct skills within a repository stay separate and backup round-trip preserves search and pins',()=>{
 const state={skills:[]};M.save(state,'',{title:'文档',url:'https://github.com/owner/repo/tree/main/doc',tags:'PPT，课程',status:'trying'},'a');
 M.save(state,'',{title:'表格',url:'https://github.com/owner/repo/tree/main/sheets'},'b');state.skills.find(s=>s.id==='a').pinned=true;
 const backup=JSON.parse(JSON.stringify(state));assert.equal(backup.skills.length,2);assert.equal(M.sorted(backup.skills)[0].id,'a');assert(M.matches(backup.skills[1],'ppt 课程'));assert(M.matches(backup.skills[1],'owner 试用中'));
});
