// src/ui/hud.js
// Manages individual player HUD elements like Alpha Burst indicators and Combo chains.
// GPT-GEN

import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

const HUD_CONFIG = {
  PLAYER_HUD_OFFSET_X: 50, // Horizontal offset for each player's HUD
  PLAYER_HUD_OFFSET_Y: 40, // Vertical start offset for the first player's HUD
  PLAYER_HUD_SPACING_Y: 80, // Vertical spacing between player HUDs

  BURST_INDICATOR: {
    RADIUS_NORMAL: 8,
    RADIUS_BURST: 16,
    COLOR_NORMAL: 'rgba(200, 200, 200, 0.5)',
    COLOR_BURST: 'rgba(255, 255, 0, 1)', // Bright yellow for burst
    FLASH_DURATION: 150, // ms for the main flash
    REVERT_DURATION: 300, // ms to revert to normal
  },
  COMBO_TEXT: {
    FONT_SIZE: '14px',
    COLOR: 'white',
    OFFSET_Y: 25, // Relative to the player's HUD group y-center
    TEXT_ANCHOR: 'middle',
  }
};

let hudContainer; // Main group for all HUD elements

export function initHud(svg, players) {
  if (hudContainer) hudContainer.remove(); // Clear previous HUD if any

  hudContainer = svg.append('g').attr('class', 'hud-elements-container');

  const playerHuds = hudContainer.selectAll('.player-hud-group')
    .data(players, p => p.id)
    .enter()
    .append('g')
    .attr('class', d => `player-hud-group player-hud-${d.id}`)
    .attr('transform', (d, i) => `translate(${HUD_CONFIG.PLAYER_HUD_OFFSET_X}, ${HUD_CONFIG.PLAYER_HUD_OFFSET_Y + i * HUD_CONFIG.PLAYER_HUD_SPACING_Y})`);

  // Alpha Burst Indicator
  playerHuds.append('circle')
    .attr('class', 'burst-indicator')
    .attr('r', HUD_CONFIG.BURST_INDICATOR.RADIUS_NORMAL)
    .attr('fill', HUD_CONFIG.BURST_INDICATOR.COLOR_NORMAL)
    .attr('cx', 0) // Centered in the player-hud-group
    .attr('cy', 0);

  // Combo Text
  playerHuds.append('text')
    .attr('class', 'combo-text')
    .attr('fill', HUD_CONFIG.COMBO_TEXT.COLOR)
    .attr('font-size', HUD_CONFIG.COMBO_TEXT.FONT_SIZE)
    .attr('text-anchor', HUD_CONFIG.COMBO_TEXT.TEXT_ANCHOR)
    .attr('x', 0) // Centered
    .attr('y', HUD_CONFIG.COMBO_TEXT.OFFSET_Y)
    .text(''); // Initially empty
}

export function updateHud(players, events) {
  if (!hudContainer) return;

  // Update Combo Text for each player
  players.forEach(player => {
    const playerHudGroup = hudContainer.select(`.player-hud-${player.id}`);
    if (playerHudGroup.empty()) return;

    const comboText = playerHudGroup.select('.combo-text');
    if (player.combo > 0) {
      comboText.text(`x${player.combo} Combo!`);
    } else {
      comboText.text('');
    }
  });

  // Handle Alpha Burst events
  const alphaBurstEvents = events.filter(e => e.type === 'alphaBurst');

  alphaBurstEvents.forEach(event => {
    const sourcePlayerId = event.source.id;
    const playerHudGroup = hudContainer.select(`.player-hud-${sourcePlayerId}`);
    if (playerHudGroup.empty()) return;

    const burstIndicator = playerHudGroup.select('.burst-indicator');

    burstIndicator.transition()
      .duration(HUD_CONFIG.BURST_INDICATOR.FLASH_DURATION)
      .attr('r', HUD_CONFIG.BURST_INDICATOR.RADIUS_BURST)
      .attr('fill', HUD_CONFIG.BURST_INDICATOR.COLOR_BURST)
      .transition()
      .duration(HUD_CONFIG.BURST_INDICATOR.REVERT_DURATION)
      .attr('r', HUD_CONFIG.BURST_INDICATOR.RADIUS_NORMAL)
      .attr('fill', HUD_CONFIG.BURST_INDICATOR.COLOR_NORMAL);
  });
}