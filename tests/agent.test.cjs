const test=require('node:test'),assert=require('node:assert/strict'),M=require('../dist/agent-model.js');
test('new website collections remain empty across reloads',()=>{
 const state={agents:[],skills:[{id:'s'}]};M.initialize(state);
 assert.deepEqual(state.agents,[]);assert.equal(state.skills.length,1);
 const persisted=JSON.parse(JSON.stringify(state));M.initialize(persisted);assert.deepEqual(persisted.agents,[]);
});
test('initialization preserves only existing site URLs, descriptions, statuses and pins',()=>{
 const existing={id:'mine',title:'我的工具导航',url:'https://example.com',description:'自己的使用心得',status:'active',pinned:true};
 const state={agents:[existing],agentSamplesVersion:1};M.initialize(state);assert.equal(state.agents.length,1);assert.deepEqual(state.agents[0],existing);
 state.agents=[];M.initialize(state);assert.deepEqual(state.agents,[]);
});
test('website collections are independent from skills and preserve user edits',()=>{
 const state={skills:[{id:'s',url:'https://example.com',title:'原有 Skill'}],agents:[]};
 const item=M.save(state,'',{title:'AI 网站',url:'example.com',category:'写作',tags:'文案，中文',description:'写作辅助'},'a');item.pinned=true;
 M.save(state,'a',{...item,title:'我的写作工具',status:'active'},'unused');
 assert.equal(state.agents.length,1);assert.equal(item.pinned,true);assert.equal(state.skills[0].title,'原有 Skill');assert(M.matches(item,'中文 写作'));assert.equal(M.source(item.url).host,'example.com');
 const backup=JSON.parse(JSON.stringify(state));assert.equal(backup.agents[0].title,'我的写作工具');assert.equal(backup.agents[0].status,'active');
});
test('duplicates and unsafe addresses cannot alter the saved website list',()=>{
 const state={agents:[]};M.save(state,'',{title:'网站',url:'https://example.com'},'a');
 assert.throws(()=>M.save(state,'',{title:'重复',url:'https://example.com/'},'b'),/已经收藏/);
 assert.throws(()=>M.save(state,'a',{title:'错误',url:'javascript:alert(1)'},'unused'));
 assert.throws(()=>M.save(state,'missing',{title:'错误',url:'https://example.org'},'unused'),/网站/);
 assert.equal(state.agents.length,1);assert.equal(state.agents[0].title,'网站');
});
