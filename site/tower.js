/* Static geometry is uploaded once. GPU depth testing replaces per-frame sorting. */
function makeTower(canvas,options={}){
 let current=canvas,renderer;
 function fallback(){
  if(renderer?.fallback)return;
  renderer?.dispose?.();
  const next=current.cloneNode(false);
  for(const key of ['onpointerdown','onpointermove','onpointerup','onpointercancel','onkeydown'])next[key]=current[key];
  current.replaceWith(next);current=next;
  renderer=createTower(current,{...options,force2D:true,mainThread:true});
 }
 try{renderer=createTower(current,{...options,onFailure:fallback})}catch(error){fallback()}
 return {get canvas(){return renderer.canvas||current},project(...args){return renderer.project(...args)},draw(...args){try{renderer.draw(...args)}catch(error){fallback();renderer.draw(...args)}}};
}
function createTower(canvas,{bipv=true,shade=false,force2D=false,mainThread=false,onFailure=()=>{}}={}){
 const faces=buildTower().filter(f=>bipv||!f.panel),gl=force2D?null:canvas.getContext('webgl',{alpha:true,antialias:true,powerPreference:'low-power'});
 let W=1,H=1,dirty=true,lost=false;
 const resizeObserver=new ResizeObserver(e=>{W=e[0].contentRect.width;H=e[0].contentRect.height;dirty=true});resizeObserver.observe(canvas);
 const scale=()=>Math.min(W/(shade?25:13.5),H/(shade?23:15.7));
 function project(p,a,t,z){let xx=p[0]*Math.cos(a)+p[2]*Math.sin(a),zz=-p[0]*Math.sin(a)+p[2]*Math.cos(a),y=p[1]-(shade?4:6),s=scale()*z;return [W*.53+xx*s,H*.54-(y*Math.cos(t)-zz*Math.sin(t))*s]}
 if(!gl){
  let busy=false,last=0,worker=null,renderer=null,timer;
  function useMainThread(){
   clearTimeout(timer);worker?.terminate();worker=null;busy=false;
   const next=canvas.cloneNode(false);
   for(const key of ['onpointerdown','onpointermove','onpointerup','onpointercancel','onkeydown'])next[key]=canvas[key];
   canvas.replaceWith(next);resizeObserver.unobserve(canvas);canvas=next;resizeObserver.observe(canvas);
   renderer=create2DRenderer(canvas,faces,{bipv,shade});
  }
  if(!mainThread&&canvas.transferControlToOffscreen&&typeof Worker!=='undefined'){
   try{worker=new Worker('model-worker.js');worker.onerror=useMainThread;worker.onmessage=()=>{clearTimeout(timer);busy=false};
    let offscreen=canvas.transferControlToOffscreen();busy=true;timer=setTimeout(useMainThread,3000);
    worker.postMessage({type:'init',canvas:offscreen,faces,options:{bipv,shade}},[offscreen]);
   }catch(error){useMainThread()}
  }else renderer=create2DRenderer(canvas,faces,{bipv,shade});
  return {get canvas(){return canvas},project,dispose(){resizeObserver.disconnect();worker?.terminate();clearTimeout(timer)},draw(a,t,z,now,sun){if(busy||now-last<33||W<2||H<2)return;last=now;let data={a,t,z,now,sun,width:W,height:H,dpr:Math.min(devicePixelRatio||1,1.5)};if(worker){busy=true;timer=setTimeout(useMainThread,3000);worker.postMessage(data)}else renderer.draw(data)},fallback:true};
 }
 const vs=`attribute vec3 aPos;attribute vec3 aColor;attribute vec3 aNormal;attribute float aDist;uniform vec4 uView;uniform vec2 uSize;uniform vec3 uSun;uniform mediump float uMode;uniform float uShade;varying mediump vec3 vColor;varying mediump float vDist;void main(){vec3 p=aPos;if(uMode>0.5&&uMode<1.5){p.x-=max(p.y,0.0)*uSun.x/max(uSun.y,.12);p.z-=max(p.y,0.0)*uSun.z/max(uSun.y,.12);p.y=-.22;}float ca=cos(uView.x),sa=sin(uView.x),ct=cos(uView.y),st=sin(uView.y);float xx=p.x*ca+p.z*sa;float zz=-p.x*sa+p.z*ca;float yy=p.y-mix(6.0,4.0,uShade);float y=yy*ct-zz*st;float depth=yy*st+zz*ct;float s=min(uSize.x/mix(13.5,25.0,uShade),uSize.y/mix(15.7,23.0,uShade))*uView.z;gl_Position=vec4(.06+xx*s*2.0/uSize.x,-.08+y*s*2.0/uSize.y,-depth/160.0,1.0);float light=mix(1.0,.7+.3*max(dot(aNormal,normalize(uSun)),0.0),uShade);vColor=aColor*light;vDist=aDist;}`;
 const fs=`precision mediump float;uniform mediump float uMode;uniform float uTime;varying mediump vec3 vColor;varying mediump float vDist;void main(){if(uMode>2.5&&mod(vDist-uTime*.0008,1.35)>.26)discard;if(uMode>0.5&&uMode<1.5)gl_FragColor=vec4(.68,.65,.67,1.0);else gl_FragColor=vec4(vColor,1.0);}`;
 function compile(type,source){let s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}
 let program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vs));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
 let tris=[],lines=[],traces=[],ground=[];function add(out,p,c,n,d=0){out.push(...p,...c,...n,d)}
 for(let f of faces){let pts=f.pts,u=pts[1].map((v,i)=>v-pts[0][i]),v=pts[2].map((v,i)=>v-pts[0][i]);let n=[u[2]*v[1]-u[1]*v[2],u[0]*v[2]-u[2]*v[0],u[1]*v[0]-u[0]*v[1]],len=Math.hypot(...n)||1;n=n.map(v=>v/len);let col=f.color.match(/[a-f\d]{2}/gi).map(v=>parseInt(v,16)/255);let grey=col.reduce((a,b)=>a+b,0)/3;col=[grey,grey,grey];if(f.panel)col=bipv?[.62,.61,.63]:[.85,.84,.85];for(let i=1;i<pts.length-1;i++){add(tris,pts[0],col,n);add(tris,pts[i],col,n);add(tris,pts[i+1],col,n)}let d=f.seed;for(let i=0;i<pts.length;i++){let p=pts[i],q=pts[(i+1)%pts.length],dd=d+Math.hypot(...q.map((x,k)=>x-p[k]));add(lines,p,[.58,.56,.57],n);add(lines,q,[.58,.56,.57],n);if(f.panel&&bipv){add(traces,p,[.90,.25,.24],n,d);add(traces,q,[.90,.25,.24],n,dd)}d=dd}}
 for(let p of [[-50,-.25,-50],[50,-.25,-50],[50,-.25,50],[-50,-.25,-50],[50,-.25,50],[-50,-.25,50]])add(ground,p,[.93,.92,.93],[0,1,0]);
 let grid=[];for(let i=-20;i<=20;i+=2){for(let p of [[i,-.24,-20],[i,-.24,20],[-20,-.24,i],[20,-.24,i]])add(grid,p,[.86,.84,.85],[0,1,0])}
 function buffer(data){let b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);return {b,count:data.length/10}}
 const batches=[buffer(tris),buffer(lines),buffer(traces),buffer(ground),buffer(grid)];let attrs=['aPos','aColor','aNormal','aDist'].map(x=>gl.getAttribLocation(program,x));attrs.forEach(a=>gl.enableVertexAttribArray(a));let uni={};for(let x of ['uView','uSize','uSun','uMode','uTime','uShade'])uni[x]=gl.getUniformLocation(program,x);
 gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.clearColor(0,0,0,0);canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;onFailure()});
 function drawBatch(index,mode,line=false){const b=batches[index];gl.bindBuffer(gl.ARRAY_BUFFER,b.b);for(let i=0;i<4;i++)gl.vertexAttribPointer(attrs[i],i===3?1:3,gl.FLOAT,false,40,i*12);gl.uniform1f(uni.uMode,mode);if(!line){gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1,1);gl.depthMask(true)}else{gl.disable(gl.POLYGON_OFFSET_FILL);gl.depthMask(false)}gl.drawArrays(line?gl.LINES:gl.TRIANGLES,0,b.count)}
 return {dispose(){resizeObserver.disconnect()},project,draw(a,t,z,now,sun=[.3,.8,-.5]){if(lost||W<2||H<2)return;if(dirty){let dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);gl.viewport(0,0,canvas.width,canvas.height);dirty=false}gl.depthMask(true);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);gl.uniform4f(uni.uView,a,t,z,0);gl.uniform2f(uni.uSize,W,H);gl.uniform3f(uni.uSun,...sun);gl.uniform1f(uni.uShade,shade?1:0);gl.uniform1f(uni.uTime,now);if(shade){drawBatch(3,0);drawBatch(4,2,true);if(sun[1]>.01)drawBatch(0,1)}drawBatch(0,0);drawBatch(1,2,true);if(bipv&&!shade)drawBatch(2,3,true);gl.depthMask(true)}};
}
