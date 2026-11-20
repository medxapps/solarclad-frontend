const overlay = document.querySelector('#solar-opening');
const [cells, current, ember] = overlay.querySelectorAll('img');
const tip = overlay.querySelector('.solar-tip');
const grid = overlay.firstElementChild;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = n => Math.max(0, Math.min(1,n));
const smooth = n => { const t=clamp(n); return t*t*(3-2*t) };

// Count painted, visible frames. Background tabs and a busy WebGL startup
// must not consume the opening while the visitor cannot see it.
let elapsed=0, previous=0, waiting=0;
document.addEventListener('visibilitychange',()=>{previous=0});
function paint(now){
  const dt=document.hidden || !previous ? 0 : Math.min(40,now-previous);
  previous=now;
  if(elapsed>=1410 && !document.documentElement.dataset.pavilionReady && waiting<4000) waiting+=dt;
  else elapsed+=dt;
  const flow=smooth((elapsed-230)/1250);
  current.style.opacity=reduced ? .72*Math.sin(flow*Math.PI) : String(smooth((elapsed-210)/170));
  current.style.maskPosition=reduced?'50% 0':(-105+flow*310)+'% 0';
  tip.style.left=(2+93*flow)+'%';
  tip.style.opacity=reduced?0:Math.sin(flow*Math.PI);
  const dissolve=smooth((elapsed-1270)/480);
  grid.style.filter='blur('+(5*dissolve)+'px)';
  ember.style.opacity=.68*dissolve;
  overlay.style.opacity=1-smooth((elapsed-1410)/490);
  if(elapsed<1900) requestAnimationFrame(paint);
  else overlay.remove();
}
Promise.allSettled([cells.decode(),current.decode(),ember.decode()]).then(()=>requestAnimationFrame(paint));
