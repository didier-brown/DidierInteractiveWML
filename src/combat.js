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
      cd         : 0   // cooldown remaining
    });
  });
}

export function combatStep(state, dt){
  const events = [];
  state.players.forEach((p,i)=>{
    const d = p.data;
    p.cd  = Math.max(0, p.cd - dt);
    p.hp += (d.focus * C.regen.healPerFocus -
             d.mindWander * C.regen.dmgPerWander) * dt;
    p.hp = clamp(p.hp, 0, C.regen.maxHp);
    const meets =
      d.alphaTheta >= C.alphaBurst.alphaΘ &&
      d.focus      >= C.alphaBurst.focus  &&
      d.mindWander <= C.alphaBurst.wander;
    if(meets && p.cd === 0){
      p.burstReady += dt;
      if(p.burstReady >= C.alphaBurst.holdSec){
        const target = chooseTarget(state, p.id);
        if(target){
          const damage = Math.round(
            C.alphaBurst.baseDmg *
            (1 + p.combo * C.alphaBurst.comboMul)
          );
          target.hp = clamp(target.hp - damage, 0, C.regen.maxHp);
          events.push({
            type:'alphaBurst',
            source:p,
            target,
            payload:{ damage, combo:p.combo }
          });
          p.combo   += C.alphaBurst.comboAdd;
          p.cd       = C.alphaBurst.cooldown;
        }
        p.burstReady = 0;
      }
    }else{
      p.burstReady = 0;
      if(!meets) p.combo = 0;
    }
  });
  return events;
}

function chooseTarget(state, shooterId){
  const alive = others(state, shooterId)
                  .filter(p=>p.hp>0);
  if(alive.length === 0) return null;
  return alive.sort((a,b)=>b.hp - a.hp)[0];
}
