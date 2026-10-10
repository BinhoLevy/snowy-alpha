
/* SNOWY NETLIFE — 3D ENGINE 0.3
   MEMÓRIAS VIVAS — PROTÓTIPO C
   Toque para abrir. Arraste para explorar.
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

  camera.position.set(0,0,0);
  camera.rotation.order = 'YXZ';

  const renderer = new THREE.WebGLRenderer({
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

  const canvas = renderer.domElement;
  canvas.style.touchAction = 'none';
  container.appendChild(canvas);

  // =========================================
  // 1. TEIA VIVA ORIGINAL
  // =========================================

  const radius = 65;
  const count = 420;

  const originalPositions = [];
  const positions = [];
  const velocities = [];

  for(let i=0;i<count;i++){

    const y = 1-(i/(count-1))*2;
    const r = Math.sqrt(1-y*y);
    const theta = Math.PI*(3-Math.sqrt(5))*i;

    const depth =
      radius+Math.sin(i*2.37)*2.4;

    const point = new THREE.Vector3(
      Math.cos(theta)*r*depth,
      y*depth,
      Math.sin(theta)*r*depth
    );

    originalPositions.push(point.clone());
    positions.push(point.clone());
    velocities.push(new THREE.Vector3());
  }

  const pointsGeometry =
    new THREE.BufferGeometry();

  pointsGeometry.setFromPoints(positions);

  const pointsMaterial =
    new THREE.PointsMaterial({
      color:0x242424,
      size:0.8,
      sizeAttenuation:true
    });

  const points = new THREE.Points(
    pointsGeometry,
    pointsMaterial
  );

  scene.add(points);

  const connections = [];

  for(let i=0;i<count;i++){
    for(let j=i+1;j<count;j++){

      if(
        originalPositions[i].distanceTo(
          originalPositions[j]
        ) < 13
      ){
        connections.push([i,j]);
      }
    }
  }

  const lineArray = new Float32Array(
    connections.length*6
  );

  const lineGeometry =
    new THREE.BufferGeometry();

  const lineAttribute =
    new THREE.BufferAttribute(lineArray,3);

  lineAttribute.setUsage(
    THREE.DynamicDrawUsage
  );

  lineGeometry.setAttribute(
    'position',
    lineAttribute
  );

  const lineMaterial =
    new THREE.LineBasicMaterial({
      color:0x555555,
      transparent:true,
      opacity:0.25,
      depthWrite:false
    });

  const mesh = new THREE.LineSegments(
    lineGeometry,
    lineMaterial
  );

  scene.add(mesh);

  // =========================================
  // 2. CARTÕES DE MEMÓRIAS DEMONSTRATIVAS
  // =========================================

  function makeTexture(title, colored, kind){

    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 360;

    const ctx = c.getContext('2d');

    const sky = ctx.createLinearGradient(
      0,0,0,360
    );

    if(colored){
      sky.addColorStop(0,'#8db5c9');
      sky.addColorStop(1,'#e6d5b9');
    }else{
      sky.addColorStop(0,'#b6b6b6');
      sky.addColorStop(1,'#e5e5e5');
    }

    ctx.fillStyle = sky;
    ctx.fillRect(0,0,512,360);

    // Paisagem ilustrativa, não fotografia real
    ctx.fillStyle = colored
      ? '#78948b'
      : '#989898';

    ctx.beginPath();
    ctx.moveTo(0,240);
    ctx.lineTo(115,110);
    ctx.lineTo(230,230);
    ctx.lineTo(330,135);
    ctx.lineTo(512,260);
    ctx.lineTo(512,360);
    ctx.lineTo(0,360);
    ctx.fill();

    ctx.fillStyle = colored
      ? '#426b60'
      : '#707070';

    ctx.beginPath();
    ctx.moveTo(0,300);
    ctx.lineTo(170,205);
    ctx.lineTo(310,285);
    ctx.lineTo(440,195);
    ctx.lineTo(512,250);
    ctx.lineTo(512,360);
    ctx.lineTo(0,360);
    ctx.fill();

    ctx.fillStyle = colored
      ? '#f2d59a'
      : '#dddddd';

    ctx.beginPath();
    ctx.arc(
      kind===0 ? 380 : 110,
      78,
      30,
      0,
      Math.PI*2
    );
    ctx.fill();

    ctx.fillStyle = 'rgba(0,0,0,.60)';
    ctx.fillRect(0,288,512,72);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 25px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(title,256,330);

    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;

    return texture;
  }

  const memoryData = [
    {
      title:'UMA LEMBRANÇA',
      position:[0,0,-42],
      size:[17,12],
      kind:0
    },
    {
      title:'PESSOAS',
      position:[-20,12,-48],
      size:[12,8.5],
      kind:1
    },
    {
      title:'LUGARES',
      position:[20,9,-49],
      size:[12,8.5],
      kind:2
    },
    {
      title:'MOMENTOS',
      position:[4,-16,-46],
      size:[12,8.5],
      kind:3
    }
  ];

  const memories = [];

  memoryData.forEach((data,index)=>{

    const gray = makeTexture(
      data.title,false,data.kind
    );

    const color = makeTexture(
      data.title,true,data.kind
    );

    const material = new THREE.SpriteMaterial({
      map:gray,
      transparent:true,
      depthWrite:false,
      opacity:index===0 ? 0.85 : 0
    });

    const sprite = new THREE.Sprite(material);

    sprite.position.set(...data.position);
    sprite.scale.set(
      data.size[0],
      data.size[1],
      1
    );

    sprite.visible = index===0;
    sprite.userData.memoryIndex = index;

    scene.add(sprite);

    memories.push({
      sprite,
      gray,
      color,
      base:new THREE.Vector3(...data.position),
      size:data.size,
      visibility:index===0 ? 1 : 0,
      focus:0
    });
  });

  let opened = false;
  let hoveredMemory = -1;

  // Fios adicionais entre as memórias
  const memoryLineGeometry =
    new THREE.BufferGeometry();

  const memoryLineData = new Float32Array(18);

  const memoryLineAttribute =
    new THREE.BufferAttribute(
      memoryLineData,3
    );

  memoryLineAttribute.setUsage(
    THREE.DynamicDrawUsage
  );

  memoryLineGeometry.setAttribute(
    'position',
    memoryLineAttribute
  );

  const memoryLineMaterial =
    new THREE.LineBasicMaterial({
      color:0x737373,
      transparent:true,
      opacity:0,
      depthWrite:false
    });

  const memoryLines = new THREE.LineSegments(
    memoryLineGeometry,
    memoryLineMaterial
  );

  scene.add(memoryLines);

  // =========================================
  // 3. TOQUE, ARRASTAR E NAVEGAÇÃO 360°
  // =========================================

  const raycaster = new THREE.Raycaster();
  raycaster.params.Points.threshold = 5;

  const pointer = new THREE.Vector2();

  let yaw=0;
  let pitch=0;

  let activePointer=null;
  let selectedMemory=-1;
  let selectedPoint=-1;

  let lastX=0;
  let lastY=0;
  let totalMovement=0;

  const memoryOffset = new THREE.Vector3();

  function pick(x,y){

    const rect = canvas.getBoundingClientRect();

    if(!rect.width || !rect.height){
      return {memory:-1,point:-1};
    }

    pointer.x =
      ((x-rect.left)/rect.width)*2-1;

    pointer.y =
      -((y-rect.top)/rect.height)*2+1;

    raycaster.setFromCamera(pointer,camera);

    const visibleSprites = memories
      .filter(m=>m.sprite.visible)
      .map(m=>m.sprite);

    const spriteHits =
      raycaster.intersectObjects(visibleSprites);

    if(spriteHits.length){
      return {
        memory:
          spriteHits[0].object.userData.memoryIndex,
        point:-1
      };
    }

    const pointHits =
      raycaster.intersectObject(points);

    return {
      memory:-1,
      point:pointHits.length
        ? pointHits[0].index
        : -1
    };
  }

  function applyForce(index,dx,dy){

    if(index<0)return;

    const right = new THREE.Vector3(
      1,0,0
    ).applyQuaternion(camera.quaternion);

    const up = new THREE.Vector3(
      0,1,0
    ).applyQuaternion(camera.quaternion);

    const force = right
      .multiplyScalar(dx*0.06)
      .add(
        up.multiplyScalar(-dy*0.06)
      );

    for(let i=0;i<count;i++){

      const distance =
        originalPositions[i].distanceTo(
          originalPositions[index]
        );

      if(distance>25)continue;

      const influence =
        Math.pow(1-distance/25,2);

      velocities[i].addScaledVector(
        force,influence
      );
    }
  }

  function nearestWebPoint(position){

    let nearest=0;
    let distance=Infinity;

    for(let i=0;i<count;i++){

      const d =
        originalPositions[i].distanceToSquared(
          position
        );

      if(d<distance){
        distance=d;
        nearest=i;
      }
    }

    return nearest;
  }

  const memoryAnchor = nearestWebPoint(
    memories[0].base
  );

  function onPointerDown(e){

    if(activePointer!==null)return;

    activePointer=e.pointerId;

    lastX=e.clientX;
    lastY=e.clientY;
    totalMovement=0;

    const hit=pick(e.clientX,e.clientY);

    selectedMemory=hit.memory;
    selectedPoint=hit.point;

    canvas.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e){

    if(activePointer===null){

      if(e.pointerType==='mouse'){

        const hit=pick(e.clientX,e.clientY);

        hoveredMemory=hit.memory;
        canvas.style.cursor =
          hit.memory>=0
            ? 'pointer'
            : 'grab';
      }

      return;
    }

    if(e.pointerId!==activePointer)return;

    const dx=e.clientX-lastX;
    const dy=e.clientY-lastY;

    lastX=e.clientX;
    lastY=e.clientY;

    totalMovement+=Math.hypot(dx,dy);

    if(selectedMemory>=0){

      // Arrastar uma memória move a teia
      const right=new THREE.Vector3(
        1,0,0
      ).applyQuaternion(camera.quaternion);

      const up=new THREE.Vector3(
        0,1,0
      ).applyQuaternion(camera.quaternion);

      memoryOffset.addScaledVector(
        right,dx*0.055
      );

      memoryOffset.addScaledVector(
        up,-dy*0.055
      );

      memoryOffset.clampLength(0,22);

      applyForce(memoryAnchor,dx,dy);

    }else if(selectedPoint>=0){

      // Preserva a elasticidade original
      applyForce(selectedPoint,dx,dy);

    }else{

      // Preserva a navegação 360°
      yaw-=dx*0.004;
      pitch-=dy*0.004;

      pitch=Math.max(
        -Math.PI/2+0.01,
        Math.min(
          Math.PI/2-0.01,
          pitch
        )
      );

      camera.rotation.y=yaw;
      camera.rotation.x=pitch;
    }
  }

  function stop(e){

    if(
      activePointer===null ||
      e.pointerId!==activePointer
    )return;

    // Toque curto abre ou fecha conexões
    if(
      selectedMemory===0 &&
      totalMovement<9 &&
      e.type==='pointerup'
    ){
      opened=!opened;
    }

    activePointer=null;
    selectedMemory=-1;
    selectedPoint=-1;
  }

  canvas.addEventListener(
    'pointerdown',onPointerDown
  );

  canvas.addEventListener(
    'pointermove',onPointerMove
  );

  canvas.addEventListener(
    'pointerup',stop
  );

  canvas.addEventListener(
    'pointercancel',stop
  );

  canvas.addEventListener(
    'lostpointercapture',stop
  );

  function onPointerLeave(){
    if(activePointer===null){
      hoveredMemory=-1;
    }
  }

  canvas.addEventListener(
    'pointerleave',onPointerLeave
  );

  // =========================================
  // 4. ANIMAÇÃO DA TEIA E DAS MEMÓRIAS
  // =========================================

  const clock=new THREE.Clock();

  let running=true;
  let frameId=0;

  function updateWeb(time,dt){

    const step=Math.min(dt*60,2);

    for(let i=0;i<count;i++){

      const original=originalPositions[i];
      const position=positions[i];
      const velocity=velocities[i];

      const floating=new THREE.Vector3(
        Math.sin(time*.37+i*.23)*.3,
        Math.cos(time*.31+i*.19)*.3,
        Math.sin(time*.27+i*.17)*.3
      );

      const target=original.clone()
        .add(floating);

      const restoring=target
        .sub(position)
        .multiplyScalar(.018*step);

      velocity.add(restoring);

      velocity.multiplyScalar(
        Math.pow(.92,step)
      );

      position.addScaledVector(
        velocity,step
      );
    }

    const attribute=
      pointsGeometry.getAttribute('position');

    for(let i=0;i<count;i++){
      attribute.setXYZ(
        i,
        positions[i].x,
        positions[i].y,
        positions[i].z
      );
    }

    attribute.needsUpdate=true;

    let offset=0;

    for(const [a,b] of connections){

      const p1=positions[a];
      const p2=positions[b];

      lineArray[offset++]=p1.x;
      lineArray[offset++]=p1.y;
      lineArray[offset++]=p1.z;

      lineArray[offset++]=p2.x;
      lineArray[offset++]=p2.y;
      lineArray[offset++]=p2.z;
    }

    lineAttribute.needsUpdate=true;
  }

  function updateMemories(time,dt){

    const smooth=1-Math.exp(
      -4*Math.min(dt,.05)
    );

    // Ao soltar, o deslocamento retorna
    if(selectedMemory<0){
      memoryOffset.multiplyScalar(
        Math.exp(-1.5*Math.min(dt,.05))
      );
    }

    memories.forEach((memory,index)=>{

      const active =
        selectedMemory===index ||
        hoveredMemory===index;

      const desiredVisibility =
        index===0 || opened ? 1 : 0;

      memory.visibility +=
        (desiredVisibility-memory.visibility)
        *smooth;

      memory.visibility=Math.max(
        0,Math.min(1,memory.visibility)
      );

      const desiredFocus=active ? 1 : 0;

      memory.focus +=
        (desiredFocus-memory.focus)
        *smooth;

      const drift=new THREE.Vector3(
        Math.sin(time*.4+index*2)*.35,
        Math.cos(time*.3+index*3)*.35,
        Math.sin(time*.25+index)*.25
      );

      const target=memory.base.clone()
        .add(memoryOffset)
        .add(drift);

      if(index>0){

        // Conexões emergem de perto
        // da memória central
        const center=memories[0].base;

        target.lerp(
          center,
          1-memory.visibility
        );
      }

      // Foco traz a imagem para frente
      const forward=new THREE.Vector3(
        0,0,-1
      ).applyQuaternion(camera.quaternion);

      target.addScaledVector(
        forward,-memory.focus*5
      );

      memory.sprite.position.lerp(
        target,smooth
      );

      const enlargement=
        1+memory.focus*.25;

      memory.sprite.scale.set(
        memory.size[0]*enlargement,
        memory.size[1]*enlargement,
        1
      );

      memory.sprite.visible=
        memory.visibility>.01;

      memory.sprite.material.opacity=
        memory.visibility*
        (index===0?.85:.78);

      memory.sprite.material.map=
        memory.focus>.25
          ? memory.color
          : memory.gray;
    });

    // Três fios ligando a memória principal
    // às três memórias relacionadas
    const center=memories[0].sprite.position;

    for(let i=1;i<4;i++){

      const child=memories[i].sprite.position;
      const o=(i-1)*6;

      memoryLineData[o]=center.x;
      memoryLineData[o+1]=center.y;
      memoryLineData[o+2]=center.z;

      memoryLineData[o+3]=child.x;
      memoryLineData[o+4]=child.y;
      memoryLineData[o+5]=child.z;
    }

    memoryLineAttribute.needsUpdate=true;

    memoryLineMaterial.opacity=
      .48*memories[1].visibility;
  }

  function animate(){

    if(!running)return;

    frameId=requestAnimationFrame(animate);

    const dt=clock.getDelta();
    const time=clock.elapsedTime;

    updateWeb(time,dt);
    updateMemories(time,dt);

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

  // =========================================
  // 5. LIMPEZA
  // =========================================

  return function destroy(){

    running=false;
    cancelAnimationFrame(frameId);

    window.removeEventListener(
      'resize',resize
    );

    canvas.removeEventListener(
      'pointerdown',onPointerDown
    );

    canvas.removeEventListener(
      'pointermove',onPointerMove
    );

    canvas.removeEventListener(
      'pointerup',stop
    );

    canvas.removeEventListener(
      'pointercancel',stop
    );

    canvas.removeEventListener(
      'lostpointercapture',stop
    );

    canvas.removeEventListener(
      'pointerleave',onPointerLeave
    );

    pointsGeometry.dispose();
    pointsMaterial.dispose();

    lineGeometry.dispose();
    lineMaterial.dispose();

    memoryLineGeometry.dispose();
    memoryLineMaterial.dispose();

    memories.forEach(memory=>{
      memory.gray.dispose();
      memory.color.dispose();
      memory.sprite.material.dispose();
    });

    renderer.dispose();
    canvas.remove();
  };
}
