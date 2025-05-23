import { initCombat, combatStep, startNewRound } from '../src/combat.js';

// Mock constants from combat.js C object for test stability and clarity
const C_mock = {
  alphaBurst : {
    alphaΘ   : 0.90,
    focus    : 0.60,
    wander   : 0.30,
    holdSec  : 1.0,
    cooldown : 4.0,
    baseDmg  : 12,
    comboAdd : 1,
    comboMul : 0.25
  },
  regen : {
    healPerFocus : 0.30,
    dmgPerWander : 0.45,
    maxHp        : 100
  }
};

describe('Combat System Score Logic', () => {
  let state;

  beforeEach(() => {
    // Initialize state before each test
    state = {
      players: [
        { id: 'player1', data: { alphaTheta: 0, focus: 0, mindWander: 0 } },
        { id: 'player2', data: { alphaTheta: 0, focus: 0, mindWander: 0 } }
      ]
      // Note: main.js might also pass 'config' or other top-level state properties
    };
    initCombat(state); // Initializes HP, combo, burstReady, cd, roundWins
                       // Uses constants from actual combat.js
  });

  test('alpha burst should deal damage and update attacker stats (combo, cd, burstReady)', () => {
    const attacker = state.players[0];
    const target = state.players[1];

    // Simulate conditions for player1 to achieve alpha burst
    attacker.data.alphaTheta = C_mock.alphaBurst.alphaΘ + 0.05; // Ensure above threshold
    attacker.data.focus      = C_mock.alphaBurst.focus + 0.1;   // Ensure above threshold
    attacker.data.mindWander = C_mock.alphaBurst.wander - 0.1; // Ensure below threshold

    const initialTargetHp = target.hp;
    const initialAttackerCombo = attacker.combo;
    const initialAttackerCd = attacker.cd;
    const initialAttackerBurstReady = attacker.burstReady;
    
    const expectedDamage = C_mock.alphaBurst.baseDmg; // Assuming combo is 0 initially

    // Simulate time passing for burstReady to accumulate beyond C_mock.alphaBurst.holdSec
    const dt = 0.2; // time step in seconds
    let totalTimeSimulated = 0;
    let events = [];

    // Loop enough times to ensure holdSec is reached and burst is triggered
    // C_mock.alphaBurst.holdSec / dt gives number of steps to reach holdSec
    // Add a few more steps to be sure, and to check burstReady reset
    const stepsToFire = Math.ceil(C_mock.alphaBurst.holdSec / dt) + 1;

    for (let i = 0; i < stepsToFire; i++) {
      events = combatStep(state, dt);
      totalTimeSimulated += dt;
      if (events.some(e => e.type === 'alphaBurst')) {
        break;
      }
    }
    
    const alphaBurstEvent = events.find(e => e.type === 'alphaBurst');
    expect(alphaBurstEvent).toBeDefined();
    expect(alphaBurstEvent.source.id).toBe(attacker.id);
    expect(alphaBurstEvent.target.id).toBe(target.id);
    expect(alphaBurstEvent.payload.damage).toBe(expectedDamage);

    // Target's HP (score) should decrease
    expect(target.hp).toBe(initialTargetHp - expectedDamage);
    
    // Attacker's "score-like" stats should update
    expect(attacker.combo).toBe(initialAttackerCombo + C_mock.alphaBurst.comboAdd);
    expect(attacker.cd).toBe(C_mock.alphaBurst.cooldown);
    expect(attacker.burstReady).toBe(0); // Burst ready should reset after firing
  });

  test('roundWins (score) should update when a player defeats another', () => {
    const player1 = state.players[0];
    const player2 = state.players[1];

    // Ensure players start with 0 roundWins for this test context
    player1.roundWins = 0;
    player2.roundWins = 0;

    // Simulate player1 having very high stats to quickly defeat player2
    player1.data.alphaTheta = C_mock.alphaBurst.alphaΘ + 0.1;
    player1.data.focus      = C_mock.alphaBurst.focus + 0.2;   // High focus for regen and burst
    player1.data.mindWander = C_mock.alphaBurst.wander - 0.1;  // Low mindWander

    // Give player2 low stats to make them an easy target / take passive damage
    player2.data.alphaTheta = 0.1; 
    player2.data.focus      = 0.1;
    player2.data.mindWander = 0.8; // High mindwander for passive damage

    let events = [];
    const maxTestSteps = 300; // Safety break for the loop (e.g., 300 steps * 0.2s = 60s max test time)
    let currentSteps = 0;

    // Simulate game steps until player2 is defeated
    while (player2.hp > 0 && currentSteps < maxTestSteps) {
      events = combatStep(state, 0.2); // Simulate 0.2s steps
      currentSteps++;
    }

    expect(player2.hp).toBeLessThanOrEqual(0); // Target is defeated
    
    const roundEndEvent = events.find(e => e.type === 'roundEnd');
    expect(roundEndEvent).toBeDefined();
    expect(roundEndEvent.winner.id).toBe(player1.id);
    
    // Player1's roundWins (score) should increment
    expect(player1.roundWins).toBe(1);
    expect(player2.roundWins).toBe(0); // Player 2's roundWins should remain 0

    // Test startNewRound to ensure HP resets and roundWins are preserved
    const p1WinsBeforeNewRound = player1.roundWins;
    const p2WinsBeforeNewRound = player2.roundWins;
    
    startNewRound(state);
    expect(player1.hp).toBe(C_mock.regen.maxHp);
    expect(player2.hp).toBe(C_mock.regen.maxHp);
    expect(player1.combo).toBe(0);
    expect(player2.combo).toBe(0);
    // Critically, roundWins should persist across rounds
    expect(player1.roundWins).toBe(p1WinsBeforeNewRound);
    expect(player2.roundWins).toBe(p2WinsBeforeNewRound);
  });

  test('HP should change based on focus (heal) and mindWander (damage)', () => {
    const player = state.players[0];
    const dt = 0.5; // 0.5 seconds

    // Test healing from focus
    player.hp = 50;
    player.data.focus = 1.0;
    player.data.mindWander = 0.0;
    const expectedHpAfterFocus = Math.min(C_mock.regen.maxHp, 50 + C_mock.regen.healPerFocus * dt);
    combatStep(state, dt);
    expect(player.hp).toBeCloseTo(expectedHpAfterFocus);

    // Test damage from mindWander
    player.hp = 50;
    player.data.focus = 0.0;
    player.data.mindWander = 1.0;
    const expectedHpAfterWander = Math.max(0, 50 - C_mock.regen.dmgPerWander * dt);
    combatStep(state, dt);
    expect(player.hp).toBeCloseTo(expectedHpAfterWander);

    // Test HP clamping at maxHP
    player.hp = C_mock.regen.maxHp - 1;
    player.data.focus = 1.0;
    player.data.mindWander = 0.0;
    combatStep(state, dt); // Apply healing for one step
    combatStep(state, dt); // Apply healing for another step
    expect(player.hp).toBe(C_mock.regen.maxHp);

    // Test HP clamping at 0 HP
    player.hp = 1;
    player.data.focus = 0.0;
    player.data.mindWander = 1.0;
    combatStep(state, dt); // Apply damage for one step
    combatStep(state, dt); // Apply damage for another step
    expect(player.hp).toBe(0);
  });
});

// Note: To run these tests, you'll need a test runner like Jest.
// Example Jest command: `npx jest tests/combat.test.js`
// Ensure you have Jest installed (`npm install --save-dev jest`) and Babel configured
// if your project uses ES module syntax that Node doesn't support natively yet for Jest,
// or if combat.js itself has dependencies that need transpilation.
// A basic babel.config.js for Jest:
// module.exports = {
//  presets: [['@babel/preset-env', {targets: {node: 'current'}}]],
// };
