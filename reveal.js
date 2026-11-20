// Coordinates come from the PNG alpha mask: (878,380) to (1174,862).
const portal = document.querySelector('#portal');
const gate = document.querySelector('#gate');
const world = document.querySelector('#world');
const sample = document.querySelector('#sample');
const title = sample.querySelector('figcaption');
const ease = t => t*t*(3-2*t);
const ramp = (value,start,end) => ease(Math.max(0,Math.min(1,(value-start)/(end-start))));

const peers=[['wood','Wooden',-2],['rustic','Rustic',-1],['metal','Metallic',1],['red','Wooden',2]].map(([file,name,slot])=>{
 const figure=document.createElement('figure');figure.className='peer';
 figure.innerHTML='<img alt="'+name+' finish" src="assets/'+file+'.webp"><figcaption>'+name+' Series</figcaption>';
 portal.append(figure);return {figure,slot};
});
export function updateReveal(progress,width,height) {
  // Retain the original 320vh tour and append 300vh of scroll.
  const distance = progress*820;
  const tour = Math.min(1,distance/320);
  const pullback = ramp(distance,320,500);
  const fade = ramp(distance,506,588);
  portal.hidden = distance <= 320;
  if (!portal.hidden) {
    const frameWidth = Math.min(Math.max(width,height*16/9),width*2.6);
    const frameHeight = frameWidth*9/16;
    const initialScale = 1.12*Math.max(width/(frameWidth*296/2048),height/(frameHeight*482/1152));
    const scale = Math.pow(initialScale,1-pullback);
    const spread=ramp(distance,610,640);
    const fitted=frameWidth+(Math.min(frameWidth,width*1.02)-frameWidth)*spread;
    document.querySelector('#brand').style.opacity=1-ramp(distance,752,780);
    peers.forEach(({figure,slot})=>{
      const t=ramp(distance,634+8*Math.abs(slot),747+7*Math.abs(slot));
      figure.style.opacity=t;
      figure.style.visibility=t===0?'hidden':'visible';
      figure.querySelector('figcaption').style.opacity=ramp(distance,671+8*Math.abs(slot),754+7*Math.abs(slot));
      figure.style.left=(42.87109375+slot*19)+'%';
    });
    portal.style.width = fitted+'px';
    portal.style.left = (width-fitted)/2+'px';
    portal.style.top = (height-fitted*9/16)/2+'px';
    portal.style.transform = 'scale('+scale+')';
    gate.style.opacity = 1-fade;
    gate.style.filter = fade>0 && fade<1 ? 'blur('+fade*12+'px)' : '';
    sample.style.opacity = ramp(distance,507,578);
    title.style.opacity = ramp(distance,570,608);
    // Feather the lower photograph boundary only on tall, uncropped compositions.
    gate.style.maskImage = frameHeight<height-1 ? 'linear-gradient(black 83%,transparent)' : '';
  }
  world.style.opacity = 1-fade;
  world.style.filter = fade>0 && fade<1 ? 'blur('+fade*11+'px)' : '';
  return {tour,pullback,cloudTravel:ramp(distance,320,583),visible:fade<1};
}
