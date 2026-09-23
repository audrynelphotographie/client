import {db,collection,getDocs,getDoc,doc,updateDoc,increment} from "./firebase.js";

const $=s=>document.querySelector(s);
const homeView=$("#homeView"), galleryView=$("#galleryView"), grid=$("#clientGrid");
const modal=$("#codeModal"), codeInput=$("#accessCode"), codeError=$("#codeError");
let clients=[], current=null, photos=[], lightboxIndex=-1;

function slug(){return decodeURIComponent(location.pathname.replace(/^\/+|\/+$/g,"").split("/")[0]||"");}
function key(s){return "audrynel_access_"+s;}
function showToast(t){const x=$("#toast");x.textContent=t;x.style.display="block";setTimeout(()=>x.style.display="none",2500)}
function cleanText(v){return v??""}

async function loadClients(){
  grid.innerHTML="";
  try{
    const snap=await getDocs(collection(db,"clients"));
    clients=snap.docs.map(d=>({id:d.id,...d.data()})).filter(c=>c.slug||c.id);
    renderClients(clients);
    const s=slug();
    if(s && s!=="admin.html") openBySlug(s,true);
  }catch(e){
    console.error(e); $("#homeStatus").textContent="Could not load galleries. Check your Firebase Firestore rules/config.";
  }
}
function renderClients(list){
  grid.innerHTML=list.map(c=>`
    <article class="client-card">
      <img class="cover" src="${cleanText(c.cover)}" alt="${cleanText(c.name)}" loading="lazy" onerror="this.style.opacity='.2'">
      <div class="card-body">
        <h3>${cleanText(c.name)}</h3>
        <div class="meta">${cleanText(c.event||"Private gallery")} · ${cleanText(c.date||"")}</div>
        <div class="card-actions">
          <button class="btn gold view" data-slug="${cleanText(c.slug||c.id)}">VIEW GALLERY</button>
          <button class="btn secondary share" data-slug="${cleanText(c.slug||c.id)}">SHARE</button>
        </div>
      </div>
    </article>`).join("");
}
grid.addEventListener("click",e=>{
  const b=e.target.closest("button"); if(!b)return;
  const c=clients.find(x=>(x.slug||x.id)===b.dataset.slug); if(!c)return;
  if(b.classList.contains("view")) openClient(c);
  else shareClient(c);
});
$("#search").addEventListener("input",e=>{
  const q=e.target.value.toLowerCase().trim();
  renderClients(clients.filter(c=>(c.name+" "+(c.event||"")).toLowerCase().includes(q)));
});
async function openBySlug(s,silent=false){
  let c=clients.find(x=>(x.slug||x.id)===s);
  if(!c){try{const d=await getDoc(doc(db,"clients",s));if(d.exists())c={id:d.id,...d.data()}}catch{}}
  if(!c){$("#homeStatus").textContent="Gallery not found.";return}
  if(silent && localStorage.getItem(key(s))==="granted") showGallery(c);
  else openClient(c);
}
function openClient(c){
  current=c; $("#modalName").textContent=c.name||"Access your gallery"; codeInput.value="";codeError.textContent="";
  const cover=c.cover||c.photos?.[0]?.url||"/cover.jpg";
  const mc=$("#modalCover"); if(mc){mc.src=cover; mc.onerror=()=>mc.style.display="none"; mc.style.display="block";}
  modal.classList.remove("hidden"); setTimeout(()=>codeInput.focus(),80);
}
async function logView(c){
  try{ await updateDoc(doc(db,"clients",c.slug||c.id),{views:increment(1),lastViewedAt:new Date().toISOString()}); }
  catch(e){ console.error("view log failed",e); }
}
$("#closeModal").onclick=()=>modal.classList.add("hidden");
$("#enterCode").onclick=checkCode;
codeInput.addEventListener("keydown",e=>{if(e.key==="Enter")checkCode()});
async function checkCode(){
  if(!current)return;
  const entered=codeInput.value.trim();
  if(!entered){codeError.textContent="Enter your access code.";return}
  if(String(entered)===String(current.accessCode||"")){
    localStorage.setItem(key(current.slug||current.id),"granted");
    modal.classList.add("hidden"); showGallery(current);
    history.replaceState({}, "", "/"+(current.slug||current.id));
  }else codeError.textContent="Incorrect access code.";
}
function showGallery(c){
  current=c; homeView.classList.add("hidden"); galleryView.classList.remove("hidden");
  $("#galleryName").textContent=c.name||"Gallery";
  $("#galleryMeta").textContent=`${c.event||"Private event"} · ${c.date||""}`;
  $("#galleryPasswordBadge").textContent="Access verified · private gallery";
  photos=Array.isArray(c.photos)?c.photos:[];
  $("#photoGrid").innerHTML=photos.map((p,i)=>`<div class="photo" data-i="${i}"><label><input type="checkbox" data-index="${i}"></label><img src="${p.url||p}" alt="${p.name||"Photo "+(i+1)}" loading="lazy" decoding="async"></div>`).join("");
  updateSelected();
  logView(c);
}
function updateSelected(){
  const n=[...document.querySelectorAll("#photoGrid input:checked")].length;
  $("#selectedCount").textContent=`${n} selected`;
  document.querySelectorAll(".photo").forEach(x=>x.classList.toggle("selected",x.querySelector("input").checked));
}
$("#photoGrid").addEventListener("change",updateSelected);
$("#photoGrid").addEventListener("click",e=>{
  const img=e.target.closest("img"); if(!img)return;
  const wrap=e.target.closest(".photo"); if(!wrap)return;
  openLightbox(+wrap.dataset.i);
});
function openLightbox(i){
  const p=photos[i]; if(!p)return;
  lightboxIndex=i;
  $("#lightboxImg").src=p.url||p;
  $("#lightbox").classList.remove("hidden");
}
function closeLightbox(){$("#lightbox").classList.add("hidden")}
$("#lightboxClose").onclick=closeLightbox;
$("#lightbox").addEventListener("click",e=>{if(e.target.id==="lightbox")closeLightbox()});
$("#lightboxDownload").onclick=()=>{
  const p=photos[lightboxIndex]; if(!p)return;
  downloadOne(p.url||p,p.name||`photo-${lightboxIndex+1}.jpg`);
};
$("#selectAll").onchange=e=>{document.querySelectorAll("#photoGrid input").forEach(x=>x.checked=e.target.checked);updateSelected()};
$("#backBtn").onclick=()=>{galleryView.classList.add("hidden");homeView.classList.remove("hidden");history.replaceState({}, "", "/");};
async function downloadOne(url,name){
  try{
    const r=await fetch(url,{mode:"cors"}); const blob=await r.blob();
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name||"photo.jpg";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
  }catch{window.open(url,"_blank");}
}
$("#downloadSelectedBtn").onclick=async()=>{
  const ids=[...document.querySelectorAll("#photoGrid input:checked")].map(x=>+x.dataset.index);
  if(!ids.length)return showToast("Select at least one photo.");
  for(const i of ids) await downloadOne(photos[i].url||photos[i],photos[i].name||`photo-${i+1}.jpg`);
};
$("#downloadAllBtn").onclick=async()=>{
  if(!photos.length)return showToast("No photos in this gallery.");
  for(let i=0;i<photos.length;i++) await downloadOne(photos[i].url||photos[i],photos[i].name||`photo-${i+1}.jpg`);
};
async function shareClient(c){
  const url=location.origin+"/"+(c.slug||c.id);
  if(navigator.share){
    try{
      await navigator.share({title:c.name+" | Audry Nel Photography",url});
    }catch{}
  } else {
    try{await navigator.clipboard.writeText(url);showToast("Gallery link copied.");}
    catch{prompt("Copy this gallery link:",url);}
  }
}
$("#shareBtn").onclick=()=>current&&shareClient(current);
$("#logoutBtn").onclick=()=>{
  if(current) localStorage.removeItem(key(current.slug||current.id));
  current=null; galleryView.classList.add("hidden"); homeView.classList.remove("hidden");
  history.replaceState({}, "", "/"); showToast("Gallery access removed.");
};
loadClients();