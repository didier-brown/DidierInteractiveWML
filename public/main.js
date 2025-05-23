// Entry point for WML Visualiser
// GPT-GEN
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import { drawLanes, updateLanes } from './ui/lanes.js';
import { initCombat, combatStep, startNewRound }  from './combat.js';
import { initScoreboard, updateScoreboard } from './ui/scoreboard.js';
import { initHud, updateHud as updatePlayerHud } from './ui/hud.js'; // Player HUD import
import { Announcer } from './announcer.js'; // Announcer import
import { initLeaderboard, updateLeaderboard } from './ui/leaderboard.js'; // Leaderboard import

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
  // roundOver: false // Optional: if explicit state needed beyond event handling
};

// These variables will be initialized once DOM is loaded
let svg;
let scoreboardContainer;
let announcer;

// Helper functions (can be defined before DOM is ready)
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
  // Assuming 'main' is the intended parent for sizing, but index.html doesn't have <main>
  // Let's use document.body or a specific container if available.
  // For now, let's assume the #arena's parent is what we want to measure, or window.
  const availableWidth = window.innerWidth * 0.9; // Example: 90% of window width
  const availableHeight = window.innerHeight * 0.7; // Example: 70% of window height
  
  // The arena itself is an SVG, its parent might be body or a div.
  // Let's use the body for available space calculation, assuming arena is top-level or in a simple layout.
  const newWidth = Math.min(document.body.clientWidth, 1200); // Max width of 1200
  const newHeight = Math.min(document.body.clientHeight - 100, 600); // Max height of 600, with some margin

  svg.attr('width',  newWidth);
  svg.attr('height', newHeight);

  if (scoreboardContainer) {
    const scoreboardWidth = 200; 
    const scoreboardMargin = { top: 20, right: 20 };
    scoreboardContainer.attr('transform', `translate(${newWidth - scoreboardWidth - scoreboardMargin.right}, ${scoreboardMargin.top})`);
  }
  // announcer might need repositioning too if it's not purely overlay
  // Ensure announcer is defined before trying to access its properties/methods
  if (typeof announcer !== 'undefined' && announcer && typeof announcer.reposition === 'function') {
    announcer.reposition(newWidth, newHeight);
  }
}

function startDemoFeed(){
  setInterval(()=>{
    state.players.forEach(p=>{
      const d = p.data;
      d.alphaTheta = clamp(d.alphaTheta + rnd(CONFIG.changeMag), 0, 1);
      d.focus      = clamp(d.focus      + rnd(CONFIG.changeMag*1.2), 0, 1);
      d.mindWander = clamp(d.mindWander + rnd(CONFIG.changeMag*1.4), 0, 1);
      // HP update in demo feed was removed as combatStep now handles HP.
      // If passive HP regen/degen is desired for demo OUTSIDE combatStep, it could be added here.
      // For now, combatStep is the source of truth for HP changes.
    });
    // combatStep is called in the main d3.timer loop, so not called here.
  }, CONFIG.demoTickMs);
}

function updateGlobalStatusDisplay(){
  const statusDiv = document.getElementById('status'); // Assuming 'status' div exists
  if (!statusDiv) return; // Guard if the element isn't in HTML

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

// Main execution block after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  svg = d3.select('#arena');
  // scoreboardContainer will be initialized here as it depends on svg
  // announcer will be initialized here as it depends on svg

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
  initLeaderboard(state.players); // Initialize leaderboard
  announcer = new Announcer(svg, state.players); // Initialize announcer

  startDemoFeed();

  let lastT = performance.now();
  d3.timer((now)=>{
    const dt = (now - lastT) / 1000; // Convert dt to seconds
    if (dt < 1 / CONFIG.fpsLimit) return;
    lastT = now;
    state.elapsed += dt; // Increment elapsed time correctly

    const combatEvents = combatStep(state, dt);
    combatEvents.forEach(e => handleEvent(e));    // animate beams etc.

    updateLanes(svg, state);
    updateGlobalStatusDisplay(); // Renamed from updateHud
    updateScoreboard(state.players, scoreboardContainer);
    updatePlayerHud(state.players, combatEvents); // Update player HUD
    announcer.update(state, combatEvents); // Update announcer
    updateLeaderboard(state.players); // Update leaderboard
  });
});
