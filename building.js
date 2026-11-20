import * as THREE from './vendor/three.module.js';

const photo = {
  width: 1536, height: 1024,
  left: 34, right: 1502, top: 88, bottom: 816,
  horizon: 759, centerX: 768, cameraZ: 40,
  eyeY: 15.8 * (816 - 759) / 728,
  focalPx: 27 * (1502 - 34) / 32
};

export const PAVILION = {
  width: 32, depth: 26, height: 15.8, frontZ: 13,
  bandBottom: 15.8 * (816 - 563) / 728,
  bandTop: 15.8 * (816 - 453) / 728,
  entryLeft: (466 - 768) * 32 / 1468,
  entryRight: (1072 - 768) * 32 / 1468,
  frontPhoto: photo
};

const directory = new URL('./assets/', import.meta.url);

function bilerp(corners, u, v) {
  return corners[0].map((_, i) =>
    (1-v) * ((1-u)*corners[0][i] + u*corners[1][i]) +
    v * ((1-u)*corners[3][i] + u*corners[2][i]));
}

// A set of independent surveyed panels with their own atlas coordinates.
class Panels {
  constructor() {
    this.position = [];
    this.uv = [];
    this.index = [];
  }
  add(corners, uvAt = (p,u,v) => [u,v], columns = 1, rows = 1) {
    const offset = this.position.length / 3;
    for (let j=0; j<=rows; j++) {
      for (let i=0; i<=columns; i++) {
        const u=i/columns, v=j/rows;
        const p = bilerp(corners,u,v);
        this.position.push(...p);
        this.uv.push(...uvAt(p,u,v));
        if (i<columns && j<rows) {
          const a=offset+j*(columns+1)+i;
          this.index.push(a,a+1,a+columns+2, a,a+columns+2,a+columns+1);
        }
      }
    }
  }
  finish(parent, name, material) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(this.position,3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv,2));
    geo.setIndex(this.index);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, material);
    mesh.name = name;
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }
}

function projection([x,y,z]) {
  const scale = 27 / (photo.cameraZ - z);
  return [
    photo.centerX + x * (photo.right-photo.left) / 32 * scale,
    photo.horizon - (y-photo.eyeY) * (photo.bottom-photo.top) / 15.8 * scale
  ];
}

function photographicMaterial(name, image, roughness, metalness, reflection) {
  // The image already contains diffuse irradiance. Preserve it in the color and
  // emissive terms of the portable PBR material. Only grazing reflections are live.
  const base = 0.18;
  const mat = new THREE.MeshStandardMaterial({
    name, map: image, emissiveMap: image,
    color: new THREE.Color().setRGB(base,base,base),
    emissive: new THREE.Color().setRGB(1-base,1-base,1-base),
    metalness, roughness, envMapIntensity: 0.8, toneMapped: false, fog: false
  });
  mat.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
      float orbitView = smoothstep(0.0, 0.68,
        length(vec2(cameraPosition.x, max(0.0,cameraPosition.y-4.0)*0.56))
          / max(0.1, length(cameraPosition.xz)));
      outgoingLight = diffuseColor.rgb / ${base.toFixed(4)}
        + (reflectedLight.directSpecular + reflectedLight.indirectSpecular)
          * orbitView * ${reflection.toFixed(3)};
      #include <opaque_fragment>`);
  };
  mat.customProgramCacheKey = () => 'pavilion-photo-' + reflection;
  return mat;
}

function addBox(group, name, w, h, d, x, y, z, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
  mesh.position.set(x,y,z);
  mesh.name = name;
  mesh.castShadow = true;
  group.add(mesh);
  return mesh;
}

