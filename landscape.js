import * as THREE from './vendor/three.module.js';


const asset = name => new URL('./assets/' + name, import.meta.url).href;

// Repeatable planting preserves the site plan across camera positions and visits.
function nurseryRandom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function lightFalloff() {
  const size = 80;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const r = Math.hypot((x + 0.5 - size / 2) / (size / 2), (y + 0.5 - size / 2) / (size / 2));
      const offset = (y * size + x) * 4;
      const value = Math.pow(Math.max(0, 1 - r * r), 3.7);
      data.set([255, 255, 255, Math.round(value * 255)], offset);
    }
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipMapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

export async function buildLandscape(scene, renderer) {
  const grounds = new THREE.Group();
  grounds.name = 'Rain garden and arrival court';
  const random = nurseryRandom(148269);
  const between = (a, b) => a + (b - a) * random();
  const loader = new THREE.TextureLoader();
  const load = async (name, { color = true, repeat = true } = {}) => {
    const texture = await loader.loadAsync(asset(name));
    if (color) texture.colorSpace = THREE.SRGBColorSpace;
    if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
    return texture;
  };
  const [pavers, wetness, turf, asphalt, hedgeLeaves, hornbeam] = await Promise.all([
    load('plaza-basalt.webp'), load('plaza-wetness.webp', { color: false }), load('understory.webp'),
    load('wet-asphalt.webp'), load('clipped-hedge.webp'), load('hornbeam.webp', { repeat: false })
  ]);
  const std = options => new THREE.MeshStandardMaterial(options);
  const stone = std({ map: pavers, roughnessMap: wetness, roughness: 0.52, metalness: 0.10, envMapIntensity: 0.64 });
  const grass = std({ map: turf, roughness: 0.92, envMapIntensity: 0.33 });
  const road = std({ map: asphalt, roughness: 0.22, metalness: 0.18, envMapIntensity: 0.57 });
  const facing = std({ color: 0x57554f, roughness: 0.52, metalness: 0.08 });
  const kerb = std({ color: 0x797671, roughness: 0.53, metalness: 0.08 });
  const soil = std({ color: 0x24251b, roughness: 0.94 });
  const rim = std({ color: 0x232321, roughness: 0.48, metalness: 0.64 });
  const lamp = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.15, 1.3, 0.49), toneMapped: false });
  const dash = std({ color: 0xabaeae, roughness: 0.51, metalness: 0.02 });
  const paint = std({ color: 0xab8f53, roughness: 0.52, metalness: 0.02 });

  function patch(name, x, z, sx, sz, y, material, tile = 1) {
    const geo = new THREE.PlaneGeometry(sx, sz);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * sx / tile, uv.getY(i) * sz / tile);
    geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    grounds.add(mesh);
    return mesh;
  }
  patch('Woodland floor', 0, 0, 920, 920, -0.3, grass, 9);
  patch('Wet basalt forecourt', 0, 11, 66, 70, 0, stone, 12.4);
  patch('Arrival street', 0, 28.65, 410, 9.3, -0.078, road, 5.3);
  patch('Garden footpath', 0, 34.3, 182, 1.95, -0.026, stone, 11.2);

  // Each set of repeated details shares a single instanced draw.
  const batches = [];
  function batch(name, geometry, material, cast = false, receive = true) {
    const b = { name, geometry, material, items: [], cast, receive };
    batches.push(b);
    return b;
  }
  const cube = new THREE.BoxGeometry(1,1,1);
  const identity = new THREE.Quaternion();
  const zero = new THREE.Vector3();
  const transform = new THREE.Matrix4();
  const vector = new THREE.Vector3();
  function piece(b, x, y, z, sx, sy, sz, color = null, q = identity) {
    transform.compose(zero.set(x, y, z), q, vector.set(sx, sy, sz));
    b.items.push([transform.clone(), color]);
  }
  function finishBatches() {
    for (const b of batches) {
      if (!b.items.length) continue;
      const mesh = new THREE.InstancedMesh(b.geometry, b.material, b.items.length);
      mesh.name = b.name;
      b.items.forEach(([m,c],i) => {
        mesh.setMatrixAt(i,m);
        if (c) mesh.setColorAt(i,c);
      });
      mesh.castShadow = b.cast;
      mesh.receiveShadow = b.receive;
      mesh.computeBoundingSphere();
      grounds.add(mesh);
    }
  }
  const walls = batch('Honed granite planters', cube, facing, true);
  const caps = batch('Pale stone coping and street kerbs', cube, kerb);
  const earth = batch('Planting soil', cube, soil);
  const hardware = batch('Recessed light fittings and drainage', cube, rim);
  const insets = batch('Warm recessed lights', cube, lamp);
  const dashes = batch('Broken centre line', cube, dash);
  const shoulder = batch('Fine ochre road edging', cube, paint);
  for (let x = -196; x <= 196; x += 8.4) piece(dashes, x, -0.073, 28.9, 3.1, 0.004, 0.09);
  for (const z of [24.18,33.09]) piece(shoulder, 0, -0.071, z, 408, 0.005, 0.042);
  for (let x = -28.5; x < 29; x += 1) piece(caps, x, -0.081, 23.934, 0.994, 0.18, 0.145);
  for (let x = -88; x < 90; x += 1.4) piece(caps, x, -0.10, 33.34, 1.39, 0.16, 0.13);
  for (const x of [-28.94,28.94]) piece(walls, x, -0.10, 0, 0.12, 0.21, 48);
  piece(walls, 0, -0.10, -23.95, 58, 0.21, 0.1);
  // Drain slots retain a visible rhythm around the slick basalt.
  for (const side of [-1,1]) {
    for (let i=0;i<18;i++) {
      const z = -21.2+i*2.5;
      piece(hardware, side*18.0, 0.009, z, 0.095, 0.015, 1.03);
      for (let j=0;j<8;j++) piece(walls, side*18, 0.019, z+(j-3.5)*0.122,0.083,0.008,0.025);
    }
  }

  const grad = lightFalloff();
  const disk = new THREE.PlaneGeometry(1,1);
  disk.rotateX(-Math.PI/2);
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x111710, map: grad, transparent: true,
    opacity: 0.46, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
  const shadows = batch('Canopy and vehicle contact shadows', disk, shadowMat, false, false);
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xffac53, map: grad, transparent: true, opacity: 0.22,
    blending: THREE.AdditiveBlending, depthWrite: false });
  const lightPools = batch('Soft pools of landscape lighting',disk,lightMat,false,false);
  const twigs = batch('Hornbeam trunks and limbs', new THREE.CylinderGeometry(0.68, 1, 1, 7, 1, false),
    std({color:0xffffff,roughness:0.91,envMapIntensity:0.26}), false);
  const barkUp = new THREE.Vector3(0,1,0);
  const branchDir = new THREE.Vector3();
  const branchQ = new THREE.Quaternion();
  function limb(a, b, radius, tint) {
    const d = branchDir.subVectors(b,a);
    const length = d.length();
    branchQ.setFromUnitVectors(barkUp,d.normalize());
    piece(twigs,(a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2,radius,length,radius,tint,branchQ);
  }
  // Each spray contains folded, individually oriented leaf blades in a 3D volume.
  const positions=[],colors=[],indices=[];
  for(let n=0;n<96;n++){
    const theta=between(0,Math.PI*2), v=between(-1,1), r=.48*Math.cbrt(random());
    const ring=Math.sqrt(1-v*v);
    const center=new THREE.Vector3(r*ring*Math.cos(theta),r*v,r*ring*Math.sin(theta));
    const axis=new THREE.Vector3(between(-1,1),between(-.85,.65),between(-1,1)).normalize();
    const cross=new THREE.Vector3().crossVectors(axis,new THREE.Vector3(0,1,0)).normalize();
    const length=between(.072,.147), width=length*between(.32,.50),start=positions.length/3;
    const light=between(.67,1.17)*(.92+center.y*.45);
    for(const [u,w,fold] of [[-1,0,0],[-.1,1,0],[.1,0,.026],[1,0,-.012],[-.1,-1,0]]){
      const pt=center.clone().addScaledVector(axis,u*length).addScaledVector(cross,w*width);
      positions.push(pt.x,pt.y+fold,pt.z);colors.push(light*between(.22,.39),light*between(.26,.34),light*.105);
    }
    for(const i of [0,1,2,1,3,2,3,4,2,4,0,2])indices.push(start+i);
  }
  const spray=new THREE.BufferGeometry();
  spray.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  spray.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  spray.setIndex(indices);spray.computeVertexNormals();
  const leaves=batch('Individual hornbeam leaves',spray,std({vertexColors:true,side:THREE.DoubleSide,roughness:.64}),false,true);
  function tuft(x,y,z,size,shade,yaw,spread=1){
    const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(between(-.4,.4),yaw,between(-.4,.4)));
    piece(leaves,x,y,z,size,size*spread,size,new THREE.Color(shade,shade,shade),q);
  }
  const hedgesMaterial = std({ map:hedgeLeaves, color:0xbbbf9b, roughness:0.83, envMapIntensity:0.42 });
  // Straight trimmed flanks with a slightly rounded shoulder and irregular top.
  const hedgePositions = [], hedgeUV = [], hedgeIndices=[];
  function clippedHedge(x,z,w,d,h,base) {
    const longX = w>d, length=Math.max(w,d), width=Math.min(w,d);
    const steps=Math.max(3,Math.ceil(length*2.2));
    const start=hedgePositions.length/3;
    const points=[[-.5,0],[-.5,.77],[-.43,.95],[-.25,1],[.23,1],[.43,.95],[.5,.77],[.5,0]];
    for(let i=0;i<=steps;i++){
      const t=(i/steps-.5)*length, wobble=between(-.035,.035);
      points.forEach(([side,alt],j)=>{
        const cross=side*width+(alt>.6?between(-.025,.025):0), height=h*alt+base+(alt>.6?wobble:0);
        hedgePositions.push(longX?x+t:x+cross,height,longX?z+cross:z+t);
        hedgeUV.push(t*.84,j*0.16);
        if(i>0&&j>0){
          const a=start+i*points.length+j,b=a-points.length;
          hedgeIndices.push(a,b,b-1,a,b-1,a-1);
        }
      });
    }
    for(let i=0;i<length*2.5;i++){
      const t=between(-length*.49,length*.49), v=between(-width*.36,width*.36);
      tuft(x+(longX?t:v),base+h+between(-.09,-.03),z+(longX?v:t),between(.19,.32),between(.48,.66),between(0,6),.74);
    }
  }
  function planter(x,z,w,d,h,{hedge=false,lamps=false,lawn=false}={}) {
    const t=0.14;
    for (const side of [-1,1]){
      piece(walls,x+side*(w-t)/2,h/2,z,t,h,d);
      piece(walls,x,h/2,z+side*(d-t)/2,w-t*2,h,t);
      piece(caps,x+side*(w-t)/2,h+.007,z,t+.024,.05,d+.024);
      piece(caps,x,h+.007,z+side*(d-t)/2,w-t*2,.05,t+.024);
    }
    if(lawn) patch('Planted lawn',x,z,w-2*t,d-2*t,h-.04,grass,6);
    else piece(earth,x,h-.075,z,w-2*t,.07,d-2*t);
    if(hedge) clippedHedge(x,z,w-.41,d-.41,.54,h-.045);
    if(lamps){
      const alongX = w>d, length=alongX?w:d;
      const count=Math.max(2,Math.floor(length/5));
      for(let i=0;i<count;i++){
        const dx=alongX ? ((i+.5)/count-.5)*w : (x>0?-1:1)*(w/2+.005);
        const dz=alongX ? d/2+.005 : ((i+.5)/count-.5)*d;
        piece(hardware,x+dx,.22,z+dz,alongX?.22:.035,.12,alongX?.035:.22);
        piece(insets,x+dx+(alongX?0:Math.sign(dx)*.015),.217,z+dz+(alongX?.02:0),alongX?.129:.035,.038,alongX?.035:.129);
        piece(lightPools,x+dx+(alongX?0:Math.sign(dx)*.30),.027,z+dz+(alongX?.34:0),1.5,1,1.3);
      }
    }
  }
  planter(-22.85,-3.55,6.25,31.2,.19,{lawn:true});
  planter(22.9,-3.55,6.25,31.2,.19,{lawn:true});
  planter(0,-19.95,34.6,3.3,.24,{lawn:true});
  for (const x of [-20.1,20.1]) planter(x,21.95,13.8,1.34,.54,{hedge:true,lamps:true});
  for (const x of [-19.44,19.45]) planter(x,-1.3,1.05,19.4,.44,{hedge:true,lamps:true});
  for (const x of [-24.1,24.1]) planter(x,15.5,3.25,3.15,.19,{lawn:true});
  for (const x of [-21.1,21.1]) planter(x,-20.2,6.3,1.24,.4,{hedge:true,lamps:true});
  const hedgeGeo=new THREE.BufferGeometry();
  hedgeGeo.setAttribute('position',new THREE.Float32BufferAttribute(hedgePositions,3));
  hedgeGeo.setAttribute('uv',new THREE.Float32BufferAttribute(hedgeUV,2));
  hedgeGeo.setIndex(hedgeIndices);hedgeGeo.computeVertexNormals();
  hedgesMaterial.side=THREE.DoubleSide;
  const hedgeMesh=new THREE.Mesh(hedgeGeo,hedgesMaterial);
  hedgeMesh.name='Clipped evergreen hedges';hedgeMesh.castShadow=true;hedgeMesh.receiveShadow=true;grounds.add(hedgeMesh);

  function tree(x,z,h,y,lit=false,distant=false) {
    const radius=h*between(.28,.38), yaw=between(0,6.28), diffuse=between(.78,1.03);
    const bark = new THREE.Color().setRGB(...(lit ? [.18,.113,.052] : [.115,.104,.078]).map(v=>v*diffuse));
    const root=new THREE.Vector3(x,y,z);
    const crotch=new THREE.Vector3(x+between(-.13,.13),y+h*between(.29,.38),z+between(-.13,.13));
    limb(root,crotch,h*.018,bark);
    const central=new THREE.Vector3(crotch.x+between(-.24,.24),y+h*.77,crotch.z+between(-.24,.24));
    limb(crotch,central,h*.013,bark);
    const whorls=distant?5:11;
    for(let k=0;k<whorls;k++) {
      const a=yaw+k*2.39996+between(-.29,.29);
      const layer=k/(whorls-1),reach=radius*(1-layer*.52);
      const start=crotch.clone().lerp(central,layer*.86);
      const middle=new THREE.Vector3(x+Math.cos(a)*reach*.58,y+h*(.48+layer*.32),z+Math.sin(a)*reach*.58);
      limb(start,middle,h*.0093*(1-layer*.4),bark);
      const forks=distant?2:3;
      for(let j=0;j<forks;j++){
        const v=a+(j-(forks-1)/2)*between(.49,.78);
        const tip=new THREE.Vector3(middle.x+Math.cos(v)*reach*between(.35,.68),middle.y+h*between(.10,.20),middle.z+Math.sin(v)*reach*between(.35,.68));
        if(!distant){
          limb(middle,tip,h*.0044,bark);
          for(const side of [-1,1]){
            const twig=tip.clone().add(new THREE.Vector3(Math.cos(v+side*.8)*h*.085,h*between(.05,.115),Math.sin(v+side*.8)*h*.085));
            limb(tip,twig,h*.0024,bark);
            tuft(twig.x,twig.y,twig.z,h*.13,.75,v+side);
          }
        }
        const shade=(.61+.22*layer+.13*Math.cos(v-.72)+between(-.10,.11))*diffuse;
        const size=h*between(distant?.34:.29,distant?.48:.405)*(1-layer*.24);
        tuft(tip.x,tip.y,tip.z,size,shade,v,between(.90,1.18));
      }
    }
    tuft(central.x, y+h*.885, central.z,radius*1.18,.94*diffuse,yaw+.331,1.01);
    if(!distant) {
      piece(shadows,x,y+.017,z,radius*2.6,1,radius*2.25);
      piece(shadows,x,y+.021,z,radius*1.3,1,radius*.98);
    }
    if(lit){
      const dx=Math.cos(yaw)*.42,dz=Math.sin(yaw)*.42;
      piece(hardware,x+dx,y+.027,z+dz,.20,.048,.20);
      piece(insets,x+dx,y+.057,z+dz,.089,.018,.089);
      piece(lightPools,x+dx,y+.027,z+dz,2.6,1,2.15);
    }
  }
  for (const side of [-1,1]) {
    for (const z of [-15.4,-6,4.3]) tree(side*(22.9+between(-.18,.18)),z,between(8.7,11.0),.153,true);
    tree(side*24.1,15.5,between(15.4,16.6),.151,true);
  }
  for (const x of [-13.4,-4.4,5.1,14.05]) tree(x,-19.8,between(7.4,9.3),.203,true);
  for(let i=0;i<16;i++){
    const side=i%2?-1:1;
    const z=-40+Math.floor(i/2)*9.2;
    if(z>22&&z<34)continue;
    tree(side*between(30.8,38.8),z,between(9.6,15.5),-.29);
  }
  for (let z = -48; z <= 24; z+=12){
    for(let x=-59;x<=59;x+=12){
      const tx=x+between(-3.9,3.9),tz=z+between(-3.1,3.1);
      if(Math.abs(tx)<37&&tz>-29&&tz<42)continue;
      if(tz>21.5&&tz<38.3)continue;
      if(Math.abs(tx)<16&&tz>31&&tz<75)continue;
      if(random()<.13)continue;
      tree(tx,tz,between(7.2,16.4),-.29,false,true);
    }
  }
  finishBatches();
  scene.add(grounds);
  return grounds;
}
