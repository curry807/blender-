import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.161.0/examples/jsm/controls/OrbitControls.js';

let renderer, scene, camera, orbit; let selected=null; const objects=[];
const viewportEl=document.querySelector('.viewport');
const layerListEl=document.getElementById('layerList');
const selectedNameEl=document.getElementById('selectedName');
const propColorEl=document.getElementById('propColor');
const propMetalEl=document.getElementById('propMetal');
const propRoughEl=document.getElementById('propRough');

init(); animate();
function init(){ renderer=new THREE.WebGLRenderer({antialias:true}); renderer.setSize(viewportEl.clientWidth, viewportEl.clientHeight); viewportEl.appendChild(renderer.domElement);
  scene=new THREE.Scene(); camera=new THREE.PerspectiveCamera(60, viewportEl.clientWidth/viewportEl.clientHeight, .1, 1000); camera.position.set(4,4,8);
  orbit=new OrbitControls(camera, renderer.domElement); orbit.enableDamping=true; const hemi=new THREE.HemisphereLight(0xffffff,0x202030,0.6); scene.add(hemi);
  const dir=new THREE.DirectionalLight(0xffffff,0.8); dir.position.set(5,10,7); dir.castShadow=true; scene.add(dir);
  const grid=new THREE.GridHelper(20,20,0x444444,0x222222); scene.add(grid);
  document.getElementById('btnCube').onclick=()=>addPrimitive('cube');
  document.getElementById('btnSphere').onclick=()=>addPrimitive('sphere');
  document.getElementById('btnPlane').onclick=()=>addPrimitive('plane');
  document.getElementById('btnPalette').onclick=()=>document.getElementById('palettePanel').classList.toggle('hidden');
  document.getElementById('btnHumans').onclick=()=>document.getElementById('humansPanel').classList.toggle('hidden');
  propColorEl.oninput=()=>{ if(selected&&selected.material) selected.material.color.set(propColorEl.value); };
  propMetalEl.oninput=()=>{ if(selected&&selected.material) selected.material.metalness=parseFloat(propMetalEl.value); };
  propRoughEl.oninput=()=>{ if(selected&&selected.material) selected.material.roughness=parseFloat(propRoughEl.value); };
  const raycaster=new THREE.Raycaster(), pointer=new THREE.Vector2(); const canvas=renderer.domElement;
  function pick(e){ const rect=canvas.getBoundingClientRect(); pointer.x=((e.clientX-rect.left)/rect.width)*2-1; pointer.y=-((e.clientY-rect.top)/rect.height)*2+1; raycaster.setFromCamera(pointer,camera); const hits=raycaster.intersectObjects(objects,true); if(hits.length) setSelected(hits[0].object); }
  canvas.addEventListener('pointerdown',pick);
}
function animate(){ requestAnimationFrame(animate); orbit.update(); renderer.render(scene,camera); }
function addPrimitive(type){ let geo; if(type==='cube') geo=new THREE.BoxGeometry(1,1,1); if(type==='sphere') geo=new THREE.SphereGeometry(0.6,32,16); if(type==='plane') geo=new THREE.PlaneGeometry(2,2);
  const mat=new THREE.MeshStandardMaterial({color:0xcccccc,roughness:0.5,metalness:0}); const mesh=new THREE.Mesh(geo,mat); mesh.position.set((Math.random()-0.5)*2,0.5,(Math.random()-0.5)*2); scene.add(mesh); objects.push(mesh); addLayerItem(mesh); setSelected(mesh); }
