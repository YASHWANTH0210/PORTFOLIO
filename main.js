import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

const canvas = document.querySelector("#world");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fc9ef);
scene.fog = new THREE.Fog(0x8fc9ef, 75, 190);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 500);
camera.position.set(0, 4.2, 16);

const renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const controls = new PointerLockControls(camera, document.body);
controls.pointerSpeed = 0.75;

const clock = new THREE.Clock();
const world = new THREE.Group();
scene.add(world);

const solids = [];
const interactables = [];
const animated = [];
const keys = {};
let velocityY = 0;
let canJump = false;
let paused = false;
let soundOn = true;
let dayTime = 0.18;

const mats = {
  grass: new THREE.MeshLambertMaterial({color:0x4d9a55}),
  grass2: new THREE.MeshLambertMaterial({color:0x62ad5f}),
  dirt: new THREE.MeshLambertMaterial({color:0x875d3b}),
  stone: new THREE.MeshLambertMaterial({color:0x7d8791}),
  darkStone: new THREE.MeshLambertMaterial({color:0x4b5660}),
  wood: new THREE.MeshLambertMaterial({color:0x8c5a32}),
  woodDark: new THREE.MeshLambertMaterial({color:0x54331f}),
  roof: new THREE.MeshLambertMaterial({color:0x344d5d}),
  glass: new THREE.MeshLambertMaterial({color:0x9ddfff, transparent:true, opacity:.72}),
  water: new THREE.MeshPhongMaterial({color:0x2f9dcc, transparent:true, opacity:.72, shininess:90}),
  leaf: new THREE.MeshLambertMaterial({color:0x2f773c}),
  leaf2: new THREE.MeshLambertMaterial({color:0x3d9650}),
  gold: new THREE.MeshLambertMaterial({color:0xe8bb52}),
  glowGreen: new THREE.MeshBasicMaterial({color:0x78f5a7}),
  glowBlue: new THREE.MeshBasicMaterial({color:0x69b8ff}),
  glowPurple: new THREE.MeshBasicMaterial({color:0xb989ff}),
  white: new THREE.MeshLambertMaterial({color:0xe9edf2}),
  black: new THREE.MeshLambertMaterial({color:0x171b21}),
  red: new THREE.MeshLambertMaterial({color:0xc74e4e}),
};

const cubeGeo = new THREE.BoxGeometry(1,1,1);

function block(x,y,z,mat, sx=1,sy=1,sz=1, solid=true){
  const m = new THREE.Mesh(cubeGeo, mat);
  m.position.set(x,y,z);
  m.scale.set(sx,sy,sz);
  m.castShadow = true; m.receiveShadow = true;
  world.add(m);
  if(solid) solids.push({x,y,z,sx,sy,sz});
  return m;
}
function box(x,y,z,sx,sy,sz,mat,solid=true){
  return block(x,y,z,mat,sx,sy,sz,solid);
}
function label(text, x,y,z, color="#ffffff", size=.55){
  const c=document.createElement("canvas");
  c.width=1024; c.height=256;
  const ctx=c.getContext("2d");
  ctx.clearRect(0,0,c.width,c.height);
  ctx.font="800 74px Inter, Arial";
  ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.fillStyle="rgba(5,9,15,.78)";
  ctx.fillRect(30,35,964,186);
  ctx.fillStyle=color; ctx.fillText(text,512,128);
  const tex=new THREE.CanvasTexture(c);
  tex.colorSpace=THREE.SRGBColorSpace;
  const mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false});
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(size*3,size*.75),mat);
  mesh.position.set(x,y,z);
  mesh.rotation.x=-Math.PI/10;
  world.add(mesh);
  animated.push({obj:mesh,type:"label",base:y});
  return mesh;
}
function tree(x,z){
  for(let y=1;y<=4;y++) block(x,y,z,mats.wood);
  for(let dx=-2;dx<=2;dx++) for(let dz=-2;dz<=2;dz++){
    if(Math.abs(dx)+Math.abs(dz)<4) block(x+dx,5,z+dz,(Math.random()>.45?mats.leaf:mats.leaf2),1,1,1,false);
  }
  block(x,6,z,mats.leaf2,2,1,2,false);
}
function path(x,z,w=3,d=3){
  box(x,.08,z,w,.16,d,mats.stone,false);
}
function building(cx,cz,w,d,h,wallMat,roofMat,title){
  for(let x=-w/2;x<w/2;x++) for(let y=1;y<=h;y++){
    box(cx+x,y,cz-d/2,1,1,1,wallMat);
    box(cx+x,y,cz+d/2,1,1,1,wallMat);
  }
  for(let z=-d/2;z<=d/2;z++){
    for(let y=1;y<=h;y++){
      box(cx-w/2,y,cz+z,1,1,1,wallMat);
      box(cx+w/2,y,cz+z,1,1,1,wallMat);
    }
  }
  for(let x=-w/2;x<=w/2;x++) for(let z=-d/2;z<=d/2;z++){
    box(cx+x,h+1,cz+z,1,1,1,roofMat,false);
  }
  label(title,cx,h+3,cz, "#ffffff", .55);
}

