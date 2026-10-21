const test=require('node:test'),assert=require('node:assert/strict'),R=require('../dist/model-registry.js');

test('every BYOK provider exposes three transparent quality tiers',()=>{
  assert.equal(R.reviewedAt,'2026-10-21');
  assert.deepEqual(Object.keys(R.tiers),['economy','balanced','quality']);
  for(const provider of R.providers){
    for(const tier of Object.keys(R.tiers)){
      const resolved=R.resolveProviderTier(provider.id,tier);
      assert.equal(resolved.provider,provider.id);
      assert.equal(resolved.tier,tier);
      assert.ok(resolved.detail);
      assert.ok(['enabled','disabled'].includes(resolved.thinking));
      assert.ok(resolved.reasoningEffort);
      if(!provider.requiresModel){assert.ok(resolved.baseUrl);assert.ok(resolved.model);}
    }
  }
});

test('registry routes the recommended tier without requiring a typed model id',()=>{
  assert.equal(R.resolveProviderTier('deepseek').model,'deepseek-flash');
  assert.equal(R.resolveProviderTier('qwen').model,'qwen3.7-plus');
  assert.equal(R.resolveProviderTier('kimi','quality').model,'kimi-k3');
  assert.throws(()=>R.resolveProviderTier('unknown'),/不支持/);
});
