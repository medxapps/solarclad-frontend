import {createScene} from './scene.js';
import {updateReveal} from './reveal.js';
const stage=document.querySelector('#stage');
const status=document.querySelector('#load-status');
let view,frame=0,position=window.tourProgress||0,target=position,last=0;
function draw(now){
  frame=0;
  const dt=Math.min(100,now-last||16);last=now;
  position+=(target-position)*(1-Math.exp(-dt/55));
  if(Math.abs(position-target)<.0001)position=target;
  const state=updateReveal(position,stage.clientWidth,stage.clientHeight);
  if(state.visible)view?.draw(state.tour,state.pullback,state.cloudTravel);
  if(view || status.textContent.includes('WebGL')) document.documentElement.dataset.pavilionReady='true';
  if(position!==target) schedule();
}
function schedule(){if(!frame)frame=requestAnimationFrame(draw);}
window.addEventListener('tour:progress',e=>{target=e.detail;schedule();});
new ResizeObserver(schedule).observe(stage);
function unavailable(){status.hidden=false;status.textContent='The interactive tour needs WebGL.';}
try{view=await createScene(document.querySelector('#world'),unavailable);status.hidden=true;schedule();}catch(error){console.error(error);unavailable();schedule();}
