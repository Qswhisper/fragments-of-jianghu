/* Original ink lettering. Its clock follows the existing outcome sound/RAF. */
(function(){
  'use strict';
  const path='assets/ui/victory-ink-v1/atlas.png',A=G.render.assets,U=G.render.canvasUtils,M=G.render.journeyMotion;
  const clamp=n=>Math.max(0,Math.min(1,n));let mark=null;
  // A small opening pair, then the large verdict. Original ink shapes remain.
  const composition=[{x:573,y:205,size:126,tone:'#b5a58a'},{x:700,y:205,size:126,tone:'#b5a58a'},{x:527,y:378,size:274,tone:'#e3d2af'},{x:765,y:375,size:290,tone:'#e3d2af'}];
  A.getImageEntry(path);G.render.realisticCombat.assetPaths.push(path);
  const beat=G.audio.playCombatBeat;
  G.audio.playCombatBeat=function(type,previous,next,...args){
    if(type==='outcome'&&next.combat?.result==='victory'&&mark?.token!==next.combat.feedbackToken)mark={age:0,token:next.combat.feedbackToken};
    return beat.call(this,type,previous,next,...args);
  };
  const update=M.update,reset=M.reset,change=M.change;
  M.update=function(dt,s){update(dt,s);if(mark)mark.age+=Math.max(0,dt);};
  M.reset=function(s){mark=null;return reset(s);};M.change=function(a,b){if(a.scene!==b.scene)mark=null;return change(a,b);};
  function glyph(i){const entry=A.getImageEntry(path);if(!entry.loaded)return null;const img=entry.image,w=img.width/2,h=img.height/2;
    return U.cachedLayer('victory-ink-hierarchy:'+A.getRevision()+':'+i,240,240,2,c=>{c.drawImage(img,(i%2)*w,Math.floor(i/2)*h,w,h,0,0,240,240);c.globalCompositeOperation='source-in';c.fillStyle=composition[i].tone;c.fillRect(0,0,240,240);});
  }
  function render(c,s){
    if(s.combat.result!=='victory')return;
    if(!mark&&G.scenes.combat.feedback.isBusy())return;
    const reduced=M.disabled(),age=mark?.age??600,depart=s.combat.presentation?.transitionMs??520;
    const fade=G.scenes.combat.feedback.isBusy()?1:clamp(depart/150),ready=reduced||!mark;
    c.save();const wash=c.createRadialGradient(640,350,90,640,350,510);wash.addColorStop(0,'#080c1058');wash.addColorStop(.65,'#080c1030');wash.addColorStop(1,'#080c1000');c.globalAlpha=fade;c.fillStyle=wash;c.fillRect(0,0,1280,720);
    for(let i=0;i<4;i++){
      const t=ready?1:clamp((age-i*98)/115);if(!t)continue;
      const image=glyph(i);if(!image)continue;const {x,y,size}=composition[i],ease=1-Math.pow(1-t,3),scale=ready?1:1+(1-ease)*(i<2?.12:.24);
      c.save();c.globalAlpha=fade*Math.min(1,t*3);c.translate(x,y+(ready?0:(1-ease)*-12));c.scale(scale,scale);c.rotate(ready?0:(1-ease)*(i%2?.025:-.025));c.drawImage(image,-size/2,-size/2,size,size);c.restore();
    }
    const finish=ready?1:clamp((age-310)/160),brush=A.getImageEntry('assets/ui/combat_health_blood_brush_gpt4ovip_transparent_02_cropped.png');c.globalAlpha=fade*finish*.76;if(brush.loaded)c.drawImage(brush.image,435,484,400,12);c.restore();
  }
  G.render.victoryMark={render,debug:()=>({active:!!mark,age:mark?.age??null,visibleLetters:mark?(M.disabled()?4:Math.min(4,Math.max(0,Math.ceil(mark.age/98)))):0,text:'破敌得胜'})};
})();
