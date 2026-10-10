
/* SNOWY NETLIFE — 3D ENGINE 0.2
   TEIA VIVA — PRIMEIRO PROTÓTIPO
*/

import * as THREE from 'https://esm.sh/three@0.160.1';

export function createNetLife3D(container){

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf8f8f8);

  const camera = new THREE.PerspectiveCamera(
    75,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );

  // O usuário continua dentro da esfera
  camera.position.set(0, 0, 0);
  camera.rotation.order = 'YXZ';

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false
  });

  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 2)
  );

  renderer.setSize(
    container.clientWidth,
    container.clientHeight
  );

  renderer.domElement.style.touchAction = 'none';
  container.appendChild(renderer.domElement);

  // ==========================================
  // 1. ESTRUTURA DA TEIA
  // ==========================================

  const radius = 65;
  const count = 420;

  const originalPositions = [];
  const positions = [];
  const velocities = [];

  for(let i = 0; i < count; i++){

    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = Math.PI * (3 - Math.sqrt(5)) * i;

    // Pequenas diferenças de profundidade
    const depth = radius + Math.sin(i * 2.37) * 2.4;

    const point = new THREE.Vector3(
      Math.cos(theta) * r * depth,
      y * depth,
      Math.sin(theta) * r * depth
    );

    originalPositions.push(point.clone());
    positions.push(point.clone());
    velocities.push(new THREE.Vector3());
  }

  // ==========================================
  // 2. PONTOS
  // ==========================================

  const pointsGeometry = new THREE.BufferGeometry();
  pointsGeometry.setFromPoints(positions);

  const pointsMaterial = new THREE.PointsMaterial({
    color: 0x242424,
    size: 0.8,
    sizeAttenuation: true
  });

  const points = new THREE.Points(
    pointsGeometry,
    pointsMaterial
  );

  scene.add(points);

  // ==========================================
  // 3. CONEXÕES FLEXÍVEIS
  // ==========================================

  const connections = [];

  for(let i = 0; i < count; i++){
    for(let j = i + 1; j < count; j++){

      if(
        originalPositions[i].distanceTo(
          originalPositions[j]
        ) < 13
      ){
        connections.push([i, j]);
      }
    }
  }

  const lineArray = new Float32Array(
    connections.length * 6
  );

  const lineGeometry = new THREE.BufferGeometry();

  const lineAttribute = new THREE.BufferAttribute(
    lineArray,
    3
  );

  lineAttribute.setUsage(THREE.DynamicDrawUsage);

  lineGeometry.setAttribute(
    'position',
    lineAttribute
  );

  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x555555,
    transparent: true,
    opacity: 0.25,
    depthWrite: false
  });

  const mesh = new THREE.LineSegments(
    lineGeometry,
    lineMaterial
  );

  scene.add(mesh);

  // ==========================================
  // 4. MOVIMENTO E INTERAÇÃO
  // ==========================================

  let yaw = 0;
  let pitch = 0;

  let dragging = false;
  let activePointer = null;

  let lastX = 0;
  let lastY = 0;

  const raycaster = new THREE.Raycaster();

  raycaster.params.Points.threshold = 5;

  const pointer = new THREE.Vector2();

  let selectedPoint = -1;

  const clock = new THREE.Clock();

  function getPointAt(x, y){

    const rect =
      renderer.domElement.getBoundingClientRect();

    if(!rect.width || !rect.height){
      return -1;
    }

    pointer.x =
      ((x - rect.left) / rect.width) * 2 - 1;

    pointer.y =
      -((y - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);

    const hits = raycaster.intersectObject(points);

    if(hits.length){
      return hits[0].index;
    }

    return -1;
  }

  function applyForce(index, dx, dy){

    if(index < 0) return;

    const point = positions[index];

    // Movimento na orientação atual da câmera
    const right = new THREE.Vector3(1, 0, 0)
      .applyQuaternion(camera.quaternion);

    const up = new THREE.Vector3(0, 1, 0)
      .applyQuaternion(camera.quaternion);

    const force = right.multiplyScalar(dx * 0.06)
      .add(up.multiplyScalar(-dy * 0.06));

    // A força se espalha aos pontos próximos
    const influenceRadius = 25;

    for(let i = 0; i < count; i++){

      const distance =
        originalPositions[i].distanceTo(
          originalPositions[index]
        );

      if(distance > influenceRadius){
        continue;
      }

      const influence =
        Math.pow(
          1 - distance / influenceRadius,
          2
        );

      velocities[i].addScaledVector(
        force,
        influence
      );
    }
  }

  const canvas = renderer.domElement;

  function onPointerDown(e){

    if(activePointer !== null) return;

    activePointer = e.pointerId;
    dragging = true;

    lastX = e.clientX;
    lastY = e.clientY;

    selectedPoint = getPointAt(
      e.clientX,
      e.clientY
    );

    canvas.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e){

    if(!dragging || e.pointerId !== activePointer){
      return;
    }

    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;

    lastX = e.clientX;
    lastY = e.clientY;

    if(selectedPoint >= 0){

      // Quando um ponto é selecionado,
      // o movimento deforma a teia.
      applyForce(selectedPoint, dx, dy);

    }else{

      // Fora dos pontos, mantém a
      // navegação 360 graus original.
      yaw -= dx * 0.004;
      pitch -= dy * 0.004;

      pitch = Math.max(
        -Math.PI / 2 + 0.01,
        Math.min(
          Math.PI / 2 - 0.01,
          pitch
        )
      );

      camera.rotation.y = yaw;
      camera.rotation.x = pitch;
    }
  }

  function stop(e){

    if(
      e &&
      activePointer !== null &&
      e.pointerId !== activePointer
    ){
      return;
    }

    dragging = false;
    selectedPoint = -1;
    activePointer = null;
  }

  canvas.addEventListener(
    'pointerdown',
    onPointerDown
  );

  canvas.addEventListener(
    'pointermove',
    onPointerMove
  );

  canvas.addEventListener(
    'pointerup',
    stop
  );

  canvas.addEventListener(
    'pointercancel',
    stop
  );

  canvas.addEventListener(
    'lostpointercapture',
    stop
  );

  // ==========================================
  // 5. FÍSICA DA TEIA
  // ==========================================

  let running = true;
  let frameId = 0;

  const springStrength = 0.018;
  const damping = 0.92;

  function updateWeb(time, dt){

    const step = Math.min(dt * 60, 2);

    for(let i = 0; i < count; i++){

      const original = originalPositions[i];
      const position = positions[i];
      const velocity = velocities[i];

      // Flutuação sutil, sempre presente
      const floating = new THREE.Vector3(
        Math.sin(time * 0.37 + i * 0.23) * 0.3,
        Math.cos(time * 0.31 + i * 0.19) * 0.3,
        Math.sin(time * 0.27 + i * 0.17) * 0.3
      );

      const target = original.clone().add(floating);

      // Força de retorno elástico
      const restoring = target.sub(position)
        .multiplyScalar(springStrength * step);

      velocity.add(restoring);

      // Amortecimento para não vibrar
      // indefinidamente
      velocity.multiplyScalar(
        Math.pow(damping, step)
      );

      position.addScaledVector(
        velocity,
        step
      );
    }

    // Atualiza os pontos
    const pointAttribute =
      pointsGeometry.getAttribute('position');

    for(let i = 0; i < count; i++){

      pointAttribute.setXYZ(
        i,
        positions[i].x,
        positions[i].y,
        positions[i].z
      );
    }

    pointAttribute.needsUpdate = true;

    // Atualiza os fios acompanhando
    // o movimento dos pontos
    let offset = 0;

    for(const [a, b] of connections){

      const p1 = positions[a];
      const p2 = positions[b];

      lineArray[offset++] = p1.x;
      lineArray[offset++] = p1.y;
      lineArray[offset++] = p1.z;

      lineArray[offset++] = p2.x;
      lineArray[offset++] = p2.y;
      lineArray[offset++] = p2.z;
    }

    lineAttribute.needsUpdate = true;
  }

  // ==========================================
  // 6. ANIMAÇÃO
  // ==========================================

  function animate(){

    if(!running) return;

    frameId = requestAnimationFrame(animate);

    const dt = clock.getDelta();
    const time = clock.elapsedTime;

    updateWeb(time, dt);

    renderer.render(scene, camera);
  }

  function resize(){

    if(!running) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    if(!w || !h) return;

    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    renderer.setSize(w, h);
  }

  window.addEventListener('resize', resize);

  animate();

  // ==========================================
  // 7. LIMPEZA
  // ==========================================

  return function destroy(){

    running = false;

    cancelAnimationFrame(frameId);

    window.removeEventListener(
      'resize',
      resize
    );

    canvas.removeEventListener(
      'pointerdown',
      onPointerDown
    );

    canvas.removeEventListener(
      'pointermove',
      onPointerMove
    );

    canvas.removeEventListener(
      'pointerup',
      stop
    );

    canvas.removeEventListener(
      'pointercancel',
      stop
    );

    canvas.removeEventListener(
      'lostpointercapture',
      stop
    );

    pointsGeometry.dispose();
    pointsMaterial.dispose();

    lineGeometry.dispose();
    lineMaterial.dispose();

    renderer.dispose();
    canvas.remove();
  };
}
