// tests/combat.test.js

// Assertion Helpers
function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        console.error(`Assertion Failed: ${message}. Expected "${expected}", but got "${actual}".`);
        throw new Error(`Assertion Failed: ${message}. Expected "${expected}", but got "${actual}".`);
    }
    console.log(`Test passed: ${message}`);
}

function assertClose(actual, expected, tolerance = 0.01, message) {
    if (Math.abs(actual - expected) > tolerance) {
        console.error(`Assertion Failed: ${message}. Expected "${expected}" (approx), but got "${actual}".`);
        throw new Error(`Assertion Failed: ${message}. Expected "${expected}" (approx), but got "${actual}".`);
    }
    console.log(`Test passed: ${message}`);
}

function assertTrue(condition, message) {
    if (!condition) {
        console.error(`Assertion Failed: ${message}. Expected true, but got false.`);
        throw new Error(`Assertion Failed: ${message}. Expected true, but got false.`);
    }
    console.log(`Test passed: ${message}`);
}

function assertDefined(value, message) {
    if (value === undefined) {
        console.error(`Assertion Failed: ${message}. Expected a defined value, but got undefined.`);
        throw new Error(`Assertion Failed: ${message}. Expected a defined value, but got undefined.`);
    }
    console.log(`Test passed: ${message}`);
}

function assertEvent(events, eventType, message) {
    const event = events.find(e => e.type === eventType);
    if (!event) {
        console.error(`Assertion Failed: ${message}. Expected event of type "${eventType}" to be emitted. Events: ${JSON.stringify(events)}`);
        throw new Error(`Assertion Failed: ${message}. Expected event of type "${eventType}" to be emitted.`);
    }
    console.log(`Test passed: ${message}`);
    return event; // Return the event for further assertions if needed
}

// Import functions from combat.js
// Assuming combat.js exports C (constants) as well, or we mock it.
// For Node.js testing, you might need to adjust paths or use a bundler.
// For browser, ensure paths are correct relative to your HTML runner.
import { initCombat, combatStep, startNewRound } from '../src/combat.js';
// If C (constants from combat.js) is not exported, we'll need to define a mock C for tests.
// For simplicity, we'll assume C is implicitly used by the functions and tests focus on behavior.
// Or, if combat.js is refactored to export C, we can import it.
// For now, we'll use the C values as defined in combat.js internally.
// Let's define a mock C for test clarity, matching key values from combat.js
const C_mock = {
  alphaBurst : { // Values needed for later tests
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
    healPerFocus    :  0.30,   // hp / s
    dmgPerWander    :  0.45,   // hp / s
    maxHp           : 100
  }
};

// --- Test Suite Starts Here ---
console.log("Running Combat Logic Tests...");

function testInitialization() {
    console.log("--- Testing Initialization ---");
    const mockState = {
        players: [
            { id: 1, name: 'Player A', data: {} },
            { id: 2, name: 'Player B', data: {} }
        ]
    };

    initCombat(mockState);

    mockState.players.forEach(p => {
        assertEqual(p.hp, C_mock.regen.maxHp, `Player ${p.id} HP initialized`);
        assertEqual(p.combo, 0, `Player ${p.id} combo initialized`);
        assertEqual(p.burstReady, 0, `Player ${p.id} burstReady initialized`);
        assertEqual(p.cd, 0, `Player ${p.id} cd initialized`);
        assertEqual(p.roundWins, 0, `Player ${p.id} roundWins initialized`);
    });

    // Modify some properties
    mockState.players[0].hp = 50;
    mockState.players[0].combo = 2;
    mockState.players[0].burstReady = 0.5;
    mockState.players[0].cd = 3;
    mockState.players[1].roundWins = 1; // Player B won a previous round

    startNewRound(mockState);

    mockState.players.forEach(p => {
        assertEqual(p.hp, C_mock.regen.maxHp, `Player ${p.id} HP reset by startNewRound`);
        assertEqual(p.combo, 0, `Player ${p.id} combo reset by startNewRound`);
        assertEqual(p.burstReady, 0, `Player ${p.id} burstReady reset by startNewRound`);
        assertEqual(p.cd, 0, `Player ${p.id} cd reset by startNewRound`);
    });
    // Round wins should NOT be reset by startNewRound
    assertEqual(mockState.players[0].roundWins, 0, `Player 1 roundWins not reset by startNewRound (correct)`);
    assertEqual(mockState.players[1].roundWins, 1, `Player 2 roundWins not reset by startNewRound (correct)`);

    console.log("--- Initialization Tests Passed ---");
}

