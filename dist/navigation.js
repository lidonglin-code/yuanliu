(function(root,factory){const create=factory();if(typeof module==='object'&&module.exports)module.exports=create;else root.createWorkspaceNavigation=create;})(typeof window==='undefined'?globalThis:window,()=>{
  return function createWorkspaceNavigation({win=window,render,getContext}){
    let serial=0,lastToken='',scrollFrame=0,applying=false;
    const key='workspaceNavigation';
    const token=()=>win.location.hash+'|'+(win.history.state?.[key]?.id||'');
    const nextId=()=>Date.now().toString(36)+'-'+(++serial);
    function remember(y=win.scrollY){
      const prior=win.history.state||{};
      win.history.replaceState({...prior,[key]:{id:prior[key]?.id||nextId(),y,context:getContext()}},'',win.location.href);
      lastToken=token();
    }
    // Used when a rendered project resolves its default module to a canonical URL.
    function setHash(hash,{replace=false}={}){
      if(hash===win.location.hash)return;
      if(!replace)remember();
      const prior=replace?(win.history.state||{}):{};
      win.history[replace?'replaceState':'pushState']({...prior,[key]:{id:replace?prior[key]?.id||nextId():nextId(),y:win.scrollY,context:getContext()}},'',hash);
      lastToken=token();
    }
    function apply(context,y,focus){
      applying=true;
      try{
        render(context);
        if(focus)win.document.getElementById('workspace')?.focus({preventScroll:true});
        win.scrollTo({top:y,left:0,behavior:'instant'});
        remember(y);
      }finally{applying=false;}
    }
    function go(hash,{replace=false,keepScroll=false,context=null}={}){
      const y=keepScroll?win.scrollY:0;
      remember();
      setHash(hash,{replace});
      apply(context,y,!keepScroll);
    }
    function historyChanged(){
      if(token()===lastToken)return;
      const entry=win.history.state?.[key];
      apply(entry?.context||null,entry?.y||0,true);
    }
    function onScroll(){
      if(applying||scrollFrame)return;
      const before=token();
      scrollFrame=win.requestAnimationFrame(()=>{scrollFrame=0;if(!applying&&before===token())remember();});
    }
    const originalRestoration=win.history.scrollRestoration;
    win.history.scrollRestoration='manual';
    win.addEventListener('popstate',historyChanged);win.addEventListener('hashchange',historyChanged);win.addEventListener('scroll',onScroll,{passive:true});
    return {go,setHash,remember,start(){const entry=win.history.state?.[key];apply(entry?.context||null,entry?.y||0,false);},destroy(){if(scrollFrame)win.cancelAnimationFrame(scrollFrame);win.removeEventListener('popstate',historyChanged);win.removeEventListener('hashchange',historyChanged);win.removeEventListener('scroll',onScroll);win.history.scrollRestoration=originalRestoration;}};
  };
});
