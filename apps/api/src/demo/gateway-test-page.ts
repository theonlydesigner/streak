import type { FastifyInstance } from "fastify";
import type { ApiStore } from "../server.js";

function renderPage(): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>STREAK Gateway Test Console</title>
<style>body{font-family:Arial;background:#080808;color:#fff;max-width:900px;margin:3rem auto;padding:0 1rem}input,button{padding:.75rem;margin:.25rem;background:#191919;color:#fff;border:1px solid #555;border-radius:.4rem}button{cursor:pointer;background:#ff7a00;color:#111;font-weight:700}.note{color:#ffb347}.status{font-size:1.5rem;margin:2rem 0}.queue{color:#aaa}</style></head>
<body><h1>GATEWAY TEST CONSOLE</h1><p class="note">software fixture: this simulates the card ID a future USB reader will send. No physical hardware is connected.</p>
<form id="form"><input id="card" name="card_id" placeholder="ABC123" autocomplete="off" required><button>Simulate card tap</button></form>
<div id="status" class="status">Ready</div><div id="queue" class="queue">Queue: 0</div>
<script>
const gym = new URLSearchParams(location.search).get("gym") || "gym-1";
const username = window.prompt("Admin username", "admin") || "";
const password = window.prompt("Admin password", "admin") || "";
const headers = {"authorization":"Basic " + btoa(username + ":" + password),"content-type":"application/json"};
const status = document.querySelector("#status");
const queue = document.querySelector("#queue");
async function refresh(){const response=await fetch("/demo/gateway-status",{headers,credentials:"same-origin"});if(!response.ok)throw new Error("Status unavailable (HTTP "+response.status+")");const data=await response.json();queue.textContent="Queue: "+data.queue_size;}
document.querySelector("#form").addEventListener("submit",async event=>{event.preventDefault();try{const card=document.querySelector("#card").value;const response=await fetch("/demo/gateway-tap",{method:"POST",headers,credentials:"same-origin",body:JSON.stringify({card_id:card})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Tap failed");status.textContent=data.status+(data.member_id?" — "+data.member_id:"");await refresh();}catch(error){status.textContent=error.message;}});
refresh().catch(error=>{status.textContent=error.message;});
</script></body></html>`;
}

export async function registerGatewayTestPage(app: FastifyInstance, store: ApiStore): Promise<void> {
  app.get("/admin/gateway-test", async (request, reply) => {
    if (!store.adminAuth.authorizeHeader(request.headers.authorization)) {
      return reply.header("WWW-Authenticate", 'Basic realm="STREAK Admin"').code(401).send({ error: "unauthorized admin" });
    }
    return reply.type("text/html").send(renderPage());
  });
}
