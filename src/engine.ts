export const WIDTH = 10;
export const HEIGHT = 20;
export const TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'] as const;
export type Kind = typeof TYPES[number];
export type Board = (Kind | null)[][];
export type Status = 'ready' | 'playing' | 'paused' | 'clearing' | 'gameover';
export interface Piece { kind: Kind; x: number; y: number; rotation: number }
export interface GameEvent { type: 'move' | 'rotate' | 'hold' | 'drop' | 'lock' | 'clear' | 'level' | 'gameover'; cells?: { x: number; y: number; kind: Kind }[]; rows?: number[]; count?: number; label?: string; points?: number; combo?: number; fromY?: number; toY?: number }
const SHAPES: Record<Kind, number[][]> = {
  I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  O: [[1,1],[1,1]], T: [[0,1,0],[1,1,1],[0,0,0]],
  S: [[0,1,1],[1,1,0],[0,0,0]], Z: [[1,1,0],[0,1,1],[0,0,0]],
  J: [[1,0,0],[1,1,1],[0,0,0]], L: [[0,0,1],[1,1,1],[0,0,0]],
};
// SRS kick tables use positive Y upward; converted to board coordinates in rotate().
const JLSTZ: Record<string, number[][]> = {
  '0>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  '1>0': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  '1>2': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  '2>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  '2>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  '3>2': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  '3>0': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  '0>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
};
const I_KICKS: Record<string, number[][]> = {
  '0>1': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  '1>0': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  '1>2': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
  '2>1': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
  '2>3': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  '3>2': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  '3>0': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
  '0>3': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
};
export function matrix(kind: Kind, rotation = 0): number[][] {
  let m = SHAPES[kind].map(row => [...row]);
  for (let i = 0; i < rotation; i++) m = m[0].map((_, x) => m.map(row => row[x]).reverse());
  return m;
}
export function cells(piece: Piece) {
  return matrix(piece.kind, piece.rotation).flatMap((row, y) => row.flatMap((v, x) => v ? [{ x: x + piece.x, y: y + piece.y, kind: piece.kind }] : []));
}
export const emptyBoard = (): Board => Array.from({ length: HEIGHT }, () => Array<Kind | null>(WIDTH).fill(null));

