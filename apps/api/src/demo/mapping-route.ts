import type { FastifyInstance } from "fastify";
import type { ApiStore } from "../server.js";

function renderPage(): string {
return `<!doctype html>
<html><head><meta charset="utf-8"><title>STREAK Card Mapping</title>
<style>body{font-family:Arial;background:#080808;color:#fff;max-width:900px;margin:3rem auto;padding:0 1rem}input,button{padding:.7rem;margin:.25rem;background:#191919;color:#fff;border:1px solid #555;border-radius:.4rem}button{cursor:pointer;background:#ff7a00;color:#111;font-weight:700}li{margin:1rem 0}.note{color:#ffb347}.panel{border:1px solid #333;border-radius:.5rem;padding:1rem;margin:1rem 0}.muted{color:#aaa}.danger{background:#a83220;color:#fff}</style></head>
<body><h1>MEMBER MANAGEMENT</h1><p class="note">Create members here before assigning real keyfobs. These are placeholder IDs until the physical reader and keyfobs arrive.</p>
<div class="panel"><h2 id="member-title">Add member</h2>
<form id="member-form"><label>Card ID <input id="member-card" placeholder="XYZ789" required></label><label>Member ID <input id="member-id" placeholder="member-4" required></label><label>Name <input id="member-name" placeholder="Priya" required></label><button id="member-submit">Add member</button><button id="member-cancel" type="button" hidden>Cancel</button></form></div>
<h2>Members</h2><ul id="members"></ul>
<div class="panel"><h2>CARD MAPPING</h2><p class="muted">Use this section to assign or replace a card for an existing member.</p>
<form id="form"><label>Card ID <input id="card" placeholder="ABC123" required></label><label>Member ID <input id="member" placeholder="member-1" required></label><button>Assign card</button></form></div>
<h2>Current mappings</h2><ul id="list"></ul><pre id="export"></pre>
<script>
const gym = new URLSearchParams(location.search).get("gym") || "gym-1";
const username = window.prompt("Admin username", "admin") || "";
const password = window.prompt("Admin password", "admin") || "";
const headers = {"authorization":"Basic " + btoa(username + ":" + password),"content-type":"application/json"};
let editingMember = "";
const api = path => "/v1/gyms/"+encodeURIComponent(gym)+path;
async function loadMembers(){const r=await fetch(api("/members"),{headers,credentials:"same-origin"});if(!r.ok){throw new Error("Unable to load members (HTTP "+r.status+")");}const data=await r.json();const list=document.querySelector("#members");list.textContent="";if(!(data.members||[]).length){const empty=document.createElement("li");empty.textContent="No members yet";list.appendChild(empty);}else{for(const member of data.members){const item=document.createElement("li");item.textContent=member.member_id+" — "+member.name+" — "+(member.card_id||"No card")+" — "+member.active_streak+" day streak, best "+member.personal_best+" ";const edit=document.createElement("button");edit.textContent="Edit";edit.addEventListener("click",()=>startEdit(member));const remove=document.createElement("button");remove.textContent="Remove member";remove.className="danger";remove.addEventListener("click",()=>removeMember(member.member_id));item.appendChild(edit);item.appendChild(remove);list.appendChild(item);}}}
function startEdit(member){editingMember=member.member_id;document.querySelector("#member-id").value=member.member_id;document.querySelector("#member-id").disabled=true;document.querySelector("#member-name").value=member.name;document.querySelector("#member-card").value=member.card_id||"";document.querySelector("#member-title").textContent="Edit member";document.querySelector("#member-submit").textContent="Save changes";document.querySelector("#member-cancel").hidden=false;}
function resetMemberForm(){editingMember="";document.querySelector("#member-form").reset();document.querySelector("#member-id").disabled=false;document.querySelector("#member-title").textContent="Add member";document.querySelector("#member-submit").textContent="Add member";document.querySelector("#member-cancel").hidden=true;}
async function removeMember(member){if(!confirm("Remove "+member+" and its card mapping?"))return;const response=await fetch(api("/members/"+encodeURIComponent(member)),{method:"DELETE",headers,credentials:"same-origin"});if(!response.ok){throw new Error((await response.json()).error||"Unable to remove member");}await load();}
async function loadMappings(){const r=await fetch(api("/card-mappings"),{headers,credentials:"same-origin"});if(!r.ok){throw new Error("Unable to load mappings (HTTP "+r.status+")");}const data=await r.json();const list=document.querySelector("#list");list.textContent="";if(!(data.mappings||[]).length){const empty=document.createElement("li");empty.textContent="No mappings yet";list.appendChild(empty);}else{for(const mapping of data.mappings){const item=document.createElement("li");item.textContent=mapping.member_id+" ← "+mapping.card_id+" ";const button=document.createElement("button");button.textContent="Remove";button.addEventListener("click",()=>removeMapping(mapping.member_id));item.appendChild(button);list.appendChild(item);}}document.querySelector("#export").textContent=JSON.stringify(Object.fromEntries((data.mappings||[]).map(m=>[m.card_id,m.member_id])),null,2);}
async function load(){await Promise.all([loadMembers(),loadMappings()]);}
async function removeMapping(member){const response=await fetch("/v1/gyms/"+encodeURIComponent(gym)+"/card-mappings/"+encodeURIComponent(member),{method:"DELETE",headers,credentials:"same-origin"});if(!response.ok){throw new Error("Unable to remove mapping (HTTP "+response.status+")");}await load();}
document.querySelector("#member-cancel").addEventListener("click",resetMemberForm);
document.querySelector("#member-form").addEventListener("submit",async e=>{e.preventDefault();try{const member=document.querySelector("#member-id").value;const name=document.querySelector("#member-name").value;const card=document.querySelector("#member-card").value;const response=await fetch(api(editingMember?"/members/"+encodeURIComponent(editingMember):"/members"),{method:editingMember?"PUT":"POST",headers,credentials:"same-origin",body:JSON.stringify(editingMember?{name,card_id:card}:{member_id:member,name,card_id:card})});if(!response.ok){throw new Error((await response.json()).error||"Unable to save member");}resetMemberForm();await load();}catch(error){alert(error.message);}});
document.querySelector("#form").addEventListener("submit",async e=>{e.preventDefault();try{const member=document.querySelector("#member").value;const card=document.querySelector("#card").value;const existing=await fetch("/v1/gyms/"+gym+"/card-mappings",{headers,credentials:"same-origin"}).then(r=>r.json());const current=(existing.mappings||[]).find(m=>m.member_id===member);const url="/v1/gyms/"+gym+"/card-mappings"+(current?"/"+member:"");const response=await fetch(url,{method:current?"PUT":"POST",headers,credentials:"same-origin",body:JSON.stringify(current?{card_id:card}:{member_id:member,card_id:card})});if(!response.ok){throw new Error((await response.json()).error || "Unable to save mapping");}e.target.reset();await load();}catch(error){alert(error.message);}});
load();
</script></body></html>`;
}

export async function registerDemoMappingRoute(app: FastifyInstance, store: ApiStore): Promise<void> {
  app.get("/admin/mappings", async (request, reply) => {
    if (!store.adminAuth.authorizeHeader(request.headers.authorization)) {
      return reply.header("WWW-Authenticate", 'Basic realm="STREAK Admin"').code(401).send({ error: "unauthorized admin" });
    }
    return reply.type("text/html").send(renderPage());
  });
}
