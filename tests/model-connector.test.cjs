const test=require('node:test'),assert=require('node:assert/strict'),C=require('../dist/model-connector.js');

function response(value,status=200){return {ok:status>=200&&status<300,status,json:async()=>value};}

test('connector keeps the key in memory and sends normalized contracts',async()=>{
  const calls=[];
  const connector=C.createModelConnector({sessionToken:'session',fetchImpl:async(url,options)=>{calls.push({url,options,body:JSON.parse(options.body)});return response(url.endsWith('/test')?{ok:true}:{ok:true,content:'{}',model:'deepseek-flash'});}});
  const publicConfig=await connector.connect({provider:'deepseek',tier:'balanced',apiKey:'secret'});
  assert.equal(publicConfig.model,'deepseek-flash');assert.equal('apiKey' in publicConfig,false);
  assert.equal(connector.publicConfig().apiKey,undefined);
  await connector.chat({messages:[{role:'user',content:'hello'}],maxTokens:1000});
  assert.equal(calls[0].url,'/api/model/test');assert.equal(calls[0].body.config.apiKey,'secret');
  assert.equal(calls[0].options.headers['X-Yuanliu-Session'],'session');
  assert.equal(calls[1].url,'/api/model/chat');assert.equal(calls[1].body.config.apiKey,'secret');
  connector.disconnect();assert.equal(connector.publicConfig(),null);
});

test('failed real test never replaces an active connection',async()=>{
  let fail=false;
  const connector=C.createModelConnector({fetchImpl:async()=>fail?response({error:'denied'},401):response({ok:true})});
  await connector.connect({provider:'openai',tier:'economy',apiKey:'first'});fail=true;
  await assert.rejects(()=>connector.connect({provider:'qwen',tier:'quality',apiKey:'second'}),/denied/);
  assert.equal(connector.publicConfig().provider,'openai');
});

test('compatible provider requires explicit advanced values',async()=>{
  const connector=C.createModelConnector({fetchImpl:async()=>response({ok:true})});
  await assert.rejects(()=>connector.connect({provider:'compatible',tier:'balanced',apiKey:'key'}),/API 地址/);
  const cfg=await connector.connect({provider:'compatible',tier:'balanced',apiKey:'key',baseUrl:'https://example.test/v1',model:'my-model'});
  assert.equal(cfg.model,'my-model');
});
