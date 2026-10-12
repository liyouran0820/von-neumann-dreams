import * as Game from '../web/engine.js';
import { LEVELS } from '../web/levels.js';

// Enumerate only the public three-slot vocabulary. Goal checks remain in the engine.
for (const level of LEVELS) {
  const winners = [];
  for (const a of Game.CODES) for (const b of Game.CODES) for (const c of Game.CODES) {
    const program = [a, b, c], result = Game.runProgram(level, program);
    if (result.state.status !== 'success') continue;
    const deposits = new Map();
    let retrieved = false, learnedSwap = false;
    for (const [index, event] of result.events.entries()) {
      if (event.kind === 'move') for (const [cell, record] of deposits) if (cell !== event.to) record.left = true;
      if (!event.swap) continue;
      const swap = event.swap, previous = deposits.get(swap.cell);
      if (previous?.left && previous.code === swap.incoming && swap.incoming !== swap.outgoing) retrieved = true;
      if (swap.incoming === 'S' && result.events[index + 1]?.action === 'S' && result.events[index + 1].slot === swap.slot) learnedSwap = true;
      deposits.set(swap.cell, { code: swap.outgoing, left: false });
    }
    winners.push({
      program: program.map(code => Game.INSTRUCTIONS[code].name).join(' / '),
      steps: result.state.steps, learnedSwap, returnedForStoredInstruction: retrieved,
    });
  }
  console.log(JSON.stringify({ level: level.name, budget: Game.MAX_STEPS, initialPrograms: 27, winners }, null, 2));
}