function makeGround(){
  box(0,-.5,0,160,1,160,mats.dirt);
  for(let x=-78;x<=78;x++) for(let z=-78;z<=78;z++){
    if((x*x+z*z)%11===0) box(x,.08,z,1,.16,1,mats.grass2,false);
  }
}
function makeSpawn(){
  building(0,12,18,16,5,mats.wood,mats.roof,"YESWANTH");
  box(0,1.8,3.9,3,3,.4,mats.glass,false);
  box(-7,1.8,12, .4,3,3,mats.glass,false);
  box(7,1.8,12, .4,3,3,mats.glass,false);
  box(0,0.8,3,2.4,1.6,.5,mats.woodDark);
  label("WEB DEVELOPER • AI ENGINEER • FULL STACK",0,8.3,12,"#78f5a7",.35);
  for(let x=-6;x<=6;x+=3){ tree(x,22); }
  tree(-12,5); tree(13,5);
  box(0,.45,0,7,.9,7,mats.stone,false);
  box(0,.95,0,5,.15,5,mats.water,false);
  for(let i=0;i<4;i++){ const a=i*Math.PI/2; block(Math.round(Math.cos(a)*3),1,Math.round(Math.sin(a)*3),mats.stone,false); }
  label("WELCOME TO MY WORLD",0,3.4,0,"#ffffff",.45);
}
function makeLibrary(){
  building(-40,-35,24,18,6,mats.stone,mats.roof,"KNOWLEDGE LIBRARY");
  for(let x=-47;x<=-33;x+=3) for(let z=-40;z<=-30;z+=3){
    box(x,1.5,z,1.5,3,1,mats.woodDark,false);
  }
  box(-40,2,-26,4,4,.5,mats.glass,false);
  label("EDUCATION • B.TECH • 1ST YEAR",-40,9,-35,"#73b8ff",.4);
}
function makeMine(){
  building(-42,34,24,20,5,mats.darkStone,mats.woodDark,"SKILLS MINE");
  const ores=[
    [-48,1,30,0xe5b949,"HTML"],
    [-36,1,30,0x5c9eff,"CSS"],
    [-48,1,39,0xf1c84b,"JAVASCRIPT"],
    [-36,1,39,0x58a5e6,"PYTHON"]
  ];
  for(const [x,y,z,c,t] of ores){
    const mat=new THREE.MeshLambertMaterial({color:c,emissive:c,emissiveIntensity:.28});
    const o=box(x,y,z,2,2,2,mat,false);
    interactables.push({obj:o,range:7,data:{type:"skill",title:t}});
    animated.push({obj:o,type:"ore",base:y});
  }
  label("HTML • CSS • JAVASCRIPT • PYTHON",-42,8,34,"#78f5a7",.38);
}
function makeProjects(){
  building(40,34,34,25,7,mats.wood,mats.darkStone,"PROJECT WORKSHOP");
  // Study Rooms
  for(let x=29;x<=35;x+=3){
    box(x,1,28,2,2,1,mats.white,false);
    box(x,2.4,28,1.6,.5,.8,mats.glass,false);
  }
  box(32,1.5,24,12,3,.5,mats.glass,false);
  label("STUDY ROOMS",32,10,34,"#78f5a7",.48);
  const sr=box(32,1.5,21,5,3,1,mats.glowGreen,false);
  interactables.push({obj:sr,range:9,data:{type:"project",id:"study"}});
  // Cricket stadium
  const cx=49, cz=35;
  for(let r=0;r<12;r+=2) {
    const count=Math.max(8,Math.floor(2*Math.PI*r/3));
    for(let i=0;i<count;i++){
      const a=i/count*Math.PI*2;
      box(cx+Math.cos(a)*r,1+r*.05,cz+Math.sin(a)*r,2,1,2,mats.stone,false);
    }
  }
  box(cx,1.2,cz,3,.3,16,mats.grass2,false);
  box(cx,1.4,cz,1,.3,12,mats.dirt,false);
  box(cx,1.65,cz-5,2,.3,.3,mats.white,false);
  box(cx,1.65,cz+5,2,.3,.3,mats.white,false);
  const cricket=box(cx,3,cz+9,4,2,1,mats.glowBlue,false);
  interactables.push({obj:cricket,range:11,data:{type:"project",id:"cricket"}});
  label("INSIDECRICKET",49,8,35,"#73b8ff",.42);
}
function makeJourney(){
  building(38,-34,22,17,5,mats.darkStone,mats.roof,"MY JOURNEY");
  const levels=[
    ["LEVEL 01","LEARNING",28,-36],
    ["LEVEL 02","BUILDING",38,-36],
    ["LEVEL 03","GROWING",48,-36]
  ];
  levels.forEach(([a,b,x,z],i)=>{
    box(x,1.4,z,5,2.8,3,i===0?mats.glowBlue:i===1?mats.glowGreen:mats.glowPurple,false);
    label(a+" • "+b,x,4,z,"#ffffff",.28);
  });
  label("CURRENTLY GAINING EXPERIENCE BY BUILDING PROJECTS AND LEARNING NEW TECHNOLOGIES",38,8,-34,"#b989ff",.27);
}
function makeContact(){
  const x=0,z=-48;
  for(let i=0;i<18;i++){
    const a=i/18*Math.PI*2;
    const r=7;
    box(x+Math.cos(a)*r,3,z+Math.sin(a)*r,1,5,1,mats.darkStone,false);
  }
  const portal=new THREE.Mesh(
    new THREE.TorusGeometry(4.5,.55,12,48),
    new THREE.MeshBasicMaterial({color:0xb989ff})
  );
  portal.position.set(x,5,z);
  world.add(portal);
  animated.push({obj:portal,type:"portal",base:5});
  interactables.push({obj:portal,range:10,data:{type:"contact"}});
  label("CONTACT PORTAL",0,12,-48,"#b989ff",.5);
}
function makeWorld(){
  makeGround();
  makeSpawn();
  makeLibrary();
  makeMine();
  makeProjects();
  makeJourney();
  makeContact();
  // paths
  for(let i=-45;i<=45;i++) path(i,0,1,3);
  for(let i=-45;i<=45;i++) path(0,i,3,1);
  for(let i=-42;i<=42;i++) { path(i,35,2,2); path(i,-35,2,2); }
  // lanterns
  [[-10,0],[-10,10],[10,0],[10,10],[-30,20],[-30,-20],[30,20],[30,-20]].forEach(([x,z])=>{
    box(x,2,z,.3,4,.3,mats.woodDark);
    const l=box(x,4.2,z,.6,.6,.6,mats.gold,false);
    animated.push({obj:l,type:"light",base:4.2});
    const p=new THREE.PointLight(0xffd77a,1.2,10);
    p.position.set(x,4,z); world.add(p);
  });
  // ponds
  box(-18,-.03,24,12,.08,8,mats.water,false);
  box(20,-.03,-20,10,.08,7,mats.water,false);
  for(let i=0;i<28;i++){
    const p=new THREE.Mesh(new THREE.BoxGeometry(.12,.12,.12),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.35}));
    p.position.set((Math.random()-.5)*130,2+Math.random()*15,(Math.random()-.5)*130);
    world.add(p); animated.push({obj:p,type:"particle",base:p.position.y});
  }
}
makeWorld();

