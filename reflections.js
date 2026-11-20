import * as THREE from './vendor/three.module.js';
import { Reflector } from './vendor/Reflector.js';


// A reflected camera sees the same lobby and trees from below the wet stone.
// Surface roughness varies per paving slab and the reflection recedes at steep angles.
export function addWetStone(scene, compact) {
  const wet = new Reflector(new THREE.PlaneGeometry(65.98, 69.98), {
    textureWidth: compact ? 640 : 1280, textureHeight: compact ? 384 : 768,
    multisample: 0, clipBias: .002, color: 0xffffff,
    shader: {
      name: 'Wet basalt paving', uniforms: Reflector.ReflectorShader.uniforms,
      vertexShader: `uniform mat4 textureMatrix;
        varying vec4 projected; varying vec3 world;
        void main(){ projected=textureMatrix*vec4(position,1.);world=(modelMatrix*vec4(position,1.)).xyz;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `uniform sampler2D tDiffuse; varying vec4 projected; varying vec3 world;
        float hash(vec2 p){ p=fract(p*vec2(.1031,.11369));p+=dot(p,p.yx+19.19);return fract((p.x+p.y)*p.x);}
        float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
        void main(){vec2 p=world.xz;vec2 uv=projected.xy/projected.w;
          float r=noise(p*vec2(2.2,6.3)), tile=hash(floor(p/1.4));
          vec2 perturb=vec2(noise(p*vec2(3.6,12.))-.5,r-.5)*.00085;
          vec2 d=vec2(.0017,.0027)*(.4+tile);uv+=perturb;
          vec3 reflected=texture2D(tDiffuse,uv).rgb*.4;
          reflected+=.15*(texture2D(tDiffuse,uv+d).rgb+texture2D(tDiffuse,uv-d).rgb+texture2D(tDiffuse,uv+vec2(-d.x,d.y)).rgb+texture2D(tDiffuse,uv+vec2(d.x,-d.y)).rgb);
          float facing=abs(normalize(cameraPosition-world).y);
          float wetness=.32+.56*pow(1.-facing,1.7);
          gl_FragColor=vec4(reflected,wetness*(.36+.52*smoothstep(.2,.72,noise(p*.68))+.12*tile));
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`
    }
  });
  wet.name = 'Rain on the forecourt';
  wet.rotation.x = -Math.PI / 2;
  wet.position.set(0,.012,11);
  wet.renderOrder = 1;
  wet.material.transparent = true;
  wet.material.depthWrite = false;
  scene.add(wet);
  return wet;
}