// Run tests
testInitialization();


function testHpActivity() {
    console.log("--- Testing HP Regeneration and Damage (Focus/Wander) ---");
    const dt = 0.1; // 100ms

    // Test HP Regeneration (Focus)
    let stateFocus = {
        players: [{ id: 1, name: 'Focus Player', data: { focus: 1.0, mindWander: 0.0 } }]
    };
    initCombat(stateFocus); // Initializes HP to C_mock.regen.maxHp (100)
    stateFocus.players[0].hp = 50; // Set HP to a mid-value to see regen
    
    combatStep(stateFocus, dt);
    const expectedHpGain = 50 + C_mock.regen.healPerFocus * dt;
    assertClose(stateFocus.players[0].hp, expectedHpGain, 0.001, "HP should increase with high focus");

    // Test HP Clamping (Max HP)
    stateFocus.players[0].data.focus = 1.0;
    stateFocus.players[0].data.mindWander = 0.0;
    stateFocus.players[0].hp = C_mock.regen.maxHp - 0.01; // Just below max HP
    combatStep(stateFocus, dt); // Should gain some HP
    combatStep(stateFocus, dt); // Gain more, potentially exceeding if not clamped
    assertClose(stateFocus.players[0].hp, C_mock.regen.maxHp, 0.001, "HP should not exceed maxHp with focus");

    // Test HP Damage (Wander)
    let stateWander = {
        players: [{ id: 2, name: 'Wander Player', data: { focus: 0.0, mindWander: 1.0 } }]
    };
    initCombat(stateWander);
    stateWander.players[0].hp = 50; // Set HP to a mid-value

    combatStep(stateWander, dt);
    const expectedHpLoss = 50 - C_mock.regen.dmgPerWander * dt;
    assertClose(stateWander.players[0].hp, expectedHpLoss, 0.001, "HP should decrease with high mind-wander");

    // Test HP Clamping (Min HP)
    stateWander.players[0].data.focus = 0.0;
    stateWander.players[0].data.mindWander = 1.0;
    stateWander.players[0].hp = 0.01; // Just above 0 HP
    combatStep(stateWander, dt); // Should lose some HP
    combatStep(stateWander, dt); // Lose more, potentially going below zero if not clamped
    assertClose(stateWander.players[0].hp, 0, 0.001, "HP should not go below 0 with mind-wander");

    // Test No Change (Neutral activity)
    let stateNeutral = {
        players: [{ id: 3, name: 'Neutral Player', data: { focus: 0.0, mindWander: 0.0 } }]
    };
    initCombat(stateNeutral);
    stateNeutral.players[0].hp = 50;
    const initialHpNeutral = stateNeutral.players[0].hp;
    combatStep(stateNeutral, dt);
    assertEqual(stateNeutral.players[0].hp, initialHpNeutral, "HP should not change with no focus/wander");

    console.log("--- HP Activity Tests Passed ---");
}

testHpActivity();


