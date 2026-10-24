import { cells, matrix, WIDTH, HEIGHT } from './engine';
import type { Game, Kind, GameEvent, Board } from './engine';
export const palette: Record<string, string> = {};
export function initPalette() {
  const style = getComputedStyle(document.documentElement);
  for (const name of ['paper','panel','board','ink','grid','accent','blue','cyan','pink','red','orange','purple','mint','pupil']) palette[name] = style.getPropertyValue(`--color-${name}`).trim();
}
const names: Record<Kind,string> = { I:'cyan',O:'accent',T:'purple',S:'mint',Z:'red',J:'blue',L:'orange' };
export function ghostSprite(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, kind: Kind, alpha = 1) {
  const u = size / 16;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x,y);
  ctx.fillStyle = palette[names[kind]];
  ctx.beginPath();
  const outline = [[1,5],[2,5],[2,3],[4,3],[4,1],[12,1],[12,3],[14,3],[14,5],[15,5],[15,15],[12,15],[12,13],[10,13],[10,15],[6,15],[6,13],[4,13],[4,15],[1,15]];
  outline.forEach(([px,py],i) => i ? ctx.lineTo(px*u,py*u) : ctx.moveTo(px*u,py*u)); ctx.closePath(); ctx.fill();
  ctx.fillStyle = palette.ink;
  ctx.fillRect(4*u,5*u,3*u,5*u); ctx.fillRect(10*u,5*u,3*u,5*u);
  ctx.fillStyle = palette.pupil;
  ctx.fillRect(5*u,7*u,2*u,2*u); ctx.fillRect(11*u,7*u,2*u,2*u);
  ctx.globalAlpha = alpha * .25; ctx.fillStyle = palette.ink; ctx.fillRect(5*u,2*u,6*u,u);
  ctx.restore();
}
export function preview(canvas: HTMLCanvasElement, kind: Kind | null, muted = false) {
  canvas.width = 280; canvas.height = 150;
  const ctx = canvas.getContext('2d')!; ctx.clearRect(0,0,280,150);
  if (!kind) {
    ctx.strokeStyle = palette.grid; ctx.setLineDash([5,6]); ctx.strokeRect(99,37,82,72); ctx.setLineDash([]);
    ctx.fillStyle = palette.grid; ctx.font = '22px sans-serif'; ctx.textAlign='center'; ctx.fillText('+',140,81); return;
  }
  const shape = matrix(kind), all = shape.flatMap((row,y) => row.flatMap((v,x) => v ? [{x,y}] : []));
  const minX = Math.min(...all.map(c=>c.x)), maxX = Math.max(...all.map(c=>c.x));
  const minY = Math.min(...all.map(c=>c.y)), maxY = Math.max(...all.map(c=>c.y));
  const size = 38, ox = (280 - (maxX-minX+1)*size)/2, oy = (150 - (maxY-minY+1)*size)/2;
  for (const c of all) ghostSprite(ctx,ox+(c.x-minX)*size,oy+(c.y-minY)*size,size,kind,muted ? .4 : 1);
}
interface Particle { x:number; y:number; vx:number; vy:number; life:number; max:number; color:string; size:number }
interface Sweep { rows:number[]; age:number }
export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private sweeps: Sweep[] = [];
  private impact = 0;
  private beams: { x:number; top:number; bottom:number; life:number }[] = [];
  private demo: Board;
  effects = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  constructor(canvas: HTMLCanvasElement, private game: Game) {
    canvas.width = 600; canvas.height = 1200; this.ctx = canvas.getContext('2d')!;
    this.demo = Array.from({length:HEIGHT},()=>Array<Kind|null>(WIDTH).fill(null));
    const pattern: (Kind|null)[][] = [
      ['J',null,null,null,null,null,null,null,null,'L'],
      ['J','J',null,null,null,null,null,null,'L','L'],
      ['I','I',null,null,null,null,'T',null,'L','L'],
      ['I','I','Z','Z',null,'T','T','T','O','O'],
      ['S','S','Z',null,null,'I',null,'J','O','O'],
      ['S','L','L','L',null,'I','Z','J','J','J'],
      ['L','L','T','T',null,'I','Z','Z','O','O'],
    ];
    pattern.forEach((r,i)=>this.demo[HEIGHT-pattern.length+i]=r);
  }
  event(e: GameEvent) {
    if (!this.effects) return;
    if (e.type === 'drop') {
      this.impact = 8;
      for (const c of e.cells ?? []) {
        this.beams.push({x:c.x*60,top:Math.max(0,(e.fromY??0)*60),bottom:(c.y+1)*60,life:180});
        this.burst(c.x*60+30,(c.y+1)*60,palette[names[c.kind]],6);
      }
    }
    if (e.type === 'clear' && e.rows?.length) {
      this.sweeps.push({rows:e.rows,age:0}); this.impact = e.count === 4 ? 14 : 6;
      for (const row of e.rows) for (let x=0;x<WIDTH;x++) this.burst(x*60+30,row*60+30,palette[names[this.game.board[row][x] ?? 'O']],9);
    }
  }
  reset() { this.particles=[]; this.sweeps=[]; this.beams=[]; this.impact=0; }
  private burst(x:number,y:number,color:string,n:number) {
    for (let i=0;i<n;i++) { const angle=Math.random()*Math.PI*2,speed=60+Math.random()*200,life=400+Math.random()*450; this.particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-100,life,max:life,color,size:3+Math.random()*8}); }
    if(this.particles.length>900) this.particles.splice(0,this.particles.length-900);
  }
  draw(ms:number,time:number) {
    const ctx=this.ctx, ready=this.game.status==='ready';
    ctx.clearRect(0,0,600,1200); ctx.fillStyle=palette.board; ctx.fillRect(0,0,600,1200);
    ctx.save();
    if(this.impact>0 && this.game.status!=='paused') { ctx.translate((Math.random()-.5)*this.impact,(Math.random()-.5)*this.impact); this.impact*=.83; if(this.impact<.2)this.impact=0; }
    ctx.strokeStyle=palette.grid; ctx.lineWidth=1;
    ctx.beginPath(); for(let x=0;x<=WIDTH;x++){ctx.moveTo(x*60,0);ctx.lineTo(x*60,1200);} for(let y=0;y<=HEIGHT;y++){ctx.moveTo(0,y*60);ctx.lineTo(600,y*60);} ctx.stroke();
    const board=ready?this.demo:this.game.board;
    for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++){
      const kind=board[y][x]; if(!kind)continue;
      const clearing=this.game.clearingRows.includes(y);
      const sweep=this.sweeps.find(s=>s.rows.includes(y));
      if(clearing && sweep && x*60 < sweep.age/520*750)continue;
      ghostSprite(ctx,x*60+1,y*60+1,58,kind,ready?.6:1);
    }
    const active=ready?{kind:'T' as Kind,x:3,y:3,rotation:0}:this.game.active;
    const shadow=ready?{kind:'T' as Kind,x:3,y:10,rotation:0}:this.game.ghost();
    if(shadow){
      ctx.save();ctx.strokeStyle=palette[names[shadow.kind]];ctx.fillStyle=palette[names[shadow.kind]];ctx.setLineDash([7,6]);ctx.lineWidth=2;
      for(const c of cells(shadow)){if(c.y<0)continue;ctx.globalAlpha=.06;ctx.fillRect(c.x*60+4,c.y*60+4,52,52);ctx.globalAlpha=.5;ctx.strokeRect(c.x*60+5,c.y*60+5,50,50);}ctx.restore();
    }
    for(const beam of this.beams){ctx.globalAlpha=beam.life/180*.22;ctx.fillStyle=palette.cyan;ctx.fillRect(beam.x+3,beam.top,54,beam.bottom-beam.top);beam.life-=ms;} ctx.globalAlpha=1;this.beams=this.beams.filter(b=>b.life>0);
    if(active)for(const c of cells(active)){if(c.y>=0)ghostSprite(ctx,c.x*60+1,c.y*60+1,58,c.kind,ready?.85:1);}
    const freeze=this.game.status==='paused';
    for(const sweep of this.sweeps){
      if(!freeze)sweep.age+=ms;
      const px=(sweep.age/520)*750-75;
      for(const row of sweep.rows){
        const cy=row*60+30;
        ctx.save();ctx.fillStyle=palette.accent;ctx.shadowColor=palette.accent;ctx.shadowBlur=20;ctx.globalAlpha=.22;
        ctx.fillRect(0,cy-24,Math.max(0,px),48);ctx.globalAlpha=1;
        for(let x=Math.max(0,px+60);x<600;x+=60)ctx.fillRect(x-4,cy-4,8,8);
        const mouth=.12+Math.abs(Math.sin(time*.024))*.25;
        ctx.beginPath();ctx.moveTo(px,cy);ctx.arc(px,cy,34,mouth*Math.PI,(2-mouth)*Math.PI);ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.fillStyle=palette.board;ctx.fillRect(px-2,cy-20,6,6);ctx.restore();
      }
    }
    this.sweeps=this.sweeps.filter(s=>s.age<650);
    for(const p of this.particles){if(!freeze){p.life-=ms;p.x+=p.vx*ms/1000;p.y+=p.vy*ms/1000;p.vy+=500*ms/1000;}ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size);}ctx.globalAlpha=1;this.particles=this.particles.filter(p=>p.life>0);
    ctx.restore();
  }
}