const hemi = new THREE.HemisphereLight(0xbfe8ff,0x34472e,1.5);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0c7,2.3);
sun.position.set(35,60,20);
sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.left=-100; sun.shadow.camera.right=100;
sun.shadow.camera.top=100; sun.shadow.camera.bottom=-100;
scene.add(sun);

const ambient = new THREE.AmbientLight(0x6688aa,.25);
scene.add(ambient);

const sky = new THREE.Mesh(
  new THREE.SphereGeometry(230,32,16),
  new THREE.MeshBasicMaterial({color:0x77b9e8,side:THREE.BackSide})
);
scene.add(sky);

function updateLighting(dt){
  dayTime=(dayTime+dt*.008)%1;
  const a=dayTime*Math.PI*2;
  const daylight=Math.max(0,Math.sin(a));
  sun.position.set(Math.cos(a)*70,Math.max(8,Math.sin(a)*70),Math.sin(a)*70);
  sun.intensity=.35+daylight*2.1;
  hemi.intensity=.35+daylight*1.3;
  sky.material.color.lerpColors(new THREE.Color(0x10182e),new THREE.Color(0x8fc9ef),.25+daylight*.75);
  scene.fog.color.copy(sky.material.color);
  document.querySelector("#time-label").textContent=daylight>.3?"DAY":"NIGHT";
}

