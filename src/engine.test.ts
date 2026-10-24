import { describe, expect, it } from 'vitest';
import { Game, cells, emptyBoard, matrix, TYPES } from './engine';
import type { Kind } from './engine';
const advance = (g:Game, ms:number) => { for(let n=0;n<ms;n+=10)g.tick(10); };
const started = () => { const g=new Game(()=>.42);g.start();g.events=[];return g; };
function prepareClear(count:number) {
  const g=started();g.board=emptyBoard();
  g.board[10][0]='T'; // Prevent the independent all-clear bonus.
  for(let y=20-count;y<20;y++)g.board[y]=Array.from({length:10},(_,x)=>x===4?null:'J');
  g.active={kind:'I',x:2,y:16,rotation:1};return g;
}

describe('tetrominoes and randomizer',()=>{
  it('every rotation contains exactly four cells and returns to its original shape',()=>{
    for(const kind of TYPES){for(let r=0;r<4;r++)expect(cells({kind,x:0,y:0,rotation:r})).toHaveLength(4);expect(matrix(kind,4)).toEqual(matrix(kind));}
  });
  it('each consecutive bag contains all seven pieces',()=>{
    const g=new Game();const pieces:Kind[]=[];
    for(let i=0;i<70;i++){pieces.push(g.queue.shift()!);g.fillQueue();}
    for(let i=0;i<70;i+=7)expect(new Set(pieces.slice(i,i+7)).size).toBe(7);
  });
});
describe('movement, SRS, and locking',()=>{
  it('rejects side and floor collisions without overwriting the piece',()=>{
    const g=started();g.active={kind:'O',x:0,y:18,rotation:0};expect(g.move(-1)).toBe(false);expect(g.move(0,1)).toBe(false);expect(g.active.x).toBe(0);
  });
  it('kicks a T piece out of the left wall',()=>{
    const g=started();g.active={kind:'T',x:-1,y:5,rotation:1};expect(g.fits(g.active)).toBe(true);expect(g.rotate()).toBe(true);expect(g.active?.rotation).toBe(2);expect(g.active?.x).toBe(0);
  });
  it('uses the separate I-piece kick table',()=>{
    const g=started();g.active={kind:'I',x:-2,y:5,rotation:1};expect(g.rotate(-1)).toBe(true);expect(g.active?.rotation).toBe(0);expect(g.active?.x).toBe(0);
  });
  it('ghost follows the nearest obstacle and hard drop locks immediately',()=>{
    const g=started();g.active={kind:'O',x:4,y:0,rotation:0};g.board[15][4]='T';expect(g.ghost()?.y).toBe(13);g.hardDrop();expect(g.board[13][4]).toBe('O');expect(g.score).toBe(26);expect(g.active).not.toBeNull();
  });
  it('soft drop adds one point per row',()=>{
    const g=started();expect(g.move(0,1,true)).toBe(true);expect(g.score).toBe(1);
  });
  it('allows 500ms to adjust a grounded piece before locking',()=>{
    const g=started();g.active={kind:'O',x:4,y:18,rotation:0};advance(g,490);expect(g.board[19][4]).toBeNull();advance(g,10);expect(g.board[19][4]).toBe('O');
  });
  it('caps grounded movement lock resets at fifteen',()=>{
    const g=started();g.active={kind:'O',x:4,y:18,rotation:0};
    for(let i=0;i<20;i++){g.move(i%2?1:-1);advance(g,20);}
    advance(g,500);expect(g.board[19].filter(Boolean)).toHaveLength(2);
  });
});
describe('hold and state transitions',()=>{
  it('permits one hold per placed piece and swaps without consuming a queue item',()=>{
    const g=started(),first=g.active!.kind,next=g.queue[0];expect(g.hold()).toBe(true);expect(g.held).toBe(first);expect(g.active!.kind).toBe(next);expect(g.hold()).toBe(false);
    g.hardDrop();const queue=[...g.queue];const current=g.active!.kind;expect(g.hold()).toBe(true);expect(g.active!.kind).toBe(first);expect(g.held).toBe(current);expect(g.queue).toEqual(queue);
  });
  it('freezes movement, gravity and time while paused',()=>{
    const g=started(),p={...g.active!};g.togglePause();advance(g,5000);expect(g.active).toEqual(p);expect(g.elapsed).toBe(0);expect(g.move(1)).toBe(false);g.togglePause();expect(g.status).toBe('playing');
  });
  it('ends the game when the spawn area is obstructed',()=>{
    const g=started();g.board[0].fill('O');g.spawn('T');expect(g.status).toBe('gameover');expect(g.active).toBeNull();
  });
  it('ends when a locked piece extends above the playfield',()=>{
    const g=started();g.active={kind:'O',x:4,y:-1,rotation:0};g.lock();expect(g.status).toBe('gameover');
  });
  it('restart clears score, board, hold and elapsed time',()=>{
    const g=started();g.hold();g.hardDrop();advance(g,1000);g.start();expect(g.board.flat().every(v=>!v)).toBe(true);expect(g.score).toBe(0);expect(g.held).toBeNull();expect(g.elapsed).toBe(0);expect(g.holdUsed).toBe(false);
  });
});
describe('line clearing and scoring',()=>{
  it.each([[1,100],[2,300],[3,500],[4,800]])('scores %i complete rows and preserves the others', (count,score)=>{
    const g=prepareClear(count);g.lock();expect(g.status).toBe('clearing');expect(g.lines).toBe(count);expect(g.score).toBe(score);
    advance(g,510);expect(g.status).toBe('clearing');advance(g,10);expect(g.status).toBe('playing');expect(g.board).toHaveLength(20);expect(g.board[10+count][0]).toBe('T');expect(g.board.some(row=>row.every(Boolean))).toBe(false);
  });
  it('can pause and resume a line-clear animation without advancing it',()=>{
    const g=prepareClear(1);g.lock();advance(g,200);g.togglePause();advance(g,1000);expect(g.status).toBe('paused');g.togglePause();expect(g.status).toBe('clearing');advance(g,320);expect(g.status).toBe('playing');
  });
  it('awards a consecutive clear combo and resets it after a non-clear',()=>{
    const g=prepareClear(1);g.lock();advance(g,520);
    g.board[19]=Array.from({length:10},(_,x)=>x===4?null:'J');g.active={kind:'I',x:2,y:16,rotation:1};g.lock();expect(g.combo).toBe(1);expect(g.score).toBe(250);advance(g,520);g.hardDrop();expect(g.combo).toBe(-1);
  });
  it('awards back-to-back tetrises',()=>{
    const g=prepareClear(4);g.lock();advance(g,520);
    for(let y=16;y<20;y++)g.board[y]=Array.from({length:10},(_,x)=>x===4?null:'J');
    g.active={kind:'I',x:2,y:16,rotation:1};g.lock();expect(g.score).toBe(800+1200+50);
  });
  it('awards an all-clear bonus',()=>{
    const g=prepareClear(4);g.board[10][0]=null;g.lock();expect(g.score).toBe(4300);expect(g.events.find(e=>e.type==='clear')?.label).toBe('ALL CLEAR!');
  });
  it('increases speed every ten cleared rows and applies the old level to that clear',()=>{
    const g=prepareClear(1),speed=g.dropInterval;g.lines=9;g.lock();expect(g.lines).toBe(10);expect(g.level).toBe(2);expect(g.score).toBe(100);expect(g.dropInterval).toBeLessThan(speed);
  });
  it('recognizes a three-corner T-spin after a successful rotation',()=>{
    const g=started();g.board=emptyBoard();g.active={kind:'T',x:3,y:17,rotation:3};
    g.board[17][3]='J';g.board[17][5]='J';g.board[19][3]='J';
    expect(g.rotate()).toBe(true);g.lock();expect(g.score).toBe(400);expect(g.events.some(e=>e.label==='T-SPIN')).toBe(true);
  });
});
