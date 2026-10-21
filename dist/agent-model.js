(function(root){
  const links=typeof module!=='undefined'&&module.exports?require('./skill-model.js'):root.SkillModel;
  const statuses=links.statuses;
  function initialize(state){if(!Array.isArray(state.agents))state.agents=[];return state;}
  function link(value){try{return links.link(value);}catch(err){throw Error(err.message.replaceAll('Skill 地址','网站地址'));}}
  function source(value){try{const host=new URL(link(value)).hostname.replace(/^www\./,'');return {host,name:host.split('.')[0]};}catch{return {host:'链接待修正',name:''};}}
  function save(state,id,data,newId){
    const bucket={skills:state.agents||[]};
    try{const item=links.save(bucket,id,data,newId);state.agents=bucket.skills;return item;}catch(err){throw Error(err.message.replaceAll('Skill','网站'));}
  }
  const api={statuses,link,source,save,initialize,tags:links.tags,matches:links.matches,sorted:links.sorted};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.AgentModel=api;
})(typeof window==='undefined'?globalThis:window);