function addLayerItem(obj){ const li=document.createElement('li'); obj.userData.layerItem=li; obj.name=obj.name||obj.geometry.type||obj.type; li.textContent=obj.name; li.onclick=()=>setSelected(obj); layerListEl.appendChild(li); }
function setSelected(obj){ selected=obj; [...layerListEl.children].forEach(li=>li.classList.remove('active')); if(obj){ obj.userData.layerItem?.classList.add('active'); selectedNameEl.textContent=obj.name; if(obj.material){ propColorEl.value='#'+obj.material.color.getHexString(); propMetalEl.value=obj.material.metalness||0; propRoughEl.value=obj.material.roughness||0.5; } } else { selectedNameEl.textContent='(なし)'; } }
function syncUIFromSelected(){ if(!selected||!selected.material) return; propColorEl.value='#'+selected.material.color.getHexString(); propMetalEl.value=selected.material.metalness||0; propRoughEl.value=selected.material.roughness||0.5; }

// ===== Palette (save/apply/import/export) =====
const palNameEl=document.getElementById('palName');
const palAddBtn=document.getElementById('palAdd');
const palExportBtn=document.getElementById('palExport');
const palImportBtn=document.getElementById('palImport');
const palClearBtn=document.getElementById('palClear');
const palListEl=document.getElementById('palList');
const PALETTE_KEY='blenderlite-palette';
class PaletteManager{ constructor(){ this.items=[]; this.load(); this.render(); } load(){ try{ const json=localStorage.getItem(PALETTE_KEY); this.items=json?JSON.parse(json):[]; }catch(e){ this.items=[]; } } save(){ try{ localStorage.setItem(PALETTE_KEY, JSON.stringify(this.items)); }catch(e){ alert('パレット保存に失敗: '+e.message); } } addFromSelected(name){ if(!selected||!selected.material){ return alert('色を保存するにはモデルを選択'); } const mat=selected.material; const color='#'+mat.color.getHexString(); const metal=mat.metalness??0; const rough=mat.roughness??0.5; const item={name:name||('Preset '+(this.items.length+1)), color, metal, rough}; this.items.push(item); this.save(); this.render(); } apply(i){ const it=this.items[i]; if(!it) return; if(!selected||!selected.material) return alert('適用先のモデルを選択'); selected.material.color.set(it.color); if(selected.material.metalness!==undefined) selected.material.metalness=it.metal; if(selected.material.roughness!==undefined) selected.material.roughness=it.rough; syncUIFromSelected(); } remove(i){ this.items.splice(i,1); this.save(); this.render(); } clear(){ if(!confirm('すべて削除しますか？')) return; this.items=[]; this.save(); this.render(); } export(){ const data=JSON.stringify(this.items,null,2); const blob=new Blob([data],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='palette.json'; a.click(); URL.revokeObjectURL(a.href); } import(){ const input=document.createElement('input'); input.type='file'; input.accept='.json,application/json'; input.onchange=()=>{ const file=input.files[0]; if(!file) return; const reader=new FileReader(); reader.onload=()=>{ try{ const arr=JSON.parse(reader.result); if(Array.isArray(arr)){ this.items=arr; this.save(); this.render(); }else alert('JSON形式が不正'); }catch(e){ alert('読み込み失敗: '+e.message); } }; reader.readAsText(file); }; input.click(); } render(){ palListEl.innerHTML=''; if(!this.items.length){ const empty=document.createElement('div'); empty.textContent='（保存済みカラーがありません）'; empty.style.color='#aaa'; palListEl.appendChild(empty); return; } this.items.forEach((it,idx)=>{ const itemEl=document.createElement('div'); itemEl.className='pal-item'; const sw=document.createElement('div'); sw.className='pal-swatch'; sw.style.background=it.color; const meta=document.createElement('div'); meta.className='pal-meta'; meta.innerHTML=`<strong>${it.name}</strong><span>${it.color}  M:${it.metal.toFixed(2)}  R:${it.rough.toFixed(2)}</span>`; const act=document.createElement('div'); act.className='pal-actions'; const applyBtn=document.createElement('button'); applyBtn.className='pal-btn'; applyBtn.textContent='適用'; applyBtn.onclick=()=>this.apply(idx); const delBtn=document.createElement('button'); delBtn.className='pal-btn'; delBtn.textContent='🗑'; delBtn.onclick=()=>this.remove(idx); act.appendChild(applyBtn); act.appendChild(delBtn); itemEl.appendChild(sw); itemEl.appendChild(meta); itemEl.appendChild(act); palListEl.appendChild(itemEl); }); } }

let paletteMgr=new PaletteManager();
palAddBtn.onclick=()=>{ const name=(palNameEl.value||'').trim(); paletteMgr.addFromSelected(name); if(!name) palNameEl.value=''; };
palExportBtn.onclick=()=>paletteMgr.export();
palImportBtn.onclick=()=>paletteMgr.import();
palClearBtn.onclick=()=>paletteMgr.clear();

// ===== Humans (multi character spawn) =====
const humansPanel=document.getElementById('humansPanel');
const humanAddBtn=document.getElementById('humanAdd');
const humanDuplicateBtn=document.getElementById('humanDuplicate');
const humanRemoveBtn=document.getElementById('humanRemove');
const humanCountEl=document.getElementById('humanCount');
const humanLayoutEl=document.getElementById('humanLayout');
const humanSpawnBtn=document.getElementById('humanSpawn');
const humanScaleEl=document.getElementById('humanScale');
const humanBuildEl=document.getElementById('humanBuild');
const humanSkinEl=document.getElementById('humanSkin');

function makeHuman({scale=1.0,build=1.0,skin='#f1c9b8'}={}){
  const g=new THREE.Group(); g.name='人体';
  const skinMat=new THREE.MeshPhysicalMaterial({color:new THREE.Color(skin),roughness:0.6,metalness:0.0,sheen:0.25});
  const clothMat=new THREE.MeshStandardMaterial({color:0x8888aa,roughness:0.7});
  const darkMat=new THREE.MeshStandardMaterial({color:0x333333,roughness:0.6});
  const H=1.70*scale; const headR=0.10*H; const neckH=0.04*H; const torsoH=0.28*H; const pelvisH=0.12*H; const armL=0.30*H; const forearmL=0.26*H; const thighL=0.32*H; const shinL=0.30*H; const footL=0.10*H; const w=build;
  const head=new THREE.Mesh(new THREE.SphereGeometry(headR,32,24),skinMat); head.position.set(0, headR*2+neckH+torsoH+pelvisH+thighL+shinL, 0); g.add(head);
  const neck=new THREE.Mesh(new THREE.CylinderGeometry(0.06*H*w,0.06*H*w,neckH,12),skinMat); neck.position.set(0, head.position.y - headR - neckH/2, 0); g.add(neck);
  const chest=new THREE.Mesh(new THREE.BoxGeometry(0.30*H*w,torsoH,0.18*H*w), clothMat); chest.position.set(0, neck.position.y - neckH/2 - torsoH/2, 0); g.add(chest);
  const pelvis=new THREE.Mesh(new THREE.BoxGeometry(0.26*H*w,pelvisH,0.18*H*w), darkMat); pelvis.position.set(0, chest.position.y - torsoH/2 - pelvisH/2, 0); g.add(pelvis);
  const upperArmGeo=new THREE.CylinderGeometry(0.055*H*w,0.055*H*w,armL,12);
  const foreArmGeo=new THREE.CylinderGeometry(0.05*H*w,0.05*H*w,forearmL,12);
  const handGeo=new THREE.BoxGeometry(0.08*H*w,0.03*H*w,0.15*H*w);
  function makeArm(side){ const s=side==='L'?-1:1; const shoulderY=chest.position.y+torsoH/2-0.02*H; const shoulderX=0.17*H*w*s; const upper=new THREE.Mesh(upperArmGeo,skinMat); upper.position.set(shoulderX, shoulderY-armL/2, 0); upper.rotation.z=s*0.15; g.add(upper); const fore=new THREE.Mesh(foreArmGeo,skinMat); fore.position.set(shoulderX, upper.position.y-armL/2-forearmL/2, 0.02*H); fore.rotation.z=s*0.05; g.add(fore); const hand=new THREE.Mesh(handGeo,skinMat); hand.position.set(shoulderX, fore.position.y-forearmL/2-0.02*H, 0.05*H); g.add(hand); }
  makeArm('L'); makeArm('R');
  const thighGeo=new THREE.CylinderGeometry(0.08*H*w,0.08*H*w,thighL,12);
  const shinGeo=new THREE.CylinderGeometry(0.065*H*w,0.065*H*w,shinL,12);
  const footGeo=new THREE.BoxGeometry(0.10*H*w,0.04*H*w,footL);
  function makeLeg(side){ const s=side==='L'?-1:1; const hipY=pelvis.position.y - pelvisH/2; const hipX=0.08*H*w*s; const thigh=new THREE.Mesh(thighGeo,skinMat); thigh.position.set(hipX, hipY - thighL/2, 0.02*H); g.add(thigh); const shin=new THREE.Mesh(shinGeo,skinMat); shin.position.set(hipX, thigh.position.y - thighL/2 - shinL/2, 0.02*H); g.add(shin); const foot=new THREE.Mesh(footGeo,darkMat); foot.position.set(hipX, shin.position.y - shinL/2 - 0.02*H, 0.06*H); g.add(foot); }
  makeLeg('L'); makeLeg('R');
  g.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.receiveShadow=true; } });
  return g;
}
function addHumanAt(x=0,y=0,z=0,opts={}){ const h=makeHuman(opts); h.position.set(x,y,z); scene.add(h); objects.push(h); addLayerItem(h); setSelected(h); return h; }

