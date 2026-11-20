import * as THREE from './vendor/three.module.js';
import { RGBELoader } from './vendor/RGBELoader.js';
import { makeCamera, placeCamera, pathStart } from './camera.js';
import { addWetStone } from './reflections.js';
import { buildPavilion } from './building.js';
import { buildLandscape } from './landscape.js';

export async function createScene(stage, onLoss) {
  const compact = Math.min(window.innerWidth, window.innerHeight) < 660;
  const renderer = new THREE.WebGLRenderer({ antialias: !compact, alpha: false, powerPreference: 'high-performance' });
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden','true');
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); onLoss(); }, {once:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, compact ? 1.25 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  const scene = new THREE.Scene();
  const camera = makeCamera();
  scene.fog = new THREE.FogExp2(0x414a57, .003);
  const skyLight = new THREE.HemisphereLight(0xdde7fb,0x393c39,.55);
  scene.add(skyLight);
  const daylight = new THREE.DirectionalLight(0xc8d5eb,.83);
  daylight.position.set(-30,54,46);
  daylight.castShadow = true;
  daylight.shadow.mapSize.setScalar(compact ? 1024 : 2048);
  Object.assign(daylight.shadow.camera, {left:-52,right:52,top:52,bottom:-52,near:1,far:160});
  daylight.shadow.camera.updateProjectionMatrix();
  daylight.shadow.normalBias = .03;
  daylight.shadow.bias = -.0002;
  scene.add(daylight,daylight.target);
  const textureLoader = new THREE.TextureLoader();
  const [sky,lighting] = await Promise.all([
    textureLoader.loadAsync('./assets/sky.jpg'),
    new RGBELoader().loadAsync('./assets/overcast.hdr'),
    buildPavilion(scene,renderer), buildLandscape(scene,renderer)
  ]);
  sky.colorSpace = THREE.SRGBColorSpace;
  sky.mapping = THREE.EquirectangularReflectionMapping;
  lighting.mapping = THREE.EquirectangularReflectionMapping;
  // Sample the same panorama in both the main view and the reflected view.
  const clouds = new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,
    uniforms:{panorama:{value:sky},advance:{value:0}},
    vertexShader:`varying vec3 ray;
      void main(){ray=position;vec4 p=projectionMatrix*vec4(mat3(viewMatrix)*position,1.);gl_Position=p.xyww;}`,
    fragmentShader:`uniform sampler2D panorama;uniform float advance;varying vec3 ray;
      void main(){vec3 direction=normalize(ray);
        float skyMask=smoothstep(.025,.19,direction.y);
        direction=normalize(direction+vec3(0.,0.,-advance*skyMask));
        vec2 uv=vec2(atan(direction.z,direction.x)/6.2831853+.5,asin(direction.y)/3.14159265+.5);
        gl_FragColor=vec4(texture2D(panorama,uv).rgb*.96,1.);
        #include <colorspace_fragment>
      }`
  });
  const skyDome=new THREE.Mesh(new THREE.SphereGeometry(1,64,32),clouds);
  skyDome.frustumCulled=false;skyDome.renderOrder=-1000;scene.add(skyDome);
  scene.environment = lighting;
  scene.environmentIntensity = .72;

  for(const [x,z] of [[-24,15],[24,15],[-23,-6],[23,-6],[-9,13],[9,13],[-12,25]]){
    const light=new THREE.PointLight(0xffbb72,55,13,2);
    light.position.set(x,.65,z);scene.add(light);
  }
  const wet = addWetStone(scene,compact);

  let lastWidth = 0, lastHeight = 0;
  function draw(progress,pullback=0,cloudTravel=0) {
    const width = Math.max(stage.clientWidth,1), height = Math.max(stage.clientHeight,1);
    if (width !== lastWidth || height !== lastHeight) {
      renderer.setSize(width,height,false);
      lastWidth = width; lastHeight = height;
    }
    placeCamera(camera,width,height,progress,pullback);


    clouds.uniforms.advance.value=.055*THREE.MathUtils.smoothstep(progress,1-.45/pathStart,1)+.095*cloudTravel;
    renderer.render(scene,camera);
  }
  stage.append(canvas);
  renderer.shadowMap.needsUpdate = true;

  return { draw, dispose() { wet.dispose(); renderer.dispose(); canvas.remove(); } };
}