function testAlphaBurstMechanics() {
    console.log("--- Testing Alpha Burst Mechanics ---");
    const dt = 0.1; // 100ms simulation step

    // Base state for two players
    function createTwoPlayerState() {
        const state = {
            players: [
                { id: 1, name: 'Shooter', data: { alphaTheta: 0, focus: 0, mindWander: 1.0 } }, // Initially not meeting conditions
                { id: 2, name: 'Target',  data: { alphaTheta: 0, focus: 0, mindWander: 1.0 } }
            ]
        };
        initCombat(state); // Initialize HP, combo, etc.
        return state;
    }

    // Test 1: burstReady increases when conditions are met
    let stateArming = createTwoPlayerState();
    stateArming.players[0].data = { alphaTheta: C_mock.alphaBurst.alphaΘ, focus: C_mock.alphaBurst.focus, mindWander: C_mock.alphaBurst.wander };
    
    combatStep(stateArming, dt);
    assertClose(stateArming.players[0].burstReady, dt, 0.001, "BurstReady should increase when conditions met");
    
    combatStep(stateArming, dt);
    assertClose(stateArming.players[0].burstReady, 2 * dt, 0.001, "BurstReady should continue increasing");

    // Test 2: burstReady resets if conditions are no longer met
    stateArming.players[0].data.focus = C_mock.alphaBurst.focus - 0.1; // Drop focus below threshold
    combatStep(stateArming, dt);
    assertEqual(stateArming.players[0].burstReady, 0, "BurstReady should reset if conditions no longer met");

    // Test 3: Firing an Alpha Burst
    let stateFiring = createTwoPlayerState();
    stateFiring.players[0].data = { alphaTheta: C_mock.alphaBurst.alphaΘ, focus: C_mock.alphaBurst.focus, mindWander: C_mock.alphaBurst.wander };
    stateFiring.players[1].hp = C_mock.regen.maxHp; // Ensure target is full HP

    let totalTime = 0;
    let events = [];
    while (totalTime < C_mock.alphaBurst.holdSec - dt/2) { // Simulate time just before burst fires
        events = combatStep(stateFiring, dt);
        totalTime += dt;
    }
    assertClose(stateFiring.players[0].burstReady, totalTime, 0.001, "BurstReady accumulates up to holdSec");
    assertEqual(events.some(e => e.type === 'alphaBurst'), false, "No alphaBurst event before holdSec met");

    // One more step to trigger the burst
    events = combatStep(stateFiring, dt);
    totalTime += dt;

    const burstEvent = assertEvent(events, 'alphaBurst', "AlphaBurst event should be emitted");
    assertDefined(burstEvent.source, "Burst event should have a source");
    assertDefined(burstEvent.target, "Burst event should have a target");
    assertEqual(burstEvent.source.id, stateFiring.players[0].id, "Burst source should be player 0");
    assertEqual(burstEvent.target.id, stateFiring.players[1].id, "Burst target should be player 1");
    assertEqual(burstEvent.payload.damage, C_mock.alphaBurst.baseDmg, "Damage should be baseDmg for 0 combo");
    
    assertEqual(stateFiring.players[0].burstReady, 0, "Shooter burstReady should reset after firing");
    assertEqual(stateFiring.players[0].combo, C_mock.alphaBurst.comboAdd, "Shooter combo should increase by comboAdd");
    assertClose(stateFiring.players[0].cd, C_mock.alphaBurst.cooldown, 0.001, "Shooter should be on cooldown");
    const expectedTargetHp = C_mock.regen.maxHp - C_mock.alphaBurst.baseDmg;
    assertClose(stateFiring.players[1].hp, expectedTargetHp, 0.001, "Target HP should decrease by baseDmg");

    // Test 4: Cooldown prevents firing
    let stateCooldown = createTwoPlayerState();
    stateCooldown.players[0].data = { alphaTheta: C_mock.alphaBurst.alphaΘ, focus: C_mock.alphaBurst.focus, mindWander: C_mock.alphaBurst.wander };
    stateCooldown.players[0].cd = C_mock.alphaBurst.cooldown / 2; // Put player on some cooldown
    const initialBurstReady = stateCooldown.players[0].burstReady;

    combatStep(stateCooldown, dt);
    assertEqual(stateCooldown.players[0].burstReady, initialBurstReady, "BurstReady should not increase while on cooldown");
    
    stateCooldown.players[0].cd = 0; // Cooldown finished
    combatStep(stateCooldown, dt);
    assertClose(stateCooldown.players[0].burstReady, dt, 0.001, "BurstReady should increase once cooldown is over");
    
    console.log("--- Alpha Burst Mechanics Tests Passed ---");
}

