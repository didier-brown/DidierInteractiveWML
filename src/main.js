// Entry point for WML Visualiser
// GPT-GEN
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import { drawLanes, updateLanes } from './ui/lanes.js';
import { initCombat, combatStep }  from './combat.js';

const CONFIG = {
  fpsLimit : 60,
  demoTickMs : 200,
  changeMag  : 0.08,
};

const state = {
  elapsed : 0,
  players : [
    { id: 1, name: 'Mark',    colour: '#00c9ff', hp: 100,
      data: { alphaTheta: .5, focus: .5, mindWander: .5 } },
    { id: 2, name: 'Jessica', colour: '#ff43a6', hp: 100,
      data: { alphaTheta: .5, focus: .5, mindWander: .5 } }
  ]
};

const svg  = d3.select('#arena');
resizeSvg();
window.addEventListener('resize', resizeSvg, { passive:true });

drawLanes(svg, state);
initCombat(state);              // right after defining state
startDemoFeed();

let lastT = performance.now();
d3.timer((now)=>{
  const dt = now - lastT;
  if (dt < 1000/CONFIG.fpsLimit) return;
  lastT = now;
  state.elapsed = now/1000;
  const combatEvents = combatStep(state, dt);   // <- new
  combatEvents.forEach(e => handleEvent(e));    // animate beams etc.
  updateLanes(svg, state);
  updateHud();
});

function handleEvent(e){
  if(e.type === 'alphaBurst'){
    // TODO – emit SVG laser from e.source to e.target,
    // flash damage text, play SFX.  Copilot: suggest!
  }
}

function resizeSvg(){
  const main = document.querySelector('main');
  svg.attr('width',  main.clientWidth );
  svg.attr('height', main.clientHeight);
}

function startDemoFeed(){
  setInterval(()=>{
    state.players.forEach(p=>{
      const d = p.data;
      d.alphaTheta = clamp(d.alphaTheta + rnd(CONFIG.changeMag), 0, 1);
      d.focus      = clamp(d.focus      + rnd(CONFIG.changeMag*1.2), 0, 1);
      d.mindWander = clamp(d.mindWander + rnd(CONFIG.changeMag*1.4), 0, 1);
      p.hp = clamp(
        p.hp + (d.focus * 0.4 - d.mindWander * 0.6) * 5,
        0, 100
      );
    });
    // TODO: call combat.step(state) here.
  }, CONFIG.demoTickMs);
}

function updateHud(){
  const status = document.getElementById('status');
  const lead   = state.players.sort((a,b)=>b.hp-a.hp)[0];
  status.textContent = `Leader: ${lead.name} — HP ${lead.hp.toFixed(0)}`;
}

function rnd(mag){ return (Math.random() - 0.5) * mag * 2; }
function clamp(v,a,b){ return Math.max(a, Math.min(v,b)); }