humanAddBtn && (humanAddBtn.onclick=()=>{ addHumanAt((Math.random()-0.5)*2,0,(Math.random()-0.5)*2,{ scale: parseFloat(humanScaleEl.value), build: parseFloat(humanBuildEl.value), skin: humanSkinEl.value }); });

humanDuplicateBtn && (humanDuplicateBtn.onclick=()=>{ if(!selected) return alert('複製したい人体を選択してください'); const base=selected; const pos=base.position.clone(); pos.x += 0.4; addHumanAt(pos.x,pos.y,pos.z,{ scale: parseFloat(humanScaleEl.value), build: parseFloat(humanBuildEl.value), skin: humanSkinEl.value }); });

humanRemoveBtn && (humanRemoveBtn.onclick=()=>{ if(!selected) return alert('削除したい人体を選択してください'); const idx=objects.indexOf(selected); if(idx>=0){ scene.remove(selected); objects.splice(idx,1); layerListEl.removeChild(selected.userData.layerItem); setSelected(null); } });

humanSpawnBtn && (humanSpawnBtn.onclick=()=>{ const n=Math.max(1,Math.min(50,parseInt(humanCountEl.value))); const layout=humanLayoutEl.value; const scale=parseFloat(humanScaleEl.value); const build=parseFloat(humanBuildEl.value); const skin=humanSkinEl.value; const radius=3.0; const grid= Math.ceil(Math.sqrt(n)); for(let i=0;i<n;i++){ let x=0,z=0; if(layout==='random'){ x=(Math.random()-0.5)*radius*2; z=(Math.random()-0.5)*radius*2; } else if(layout==='circle'){ const ang=i*(Math.PI*2/n); x=Math.cos(ang)*radius; z=Math.sin(ang)*radius; } else { const gx=i%grid, gy=Math.floor(i/grid); x=(gx-(grid-1)/2)*0.8; z=(gy-(grid-1)/2)*0.8; } addHumanAt(x,0,z,{scale,build,skin}); } });

function applyHumanParamsToSelected(){ if(!selected) return; const s=parseFloat(humanScaleEl.value), b=parseFloat(humanBuildEl.value), c=humanSkinEl.value; selected.scale.setScalar(s); selected.traverse(o=>{ if(o.material && o.material.isMaterial){ if(o.material.color) o.material.color.set(c); if(o.material.sheen!==undefined) o.material.sheen=0.25; } }); }
[humanScaleEl,humanBuildEl,humanSkinEl].forEach(el=> el.oninput=applyHumanParamsToSelected);
