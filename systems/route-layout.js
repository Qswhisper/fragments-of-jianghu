/* Five-station routes: retain the authored nodes and narrative opportunities. */
(function () {
  'use strict';
  window.G = window.G || {};
function proposeRouteEdges(nodes){
  const copy=structuredClone(nodes),at=(tier,type)=>copy.filter(n=>n.tier===tier&&n.baseType===type).sort((a,b)=>a.x-b.x);
  const starts=at(1,'street'),event1=at(1,'event')[0],rest2=at(2,'rest')[0],shop2=at(2,'shop')[0],fight2=at(2,'street')[0];
  const elite3=at(3,'elite')[0],event3=at(3,'event')[0],fight3=at(3,'street')[0],rest4=at(4,'rest')[0],shop4=at(4,'shop')[0],gate=at(5,'gate')[0];
  if(Math.abs(starts[1].x-rest2.x)<Math.abs(starts[0].x-rest2.x))starts.reverse();
  copy.forEach(n=>n.nextIds=[]);
  const link=(a,b)=>{if(!a.nextIds.includes(b.id))a.nextIds.push(b.id);};
  [[starts[0],rest2,elite3,shop4,gate],[event1,fight2,event3,rest4,gate],[starts[1],shop2,fight3,shop4,gate]].forEach(route=>route.slice(0,-1).forEach((n,i)=>link(n,route[i+1])));
  function paths(){const result=[];const visit=(n,route)=>{const next=[...route,n];if(!n.nextIds.length)result.push(next);else n.nextIds.forEach(id=>visit(copy.find(n=>n.id===id),next));};copy.filter(n=>n.tier===1).forEach(n=>visit(n,[]));return result;}
  const valid=()=>paths().every(p=>p.filter(n=>['street','elite','nemesis'].includes(n.type)).length>=1&&p.filter(n=>n.type==='rest').length<=1);
  // Keep existing nearby crossings where they preserve the intended decisions.
  const extras=nodes.flatMap(n=>n.nextIds.map(id=>({from:n.id,to:id,distance:Math.abs(n.x-nodes.find(t=>t.id===id).x)}))).sort((a,b)=>a.distance-b.distance);
  for(const e of extras){const from=copy.find(n=>n.id===e.from),to=copy.find(n=>n.id===e.to);if(from.nextIds.includes(to.id)||from.nextIds.length>=2)continue;link(from,to);if(!valid())from.nextIds.pop();}
  return copy;
}

  G.routeLayout = {revision: 2, layoutNodes: proposeRouteEdges};
})();