testAlphaBurstMechanics();


function testComboSystem() {
    console.log("--- Testing Combo System ---");
    const dt = 0.1; // 100ms simulation step
    const holdTime = C_mock.alphaBurst.holdSec + dt; // Time to ensure burst fires

    function createTwoPlayerState() {
        const state = {
            players: [
                { id: 1, name: 'Shooter', data: { alphaTheta: C_mock.alphaBurst.alphaΘ, focus: C_mock.alphaBurst.focus, mindWander: C_mock.alphaBurst.wander } },
                { id: 2, name: 'Target',  data: { alphaTheta: 0, focus: 0, mindWander: 1.0 } }
            ]
        };
        initCombat(state);
        return state;
    }

    // Test 1: Combo increments on successive bursts
    let stateComboInc = createTwoPlayerState();
    let shooter = stateComboInc.players[0];
    let target = stateComboInc.players[1];
    
    // First burst
    for (let t = 0; t < holdTime; t += dt) combatStep(stateComboInc, dt);
    assertEqual(shooter.combo, 1, "Combo should be 1 after first burst");
    const damage1 = C_mock.alphaBurst.baseDmg * (1 + 0 * C_mock.alphaBurst.comboMul); // Combo was 0 for this burst
    assertClose(target.hp, C_mock.regen.maxHp - damage1, 0.01, "Target HP after 1st burst (combo 0)");
    
    // Recover target HP and shooter CD for next burst
    target.hp = C_mock.regen.maxHp;
    shooter.cd = 0; 
    shooter.burstReady = 0;

    // Second burst
    for (let t = 0; t < holdTime; t += dt) combatStep(stateComboInc, dt);
    assertEqual(shooter.combo, 2, "Combo should be 2 after second burst");
    const damage2 = C_mock.alphaBurst.baseDmg * (1 + 1 * C_mock.alphaBurst.comboMul); // Combo was 1 for this burst
    assertClose(target.hp, C_mock.regen.maxHp - damage2, 0.01, "Target HP after 2nd burst (combo 1)");

    // Test 2: Combo resets if conditions are not met
    let stateComboReset = createTwoPlayerState();
    shooter = stateComboReset.players[0];
    shooter.combo = 3; // Set a high combo
    shooter.data.focus = C_mock.alphaBurst.focus - 0.1; // Fail condition
    
    combatStep(stateComboReset, dt);
    assertEqual(shooter.combo, 0, "Combo should reset if burst conditions are not met");

    // Test 3: Damage increases with combo
    let stateComboDmg = createTwoPlayerState();
    shooter = stateComboDmg.players[0];
    target = stateComboDmg.players[1];

    // Burst at Combo 0
    shooter.combo = 0;
    target.hp = C_mock.regen.maxHp;
    shooter.cd = 0; shooter.burstReady = 0;
    for (let t = 0; t < holdTime; t += dt) combatStep(stateComboDmg, dt);
    const expectedDmgCombo0 = C_mock.alphaBurst.baseDmg * (1 + 0 * C_mock.alphaBurst.comboMul);
    assertClose(target.hp, C_mock.regen.maxHp - expectedDmgCombo0, 0.01, "Damage at combo 0");

    // Burst at Combo 1 (shooter.combo is now 1 from previous burst)
    target.hp = C_mock.regen.maxHp;
    shooter.cd = 0; shooter.burstReady = 0;
    for (let t = 0; t < holdTime; t += dt) combatStep(stateComboDmg, dt);
    const expectedDmgCombo1 = C_mock.alphaBurst.baseDmg * (1 + 1 * C_mock.alphaBurst.comboMul);
    assertClose(target.hp, C_mock.regen.maxHp - expectedDmgCombo1, 0.01, "Damage at combo 1");
    
    // Burst at Combo 2 (shooter.combo is now 2)
    target.hp = C_mock.regen.maxHp;
    shooter.cd = 0; shooter.burstReady = 0;
    for (let t = 0; t < holdTime; t += dt) combatStep(stateComboDmg, dt);
    const expectedDmgCombo2 = C_mock.alphaBurst.baseDmg * (1 + 2 * C_mock.alphaBurst.comboMul);
    assertClose(target.hp, C_mock.regen.maxHp - expectedDmgCombo2, 0.01, "Damage at combo 2");

    console.log("--- Combo System Tests Passed ---");
}

