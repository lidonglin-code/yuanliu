/* Local, decorative canvas. No network, telemetry or generated business data. */
(() => {
  let dispose = null;
  function destroy() { if (dispose) dispose(); dispose = null; }
  function mount(canvas) {
    destroy();
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const host = canvas.closest('.home-universe');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0, last = 0, time = 0, width = 0, height = 0, visible = true, disposed = false;
    let pointerX = 0, pointerY = 0, driftX = 0, driftY = 0;
    let scrolling = false, scrollTimer = 0;
    const stars = Array.from({length:110}, (_,i) => ({x:((i*197+37)%997)/997,y:((i*311+83)%991)/991,r:i%11===0?1.1:.5}));
    const canMove = () => !disposed && !scrolling && !reduced.matches && visible && !document.hidden;
    function draw() {
      if (!width || !height) return;
      ctx.clearRect(0, 0, width, height);
      const narrow = width < 600;
      const lightTheme = document.documentElement.dataset.theme === 'light';
      const strandLightness = lightTheme ? 44 : 78;
      const cx = width * (narrow ? .73 : .765) + driftX;
      const cy = height * (narrow ? .44 : .55) + driftY;
      // Scale the projected artwork uniformly; keep its original geometry and perspective.
      const artworkScale = 1.1;
      const radius = narrow ? width*.32 : Math.min(width*.242,384);
      const glow = ctx.createRadialGradient(cx,cy,radius*.35*artworkScale,cx,cy,radius*1.7*artworkScale);
      glow.addColorStop(0,'rgba(26,28,49,0)');
      glow.addColorStop(.4,'rgba(104,107,202,.075)');
      glow.addColorStop(.62,'rgba(96,113,209,.035)');
      glow.addColorStop(1,'rgba(13,17,36,0)');
      ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
      for(const star of stars) {
        ctx.fillStyle=`rgba(191,199,240,${.12+.20*(.5+.5*Math.sin(time*.3+star.x*20))})`;
        ctx.beginPath();ctx.arc(star.x*width,star.y*height,star.r,0,Math.PI*2);ctx.fill();
      }
      // Open filaments gather through a gentle twist into an ordered, flowing bundle.
      // Each strand keeps its place: movement suggests sorting, rather than orbiting.
      // Share curve calculations across all 86 strands at each sample position.
      const curveSamples=new Map(), strandSamples=new Map();
      const breath=Math.sin(time*.12)*.075;
      function project(t, strand, extra=0) {
        let curve=curveSamples.get(t);
        if(!curve){
          const angle=-.72+t*3.45+breath;
          const phase=time*.22+t*6;
          curve={
            x:radius*(.36*Math.sin(t*Math.PI*1.65-.65)+.12),
            y:radius*(2.05*t-1.02),
            spread:radius*(.58*Math.pow(1-t,1.25)+.105+.10*Math.sin(t*Math.PI)),
            sin:Math.sin(angle),cos:Math.cos(angle),
            waveSin:Math.sin(phase)*.022*radius*(1-t),
            waveCos:Math.cos(phase)*.022*radius*(1-t)
          };
          curveSamples.set(t,curve);
        }
        let phase=strandSamples.get(strand);
        if(!phase){phase={sin:Math.sin(strand*2.4),cos:Math.cos(strand*2.4)};strandSamples.set(strand,phase);}
        const wave=curve.waveSin*phase.cos+curve.waveCos*phase.sin;
        const across=strand*curve.spread+extra;
        const depth=across*curve.sin;
        const perspective=1000/(1000-depth*.45);
        return {
          x:cx+(curve.x+across*curve.cos+wave)*perspective*artworkScale,
          y:cy+(curve.y+across*.16*curve.sin+wave*.4)*perspective*artworkScale,
          z:depth
        };
      }
      ctx.globalCompositeOperation=lightTheme?'multiply':'screen';
      const strands=narrow?52:86, steps=narrow?120:180;
      for(let k=0;k<strands;k++) {
        const strand=k/(strands-1)*2-1;
        const light=(Math.cos(strand*2.5)+1)/2;
        const goldStrand=k===Math.floor(strands*.43);
        const hue=goldStrand?39:216+39*(strand+1)/2;
        const saturation=goldStrand?(lightTheme?25:31):lightTheme?48:76;
        const luminance=goldStrand?(lightTheme?45:70):strandLightness;
        const alpha=(.18+light*.24)*(goldStrand ? .78 : 1);
        const ink=ctx.createLinearGradient(0,cy-radius*1.15*artworkScale,0,cy+radius*1.15*artworkScale);
        ink.addColorStop(0,`hsla(${hue},${saturation}%,${luminance}%,0)`);
        ink.addColorStop(.12,`hsla(${hue},${saturation}%,${luminance}%,${alpha*.55})`);
        ink.addColorStop(.42,`hsla(${hue},${saturation}%,${luminance}%,${alpha})`);
        ink.addColorStop(.78,`hsla(${hue},${saturation}%,${luminance}%,${alpha*.85})`);
        ink.addColorStop(1,`hsla(${hue},${saturation}%,${luminance}%,0)`);
        ctx.strokeStyle=ink;
        ctx.lineWidth=goldStrand ? .9 : k%13===0 ? 1.05 : .65;
        ctx.beginPath();
        for(let j=0;j<=steps;j++) {
          const p=project(j/steps,strand);
          j===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y);
        }
        ctx.stroke();
      }
      // Highlights move in one direction, from loose ideas toward the gathered end.
      for(let k=0;k<11;k++) {
        const head=(time*.035+k*.091)%1;
        const strand=Math.sin(k*2.399)*.96;
        const intensity=Math.sin(head*Math.PI)*.8;
        const goldTrace=k===8;
        ctx.shadowBlur=lightTheme?0:8;ctx.shadowColor=goldTrace?'#c9b38d':k%3===0?'#b79bff':'#80c8ff';
        ctx.lineWidth=k%3===0?1.15:.8;
        const tail=Math.max(0,head-.064);
        const first=project(tail,strand),p=project(head,strand);
        const trail=ctx.createLinearGradient(first.x,first.y,p.x,p.y);
        trail.addColorStop(0,'rgba(195,208,255,0)');
        trail.addColorStop(1,`rgba(${goldTrace?(lightTheme?'128,103,67':'210,189,151'):lightTheme?'99,80,175':'195,208,255'},${intensity*(goldTrace ? .72 : 1)})`);
        ctx.strokeStyle=trail;ctx.beginPath();ctx.moveTo(first.x,first.y);
        for(let j=1;j<=16;j++) {
          const point=project(tail+(head-tail)*j/16,strand);
          ctx.lineTo(point.x,point.y);
        }
        // One glow operation per trace instead of a separate blurred stroke per segment.
        ctx.stroke();
        ctx.fillStyle=`rgba(${goldTrace?(lightTheme?'111,87,55':'225,205,170'):lightTheme?'75,70,155':'226,226,255'},${intensity*(goldTrace ? .72 : 1)})`;
        ctx.beginPath();ctx.arc(p.x,p.y,1.1,0,Math.PI*2);ctx.fill();
      }
      ctx.shadowBlur=0;
      for(let k=0;k<35;k++) {
        const t=((k*.618+time*.008)%1);
        const p=project(t,Math.sin(k*2.399)*1.4,radius*.08*Math.sin(k));
        ctx.fillStyle=`rgba(170,178,227,${Math.sin(t*Math.PI)*.24})`;
        ctx.beginPath();ctx.arc(p.x,p.y,k%13===0?1:.5,0,Math.PI*2);ctx.fill();
      }
      ctx.globalCompositeOperation='source-over';
    }
    function tick(now) {
      frame=0;
      if(!canMove()) return;
      if(!last || now-last>=32) {
        const delta=last?Math.min((now-last)/1000,.06):0;
        time+=delta;last=now;driftX+=(pointerX-driftX)*.022;driftY+=(pointerY-driftY)*.022;draw();
      }
      frame=requestAnimationFrame(tick);
    }
    function sync() {
      if(disposed)return;
      const stopped=reduced.matches;
      document.body.classList.toggle('home-motion-paused',stopped||scrolling||!visible||document.hidden);
      if(!canMove()) {if(frame)cancelAnimationFrame(frame);frame=0;last=0;}
      else if(!frame)frame=requestAnimationFrame(tick);
    }
    function resize() {
      const box=canvas.getBoundingClientRect();width=box.width;height=box.height;
      const dpr=Math.min(devicePixelRatio||1,1.5);
      canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
      ctx.setTransform(dpr,0,0,dpr,0,0);draw();
    }
    function move(e) {
      if(!canMove()||e.pointerType==='touch')return;
      const box=host.getBoundingClientRect();pointerX=((e.clientX-box.left)/box.width-.5)*24;pointerY=((e.clientY-box.top)/box.height-.5)*18;
    }
    function onScroll(){
      if(disposed)return;
      if(!scrolling){scrolling=true;sync();}
      if(scrollTimer)clearTimeout(scrollTimer);
      scrollTimer=setTimeout(()=>{scrollTimer=0;scrolling=false;sync();},140);
    }
    function leave(){pointerX=0;pointerY=0;}
    const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(canvas);
    const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:0});intersection.observe(canvas);
    host.addEventListener('pointermove',move,{passive:true});host.addEventListener('pointerleave',leave);
    window.addEventListener('scroll',onScroll,{passive:true});
    document.addEventListener('themechange',draw);
    document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);
    resize();sync();
    dispose=()=>{disposed=true;if(scrollTimer)clearTimeout(scrollTimer);scrollTimer=0;window.removeEventListener('scroll',onScroll);if(frame)cancelAnimationFrame(frame);frame=0;resizeObserver.disconnect();intersection.disconnect();host.removeEventListener('pointermove',move);host.removeEventListener('pointerleave',leave);document.removeEventListener('themechange',draw);document.removeEventListener('visibilitychange',sync);reduced.removeEventListener('change',sync);document.body.classList.remove('home-motion-paused');};
  }
  window.HomeScene={mount,destroy};
})();
