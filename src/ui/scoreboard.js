// src/ui/scoreboard.js
// GPT-GEN

import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

const SCOREBOARD_TITLE = "Leaderboard";
const PLAYER_ROW_HEIGHT = 20;
const TITLE_FONT_SIZE = "16px";
const PLAYER_FONT_SIZE = "12px";
const TEXT_COLOR = "white";
const SCORE_PRECISION = 2; // How many decimal places for the score

// Helper function to calculate performance score
function calculatePerformanceScore(player) {
  return (player.data.alphaTheta || 0) + (player.data.focus || 0);
}

export function initScoreboard(container, players) {
  container.selectAll('*').remove(); // Clear existing content

  // Add title
  container.append('text')
    .attr('class', 'scoreboard-title')
    .attr('x', 0)
    .attr('y', 0) // Positioned at the top of the group
    .attr('fill', TEXT_COLOR)
    .attr('font-size', TITLE_FONT_SIZE)
    .attr('font-weight', 'bold')
    .text(SCOREBOARD_TITLE);

  // Create player entries
  const playerEntries = container.selectAll('.player-entry')
    .data(players, p => p.id)
    .enter()
    .append('g')
    .attr('class', 'player-entry');

  // Add text for rank, name, score
  // Initial positioning will be updated by updateScoreboard
  playerEntries.append('text')
    .attr('class', 'player-rank')
    .attr('fill', TEXT_COLOR)
    .attr('font-size', PLAYER_FONT_SIZE);

  playerEntries.append('text')
    .attr('class', 'player-name')
    .attr('x', 20) // Offset for rank
    .attr('fill', TEXT_COLOR)
    .attr('font-size', PLAYER_FONT_SIZE);

  playerEntries.append('text')
    .attr('class', 'player-score')
    .attr('x', 120) // Offset for rank and name
    .attr('fill', TEXT_COLOR)
    .attr('font-size', PLAYER_FONT_SIZE);

  updateScoreboard(players, container, false); // Initial sort and display, no transition
}

export function updateScoreboard(players, container, useTransition = true) {
  // Recalculate scores and add to player objects for sorting
  players.forEach(p => {
    p.performanceScore = calculatePerformanceScore(p);
  });

  // Sort players by performance score (descending)
  players.sort((a, b) => b.performanceScore - a.performanceScore);

  const playerEntries = container.selectAll('.player-entry')
    .data(players, p => p.id); // Join data

  const t = useTransition ? d3.transition().duration(500) : d3.transition().duration(0);

  // Update existing entries + newly entered ones
  playerEntries.join(
    enter => { // Should not happen often after init, but good practice
      const newEntry = enter.append('g').attr('class', 'player-entry');
      newEntry.append('text')
        .attr('class', 'player-rank')
        .attr('fill', TEXT_COLOR)
        .attr('font-size', PLAYER_FONT_SIZE);
      newEntry.append('text')
        .attr('class', 'player-name')
        .attr('x', 20).attr('fill', TEXT_COLOR).attr('font-size', PLAYER_FONT_SIZE);
      newEntry.append('text')
        .attr('class', 'player-score')
        .attr('x', 120).attr('fill', TEXT_COLOR).attr('font-size', PLAYER_FONT_SIZE);
      return newEntry;
    },
    update => update, // Pass through existing elements for update
    exit => exit.remove() // Remove elements that are no longer in players data
  )
  .transition(t)
  .attr('transform', (d, i) => `translate(0, ${PLAYER_ROW_HEIGHT * (i + 1) + (PLAYER_ROW_HEIGHT/2)})`) // Position group based on rank
  .each(function(p, i) { // `this` is the 'g' element
    const entry = d3.select(this);
    entry.select('.player-rank').text(`${i + 1}.`);
    entry.select('.player-name').text(p.name);
    entry.select('.player-score').text(p.performanceScore.toFixed(SCORE_PRECISION));
  });
}