testComboSystem();


function testRoundMechanics() {
    console.log("--- Testing Round Mechanics ---");
    const dt = 0.1; // 100ms simulation step

    function createTwoPlayerState() {
        const state = {
            players: [
                { id: 1, name: 'Player 1', data: { alphaTheta: 0, focus: 0, mindWander: 0 } },
                { id: 2, name: 'Player 2', data: { alphaTheta: 0, focus: 0, mindWander: 0 } }
            ]
        };
        initCombat(state);
        return state;
    }

    // Test 1: Round ends when one player is defeated, winner's roundWins increments
    let stateRoundEnd = createTwoPlayerState();
    let player1 = stateRoundEnd.players[0];
    let player2 = stateRoundEnd.players[1];
    player1.hp = 10; // Player 1 is weak
    player2.hp = C_mock.regen.maxHp; // Player 2 is healthy
    
    // Simulate Player 2 dealing damage to Player 1
    // For simplicity, directly set Player 1 HP to 0 as if by an attack.
    // A more integrated test would have P2 fire an alpha burst.
    player1.hp = 0;
    
    let events = combatStep(stateRoundEnd, dt);
    const roundEndEvent = assertEvent(events, 'roundEnd', "RoundEnd event should be emitted when one player left");
    assertDefined(roundEndEvent.winner, "roundEnd event should have a winner");
    assertEqual(roundEndEvent.winner.id, player2.id, "Player 2 should be the winner");
    assertEqual(player2.roundWins, 1, "Player 2 roundWins should increment");
    assertEqual(player1.roundWins, 0, "Player 1 roundWins should not change");

    // Test 2: Draw scenario - both players reach 0 HP
    let stateDraw = createTwoPlayerState();
    player1 = stateDraw.players[0];
    player2 = stateDraw.players[1];
    player1.hp = 0; // Player 1 knocked out
    player2.hp = 0; // Player 2 knocked out simultaneously
    
    events = combatStep(stateDraw, dt);
    // Check if a 'draw' event is emitted. If not, check that no 'roundEnd' event is emitted either.
    const drawEvent = events.find(e => e.type === 'draw');
    const roundEndEventDrawTest = events.find(e => e.type === 'roundEnd');

    if (drawEvent) {
        assertEvent(events, 'draw', "Draw event should be emitted if all players are out");
        console.log("Draw event correctly emitted.");
    } else {
        assertEqual(roundEndEventDrawTest, undefined, "No roundEnd event should be emitted on a draw if draw event not implemented");
        console.log("No draw event, and no roundEnd event as expected for simultaneous knockout.");
    }
    assertEqual(player1.roundWins, 0, "Player 1 roundWins unchanged on draw");
    assertEqual(player2.roundWins, 0, "Player 2 roundWins unchanged on draw");
    
    // Test 3: Game continues if multiple players are alive
    let stateContinue = createTwoPlayerState();
    player1 = stateContinue.players[0];
    player2 = stateContinue.players[1];
    player1.hp = 50;
    player2.hp = 50;

    events = combatStep(stateContinue, dt);
    const roundEndEventContinueTest = events.find(e => e.type === 'roundEnd');
    assertEqual(roundEndEventContinueTest, undefined, "No roundEnd event if multiple players are alive");

    console.log("--- Round Mechanics Tests Passed ---");
}

testRoundMechanics();

// --- End of Test Suite ---
console.log("All combat logic tests completed.");
console.log("\nTo run these tests, open an HTML file in the browser that includes '../src/combat.js' and 'tests/combat.test.js' as modules, then view the console output.");
console.log("Alternatively, if your environment supports ES modules in Node.js, you might be able to run `node tests/combat.test.js` (ensure paths are correct).");
