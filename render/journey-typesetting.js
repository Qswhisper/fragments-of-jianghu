/* Measured Chinese line breaking for journey prose; combat/card identity stays intact. */
(function(){
  const closing=/^[，。、；：！？）】》」』”’％%]/,opening=/[（【《「『“‘]$/;
  const cache=new Map();let revision=0;
  document.fonts?.addEventListener('loadingdone',()=>{revision++;cache.clear();});
  function lines(ctx,value,width){
    const key=JSON.stringify([revision,ctx.font,ctx.fontKerning,ctx.fontStretch,ctx.fontVariantCaps,ctx.textRendering,ctx.letterSpacing,ctx.wordSpacing,ctx.direction,String(value??''),width]);
    if(cache.has(key)){const rows=cache.get(key);cache.delete(key);cache.set(key,rows);return rows.slice();}
    const result=String(value??'').split('\n').flatMap(paragraph=>{
      const tokens=paragraph.match(/\d+(?:\.\d+)?%?|[A-Za-z]+|./gu)||[],rows=[];let row='';
      for(const token of tokens){
        if(row&&ctx.measureText(row+token).width>width){
          if(closing.test(token)){const chars=Array.from(row);const tail=chars.pop();rows.push(chars.join(''));row=tail+token;continue;}
          if(opening.test(row)){const tail=row.slice(-1);rows.push(row.slice(0,-1));row=tail+token;continue;}
          rows.push(row);row=token;
        }else row+=token;
      }
      if(row)rows.push(row);
      if(rows.length>1){
        const last=rows.length-1;
        while(rows[last].replace(/[\p{P}\s]/gu,'').length<2&&rows[last-1].length>3){
          const chars=Array.from(rows[last-1]),tail=chars.pop();
          if(ctx.measureText(tail+rows[last]).width>width)break;
          rows[last]=tail+rows[last];rows[last-1]=chars.join('');
        }
        // Rebalance a very short tail, retaining full text and paragraph boundaries.
        while(ctx.measureText(rows[last]).width<width*.35&&rows[last-1].length>4){
          const chars=Array.from(rows[last-1]),tail=chars.pop();
          if(closing.test(tail)||opening.test(chars.at(-1)||'')||ctx.measureText(tail+rows[last]).width>width*.7)break;
          rows[last]=tail+rows[last];rows[last-1]=chars.join('');
        }
      }
      return rows.length?rows:[''];
    });
    if(document.fonts?.status!=='loading'){cache.set(key,result);if(cache.size>512)cache.delete(cache.keys().next().value);}
    return result.slice();
  }
  G.render.journeyTypesetting={lines};
})();
