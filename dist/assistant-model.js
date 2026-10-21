(function(root){
  const iso=d=>new Date(d-d.getTimezoneOffset()*60000).toISOString().slice(0,10);
  function number(s){if(/^\d+$/.test(s))return +s;const chars='零一二三四五六七八九';if(s==='两')return 2;if(s.includes('十')){const [a,b]=s.split('十');return (a?chars.indexOf(a):1)*10+(b?chars.indexOf(b):0);}return chars.indexOf(s);}
  function parse(text,today=iso(new Date())){
    const raw=text.trim();if(!raw)return {text:'请写下要安排或保存的内容。'};
    const t=raw.replace(/(上午|下午|晚上|中午)?\s*(\d{1,2}|[零一二两三四五六七八九十]+)点(半|[零一二两三四五六七八九十]+分?)?/g,(_,period,h,m)=>{let hour=number(h);if(/下午|晚上/.test(period||'')&&hour<12)hour+=12;return ` ${String(hour).padStart(2,'0')}:${String(m==='半'?30:m?number(m.replace('分','')):0).padStart(2,'0')} `;});
    const dm=t.match(/今天|明天|后天|(?:下周|本周)[一二三四五六日天]|\d{4}[-年]\d{1,2}[-月]\d{1,2}日?/),tm=t.match(/\b([01]?\d|2[0-3])[:：]([0-5]\d)\b/);
    let date='';if(dm){const d=new Date(today+'T12:00:00'),v=dm[0];if(/^\d/.test(v)){const a=v.match(/\d+/g);date=`${a[0]}-${a[1].padStart(2,'0')}-${a[2].padStart(2,'0')}`;}else {if(v==='明天')d.setDate(d.getDate()+1);else if(v==='后天')d.setDate(d.getDate()+2);else if(/周/.test(v)){const day='一二三四五六日'.indexOf(v.slice(-1).replace('天','日'));d.setDate(d.getDate()-((d.getDay()+6)%7)+day+(v.startsWith('下周')?7:0));}date=iso(d);}}
    if(date&&(isNaN(Date.parse(date))||iso(new Date(date+'T12:00:00'))!==date))return {text:'日期似乎无效，请补充一个有效日期。'};
    const time=tm?tm[1].padStart(2,'0')+':'+tm[2]:'';
    const explicitTask=/^(?:请|帮我|请帮我)?\s*(?:记一个任务|新建任务|新增任务|任务[:：])/.test(raw);
    const noteCue=/^(?:请|帮我|请帮我)?\s*(?:记一条|保存|收藏|记录一下|新增资料|资料[:：]|笔记[:：])/.test(raw);
    const projectCue=/^(?:请|帮我|请帮我)?\s*(?:建立|创建|新建|新增)(?:一个)?[^，。]*项目/.test(raw);
    const type=explicitTask?'task':noteCue?'note':projectCue?'project':time||/会议|开会|日程|约谈|面谈/.test(raw)?'event':'task';
    if(type==='event'&&!date)return {text:'请补充日程日期，例如“明天下午三点和业务方开会”。'};
    let title=t.replace(/^(帮我|请帮我|请)\s*/,'').replace(/^(记一个任务|记一条|记录一下|安排|添加|新增|新建|创建|建立一个|保存|收藏)[:：]?\s*/,'');
    if(type!=='note'){if(dm)title=title.replace(dm[0],'');if(tm)title=title.replace(tm[0],'');title=title.replace(/^[\s，,:：]+/,'');}title=title.replace(/^(任务|日程|项目|资料|笔记)[:：]\s*/,'').trim();
    if(!title)return {text:'请补充具体要做什么。'};
    const data=type==='task'?{title,plannedDate:date,due:'',description:time?'建议时间：'+time:''}:type==='event'?{title,date,time,kind:'日程',location:''}:type==='project'?{title,projectMode:/培训|训练营/.test(raw)?'training':'general',category:'未分类',status:'planning'}:{title,body:raw,resourceType:'text'};
    return {text:'已整理为一份草稿，可切换类型或修改后保存。',action:{type,data}};
  }
  function convert(action,type){
    if(!['task','event','project','note'].includes(type))throw Error('不支持的记录类型');
    if(action.type===type)return action;
    const old=action.data,data={...old};
    if(type==='task'){data.plannedDate=old.plannedDate||old.date||'';data.due=old.due||'';if(old.time&&!old.description)data.description='建议时间：'+old.time;}
    if(type==='event'){data.date=old.date||old.plannedDate||'';data.time=old.time||'';data.kind='日程';}
    if(type==='project'){data.projectMode=old.projectMode||'general';data.category=old.category||'未分类';data.status='planning';}
    if(type==='note'){data.resourceType=old.url?'web':'text';data.body=old.body||old.description||old.title;}
    return {type,data};
  }
  const api={parse,convert};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.AssistantModel=api;
})(typeof window==='undefined'?globalThis:window);
