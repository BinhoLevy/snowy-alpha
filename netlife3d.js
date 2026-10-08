/* SNOWY NETLIFE — 3D ENGINE 0.1 */

import * as THREE from
  'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';

export function createNetLife3D(container){

  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0xf8f8f8);

  const camera=new THREE.PerspectiveCamera(
    75,
    container.clientWidth/container.clientHeight,
    0.1,
    1000
  );

  // O usuário está dentro da esfera
  camera.position.set(0,0,0);

  const renderer=new THREE.WebGLRenderer({
    antialias:true,
    alpha:false
  });

  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio,2)
  );

  renderer.setSize(
    container.clientWidth,
    container.clientHeight
  );

  container.appendChild(renderer.domElement);

  const radius=65;
  const count=420;
  const positions=[];

  // Distribuição dos pontos na superfície esférica
  for(let i=0;i<count;i++){

    const y=1-(i/(count-1))*2;
    const r=Math.sqrt(1-y*y);
    const theta=Math.PI*(3-Math.sqrt(5))*i;

    positions.push(new THREE.Vector3(
      Math.cos(theta)*r*radius,
      y*radius,
      Math.sin(theta)*r*radius
    ));
  }

  const pointsGeometry=new THREE.BufferGeometry();

  pointsGeometry.setFromPoints(positions);

  const pointsMaterial=new THREE.PointsMaterial({
    color:0x242424,
    size:0.8,
    sizeAttenuation:true
  });

  const points=new THREE.Points(
    pointsGeometry,
    pointsMaterial
  );

  scene.add(points);

  // Conexões entre pontos próximos
  const lines=[];

  for(let i=0;i<count;i++){
    for(let j=i+1;j<count;j++){

      if(positions[i].distanceTo(positions[j])<13){
        lines.push(
          positions[i].x,
          positions[i].y,
          positions[i].z,
          positions[j].x,
          positions[j].y,
          positions[j].z
        );
      }
    }
  }

  const lineGeometry=new THREE.BufferGeometry();

  lineGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(lines,3)
  );

  const lineMaterial=new THREE.LineBasicMaterial({
    color:0x555555,
    transparent:true,
    opacity:0.25,
    depthWrite:false
  });

  const mesh=new THREE.LineSegments(
    lineGeometry,
    lineMaterial
  );

  scene.add(mesh);

  // Navegação em 360 graus
  let yaw=0;
  let pitch=0;
  let dragging=false;
  let lastX=0;
  let lastY=0;

  renderer.domElement.style.touchAction='none';

  renderer.domElement.addEventListener(
    'pointerdown',
    e=>{
      dragging=true;
      lastX=e.clientX;
      lastY=e.clientY;
      renderer.domElement.setPointerCapture(e.pointerId);
    }
  );

  renderer.domElement.addEventListener(
    'pointermove',
    e=>{
      if(!dragging)return;

      const dx=e.clientX-lastX;
      const dy=e.clientY-lastY;

      lastX=e.clientX;
      lastY=e.clientY;

      yaw-=dx*0.004;
      pitch-=dy*0.004;

      pitch=Math.max(
        -Math.PI/2+0.01,
        Math.min(Math.PI/2-0.01,pitch)
      );

      camera.rotation.order='YXZ';
      camera.rotation.y=yaw;
      camera.rotation.x=pitch;
    }
  );

  const stop=()=>dragging=false;

  renderer.domElement.addEventListener('pointerup',stop);
  renderer.domElement.addEventListener('pointercancel',stop);
  renderer.domElement.addEventListener('lostpointercapture',stop);

  let running=true;
  let frameId=0;

  function animate(){
    if(!running)return;

    frameId=requestAnimationFrame(animate);
    renderer.render(scene,camera);
  }

  function resize(){
    if(!running)return;

    const w=container.clientWidth;
    const h=container.clientHeight;

    if(!w||!h)return;

    camera.aspect=w/h;
    camera.updateProjectionMatrix();
    renderer.setSize(w,h);
  }

  window.addEventListener('resize',resize);

  animate();

  // Limpeza ao sair do universo
  return function destroy(){
    running=false;
    cancelAnimationFrame(frameId);
    window.removeEventListener('resize',resize);

    pointsGeometry.dispose();
    pointsMaterial.dispose();
    lineGeometry.dispose();
    lineMaterial.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}