function playerBoxCollides(pos){
  const px=pos.x, pz=pos.z;
  if(Math.abs(px)>77 || Math.abs(pz)>77) return true;
  for(const s of solids){
    const minX=s.x-s.sx/2-.45, maxX=s.x+s.sx/2+.45;
    const minZ=s.z-s.sz/2-.45, maxZ=s.z+s.sz/2+.45;
    if(px>minX&&px<maxX&&pz>minZ&&pz<maxZ&&pos.y-1.7 < s.y+s.sy/2+.2 && pos.y > s.y-s.sy/2-.2) return true;
  }
  return false;
}

function movePlayer(dt){
  const speed=keys.ShiftLeft?11:6.5;
  const dir=new THREE.Vector3();
  if(keys.KeyW) dir.z-=1;
  if(keys.KeyS) dir.z+=1;
  if(keys.KeyA) dir.x-=1;
  if(keys.KeyD) dir.x+=1;
  if(dir.lengthSq()>0){
    dir.normalize();
    const euler=new THREE.Euler(0,camera.rotation.y,0,"YXZ");
    dir.applyEuler(euler);
    const next=camera.position.clone();
    next.x += dir.x*speed*dt;
    if(!playerBoxCollides(next)) camera.position.x=next.x;
    next.copy(camera.position); next.z += dir.z*speed*dt;
    if(!playerBoxCollides(next)) camera.position.z=next.z;
  }
  velocityY-=22*dt;
  camera.position.y+=velocityY*dt;
  if(camera.position.y<=3.1){camera.position.y=3.1; velocityY=0; canJump=true;}
}
function jump(){ if(canJump){ velocityY=8.5; canJump=false; } }

function nearestInteraction(){
  let best=null, dist=Infinity;
  for(const i of interactables){
    const d=camera.position.distanceTo(i.obj.position);
    if(d<i.range && d<dist){best=i;dist=d;}
  }
  return best;
}
function interact(){
  const i=nearestInteraction();
  if(!i) return;
  showPanel(i.data);
}
function showPanel(data){
  const panel=document.querySelector("#panel");
  const content=document.querySelector("#panel-content");
  if(data.type==="skill"){
    const descriptions={
      HTML:"Structure and semantic foundations for web experiences.",
      CSS:"Styling, layouts, responsive interfaces and visual design.",
      JAVASCRIPT:"Interactive web experiences and application logic.",
      PYTHON:"Programming and building with a versatile general-purpose language."
    };
    content.innerHTML=`<h2>${data.title}</h2><p>${descriptions[data.title]}</p><span class="tag">SKILL</span>`;
  }
  if(data.type==="project"){
    if(data.id==="study"){
      content.innerHTML=`<h2>STUDY ROOMS</h2>
      <p>Create a private room, invite your friends and study together.</p>
      <h3>TECHNOLOGY</h3>
      <span class="tag">React</span><span class="tag">Tailwind CSS</span><span class="tag">Socket.io</span><span class="tag">WebRTC</span><span class="tag">Node.js</span><span class="tag">Express</span>
      <br><a class="primary" href="https://study-room-frontend-one.vercel.app/" target="_blank" rel="noopener">OPEN PROJECT ↗</a>`;
    } else {
      content.innerHTML=`<h2>INSIDECRICKET</h2>
      <p>A cricket website exploring cricket history, ODI World Cups, T20 World Cups, stadiums and players.</p>
      <h3>TECHNOLOGY</h3>
      <span class="tag">HTML5</span><span class="tag">CSS</span><span class="tag">JavaScript</span><span class="tag">GitHub Pages</span>
      <br><a class="primary" href="https://yashwanth0210.github.io/INSIDECRICKET/" target="_blank" rel="noopener">VIEW PROJECT ↗</a>`;
    }
  }
  if(data.type==="contact"){
    content.innerHTML=`<h2>CONTACT</h2>
      <p>Let's connect through the links below.</p>
      <p><strong>GitHub</strong><br><a href="https://github.com/YASHWANTH0210" target="_blank" rel="noopener">YASHWANTH0210 ↗</a></p>
      <p><strong>Instagram</strong><br><a href="https://instagram.com/ft.yashv_" target="_blank" rel="noopener">@ft.yashv_ ↗</a></p>
      <p><strong>Email</strong><br><a href="mailto:yashwanthboppe0210@gmail.com">yashwanthboppe0210@gmail.com</a></p>`;
  }
  panel.classList.remove("hidden");
  controls.unlock();
}
function closePanel(){document.querySelector("#panel").classList.add("hidden");}
document.querySelector("#panel-close").onclick=closePanel;

