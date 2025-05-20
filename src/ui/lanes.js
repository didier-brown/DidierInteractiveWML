// GPT-GEN
// Draws static track lanes for up to four players
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

const CONFIG = {
  leftPad      : 140,   // space for name + avatar
  laneHeight   : 90,
  laneGap      : 40,
  trackRadius  : 8,
  startColour  : '#1abc9c',
  finishColour : '#e74c3c',
  bgColour     : '#262630',
  labelColour  : '#eee',
  hpBarH       : 6
};

/**
 * Build lanes, labels & start/finish gates.
 * Call once after the SVG canvas is created.
 */
export function drawLanes(svg, state){
  const W = +svg.attr('width')  || svg.node().clientWidth;
  const H = +svg.attr('height') || svg.node().clientHeight;

  // ---------- Main group -------------
  const g = svg.append('g').attr('class','lanes');

  // ---------- Scale helpers ----------
  const yScale = (i)=> CONFIG.laneGap + i*(CONFIG.laneHeight+CONFIG.laneGap);

  // ---------- One lane per player ----
  const lane = g.selectAll('g.lane')
    .data(state.players)
    .enter()
    .append('g')
      .attr('class','lane')
      .attr('transform',(d,i)=>`translate(0,${yScale(i)})`);

  /* background rect */
  lane.append('rect')
      .attr('class','laneBg')
      .attr('x', CONFIG.leftPad)
      .attr('y', 0)
      .attr('width', W - CONFIG.leftPad - CONFIG.laneGap)
      .attr('height', CONFIG.laneHeight)
      .attr('rx', CONFIG.trackRadius)
      .attr('fill', CONFIG.bgColour)
      .attr('stroke', '#000')
      .attr('stroke-width', 1.5);

  /* start / finish ticks */
  lane.append('rect')
      .attr('x', CONFIG.leftPad)
      .attr('y', CONFIG.laneHeight/2 - 18)
      .attr('width', 6).attr('height', 36)
      .attr('fill', CONFIG.startColour);

  lane.append('rect')
      .attr('x', W - CONFIG.laneGap - 6)
      .attr('y', CONFIG.laneHeight/2 - 18)
      .attr('width', 6).attr('height', 36)
      .attr('fill', CONFIG.finishColour);

  /* player label */
  lane.append('text')
      .text(d=>d.name)
      .attr('x', CONFIG.leftPad - 10)
      .attr('y', CONFIG.laneHeight/2 + 6)
      .attr('text-anchor','end')
      .attr('font-size', 18)
      .attr('fill', CONFIG.labelColour)
      .attr('font-weight',600);

  /* HP / shield bar (empty for now) */
  lane.append('rect')
      .attr('class','hpBarBg')
      .attr('x', CONFIG.leftPad)
      .attr('y', CONFIG.laneHeight + 10)
      .attr('width', W - CONFIG.leftPad - CONFIG.laneGap)
      .attr('height', CONFIG.hpBarH)
      .attr('rx', CONFIG.hpBarH/2)
      .attr('fill', '#111');
  
  lane.append('rect')
      .attr('class','hpBarFill')
      .attr('x', CONFIG.leftPad)
      .attr('y', CONFIG.laneHeight + 10)
      .attr('height', CONFIG.hpBarH)
      .attr('rx', CONFIG.hpBarH/2)
      .attr('fill', d=>d.colour)
      .attr('width', d=> hpToWidth(d.hp, W));

  /* helper for later width mapping */
  function hpToWidth(hp, fullWidth){
    const max = fullWidth - CONFIG.leftPad - CONFIG.laneGap;
    return max * (hp/100);
  }

  // Store helper for update function
  svg.node().__hpToWidth__ = hpToWidth;
}

/**
 * Optional per-frame lane updates – tint lanes on critical HP
 * and animate shield bar width.
 */
export function updateLanes(svg, state){
  if(!svg.node().__hpToWidth__) return;      // hasn’t been initialised
  const hpToWidth = svg.node().__hpToWidth__;

  svg.selectAll('g.lane').data(state.players)
    .select('rect.hpBarFill')
      .transition().duration(120)
      .attr('width', d=> hpToWidth(d.hp, svg.node().clientWidth));

  // Critical tint
  svg.selectAll('g.lane').data(state.players)
    .select('rect.laneBg')          // back-rect is first child, easier:
    .attr('fill', d=> d.hp < 20 ? '#4a0000' : CONFIG.bgColour);
}

// Auto-render lanes on page load (dev only)
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const svg = d3.select('#arena');
    const players = [
      { id: 1, name: 'Player 1', colour: '#3a8dde' },
      { id: 2, name: 'Player 2', colour: '#de3a8d' },
      { id: 3, name: 'Player 3', colour: '#3ade8d' },
      { id: 4, name: 'Player 4', colour: '#e2de3a' },
    ];
    drawLanes(svg, players);
  });
}