export class Game {
  board = emptyBoard();
  status: Status = 'ready';
  active: Piece | null = null;
  queue: Kind[] = [];
  held: Kind | null = null;
  holdUsed = false;
  score = 0;
  lines = 0;
  level = 1;
  combo = -1;
  backToBack = false;
  elapsed = 0;
  clearingRows: number[] = [];
  events: GameEvent[] = [];
  private gravity = 0;
  private lockTimer = 0;
  private lockResets = 0;
  private clearTimer = 0;
  private rotated = false;
  private kick = 0;
  private pausedFrom: 'playing' | 'clearing' = 'playing';
  constructor(private random = Math.random) { this.fillQueue(); }
  get dropInterval() { const level = Math.min(this.level, 20); return Math.max(65, 1000 * Math.pow(0.8 - (level - 1) * 0.007, level - 1)); }
  fillQueue() {
    while (this.queue.length < 7) {
      const bag = [...TYPES];
      for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(this.random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
      this.queue.push(...bag);
    }
  }
  start() {
    this.board = emptyBoard(); this.queue = []; this.fillQueue(); this.held = null;
    this.score = 0; this.lines = 0; this.level = 1; this.combo = -1; this.backToBack = false;
    this.elapsed = 0; this.events = []; this.clearingRows = []; this.holdUsed = false;
    this.status = 'playing'; this.spawn();
  }
  spawn(kind?: Kind) {
    this.active = { kind: kind ?? this.queue.shift()!, x: kind === 'O' ? 4 : 3, y: -1, rotation: 0 };
    if (this.active.kind === 'O') this.active.x = 4;
    this.fillQueue(); this.gravity = 0; this.lockTimer = 0; this.lockResets = 0; this.rotated = false;
    if (!this.fits(this.active)) this.end();
  }
  fits(piece: Piece) {
    return cells(piece).every(({ x, y }) => x >= 0 && x < WIDTH && y < HEIGHT && y >= -4 && (y < 0 || !this.board[y][x]));
  }
  ghost(): Piece | null {
    if (!this.active) return null;
    const p = { ...this.active };
    while (this.fits({ ...p, y: p.y + 1 })) p.y++;
    return p;
  }
  grounded() { return !!this.active && !this.fits({ ...this.active, y: this.active.y + 1 }); }
  move(dx: number, dy = 0, soft = false) {
    if (this.status !== 'playing' || !this.active) return false;
    const p = { ...this.active, x: this.active.x + dx, y: this.active.y + dy };
    if (!this.fits(p)) return false;
    const grounded = this.grounded(); this.active = p; this.rotated = false;
    if (grounded && this.lockResets < 15 && dx) { this.lockTimer = 0; this.lockResets++; }
    if (soft && dy > 0) this.score += dy;
    if (dx) this.events.push({ type: 'move' });
    return true;
  }
  rotate(direction = 1) {
    if (this.status !== 'playing' || !this.active || this.active.kind === 'O') return false;
    const from = this.active.rotation, to = (from + direction + 4) % 4;
    const kicks = (this.active.kind === 'I' ? I_KICKS : JLSTZ)[`${from}>${to}`];
    for (let i = 0; i < kicks.length; i++) {
      const [dx, dy] = kicks[i];
      const p = { ...this.active, x: this.active.x + dx, y: this.active.y - dy, rotation: to };
      if (!this.fits(p)) continue;
      const grounded = this.grounded(); this.active = p; this.rotated = true; this.kick = i;
      if (grounded && this.lockResets < 15) { this.lockTimer = 0; this.lockResets++; }
      this.events.push({ type: 'rotate' }); return true;
    }
    return false;
  }
  hold() {
    if (this.status !== 'playing' || !this.active || this.holdUsed) return false;
    const current = this.active.kind, held = this.held;
    this.held = current; this.holdUsed = true; this.spawn(held ?? undefined);
    this.events.push({ type: 'hold' }); return true;
  }
  hardDrop() {
    if (this.status !== 'playing' || !this.active) return;
    const ghost = this.ghost()!, fromY = this.active.y, distance = ghost.y - fromY;
    this.score += distance * 2; this.active = ghost;
    if (distance > 0) this.rotated = false;
    this.events.push({ type: 'drop', cells: cells(ghost), fromY, toY: ghost.y }); this.lock();
  }
  private spin(): 'full' | 'mini' | null {
    if (this.active?.kind !== 'T' || !this.rotated) return null;
    const { x, y, rotation } = this.active;
    const blocked = [[x,y],[x+2,y],[x,y+2],[x+2,y+2]].map(([cx,cy]) => cx < 0 || cx >= WIDTH || cy >= HEIGHT || (cy >= 0 && !!this.board[cy][cx]));
    if (blocked.filter(Boolean).length < 3) return null;
    const front = [[0,1],[1,3],[2,3],[0,2]][rotation];
    return front.every(i => blocked[i]) || this.kick === 4 ? 'full' : 'mini';
  }
  lock() {
    if (!this.active || this.status !== 'playing') return;
    const spin = this.spin(), placed = cells(this.active);
    for (const { x, y, kind } of placed) if (y >= 0) this.board[y][x] = kind;
    this.events.push({ type: 'lock', cells: placed });
    this.active = null; this.holdUsed = false;
    if (placed.some(c => c.y < 0)) { this.end(); return; }
    const rows = this.board.flatMap((row, y) => row.every(Boolean) ? [y] : []);
    const count = rows.length;
    if (!count) {
      this.combo = -1;
      if (spin) { const points = (spin === 'full' ? 400 : 100) * this.level; this.score += points; this.events.push({ type: 'clear', rows: [], count: 0, label: spin === 'full' ? 'T-SPIN' : 'T-SPIN MINI', points }); }
      this.spawn(); return;
    }
    this.combo++;
    const difficult = count === 4 || !!spin;
    let base = spin === 'full' ? [400,800,1200,1600][count] : spin === 'mini' ? [100,200,400][count] : [0,100,300,500,800][count];
    if (difficult && this.backToBack) base *= 1.5;
    let points = (base + Math.max(0, this.combo) * 50) * this.level;
    const perfect = this.board.every((row, y) => rows.includes(y) || row.every(v => !v));
    if (perfect) points += 3500 * this.level;
    const label = perfect ? 'ALL CLEAR!' : spin ? `T-SPIN${spin === 'mini' ? ' MINI' : ''}` : ['','SINGLE!','DOUBLE!','TRIPLE!','TETRIS!'][count];
    this.score += points; this.lines += count; this.backToBack = difficult;
    const nextLevel = Math.floor(this.lines / 10) + 1;
    if (nextLevel !== this.level) { this.level = nextLevel; this.events.push({ type: 'level' }); }
    this.clearingRows = rows; this.clearTimer = 0; this.status = 'clearing';
    this.events.push({ type: 'clear', rows, count, label, points, combo: this.combo });
  }
  togglePause() {
    if (this.status === 'paused') this.status = this.pausedFrom;
    else if (this.status === 'playing' || this.status === 'clearing') { this.pausedFrom = this.status; this.status = 'paused'; }
  }
  tick(ms: number) {
    if (this.status !== 'playing' && this.status !== 'clearing') return;
    ms = Math.min(ms, 100); this.elapsed += ms;
    if (this.status === 'clearing') {
      this.clearTimer += ms;
      if (this.clearTimer >= 520) {
        this.board = [...Array.from({ length: this.clearingRows.length }, () => Array<Kind | null>(WIDTH).fill(null)), ...this.board.filter((_, y) => !this.clearingRows.includes(y))];
        this.clearingRows = []; this.status = 'playing'; this.spawn();
      }
      return;
    }
    this.gravity += ms;
    while (this.gravity >= this.dropInterval) { this.gravity -= this.dropInterval; if (!this.move(0, 1)) break; }
    if (this.grounded()) { this.lockTimer += ms; if (this.lockTimer >= 500) this.lock(); }
    else this.lockTimer = 0;
  }
  private end() { this.status = 'gameover'; this.active = null; this.events.push({ type: 'gameover' }); }
}
