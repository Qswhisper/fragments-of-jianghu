/* Scene-led entrance; details are opened deliberately instead of laid out as a presentation. */
(function () {
  'use strict';
  const A=G.render.assets,ui=document.getElementById('entry-ui');
  const paths={menu:'assets/journey/entry-20261002/title-empty-v1.png',styles:'assets/journey/entry-20261002/preparation-blade-v1.png'};
  const hints={blade:'叠破绽，再用杀招收尾。',iron:'架势达到10，触发铁骨反击。',dirty:'迷眼减伤，溃烂逐回合耗敌。',combo:'先出3张牌，接连环招式减费。'};
  Object.values(paths).forEach(p=>A.getImageEntry(p));
  const oldRender=G.scenes.title.render,oldUpdate=G.scenes.title.update;let signature='',firstReveal=null;
  function waiting(s){const mode=s.scene==='title'&&s.title?.mode;return !!paths[mode]&&!A.getImageEntry(paths[mode]).loaded;}
  function loading(ctx,alpha=1){
    ctx.save();ctx.globalAlpha*=alpha;const shade=ctx.createRadialGradient(640,330,20,640,360,700);shade.addColorStop(0,'#232923');shade.addColorStop(1,'#080d10');ctx.fillStyle=shade;ctx.fillRect(0,0,1280,720);
    const P=G.render.journeyMaterials;P.ink(ctx,'江湖残卷',640,308,45,'#bfb29a','center');P.seal(ctx,640,379,32,'候',.8);P.ink(ctx,'静候片刻，城门将开。',640,427,19,'#a0927b','center');ctx.restore();
  }
  function layout(base){
    const hasSave=!!G.storage?.hasRunSave();
    return {...base,
      menuButtons:[{id:'new_run',x:82,y:350,width:350,height:62},hasSave?{id:'continue',x:82,y:425,width:350,height:62}:{id:'continue',x:-20,y:-20,width:0,height:0},
        {id:'settings',x:82,y:hasSave?532:425,width:350,height:62},{id:'credits',x:82,y:hasSave?612:500,width:350,height:62}],
      styleRail:{x:874,y:163,width:332,height:80,gap:24,horizontal:false},
      startButton:{x:1016,y:628,width:190,height:62},backButton:{x:54,y:42,width:116,height:44}
    };
  }
  function el(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
  function place(e,b){Object.assign(e.style,{left:b.x/12.8+'%',top:b.y/7.2+'%',width:b.width/12.8+'%',height:b.height/7.2+'%'});return e;}
  function label(text,cls,b){ui.append(place(el('div',text,cls),b));}
  function button(text,cls,b,id){const e=place(el('button',text,cls),b);e.type='button';if(text)e.setAttribute('aria-label',text);e.dataset.entryFocus=id;e.onclick=()=>G.main.queueSceneClick({x:b.x+b.width/2,y:b.y+b.height/2});ui.append(e);return e;}
  function fit(){const c=document.getElementById('game-canvas').getBoundingClientRect(),s=document.getElementById('game-shell').getBoundingClientRect();Object.assign(ui.style,{left:c.left-s.left+'px',top:c.top-s.top+'px',width:c.width+'px',height:c.height+'px'});}
  function saveNote(s){const saved=s.title.saveSummary;if(!saved)return '';const scenes={combat:'交锋中',reward:'战后拾遗',map:'选择前路',rest:'破庙暂歇',shop:'暗巷黑市',event:'途中奇遇',arrival:'入城前情',nemesis:'旧仇再会'};return '卷 '+saved.actNumber+' · '+(scenes[saved.scene]||'行途中')+' · 气血 '+saved.hp+'/'+saved.maxHp;}
  function menu(s,L){
    label('江湖残卷','entry-title',{x:78,y:166,width:470,height:94});
    label('1.0 正式版','entry-subtitle entry-version',{x:88,y:270,width:340,height:38});
    const copy=['踏入九城','再续前路','设置','制作与鸣谢'];
    L.menuButtons.forEach((b,i)=>{if(i===1&&!s.title.continueAvailable)return;button(copy[i],'entry-menu-button'+(i===0?' primary':''),b,b.id);});
    const note=saveNote(s);if(note)label(note,'entry-save-note',{x:88,y:467,width:480,height:22});
  }
  function styles(s,L){
    const boxes=G.scenes.title.getStyleBoxes(L);
    boxes.forEach((b,i)=>{
      const o=s.title.options[i],selected=o.id===s.title.selectedStyle,e=button('', 'entry-school'+(selected?' selected':''),b,o.id);
      e.setAttribute('aria-label',o.name);e.setAttribute('aria-pressed',String(selected));e.append(el('span',o.name,'school-name'));
      if(selected)e.append(el('span',hints[o.id],'school-hint'));
    });
    const inspect=place(el('button','招式','entry-loadout'),{x:874,y:644,width:106,height:36});inspect.type='button';inspect.setAttribute('aria-label','招式');inspect.dataset.entryFocus='loadout';inspect.onclick=()=>G.journeyShell.openStarterDeck();ui.append(inspect);
    button('入城','entry-start',L.startButton,'start');button('返回','entry-back',L.backButton,'back');
  }
  function render(s,ctx){
    G.journeyShell?.syncUI(s);
    const mode=s.scene==='title'&&['menu','styles'].includes(s.title.mode)?s.title.mode:null;ui.hidden=!mode;
    if(!mode){signature='';return false;}
    if(waiting(s)){ui.hidden=true;signature='';loading(ctx);return true;}
    if(firstReveal===null)firstReveal=s.timeMs||0;
    const reveal=G.render.journeyMotion?.disabled()?1:Math.min(1,((s.timeMs||0)-firstReveal)/420);
    ctx.fillStyle='#101112';ctx.fillRect(0,0,1280,720);if(reveal<1)loading(ctx,1-reveal);ctx.save();ctx.globalAlpha=reveal;A.drawImageCover(ctx,paths[mode],0,0,1280,720);ctx.restore();
    const shade=ctx.createLinearGradient(0,0,1280,0);
    if(mode==='menu'){shade.addColorStop(0,'rgba(4,6,7,.15)');shade.addColorStop(.45,'rgba(4,6,7,0)');shade.addColorStop(1,'rgba(4,6,7,0)');}
    else{shade.addColorStop(0,'rgba(4,6,7,0)');shade.addColorStop(.50,'rgba(4,6,7,0)');shade.addColorStop(.72,'rgba(4,6,7,.22)');shade.addColorStop(1,'rgba(4,6,7,.30)');}
    ctx.fillStyle=shade;ctx.fillRect(0,0,1280,720);fit();
    const next=JSON.stringify([mode,s.title.continueAvailable,mode==='menu'?saveNote(s):'']);
    if(signature!==next){
      const focused=ui.contains(document.activeElement)?document.activeElement.dataset.entryFocus:null;
      signature=next;ui.replaceChildren();const L=G.scenes.title.getLayout();if(mode==='menu')menu(s,L);else styles(s,L);
      if(focused)ui.querySelector('[data-entry-focus="'+focused+'"]')?.focus({preventScroll:true});
    }
    if(mode==='styles'&&!ui.classList.contains('cinematic-entry'))ui.querySelectorAll('.entry-school').forEach(e=>{const selected=e.dataset.entryFocus===s.title.selectedStyle;e.classList.toggle('selected',selected);e.setAttribute('aria-pressed',String(selected));const hint=e.querySelector('.school-hint');if(selected&&!hint)e.append(el('span',hints[e.dataset.entryFocus],'school-hint'));else if(!selected)hint?.remove();});
    return true;
  }
  G.render.journeyEntry={layout,paths,render,waiting,saveNote};
  G.scenes.title.render=function(s,ctx){if(!render(s,ctx))oldRender(s,ctx);};
  Object.entries(G.scenes).filter(([name])=>name!=='title').forEach(([,scene])=>{const draw=scene.render;if(draw)scene.render=function(s,ctx){if(!G.journeyPassage?.active(s))ui.hidden=true;signature='';G.journeyShell?.syncUI(s);draw(s,ctx);};});
  G.scenes.title.update=function(s,input){if(waiting(s)){G.main.consumeClicks();return s;}const next=oldUpdate(s,input);if(next.scene==='title'&&['settings','credits'].includes(next.title.mode)&&G.journeyShell){const mode=next.title.mode;next.title.mode='menu';if(mode==='settings')G.journeyShell.openSettings();else G.journeyShell.openCredits();}return next;};
  window.addEventListener('keydown',e=>{
    if(document.getElementById('journey-dialog').open||!G.main)return;
    const s=G.main.getState();if(s.scene!=='title'||s.title.mode!=='styles')return;
    const L=G.scenes.title.getLayout();
    if(e.key==='Escape'){e.preventDefault();G.main.queueSceneClick({x:L.backButton.x+20,y:L.backButton.y+20});}
    if(['ArrowUp','ArrowDown'].includes(e.key)&&document.activeElement.classList.contains('entry-school')){
      e.preventDefault();const boxes=G.scenes.title.getStyleBoxes(L),index=boxes.findIndex(b=>b.id===s.title.selectedStyle),b=boxes[(index+(e.key==='ArrowDown'?1:3))%4];
      ui.querySelector('[data-entry-focus="'+b.id+'"]')?.focus();G.main.queueSceneClick({x:b.x+20,y:b.y+20});
    }
  });
})();
