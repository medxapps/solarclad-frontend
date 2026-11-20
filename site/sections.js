(() => {
const menu=document.querySelector('#site-menu'),toggle=document.querySelector('.menu-toggle');
toggle.onclick=()=>{menu.hidden=!menu.hidden;toggle.setAttribute('aria-expanded',String(!menu.hidden));};
menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{menu.hidden=true;toggle.setAttribute('aria-expanded','false');}));
document.addEventListener('keydown',e=>{if(e.key==='Escape'){menu.hidden=true;toggle.setAttribute('aria-expanded','false');}});
document.querySelectorAll('[data-home],.brand-pair').forEach(a=>a.onclick=e=>{e.preventDefault();scrollTo({top:0,behavior:'smooth'});});
document.querySelectorAll('.sector-card').forEach(card=>{
 const art=card.querySelector('.sector-art'),handle=card.querySelector('.reveal-handle');
 let value=0,drag=false,moved=false,startX=0,raf=0,animation=0;
 const coarse=matchMedia('(hover:none),(pointer:coarse)');
 function split(v){value=Math.max(0,Math.min(100,v));art.classList.add('comparing');art.classList.remove('lens-active');art.style.setProperty('--split',value+'%');handle.setAttribute('aria-valuenow',Math.round(value));}
 function position(e){const r=art.getBoundingClientRect();split((e.clientX-r.left)/r.width*100)}
 handle.addEventListener('pointerdown',e=>{cancelAnimationFrame(animation);drag=true;moved=false;startX=e.clientX;handle.setPointerCapture(e.pointerId);e.stopPropagation();});
 handle.addEventListener('pointermove',e=>{if(!drag)return;moved=moved||Math.abs(e.clientX-startX)>3;position(e);e.stopPropagation()});
 handle.addEventListener('pointerup',e=>{drag=false;handle.releasePointerCapture(e.pointerId);});
 handle.addEventListener('pointercancel',()=>drag=false);
 handle.addEventListener('click',()=>{if(moved){moved=false;return}cancelAnimationFrame(animation);const from=value,to=value<50?100:0,start=performance.now();function tick(t){let q=Math.min(1,(t-start)/550);split(from+(to-from)*(q*q*(3-2*q)));if(q<1)animation=requestAnimationFrame(tick)}animation=requestAnimationFrame(tick)});
 handle.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();cancelAnimationFrame(animation);split(e.key==='Home'?0:e.key==='End'?100:value+(e.key==='ArrowRight'?5:-5));}});
 art.addEventListener('pointermove',e=>{if(drag||coarse.matches||e.pointerType==='touch'||e.target===handle)return;cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{const r=art.getBoundingClientRect();art.classList.remove('comparing');art.classList.add('lens-active');art.style.setProperty('--lx',(e.clientX-r.left)+'px');art.style.setProperty('--ly',(e.clientY-r.top)+'px');art.style.setProperty('--radius',Math.min(115,r.width*.42)+'px')});});
 art.addEventListener('pointerleave',()=>{cancelAnimationFrame(raf);art.classList.remove('lens-active');art.style.setProperty('--radius','0px');split(value)});
 if(coarse.matches)split(45);
});
const iframe=document.querySelector('#intelligence-frame');
addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==iframe.contentWindow)return;
 if(e.data?.type==='solrclad-height'&&Number.isFinite(e.data.height))iframe.style.height=Math.max(650,Math.min(6000,e.data.height))+'px';
 if(e.data?.type==='solrclad-step')requestAnimationFrame(()=>scrollTo({top:iframe.getBoundingClientRect().top+scrollY-110,behavior:'smooth'}));
});
})();
