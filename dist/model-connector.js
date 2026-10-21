(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./model-registry.js'):root.ModelRegistry);if(typeof module==='object'&&module.exports)module.exports=api;else root.ModelConnector=api;})(typeof globalThis!=='undefined'?globalThis:this,function(Registry){
  function createModelConnector({apiBase='/api/model',sessionToken='',fetchImpl=typeof fetch==='function'?fetch.bind(globalThis):null}={}){
    let activeConfig=null,token=sessionToken;
    async function post(path,body,signal){
      if(!fetchImpl)throw Error('当前环境不支持网络请求。');
      let response;try{response=await fetchImpl(apiBase+'/'+path,{method:'POST',headers:{'Content-Type':'application/json','X-Yuanliu-Session':token},body:JSON.stringify(body),signal});}catch(error){if(signal?.aborted)throw error;throw Error('无法连接本机模型网关，请运行「启动源流.command」后重试。');}
      const result=await response.json().catch(()=>({}));if(!response.ok)throw Error(result.error||`请求未完成（${response.status}）`);return result;
    }
    function publicConfig(){if(!activeConfig)return null;const {apiKey,...safe}=activeConfig;return safe;}
    return {
      setSessionToken(value){token=String(value||'');},
      resolve(provider,tier='balanced'){return Registry.resolveProviderTier(provider,tier);},
      async connect({provider,tier='balanced',apiKey,baseUrl,model},signal){
        const preset=Registry.resolveProviderTier(provider,tier),key=String(apiKey||'').trim();if(!key)throw Error('请填写 API Key。');
        const config={...preset,baseUrl:String(baseUrl||preset.baseUrl).trim(),model:String(model||preset.model).trim(),apiKey:key};
        if(!config.baseUrl)throw Error('请填写 API 地址。');if(!config.model)throw Error('请填写模型 ID。');
        await post('test',{config},signal);activeConfig=config;return publicConfig();
      },
      async chat({messages,maxTokens=3000,responseSchema},signal){if(!activeConfig)throw Error('请先连接模型。');return post('chat',{config:activeConfig,messages,maxTokens,responseSchema},signal);},
      disconnect(){activeConfig=null;},
      isConnected(){return !!activeConfig;},
      publicConfig
    };
  }
  return {createModelConnector};
});
