import * as Game from '../../web/engine.js';
export function harness(level) {
  let session = Game.createSession(level);
  const command = value => { session = Game.act(level, session, value); if (session.state.status === 'failed') throw new Error(session.state.message); return session; };
  const edit = callback => { command({ type: 'edit' }); callback(); command({ type: 'edit' }); };
  const link = (a, b) => command({ type: 'link', a, b });
  const unlink = (a, b) => command({ type: 'unlink', a, b });
  const push = (count, direction = 1) => { for (let i = 0; i < count; i++) command({ type: 'push', direction }); };
  const release = () => command({ type: 'release' });
  function walk(destination) {
    const route = Game.routeTo(level, session.state, destination);
    if (!route) throw new Error('无法到达：' + destination);
    for (const point of route) command({ type: 'walk', delta: point.map((value, axis) => value - session.state.player.pos[axis]) });
  }
  function grab(id) {
    if (session.state.held) release();
    if (!Game.canGrab(level, session.state, id)) {
      const point = Game.gripPosition(level, session.state, id);
      const destinations = [point, ...[[1, 0], [0, 1], [-1, 0], [0, -1]].map(delta => point.map((value, axis) => value + delta[axis]))];
      const choices = destinations.map(destination => ({ destination, route: Game.routeTo(level, session.state, destination) })).filter(choice => choice.route);
      choices.sort((a, b) => Number(b.destination.join(',') === point.join(',')) - Number(a.destination.join(',') === point.join(',')) || a.route.length - b.route.length);
      if (!choices.length) throw new Error('够不到：' + id);
      walk(choices[0].destination);
    }
    command({ type: 'grab', id });
    if (session.state.held !== id) throw new Error('抓取失败：' + id);
  }
  return { command, edit, link, unlink, push, release, walk, grab, get session() { return session; } };
}

export function solveReference(level, alternative = false, stride = 2) {
  const h = harness(level);
  if (level.id === 'long-door') {
    h.grab('H');
    for (let i = 0; i < 3; i++) {
      h.edit(() => h.link('H', 'D')); h.push(2);
      if (i < 2) { h.edit(() => h.unlink('H', 'D')); h.push(2, -1); }
    }
    h.release();
  } else if (level.id === 'borrow-stop') {
    h.grab('H'); h.edit(() => h.link('H', 'G')); h.push(3);
    h.edit(() => { h.link('G', 'B'); if (!alternative) h.unlink('H', 'G'); }); h.release();
  } else if (level.id === 'still-orbit') {
    h.grab(alternative ? 'S' : 'C'); h.edit(() => h.link('C', 'S')); h.push(3); h.release();
  } else if (level.id === 'carry-fixed') {
    h.grab('G'); h.push(2); h.edit(() => h.link('G', 'S')); h.release();
    h.grab('C'); h.push(4); h.release();
  } else if (level.id === 'academy') {
    h.grab('H'); h.edit(() => h.link('H', 'G')); h.push(2);
    h.edit(() => { h.link('G', 'B'); h.unlink('H', 'G'); }); h.push(2, -1);
    const partner = alternative ? 'S' : 'C';
    h.edit(() => { h.link('C', 'S'); h.link('H', partner); if (alternative) h.link('H', partner === 'S' ? 'C' : 'S'); });
    for (let advanced = 0; advanced < 6; advanced += stride) {
      h.push(stride);
      if (advanced + stride < 6) {
        h.edit(() => { h.unlink('H', partner); if (alternative) h.unlink('H', partner === 'S' ? 'C' : 'S'); });
        h.push(stride, -1);
        h.edit(() => { h.link('H', partner); if (alternative) h.link('H', partner === 'S' ? 'C' : 'S'); });
      }
    }
    h.release();
  }
  if (level.exitPoint) h.walk(level.exitPoint);
  return h.session;
}
