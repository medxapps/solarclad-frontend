import {PerspectiveCamera,Vector3,MathUtils} from './vendor/three.module.js';
export const makeCamera=()=>new PerspectiveCamera(40,1,.12,500);
const shots=[
  {at:0, angle:0,radius:44,eye:1.4,target:1.4,width:58.5,height:19.7},
  {at:.45,angle:0,radius:29,eye:2.2,target:3.3,width:18.7,height:11.1},
  {at:1,angle:-40,radius:56,eye:4.8,target:7.4,width:50,height:23}
];
// The three visible base corners in the reference align at 86.8% of the original path.
export const pathStart=.868;
export function placeCamera(camera,w,h,scroll,pullback=0){
  const progress=pathStart*(1-MathUtils.clamp(scroll,0,1));
  const i=progress<=.45?0:1;
  const a=shots[i],b=shots[i+1],u=MathUtils.clamp((progress-a.at)/(b.at-a.at),0,1);
  const t=u*u*(3-2*u), lerp=k=>MathUtils.lerp(a[k],b[k],t);
  const angle=MathUtils.degToRad(lerp('angle'));
  camera.position.set(Math.sin(angle)*lerp('radius'),lerp('eye'),Math.cos(angle)*lerp('radius'));
  const frontWeight=i===0?1:i===1?1-t:0;
  const target=new Vector3(0,lerp('target'),13*frontWeight);
  camera.lookAt(target);camera.aspect=w/h;
  camera.fov=MathUtils.radToDeg(2*Math.atan(Math.max(lerp('height'),lerp('width')/1.67)*Math.min(1,1.67/camera.aspect)/(2*camera.position.distanceTo(target))));
  const opening=i===0?1-t:0;
  const depth=camera.position.distanceTo(target);
  const openingHeight=Math.max(58.5/camera.aspect,19.5);
  const baseHeight=2*depth*Math.tan(MathUtils.degToRad(camera.fov)*.5);
  camera.fov=MathUtils.radToDeg(2*Math.atan(MathUtils.lerp(baseHeight,openingHeight,opening)/(2*depth)));
  // Keep the final lens fixed while the camera physically retreats.
  camera.position.z+=6*pullback;
  camera.updateProjectionMatrix();
  camera.projectionMatrix.elements[9]=opening*(2*(7.9-1.4)/openingHeight-.11);
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  camera.updateMatrixWorld();
}
