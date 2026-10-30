"use strict";
const model=JSON.parse(document.getElementById("review-data").textContent);
const originalChoices=JSON.stringify(model.originalWorksheet.choices);
const key="citywalk-owner-review-2026-10-30-v1";
const status=document.getElementById("storage-status");
const valid=["PENDING","ACCEPT RECOMMENDATION","REQUEST CHANGES","DEFER"];
let draft={};
try{const saved=JSON.parse(localStorage.getItem(key)||"null");if(saved?.originalWorksheetSha256===model.originalWorksheetSha256)draft=saved.responses||{};}catch{status.textContent="Browser storage unavailable; notes are session-only. Download the worksheet to preserve them.";}
function persist(){try{localStorage.setItem(key,JSON.stringify({originalWorksheetSha256:model.originalWorksheetSha256,responses:draft}));}catch{status.textContent="Local persistence unavailable; download the worksheet to preserve this session.";}}
document.querySelectorAll("[data-review]").forEach(el=>{const id=el.dataset.review;el.value=valid.includes(draft[id]?.response)?draft[id].response:"PENDING";el.addEventListener("change",()=>{draft[id]={...draft[id],response:el.value};persist();});});
document.querySelectorAll("[data-note]").forEach(el=>{const id=el.dataset.note;el.value=typeof draft[id]?.note==="string"?draft[id].note:"";el.addEventListener("input",()=>{draft[id]={response:draft[id]?.response||"PENDING",note:el.value};persist();});});
function buildReviewExport(){if(JSON.stringify(model.originalWorksheet.choices)!==originalChoices)throw new Error("Original owner choices changed");const responses={};document.querySelectorAll("[data-review]").forEach(el=>{responses[el.dataset.review]={response:el.value,note:document.querySelector('[data-note="'+el.dataset.review+'"]').value};});return {review:"CITYWALK consolidation owner review",date:"2026-10-30",exportedAt:new Date().toISOString(),authority:"Owner review worksheet only; no implementation or release authorization",originalWorksheetSha256:model.originalWorksheetSha256,originalWorksheet:model.originalWorksheet,reviewResponses:responses,screen14:"PENDING",separateBlockers:model.blockers.map(b=>({id:b.id,status:b.status}))};}
document.getElementById("export").addEventListener("click",()=>{const blob=new Blob([JSON.stringify(buildReviewExport(),null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="CITYWALK-owner-review-2026-10-30.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
