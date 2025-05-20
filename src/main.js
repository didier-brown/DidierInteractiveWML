// Entry point for WML Visualiser
// GPT-GEN
import { drawLanes, updateLanes } from './ui/lanes.js';

// Example state for demo
const state = {
  players: [
    { id: 1, name: 'Player 1', colour: '#3a8dde', hp: 100 },
    { id: 2, name: 'Player 2', colour: '#de3a8d', hp: 100 },
    { id: 3, name: 'Player 3', colour: '#3ade8d', hp: 100 },
    { id: 4, name: 'Player 4', colour: '#e2de3a', hp: 100 },
  ]
};

const svg = d3.select('#arena');
drawLanes(svg, state);

function updateData() {
  // Demo: random walk HP
  state.players.forEach(p => {
    p.hp += (Math.random() - 0.5) * 8;
    p.hp = Math.max(0, Math.min(100, p.hp));
  });
}

d3.timer(() => {
  updateData();
  updateLanes(svg, state);
});
