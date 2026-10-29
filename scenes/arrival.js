/* The first encounter is seeded only after the traveler reaches the alley. */
(function () {
  'use strict';
  const inside=(p,b)=>p.x>=b.x&&p.x<=b.x+b.width&&p.y>=b.y&&p.y<=b.y+b.height;
  const getLayout=()=>({next:{x:908,y:584,width:282,height:58}});
  function prepareState(state){state.arrival=state.arrival||{stage:'gate'};if(!['gate','alley'].includes(state.arrival.stage))state.arrival.stage='gate';return state;}
  function update(state){
    if(G.render.journeyOpening&&(G.render.journeyOpening.waiting(state)||G.render.journeyMotion?.debug().transition)){G.main.consumeClicks();return state;}
    const clicks=G.main.consumeClicks(),L=G.scenes.arrival.getLayout();for(const p of clicks){
      if(!inside(p,L.next))continue;
      const next=JSON.parse(JSON.stringify(state));
      if(next.arrival.stage==='alley'){next.arrival=null;next.scene='combat';}
      else next.arrival.stage='alley';return next;
    }return state;
  }
  G.scenes.arrival={prepareState,getLayout,update,render:(state,ctx)=>G.render.journeyStory.renderArrival(state,ctx)};
  window.addEventListener('keydown',e=>{if(!['Enter',' '].includes(e.key)||e.repeat||e.target.closest?.('button,input,select,textarea')||document.getElementById('journey-dialog').open||G.main?.getState().scene!=='arrival')return;e.preventDefault();const b=G.scenes.arrival.getLayout().next;G.main.queueSceneClick({x:b.x+b.width/2,y:b.y+b.height/2});});
})();
