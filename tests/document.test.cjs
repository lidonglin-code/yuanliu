const test=require('node:test');
const assert=require('node:assert/strict');
const D=require('../dist/document-model.js');
test('old text records stay intact and local paths are never opened as URLs',()=>{
 const old={id:'n',title:'方案',body:'原有内容',originProjectId:'p'};
 D.validate(old);assert.equal(old.resourceType,'text');assert.equal(old.body,'原有内容');assert.equal(old.originProjectId,'p');
 assert.equal(D.validate({resourceType:'local',path:'/Users/test/培训.pptx'}).path,'/Users/test/培训.pptx');
 assert.throws(()=>D.webUrl('file:///Users/test/a.docx'));assert.throws(()=>D.validate({resourceType:'local',path:' '}));
});
test('document URLs accept online docs and reject executable or credential-bearing links',()=>{
 assert.equal(D.webUrl('https://example.feishu.cn/docx/abc'),'https://example.feishu.cn/docx/abc');
 for(const link of ['javascript:alert(1)','data:text/html,hi','https://user:password@example.com','not a url'])assert.throws(()=>D.webUrl(link));
});
test('shared chat text captures the link without losing the original message',()=>{
 const raw='培训方案 https://example.feishu.cn/docx/abc。';const captured=D.capture(raw);
 assert.equal(captured.url,'https://example.feishu.cn/docx/abc');assert.equal(captured.title,'培训方案');assert.equal(captured.body,raw);
 assert.equal(D.capture('待确认培训时间').resourceType,'text');assert.equal(D.source({url:'https://doc.weixin.qq.com/doc/test'}),'doc.weixin.qq.com');
});
test('task document references follow edited titles and survive serialization without copies',()=>{
 const state={notes:[{id:'n',title:'旧名称',url:'https://example.com'}]},task={documentIds:['n','missing','n']};
 state.notes[0].title='最终方案';assert.equal(D.linked(state,task).length,1);assert.equal(D.linked(state,task)[0].title,'最终方案');
 assert.deepEqual(D.linked(JSON.parse(JSON.stringify(state)),JSON.parse(JSON.stringify(task))),state.notes);
});

test('one document may belong to several valid modules; clearing all leaves it unassigned, while legacy common documents stay common',()=>{
 const modules=[{id:'design',title:'方案设计'},{id:'content',title:'内容开发'}],doc={id:'d',url:'https://example.com',body:'旧文本'};
 assert.equal(D.matchesModule(doc,'__general',modules),true);
 D.assignModules(doc,['design','content','design'],modules);
 assert.deepEqual(doc.moduleIds,['design','content']);assert.equal(D.matchesModule(doc,'content',modules),true);assert.equal(D.matchesModule(doc,'__general',modules),false);
 assert.throws(()=>D.assignModules(doc,['another-project-module'],modules));assert.deepEqual(doc.moduleIds,['design','content']);
 modules[0].title='方案评审';assert.equal(D.matchesModule(doc,'design',modules),true);
 assert.deepEqual(JSON.parse(JSON.stringify(doc)).moduleIds,['design','content']);
 D.assignModules(doc,[],modules);assert.equal(D.matchesModule(doc,'__general',modules),false);assert.equal(D.matchesModule(doc,'__unassigned',modules),true);assert.equal(D.matchesModule(doc,'content',modules),false);assert.equal(doc.body,'旧文本');
});
test('task document ranking puts its module then common documents before other modules',()=>{
 const modules=[{id:'a'},{id:'b'}];const docs=[{id:'other',projectId:'p',moduleIds:['b']},{id:'foreign',projectId:'q',moduleIds:['a']},{id:'common',projectId:'p'},{id:'local',projectId:'p',moduleIds:['a']}];
 docs.sort((a,b)=>D.priority(a,'p','a',modules)-D.priority(b,'p','a',modules));
 assert.deepEqual(docs.map(d=>d.id),['local','common','other','foreign']);
 assert.deepEqual(D.moduleIds({moduleIds:['stale']},modules),[]);
});