function openMenu(){ paused=true; controls.unlock(); document.querySelector("#menu").classList.remove("hidden"); }
function closeMenu(){ paused=false; document.querySelector("#menu").classList.add("hidden"); controls.lock(); }
document.querySelector("#menu-btn").onclick=openMenu;
document.querySelector("#resume-btn").onclick=closeMenu;
document.querySelector("#map-btn").onclick=()=>{controls.unlock();document.querySelector("#map-panel").classList.remove("hidden");};
document.querySelector("#map-close").onclick=()=>document.querySelector("#map-panel").classList.add("hidden");
document.querySelector("#menu-map-btn").onclick=()=>{document.querySelector("#menu").classList.add("hidden");document.querySelector("#map-panel").classList.remove("hidden");};
document.querySelector("#sound-btn").onclick=()=>{
  soundOn=!soundOn;
  document.querySelector("#sound-btn").textContent="SOUND: "+(soundOn?"ON":"OFF");
  document.querySelector("#sound-label").textContent=soundOn?"🔊":"🔇";
};
document.querySelector("#fullscreen-btn").onclick=()=>document.documentElement.requestFullscreen?.();

window.addEventListener("keydown",e=>{
  keys[e.code]=true;
  if(e.code==="Space"){e.preventDefault();jump();}
  if(e.code==="KeyE") interact();
  if(e.code==="Escape" && !document.querySelector("#panel").classList.contains("hidden")) closePanel();
});
window.addEventListener("keyup",e=>keys[e.code]=false);
window.addEventListener("resize",()=>{
  camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});

document.querySelector("#mobile-jump").onclick=jump;
document.querySelector("#mobile-interact").onclick=interact;
document.querySelectorAll("[data-key]").forEach(b=>{
  const k=b.dataset.key;
  const down=()=>keys[k]=true, up=()=>keys[k]=false;
  b.addEventListener("touchstart",e=>{e.preventDefault();down();},{passive:false});
  b.addEventListener("touchend",e=>{e.preventDefault();up();},{passive:false});
});
if("ontouchstart" in window) document.querySelector("#mobile-controls").classList.remove("hidden");

document.querySelector("#enter-btn").onclick=()=>{document.querySelector("#loading").classList.add("hidden");document.querySelector("#hud").classList.remove("hidden");controls.lock();};
controls.addEventListener("lock",()=>{paused=false;});
controls.addEventListener("unlock",()=>{
  if(document.querySelector("#panel").classList.contains("hidden") && document.querySelector("#map-panel").classList.contains("hidden"))
    document.querySelector("#menu").classList.remove("hidden");
});

let fakeProgress=0;
const loader=setInterval(()=>{
  fakeProgress+=Math.random()*9+4;
  if(fakeProgress>=100){
    fakeProgress=100; clearInterval(loader);
    document.querySelector(".loading-status").textContent="WORLD READY";
    document.querySelector("#enter-btn").hidden=false;
  }
  document.querySelector("#progress-bar").style.width=fakeProgress+"%";
  document.querySelector("#progress-text").textContent=Math.floor(fakeProgress)+"%";
},120);

function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(),.05);
  if(!paused && !document.querySelector("#loading").classList.contains("hidden")){}
  if(!paused && controls.isLocked){
    movePlayer(dt);
  }
  updateLighting(dt);
  for(const a of animated){
    if(a.type==="ore") a.obj.position.y=a.base+Math.sin(performance.now()*.002+a.obj.position.x)*.18;
    if(a.type==="label") a.obj.position.y=a.base+Math.sin(performance.now()*.0015+a.obj.position.x)*.08;
    if(a.type==="portal") a.obj.rotation.z+=dt*.7;
    if(a.type==="particle"){a.obj.position.y=a.base+Math.sin(performance.now()*.0008+a.obj.position.x)*.7;}
    if(a.type==="light") a.obj.scale.setScalar(.9+Math.sin(performance.now()*.01)*.1);
  }
  const near=nearestInteraction();
  const prompt=document.querySelector("#interaction");
  prompt.classList.toggle("show",!!near);
  renderer.render(scene,camera);
}
animate();
