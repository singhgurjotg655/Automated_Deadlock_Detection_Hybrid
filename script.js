const state = {
  processCount: 3,
  resources: [{name:"R1",total:1},{name:"R2",total:1},{name:"R3",total:1}],
  allocation: [[1,0,0],[0,1,0],[0,0,1]],
  request: [[0,1,0],[0,0,1],[1,0,0]],
  result: null,
  history: []
};
const $ = id => document.getElementById(id);
const pageNames = {dashboard:"Dashboard",setup:"System configuration",matrices:"Resource allocation",graph:"Dependency graph",analysis:"Detection analysis",recovery:"Recovery suggestions",history:"Analysis history"};

function showPage(name){
  document.querySelectorAll(".page").forEach(p=>p.classList.toggle("show",p.id===name));
  document.querySelectorAll(".nav").forEach(b=>b.classList.toggle("active",b.dataset.page===name));
  $("pageTitle").textContent=pageNames[name];
  if(name==="graph") drawGraph();
}
document.querySelectorAll(".nav").forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.page)));
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.go)));
function toast(message){const t=$("toast");t.textContent=message;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2400)}
function available(){return state.resources.map((r,j)=>r.total-state.allocation.reduce((sum,row)=>sum+Number(row[j]||0),0))}
function updateStats(){
  $("statProcesses").textContent=state.processCount;
  $("statResources").textContent=state.resources.length;
  const a=available();$("statAvailable").textContent=a.reduce((x,y)=>x+y,0);
  $("statStatus").textContent=state.result?(state.result.deadlock?"Deadlock":"Safe"):"Pending";
}
function renderDefinitions(){
  $("resourceDefinitions").innerHTML=state.resources.map((r,j)=>`<label class="resource-def">Resource ${j+1}<input data-resource-name="${j}" value="${escapeHtml(r.name)}" maxlength="12" aria-label="Resource name ${j+1}"><input data-resource-total="${j}" type="number" min="0" max="100" value="${r.total}" aria-label="Total instances ${j+1}"></label>`).join("");
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function renderMatrix(target,matrix){
  const headers=state.resources.map(r=>`<th>${escapeHtml(r.name)}</th>`).join("");
  const rows=matrix.map((row,i)=>`<tr><td>P${i+1}</td>${row.map((v,j)=>`<td><input class="matrix-input" type="number" min="0" step="1" value="${v}" data-matrix="${target}" data-row="${i}" data-col="${j}" aria-label="${target} P${i+1} ${state.resources[j].name}"></td>`).join("")}</tr>`).join("");
  return `<table class="matrix-table"><thead><tr><th>Process</th>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
}
function renderMatrices(){
  $("allocationTable").innerHTML=renderMatrix("allocation",state.allocation);
  $("requestTable").innerHTML=renderMatrix("request",state.request);
}
function readMatrices(){
  document.querySelectorAll("[data-matrix]").forEach(input=>{
    const value=Number(input.value);
    if(!Number.isInteger(value)||value<0)throw new Error("Matrix values must be non-negative whole numbers.");
    state[input.dataset.matrix][Number(input.dataset.row)][Number(input.dataset.col)]=value;
  });
  const a=available();
  if(a.some(v=>v<0))throw new Error("Allocated instances exceed the total for at least one resource.");
  state.result=null;updateStats();drawGraph();
}
function applySetup(){
  const p=Number($("processCount").value),r=Number($("resourceCount").value);
  if(!Number.isInteger(p)||p<1||p>20||!Number.isInteger(r)||r<1||r>20){toast("Use between 1 and 20 processes/resource types.");return}
  const defs=[];
  for(let j=0;j<r;j++){
    const name=document.querySelector(`[data-resource-name="${j}"]`)?.value.trim()||`R${j+1}`;
    const total=Number(document.querySelector(`[data-resource-total="${j}"]`)?.value??1);
    if(!Number.isInteger(total)||total<0){toast("Resource totals must be non-negative whole numbers.");return}
    defs.push({name,total});
  }
  state.processCount=p;state.resources=defs;
  state.allocation=Array.from({length:p},()=>Array(r).fill(0));
  state.request=Array.from({length:p},()=>Array(r).fill(0));
  state.result=null;renderMatrices();renderDefinitions();updateStats();drawGraph();showPage("matrices");toast("Configuration applied. Enter the matrices.");
}
function loadScenario(deadlock){
  state.processCount=3;
  if(deadlock){
    state.resources=[{name:"R1",total:1},{name:"R2",total:1},{name:"R3",total:1}];
    state.allocation=[[1,0,0],[0,1,0],[0,0,1]];
    state.request=[[0,1,0],[0,0,1],[1,0,0]];
  }else{
    state.resources=[{name:"R1",total:3},{name:"R2",total:2},{name:"R3",total:2}];
    state.allocation=[[1,0,1],[1,1,0],[0,1,0]];
    state.request=[[1,0,0],[0,0,1],[1,0,1]];
  }
  state.result=null;$("processCount").value=3;$("resourceCount").value=3;
  renderDefinitions();renderMatrices();updateStats();drawGraph();showPage("matrices");
  toast(deadlock?"Deadlock example loaded.":"Safe example loaded.");
}
function drawGraph(){
  const host=$("graphCanvas");if(!host)return;
  const width=850,height=Math.max(300,Math.max(state.processCount,state.resources.length)*85);
  const pX=170,rX=680,top=45,bottom=height-45;
  const yFor=(i,n)=>n===1?height/2:top+i*(bottom-top)/(n-1);
  let svg=`<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Resource allocation graph">`;
  // Edges: resource to process for allocation; process to resource for request.
  state.processCount&&state.resources.forEach((r,j)=>state.allocation.forEach((row,i)=>{
    if(row[j]>0)svg+=`<path d="M ${rX-65} ${yFor(j,state.resources.length)} L ${pX+65} ${yFor(i,state.processCount)}" stroke="#168a68" stroke-width="2" fill="none"/><text x="${(rX+pX)/2}" y="${(yFor(j,state.resources.length)+yFor(i,state.processCount))/2-5}" fill="#168a68" font-size="11">${row[j]}</text>`;
  }));
  state.processCount&&state.resources.forEach((r,j)=>state.request.forEach((row,i)=>{
    if(row[j]>0)svg+=`<path d="M ${pX+65} ${yFor(i,state.processCount)} L ${rX-65} ${yFor(j,state.resources.length)}" stroke="#c8862d" stroke-width="2" stroke-dasharray="6 5" fill="none"/><text x="${(rX+pX)/2}" y="${(yFor(j,state.resources.length)+yFor(i,state.processCount))/2+13}" fill="#b57a25" font-size="11">${row[j]}</text>`;
  }));
  for(let i=0;i<state.processCount;i++){let y=yFor(i,state.processCount);svg+=`<rect x="${pX-60}" y="${y-20}" width="120" height="40" rx="9" fill="#e9efff" stroke="#7895e9"/><text x="${pX}" y="${y+5}" text-anchor="middle" fill="#284baf" font-weight="700">Process P${i+1}</text>`}
  state.resources.forEach((r,j)=>{let y=yFor(j,state.resources.length);svg+=`<rect x="${rX-65}" y="${y-20}" width="130" height="40" rx="9" fill="#f2ebff" stroke="#b79be8"/><text x="${rX}" y="${y+5}" text-anchor="middle" fill="#7046aa" font-weight="700">${escapeHtml(r.name)} (${r.total})</text>`});
  svg+="</svg>";host.innerHTML=svg;
}
async function runDetection(){
  try{
    readMatrices();
    $("runDetection").disabled=true;$("runDetection").textContent="Analyzing…";
    const response=await fetch("/api/detect",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({processCount:state.processCount,resourceCount:state.resources.length,total:state.resources.map(r=>r.total),allocation:state.allocation,request:state.request})});
    const result=await response.json();if(!response.ok||result.error)throw new Error(result.error||"Detection failed.");
    state.result=result;renderResult();updateStats();renderRecovery();
    state.history.unshift({time:new Date().toLocaleString(),deadlock:result.deadlock,unfinished:result.unfinished});
    renderHistory();showPage("analysis");toast("C++ detection completed.");
  }catch(err){toast(err.message)}
  finally{$("runDetection").disabled=false;$("runDetection").textContent="▶ Run detection"}
}
function renderResult(){
  const dead=state.result.deadlock,banner=$("resultBanner");
  banner.className=`result-banner ${dead?"danger":"safe"}`;
  banner.innerHTML=`<span class="result-symbol">${dead?"⚠":"✓"}</span><div><strong>${dead?"Deadlock detected":"No deadlock detected"}</strong><p>${dead?`Unfinished processes: ${state.result.unfinished.map(p=>"P"+p).join(", ")}. These processes could not be marked finished.`:"All processes can finish in the current snapshot."}</p></div>`;
  $("traceList").innerHTML=state.result.trace.map(line=>`<li>${escapeHtml(line)}</li>`).join("");
  $("sequence").innerHTML=state.result.safeSequence.length?state.result.safeSequence.map(p=>`<span>P${p}</span>`).join('<b>→</b>'):"No complete sequence.";
}
function renderRecovery(){
  const r=state.result;
  $("recoveryState").innerHTML=r.deadlock?`<strong>Unfinished processes: ${r.unfinished.map(p=>"P"+p).join(", ")}</strong><p>Consider the strategies below. Choose a recovery action only after considering process priority, resource ownership and lost work.</p>`:`<strong>No recovery required</strong><p>All processes can complete in this snapshot. Continue monitoring future resource requests.</p>`;
}
function renderHistory(){
  $("historyList").innerHTML=state.history.length?state.history.map(h=>`<div class="history-item"><span><strong>${h.deadlock?"Deadlock detected":"No deadlock"}</strong><br><small>${escapeHtml(h.time)}</small></span><span>${h.unfinished.length?`Unfinished: ${h.unfinished.map(p=>"P"+p).join(", ")}`:"All processes completed"}</span></div>`).join(""):'<p class="muted">No analyses recorded yet.</p>';
}
$("applySetup").addEventListener("click",applySetup);
$("saveMatrices").addEventListener("click",()=>{try{readMatrices();toast("Matrix values saved.")}catch(e){toast(e.message)}});
$("runDetection").addEventListener("click",runDetection);
$("loadDeadlock").addEventListener("click",()=>loadScenario(true));
$("loadSafe").addEventListener("click",()=>loadScenario(false));
$("refreshGraph").addEventListener("click",()=>{try{readMatrices();drawGraph();toast("Graph refreshed.")}catch(e){toast(e.message)}});
$("clearHistory").addEventListener("click",()=>{state.history=[];renderHistory();toast("History cleared.")});
$("processCount").value=state.processCount;$("resourceCount").value=state.resources.length;
renderDefinitions();renderMatrices();updateStats();drawGraph();
