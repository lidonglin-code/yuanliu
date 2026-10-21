(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ModelRegistry=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const reviewedAt='2026-10-21';
  const tiers={
    economy:{id:'economy',name:'经济'},
    balanced:{id:'balanced',name:'均衡',recommended:true},
    quality:{id:'quality',name:'高质量'}
  };
  const providers=[
    {id:'deepseek',name:'DeepSeek',baseUrl:'https://api.deepseek.com',docs:'https://api-docs.deepseek.com/api/create-chat-completion/',tiers:{economy:{model:'deepseek-flash',thinking:'disabled',reasoningEffort:'low',detail:'DeepSeek Flash · 快速模式'},balanced:{model:'deepseek-flash',thinking:'enabled',reasoningEffort:'low',detail:'DeepSeek Flash · 适度思考'},quality:{model:'deepseek-v4-pro',thinking:'enabled',reasoningEffort:'high',detail:'DeepSeek V4 Pro · 增强思考'}}},
    {id:'siliconflow',name:'硅基流动',baseUrl:'https://api.siliconflow.cn/v1',docs:'https://docs.siliconflow.cn/docs/api/chat-completions-post',tiers:{economy:{model:'stepfun-ai/Step-3.5-Flash',thinking:'disabled',reasoningEffort:'low',detail:'Step-3.5-Flash · 快速生成'},balanced:{model:'Qwen/Qwen3.5-35B-A3B',thinking:'disabled',reasoningEffort:'low',detail:'Qwen3.5-35B-A3B · 稳定生成'},quality:{model:'Qwen/Qwen3.5-397B-A17B',thinking:'enabled',reasoningEffort:'high',detail:'Qwen3.5-397B-A17B · 深度生成'}}},
    {id:'zhipu',name:'智谱 AI',baseUrl:'https://open.bigmodel.cn/api/paas/v4',docs:'https://docs.bigmodel.cn/cn/guide/develop/openai/introduction',tiers:{economy:{model:'glm-4.7-flash',thinking:'disabled',reasoningEffort:'low',detail:'GLM-4.7-Flash · 轻量生成'},balanced:{model:'glm-5.3-flash',thinking:'enabled',reasoningEffort:'low',detail:'GLM-5.3-Flash · 轻量思考'},quality:{model:'glm-5.3',thinking:'enabled',reasoningEffort:'max',detail:'GLM-5.3 · 深度思考'}}},
    {id:'qwen',name:'阿里云百炼',baseUrl:'https://dashscope.aliyuncs.com/compatible-mode/v1',docs:'https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-chat-completions',tiers:{economy:{model:'qwen3.8-flash',thinking:'disabled',reasoningEffort:'none',detail:'Qwen3.8-Flash · 快速生成'},balanced:{model:'qwen3.7-plus',thinking:'enabled',reasoningEffort:'medium',detail:'Qwen3.7-Plus · 均衡推理'},quality:{model:'qwen3.8-max',thinking:'enabled',reasoningEffort:'high',detail:'Qwen3.8-Max · 增强推理'}}},
    {id:'kimi',name:'Kimi',baseUrl:'https://api.moonshot.cn/v1',docs:'https://platform.kimi.com/docs/api/chat',tiers:{economy:{model:'kimi-k2.6',thinking:'enabled',reasoningEffort:'low',detail:'Kimi K2.6 · 轻量推理'},balanced:{model:'kimi-k3',thinking:'enabled',reasoningEffort:'low',detail:'Kimi K3 · 均衡推理'},quality:{model:'kimi-k3',thinking:'enabled',reasoningEffort:'max',detail:'Kimi K3 · 深度推理'}}},
    {id:'openai',name:'OpenAI',baseUrl:'https://api.openai.com/v1',docs:'https://platform.openai.com/docs/models',tiers:{economy:{model:'gpt-5-nano',thinking:'enabled',reasoningEffort:'low',detail:'GPT-5 nano · 低推理强度'},balanced:{model:'gpt-5-mini',thinking:'enabled',reasoningEffort:'medium',detail:'GPT-5 mini · 中等推理强度'},quality:{model:'gpt-5.1',thinking:'enabled',reasoningEffort:'high',detail:'GPT-5.1 · 高推理强度'}}},
    {id:'compatible',name:'其他兼容服务',baseUrl:'',docs:'',requiresModel:true,tiers:{economy:{model:'',thinking:'disabled',reasoningEffort:'low',detail:'自定义模型 · 经济参数'},balanced:{model:'',thinking:'enabled',reasoningEffort:'medium',detail:'自定义模型 · 均衡参数'},quality:{model:'',thinking:'enabled',reasoningEffort:'high',detail:'自定义模型 · 高质量参数'}}}
  ];
  function getProvider(id){return providers.find(item=>item.id===id)||null;}
  function resolveProviderTier(providerId,tierId='balanced'){
    const provider=getProvider(providerId);if(!provider)throw Error('不支持的模型服务商。');
    const tier=provider.tiers[tierId];if(!tier||!tiers[tierId])throw Error('不支持的质量档位。');
    return {...tier,provider:provider.id,providerName:provider.name,tier:tierId,tierLabel:tiers[tierId].name,baseUrl:provider.baseUrl,docs:provider.docs,reviewedAt};
  }
  return {reviewedAt,tiers,providers,getProvider,resolveProviderTier};
});
