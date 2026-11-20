(() => {
  const far = document.querySelector('.skyline-far');
  const mid = document.querySelector('.skyline-mid');
  const front = document.querySelector('.skyline-front');
  const stage = document.querySelector('.stage');
  const header = document.querySelector('header');
  const footer = document.querySelector('footer');
  const track = document.querySelector('.track');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let tx = 0, ty = 0, x = 0, y = 0, raf = 0, last = 0;
  function update(time) {
    raf = 0;
    const ease = 1 - Math.exp(-Math.min(50, time - (last || time - 16)) / 140);
    last = time;
    x += (tx - x) * ease; y += (ty - y) * ease;
    if (Math.abs(tx-x)+Math.abs(ty-y)<.001) { x=tx; y=ty; }
    const height = innerHeight;
    const end = document.querySelector('#story-track main').offsetHeight - height;
    const rise = Math.max(0, (scrollY-document.querySelector("#intro").offsetHeight) - end);
    const fade = Math.max(0, 1 - rise / (height * .65));
    far.style.transform = `translate3d(${x*10}px,${y*4}px,0)`;
    mid.style.transform = `translate3d(${x*20}px,${y*5-rise*.15}px,0)`;
    stage.style.transform = `translate3d(${x*5}px,${y*3}px,0)`;
    front.style.transform = `translate3d(${x*30}px,${y*7-rise}px,0)`;
    header.style.opacity = 1;
    footer.style.opacity = fade;
    track.style.opacity = fade;
    footer.inert = fade === 0;
    stage.style.opacity = Math.max(0,1-Math.max(0,rise-height*.35)/(height*.65));
    if (x!==tx || y!==ty) raf=requestAnimationFrame(update);
  }
  function request() { if (!raf) { last=performance.now()-16; raf=requestAnimationFrame(update); } }
  addEventListener('pointermove', e => {
    if (e.pointerType!=='mouse' || reduced.matches) return;
    tx = e.clientX/innerWidth*2-1; ty=e.clientY/innerHeight*2-1; request();
  }, {passive:true});
  document.documentElement.addEventListener('pointerleave',()=>{tx=ty=0;request();});
  reduced.addEventListener('change',()=>{tx=ty=0;request();});
  addEventListener('scroll',request,{passive:true});
  addEventListener('resize',request);
  request();
})();