export async function buildPavilion(scene, renderer) {
  const loader = new THREE.TextureLoader();
  const anisotropy = Math.min(8,renderer?.capabilities?.getMaxAnisotropy?.() || 4);
  async function load(name, color = true) {
    const tex = await loader.loadAsync(new URL(name,directory).href);
    tex.name = name;
    if (color) tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = anisotropy;
    return tex;
  }
  const [front, right, left, roof, rough, lobby] = await Promise.all([
    load('front.webp'), load('side-right.webp'), load('side-left.webp'),
    load('roof-photo.webp'), load('roof-rough.webp',false), load('vestibule.webp')
  ]);
  const group = new THREE.Group();
  group.name = 'Noir Pavilion';
  const {height:H,bandBottom:B,bandTop:T,entryLeft:L,entryRight:R} = PAVILION;
  const frontUv = p => {
    const [x,y] = projection(p);
    return [x/photo.width,1-y/photo.height];
  };
  const frontWall = (x0,x1,y0,y1) => [[x0,y0,13],[x1,y0,13],[x1,y1,13],[x0,y1,13]];

  const stone = new Panels();
  stone.add(frontWall(-16,16,T,H),frontUv);
  stone.add(frontWall(-16,L,0,B),frontUv);
  stone.add(frontWall(R,16,0,B),frontUv);
  stone.finish(group,'South elevation • bookmatched marble',
    photographicMaterial('Nero marble • polished',front,0.18,0.16,0.15));
  const belt = new Panels();
  belt.add(frontWall(-16,16,B,T),frontUv);
  belt.finish(group,'South elevation • brushed stainless steel',
    photographicMaterial('Satin stainless steel',front,0.32,0.75,0.19));

  function elevation(name, ends, map, mirror=false) {
    const marble = new Panels(), steel = new Panels();
    const [[x0,z0],[x1,z1]]=ends;
    for (const [low,high,batch] of [[0,B,marble],[B,T,steel],[T,H,marble]]) {
      batch.add([[x0,low,z0],[x1,low,z1],[x1,high,z1],[x0,high,z0]],
        (p,u) => [mirror ? 1-u : u,p[1]/H]);
    }
    marble.finish(group,name+' • marble panels',
      photographicMaterial(name+' polished marble',map,0.19,0.16,0.14));
    steel.finish(group,name+' • metal band',
      photographicMaterial(name+' brushed steel',map,0.28,0.78,0.19));
  }
  elevation('East elevation',[[16,13],[16,-13]],right);
  elevation('West elevation',[[-16,-13],[-16,13]],left);
  elevation('North elevation',[[16,-13],[-16,-13]],left,true);

  const deckY = H - 0.075;
  const deck = new Panels();
  deck.add([[-16,deckY,13],[16,deckY,13],[16,deckY,-13],[-16,deckY,-13]]);
  const roofMat=photographicMaterial('Graphite roof panels',roof,0.83,0.26,0.23);
  roofMat.roughnessMap = rough;
  deck.finish(group,'Roof • sealed graphite panels',roofMat);
  const coping = new THREE.MeshStandardMaterial({
    name:'Folded graphite coping',color:0x313339,metalness:0.68,roughness:0.33
  });
  const copingHeight=0.088, rim=.13, rimY=H-copingHeight/2;
  addBox(group,'Front perimeter coping',32,.04,rim,0,H-.02,13-rim/2,coping);
  addBox(group,'Rear perimeter coping',32,copingHeight,rim,0,rimY,-13+rim/2,coping);
  for (const sign of [-1,1]) {
    addBox(group,'Side perimeter coping',rim,copingHeight,26-2*rim,sign*(16-rim/2),rimY,0,coping);
  }

  // Recessed side walls, soffit, sill and rear onyx are reprojected on real planes.
  // Subdivisions keep this perspective projection accurate at the steep reveals.
  const entry = new Panels();
  const lobbyUv = p => {
    const [x,y] = projection(p);
    return [(x-462)/615,1-(y-559)/260];
  };
  const rear = -8.4, threshold = .014;
  entry.add([[L,threshold,13],[L,threshold,rear],[L,B,rear],[L,B,13]],lobbyUv,24);
  entry.add([[R,threshold,rear],[R,threshold,13],[R,B,13],[R,B,rear]],lobbyUv,24);
  entry.add([[L,B,rear],[R,B,rear],[R,B,13],[L,B,13]],lobbyUv,1,24);
  entry.add([[L,threshold,13],[R,threshold,13],[R,threshold,rear],[L,threshold,rear]],lobbyUv,1,24);
  entry.add([[L,threshold,rear],[R,threshold,rear],[R,B,rear],[L,B,rear]],lobbyUv);
  entry.finish(group,'Entrance • onyx lobby, reveals, soffit and threshold',
    new THREE.MeshBasicMaterial({name:'Illuminated bronze and onyx',map:lobby,side:THREE.DoubleSide,toneMapped:false,fog:false}));

  const doorZ=6.25;
  const scale = (photo.cameraZ-doorZ)/27;
  const xAt = pixel => (pixel-photo.centerX)*32/1468*scale;
  const yAt = pixel => photo.eyeY + (photo.horizon-pixel)*15.8/728*scale;
  const bronze = new THREE.MeshStandardMaterial({name:'Dark bronze glazing beads',color:0x32281e,metalness:.79,roughness:.26});
  const doors = new THREE.Group();
  doors.name='Vestibule glazing';
  group.add(doors);
  const bars = [
    [525.8,.055],[618.0,.047],[683.4,.039],[688.6,.040],
    [770.0,.076],[850.3,.039],[855.7,.040],[917.0,.048],[1012.4,.055]
  ];
  for (const [x,width] of bars) {
    const base=Math.max(threshold,yAt(804)), top=Math.min(B,yAt(605));
    addBox(doors,'Glazing mullion',width,top-base,.07,xAt(x),(top+base)/2,doorZ,bronze);
  }
  for (const [y,x0,x1,height] of [[606,526,1012,.049],[608,683,856,.075],[803,618,917,.072]]) {
    addBox(doors,'Bronze transom',xAt(x1)-xAt(x0),height,.078,(xAt(x0)+xAt(x1))/2,yAt(y),doorZ,bronze);
  }
  const glassMaterial = new THREE.MeshStandardMaterial({
    name:'Clear entrance glazing',transparent:true,opacity:.075,color:0xa6a9a5,
    roughness:.065,metalness:.83,envMapIntensity:1.5,depthWrite:false,side:THREE.DoubleSide
  });
  const glass = new Panels();
  glass.add([[L,.04,doorZ],[R,.04,doorZ],[R,B-.04,doorZ],[L,B-.04,doorZ]]);
  const pane=glass.finish(doors,'Entrance glazing • low-iron glass',glassMaterial);
  pane.castShadow=false;
  scene.add(group);
  return group;
}
