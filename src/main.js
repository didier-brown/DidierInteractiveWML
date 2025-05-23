// Entry point for WML Visualiser
// GPT-GEN
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import { drawLanes, updateLanes } from './ui/lanes.js';
import { initCombat, combatStep, startNewRound }  from './combat.js';
import { initScoreboard, updateScoreboard } from './ui/scoreboard.js';
import { initHud, updateHud as updatePlayerHud } from './ui/hud.js'; // Player HUD import

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
let scoreboardContainer; // Declare scoreboardContainer

resizeSvg(); // Initial resize
window.addEventListener('resize', resizeSvg, { passive:true });

drawLanes(svg, state);
initCombat(state);              // right after defining state

// Scoreboard initialization
scoreboardContainer = svg.append('g')
  .attr('class', 'scoreboard-container');
// Positioning will be handled in resizeSvg initially and on resize events
initScoreboard(scoreboardContainer, state.players);
initHud(svg, state.players); // Initialize player HUD elements

startDemoFeed();

let lastT = performance.now();
d3.timer((now)=>{
  const dt = (now - lastT) / 1000; // Convert dt to seconds
  if (dt < 1 / CONFIG.fpsLimit) return;
  lastT = now;
  state.elapsed += dt; // Increment elapsed time correctly

  // Only run combatStep if there's more than one player alive, or game hasn't just ended.
  // This check might be more sophisticated depending on game state management (e.g. if a round just ended)
  const alivePlayers = state.players.filter(p => p.hp > 0);
  if (alivePlayers.length > 1) {
    const combatEvents = combatStep(state, dt);
    combatEvents.forEach(e => handleEvent(e));
  } else if (alivePlayers.length <= 1 && !state.roundOver) { // Handle initial round end
        // This logic is tricky because combatStep itself now detects round end.
        // We need to ensure combatStep runs one last time if needed, or this is handled by its events.
        // For now, let combatStep emit the event, and handleEvent will deal with it.
        // The main loop should probably not gate combatStep like this based on alivePlayers count
        // if combatStep itself is responsible for determining round end.
        // Let's simplify and let combatStep always run if game is active.
  }
  // Simpler: always call combatStep and let it produce events.
  // If a round ended, handleEvent will set a flag or similar if we need to pause.
  const combatEvents = combatStep(state, dt);
  combatEvents.forEach(e => handleEvent(e));    // animate beams etc.

  updateLanes(svg, state);
  updateGlobalStatusDisplay(); // Renamed from updateHud
  updateScoreboard(state.players, scoreboardContainer);
  updatePlayerHud(state.players, combatEvents); // Update player HUD
});

function handleEvent(e){
  if(e.type === 'alphaBurst'){
    // TODO – emit SVG laser from e.source to e.target,
    // flash damage text, play SFX.  Copilot: suggest!
    console.log(`${e.source.name} fires at ${e.target.name} for ${e.payload.damage} damage!`);
  } else if (e.type === 'roundEnd') {
    console.log(`Round Over! Winner: ${e.winner.name}`);
    
    // Confetti animation
    if (typeof confetti === 'function') {
      const winner = e.winner;
      const winnerColor = winner ? winner.colour : null; // Get winner's color
      
      // General confetti
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 }
      });

      // Player-specific color confetti, if color is available
      if (winnerColor) {
        confetti({
          particleCount: 100,
          spread: 120,
          origin: { y: 0.5 },
          colors: [winnerColor]
        });
      }
    } else {
      console.warn("Confetti function not found. Make sure canvas-confetti library is loaded.");
    }

    // alert(`Round Over! Winner: ${e.winner.name}. Starting next round...`); // Optional: for better UX
    // Potentially add a delay here before starting the next round
    // state.roundOver = true; // Flag to pause updates if necessary
    startNewRound(state);
    // state.roundOver = false; // Unset flag
    console.log("New round started.");
  } else if (e.type === 'draw') {
    console.log("Round is a Draw!");
    // alert("Round is a Draw! Starting next round..."); // Optional
    startNewRound(state);
    console.log("New round started after draw.");
  }
}

function resizeSvg(){
  const main = document.querySelector('main');
  const newWidth = main.clientWidth;
  const newHeight = main.clientHeight;
  
  svg.attr('width',  newWidth);
  svg.attr('height', newHeight);

  if (scoreboardContainer) {
    // Position scoreboard, e.g., top-right. Adjust as needed.
    const scoreboardWidth = 200; // Approximate width, can be dynamic if needed
    const scoreboardMargin = { top: 20, right: 20 };
    scoreboardContainer.attr('transform', `translate(${newWidth - scoreboardWidth - scoreboardMargin.right}, ${scoreboardMargin.top})`);
  }
  // Note: If lanes or other elements need explicit resize handling based on newWidth/newHeight,
  // they should be updated here or have their own resize handlers.
  // For now, updateLanes is called in the timer loop, which might be sufficient if it re-calculates positions.
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

function updateGlobalStatusDisplay(){ // Renamed from updateHud
  const statusDiv = document.getElementById('status');
  // Sort by round wins first, then by HP for current leader
  const sortedPlayers = [...state.players].sort((a,b) => {
    if (b.roundWins !== a.roundWins) {
      return b.roundWins - a.roundWins;
    }
    return b.hp - a.hp;
  });

  let hudText = 'Scores:<br>';
  sortedPlayers.forEach(p => {
    hudText += `${p.name}: ${p.hp.toFixed(0)} HP, ${p.roundWins} Wins<br>`;
  });
  
  if (sortedPlayers.length > 0) {
    const lead = sortedPlayers[0];
    statusDiv.innerHTML = `Leader: ${lead.name} (${lead.roundWins} wins)<br><br>${hudText}`;
  } else {
    statusDiv.innerHTML = "No players active.";
  }
}

function rnd(mag){ return (Math.random() - 0.5) * mag * 2; }
function clamp(v,a,b){ return Math.max(a, Math.min(v,b)); }

// Make sure initCombat is called after players are defined
// initCombat(state); // This was already in the original code, moved to after drawLanes
