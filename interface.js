const intro=document.querySelector('#intro'), header=document.querySelector('.site-header');
function syncScroll(){
 const distance=scrollY/intro.offsetHeight*920;
 window.tourProgress=Math.min(1,distance/820);
 window.dispatchEvent(new CustomEvent('tour:progress',{detail:window.tourProgress}));
 header.style.visibility=distance<764?'hidden':'visible';
 header.style.transform='translateY('+(-100*Math.max(0,Math.min(1,(786-distance)/22)))+'%)';
}
addEventListener('scroll',syncScroll,{passive:true});addEventListener('resize',syncScroll);syncScroll();
