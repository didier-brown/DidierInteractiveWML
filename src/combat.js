// GPT-GEN
// Placeholder for combat mechanics (Alpha-Burst, combos, etc.)

const C = {
  alphaBurst : {
    alphaΘ   : 0.90,   // αθ threshold to arm burst
    focus    : 0.60,
    wander   : 0.30,   // must stay BELOW
    holdSec  : 1.0,    // sustained time before firing
    cooldown : 4.0,    // lockout after firing
    baseDmg  : 12,
    comboAdd : 1,
    comboMul : 0.25    // extra % dmg per combo tier
  },
  regen : {
    healPerFocus    :  0.30,   // hp / s
    dmgPerWander    :  0.45,   // hp / s
    maxHp           : 100
  }
};

function clamp(v,a,b){return Math.max(a, Math.min(v,b));}
function others(state, id){return state.players.filter(p=>p.id!==id);}

export function initCombat(state){
  state.players.forEach(p=>{
    Object.assign(p, {
      hp         : C.regen.maxHp,
      combo      : 0,
      burstReady : 0,  // seconds held above thresholds
      cd         : 0,   // cooldown remaining
      roundWins  : 0   // Initialize roundWins
    });
  });
}

export function startNewRound(state) {
  state.players.forEach(p => {
    p.hp = C.regen.maxHp;
    p.combo = 0;
    p.burstReady = 0;
    p.cd = 0;
  });
  // Potentially emit an event here if main.js needs to know the round started
  // e.g., return { type: 'roundStart' };
}

export function combatStep(state, dt){
  const events = [];
  state.players.forEach((p,i)=>{
    // Skip processing for players with 0 HP
    if (p.hp <= 0) return;

    console.log(`Player ${p.id}: HP=${p.hp.toFixed(2)}, Combo=${p.combo}, BurstReady=${p.burstReady.toFixed(2)}s, CD=${p.cd.toFixed(2)}s`);

    const d = p.data;
    const oldHp = p.hp;
    p.cd  = Math.max(0, p.cd - dt); // Cooldown reduction happens every step, not logging this to avoid noise.

    // HP change from regen/wander
    const hpFromActivity = (d.focus * C.regen.healPerFocus - d.mindWander * C.regen.dmgPerWander) * dt;
    if (hpFromActivity !== 0) {
      p.hp += hpFromActivity;
      p.hp = clamp(p.hp, 0, C.regen.maxHp);
      console.log(`Player ${p.id} HP change: ${hpFromActivity.toFixed(2)}, New HP: ${p.hp.toFixed(2)} (Source: Activity)`);
    }
    
    const meetsThresholds =
      d.alphaTheta >= C.alphaBurst.alphaΘ &&
      d.focus      >= C.alphaBurst.focus  &&
      d.mindWander <= C.alphaBurst.wander;

    if(meetsThresholds && p.cd === 0){
      const oldBurstReady = p.burstReady;
      p.burstReady += dt;
      if (p.burstReady.toFixed(2) !== oldBurstReady.toFixed(2)) { // Log only if it meaningfully changed
         console.log(`Player ${p.id} burstReady increased to ${p.burstReady.toFixed(2)}s`);
      }

      if(p.burstReady >= C.alphaBurst.holdSec){
        const target = chooseTarget(state, p.id);
        if(target){
          const damage = Math.round(
            C.alphaBurst.baseDmg *
            (1 + p.combo * C.alphaBurst.comboMul)
          );
          const oldTargetHp = target.hp;
          target.hp = clamp(target.hp - damage, 0, C.regen.maxHp);
          
          console.log(`ALPHA BURST: Player ${p.id} (Combo ${p.combo}) -> Player ${target.id}, Damage: ${damage}`);
          console.log(`Player ${target.id} HP change: ${ (target.hp - oldTargetHp).toFixed(2)}, New HP: ${target.hp.toFixed(2)} (Source: Alpha Burst from Player ${p.id})`);
          
          events.push({
            type:'alphaBurst',
            source:p,
            target,
            payload:{ damage, combo:p.combo }
          });
          
          const oldCombo = p.combo;
          p.combo   += C.alphaBurst.comboAdd;
          console.log(`Player ${p.id} combo updated to ${p.combo} (Previous: ${oldCombo})`);
          
          p.cd = C.alphaBurst.cooldown;
          console.log(`Player ${p.id} cooldown initiated: ${p.cd.toFixed(2)}s`);
        }
        p.burstReady = 0;
        console.log(`Player ${p.id} burstReady reset to 0 (fired).`);
      }
    } else { // Conditions not met or on cooldown
      if (p.burstReady > 0) {
        p.burstReady = 0;
        console.log(`Player ${p.id} burstReady reset to 0 (conditions not met or on cooldown).`);
      }
      // Combo reset if conditions are not met (and player is not on cooldown from just firing)
      if (!meetsThresholds && p.combo > 0 && p.cd === 0) {
        const oldCombo = p.combo;
        p.combo = 0;
        console.log(`Player ${p.id} combo reset to 0 (conditions not met). Previous: ${oldCombo}`);
      }
    }
  });
  // The extra closing }); was a typo from the previous state, removing it.

  // Round end detection
  // Check only if there isn't already a round-ending event (like a draw from simultaneous knockout)
  if (!events.some(e => e.type === 'roundEnd' || e.type === 'draw')) {
    const alivePlayers = state.players.filter(p => p.hp > 0);
    if (alivePlayers.length === 1) {
      const winner = alivePlayers[0];
      winner.roundWins++;
      events.push({ type: 'roundEnd', winner: winner });
      // It's important that main.js handles this event to call startNewRound
      // or declare a game over. combatStep should not call startNewRound directly.
    } else if (alivePlayers.length === 0 && state.players.length > 0) {
      // All players were knocked out in the same frame (e.g. mutual damage)
      // This is a draw scenario.
      events.push({ type: 'draw' });
    }
  }
  return events;
}

function chooseTarget(state, shooterId){
  const alive = others(state, shooterId)
                  .filter(p=>p.hp>0);
  if(alive.length === 0) return null;
  return alive.sort((a,b)=>b.hp - a.hp)[0];
}
