import '@fontsource/press-start-2p/latin-400.css';
import '@fontsource/space-grotesk/latin-400.css';
import '@fontsource/space-grotesk/latin-500.css';
import '@fontsource/space-grotesk/latin-700.css';
import './style.css';
import { createIcons, Volume2, VolumeX, Maximize, CircleHelp, Pause, Play, Trophy, ArrowLeft, ArrowRight, ArrowDown, ChevronsDown, RotateCw, RotateCcw, Keyboard, Sparkles, Zap, ShieldCheck, MonitorSmartphone, X, ChevronRight, Ghost, Music2 } from 'lucide';
import { Game } from './engine';
import { initPalette, preview, Renderer } from './renderer';
import { ArcadeAudio } from './audio';

const icon = (name: string) => `<i data-lucide="${name}"></i>`;
const key = (text: string) => `<kbd class="kbd kbd-sm">${text}</kbd>`;
const dots = Array.from({length:13},()=>'<span class="dot"></span>').join('');
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<header class="app-header">
  <div class="brand"><span class="pacman" aria-hidden="true"></span><div><div class="brand-name pixel">TETRIS <span>MAN</span></div><div class="brand-sub">A GHOST BLOCK ARCADE</div></div></div>
  <div class="header-right"><span class="arcade-status"><i class="status-dot"></i> ARCADE IS OPEN</span><div class="header-actions">
    <button class="btn icon-btn" id="sound-btn" aria-label="사운드 끄기" aria-pressed="true" title="사운드 켜기 / 끄기">${icon('volume-2')}</button>
    <button class="btn icon-btn" id="fullscreen-btn" aria-label="전체 화면" title="전체 화면">${icon('maximize')}</button>
    <button class="btn icon-btn" id="help-btn" aria-label="게임 방법" title="게임 방법">${icon('circle-help')}</button>
  </div></div>
</header>
<main>
  <section class="game-heading" aria-labelledby="game-title"><div class="game-kicker pixel">CLASSIC GAME. NEW GHOSTS.</div><h1 id="game-title">고스트를 쌓고, <span>한 줄에 싹.</span></h1><p>익숙한 테트리스에 팩맨의 짜릿함을 더하다. 테트리스 맨.</p></section>
  <section class="game-layout" aria-label="테트리스 맨 게임">
    <aside class="side side-left" aria-label="점수와 홀드">
      <div class="panel score-panel"><h2 class="panel-label pixel">SCORE ${icon('sparkles')}</h2><div id="score" class="score pixel">000000</div><div class="best-score"><span>${icon('trophy')} 최고 기록</span><b id="best" class="pixel">000000</b></div></div>
      <div class="stats-pair"><div class="panel"><h2 class="panel-label pixel">LEVEL</h2><div class="stat-number pixel" id="level">01</div><div class="level-progress"><div id="level-progress"></div></div></div><div class="panel"><h2 class="panel-label pixel">LINES</h2><div class="stat-number pixel" id="lines">000</div><div class="level-progress"><div id="lines-progress"></div></div></div></div>
      <button class="panel hold-panel" id="hold-btn" aria-label="블록 홀드, C 키"><span class="panel-label pixel">HOLD <span class="keyboard-hint">C / Shift</span></span><canvas id="hold" class="preview-canvas" aria-label="보관한 블록 없음"></canvas><p class="hold-note">다음 기회를 위한 한 수</p></button>
      <div class="mini-tip"><div class="tip-title">${icon('zap')} 한 번에 4줄, TETRIS!</div><p>빈틈없이 채우면 고스트가 팡!<br>연속으로 지우면 콤보 보너스.</p></div>
    </aside>
    <div class="board-column"><div class="board-topbar"><span class="board-mode pixel"><i></i> MARATHON</span><div class="board-top-actions"><span class="game-clock" id="clock">00:00</span><button class="btn pause-btn" id="pause-btn" aria-label="일시정지" title="일시정지 (P / Esc)" disabled>${icon('pause')}</button></div></div>
      <div class="board-frame" id="board-frame"><div class="board-stage"><canvas id="board" tabindex="0" aria-label="10칸 너비, 20칸 높이의 테트리스 게임판. 방향키로 이동하고 위쪽 키로 회전, 스페이스로 즉시 떨어뜨립니다."></canvas>
        <div class="game-overlay" id="overlay"><div class="overlay-sprites" aria-hidden="true"><span class="pacman"></span><span class="dot"></span><span class="dot"></span><span class="ghost-icon"></span><span class="ghost-icon" style="--ghost-color:var(--color-cyan)"></span><span class="ghost-icon" style="--ghost-color:var(--color-pink)"></span></div><h2 class="overlay-title pixel" id="overlay-title">READY<br>PLAYER ONE?</h2><p class="overlay-sub" id="overlay-sub">고스트와 함께, 새로운 하이 스코어!</p><button class="btn start-btn" id="start-btn">${icon('play')} <span>게임 시작</span></button><span class="enter-hint">또는 ${key('Enter')} 키를 눌러 시작</span></div>
        <div class="clear-notice" id="clear-notice" aria-hidden="true"></div>
      </div><div class="board-bottom" aria-hidden="true"><span class="pacman"></span>${dots}<span class="ghost-icon small-ghost" style="--ghost-color:var(--color-cyan)"></span><span class="ghost-icon small-ghost" style="--ghost-color:var(--color-pink)"></span></div></div>
      <p class="board-caption" id="board-caption">당신의 다음 한 수를 기다리는 중</p>
    </div>
    <aside class="side side-right" aria-label="다음 블록과 조작법"><div class="panel next-panel"><h2 class="panel-label pixel">NEXT <span>UP NEXT</span></h2><div class="next-list">${Array.from({length:5},(_,i)=>`<div class="next-piece"><span class="pixel">${i+1}</span><canvas id="next-${i}" aria-label="다음 ${i+1}번째 블록"></canvas></div>`).join('')}</div></div>
      <button class="panel hold-panel mobile-hold" id="mobile-hold-btn" aria-label="블록 홀드"><span class="panel-label pixel">HOLD</span><canvas id="mobile-hold" class="preview-canvas" aria-label="보관한 블록 없음"></canvas><p class="hold-note">터치해 보관</p></button>
      <div class="panel controls-panel"><h2 class="controls-title">${icon('keyboard')} 플레이 가이드</h2><div class="key-row"><span>좌우 이동</span><div>${key(icon('arrow-left'))}${key(icon('arrow-right'))}</div></div><div class="key-row"><span>회전</span><div>${key('↑')}${key('X')}</div></div><div class="key-row"><span>반대 회전</span><div>${key('Z')}</div></div><div class="key-row"><span>빠르게 내리기</span><div>${key('↓')}</div></div><div class="key-row"><span>즉시 떨어뜨리기</span><div>${key('Space')}</div></div><div class="controls-divider"></div><div class="key-row"><span>블록 홀드</span><div>${key('C')}</div></div><div class="key-row"><span>일시정지</span><div>${key('P')}</div></div><div class="controls-divider"></div><div class="sound-tip">${icon('music-2')}<span>사운드를 켜고<br>아케이드에 빠져보세요.</span></div></div>
    </aside>
  </section>
  <div class="touch-controls" aria-label="터치 게임 조작"><button class="btn" data-action="left" aria-label="왼쪽 이동">${icon('arrow-left')}<span>왼쪽</span></button><button class="btn" data-action="right" aria-label="오른쪽 이동">${icon('arrow-right')}<span>오른쪽</span></button><button class="btn" data-action="rotate" aria-label="시계 방향 회전">${icon('rotate-cw')}<span>회전</span></button><button class="btn" data-action="down" aria-label="빠르게 내리기">${icon('arrow-down')}<span>내리기</span></button><button class="btn drop-touch" data-action="drop" aria-label="즉시 떨어뜨리기">${icon('chevrons-down')}<span>즉시 낙하</span></button></div>
  <div class="under-game"><span>${icon('ghost')} 7가지 고스트 블록</span><span>${icon('shield-check')} 클래식 테트리스 규칙</span><span>${icon('monitor-smartphone')} 키보드 & 터치 지원</span></div>
</main>
<footer class="site-footer"><span class="footer-mark pixel">TETRIS MAN <span style="color:var(--color-accent)">© 2026</span></span><span>쌓는 재미, 터뜨리는 쾌감. &nbsp; MADE FOR PLAY.</span></footer>
<dialog class="help-dialog" id="help-dialog" aria-labelledby="help-title"><div class="dialog-head"><h2 id="help-title">테트리스 맨 플레이 가이드</h2><button class="btn icon-btn" id="close-help" aria-label="가이드 닫기">${icon('x')}</button></div><p>10 × 20 보드에 고스트 블록을 쌓아 가로 한 줄을 채워보세요. 완성된 줄은 팩맨이 먹어치웁니다!</p><ul><li>방향키 ← → 이동 · ↑ 또는 X 회전 · Z 반대 회전</li><li>↓ 빠르게 내리기 · Space 즉시 떨어뜨리기</li><li>C 또는 Shift로 홀드. 블록을 놓을 때마다 한 번 사용할 수 있어요.</li><li>P 또는 Esc로 일시정지. 다른 창으로 이동하면 자동 정지됩니다.</li><li>모바일은 아래 조작 버튼을 사용하세요. 게임판을 좌우로 밀면 이동, 짧게 터치하면 회전합니다.</li></ul><h3>한 줄보다 짜릿한 네 줄</h3><div class="score-table"><span>싱글 / 더블 / 트리플 / 테트리스</span><b>100 / 300 / 500 / 800</b><span>T-Spin 1 / 2 / 3줄</span><b>800 / 1,200 / 1,600</b><span>연속 콤보</span><b>50 × 콤보</b><span>고난도 연속 성공 (B2B)</span><b>기본 점수 × 1.5</b><span>전체 보드 비우기</span><b>+3,500</b></div><p>줄 삭제 점수는 현재 레벨을 곱해 계산합니다. 10줄마다 레벨이 올라가고 블록이 더 빠르게 떨어집니다. 보드 위에 블록이 쌓이면 게임이 끝나요.</p><div class="effects-row"><span>파편 · 화면 흔들림 이펙트</span><button id="effects-btn" aria-pressed="true">켜짐</button></div></dialog>
<div class="sr-only" id="announcement" aria-live="polite" aria-atomic="true"></div>`;

const $ = <T extends HTMLElement = HTMLElement>(id:string) => document.getElementById(id) as T;
const icons = { Volume2,VolumeX,Maximize,CircleHelp,Pause,Play,Trophy,ArrowLeft,ArrowRight,ArrowDown,ChevronsDown,RotateCw,RotateCcw,Keyboard,Sparkles,Zap,ShieldCheck,MonitorSmartphone,X,ChevronRight,Ghost,Music2 };
function refreshIcons(){createIcons({icons});}
refreshIcons(); initPalette();
const game = new Game();
const renderer = new Renderer($<HTMLCanvasElement>('board'), game);
const audio = new ArcadeAudio();
function stored(key:string, fallback:string) { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } }
function save(key:string,value:string){try{localStorage.setItem(key,value);}catch{/* Gameplay remains available without browser storage. */}}
let best = Number(stored('tetris-man-best','0')) || 0;
audio.enabled = stored('tetris-man-sound','true') === 'true';
renderer.effects = stored('tetris-man-effects',String(renderer.effects)) === 'true';
let lastStatus = '', lastQueue = '', lastHeld = '', lastScore = -1, lastLevel = -1, lastLines = -1;
let lastClock = '', lastBest = -1;
let keys = new Map<string,{at:number;next:number}>();
let pointerAction: { action:string; at:number; next:number; id:number } | null = null;
let noticeTimeout: ReturnType<typeof setTimeout> | undefined;
const format = (n:number,digits=6) => String(n).padStart(digits,'0');
function announce(text:string){$('announcement').textContent=text;}
function soundUI(){ $('sound-btn').innerHTML=icon(audio.enabled?'volume-2':'volume-x');$('sound-btn').setAttribute('aria-pressed',String(audio.enabled));$('sound-btn').setAttribute('aria-label',audio.enabled?'사운드 끄기':'사운드 켜기');refreshIcons(); }
function effectsUI(){ $('effects-btn').textContent=renderer.effects?'켜짐':'꺼짐';$('effects-btn').setAttribute('aria-pressed',String(renderer.effects)); }
soundUI(); effectsUI();
function clearInputs(){keys.clear();pointerAction=null;}
function invalidatePreviews(){lastQueue='';lastHeld='';}
// Repaint static canvases after initial layout, font loading, and viewport changes.
window.addEventListener('resize',invalidatePreviews);
void document.fonts.ready.then(invalidatePreviews);
function start(){
  audio.unlock();renderer.reset();game.start();clearInputs();audio.play('start');lastQueue='';lastHeld='';
  $('clear-notice').classList.remove('show');if(noticeTimeout)clearTimeout(noticeTimeout);
  $('board').focus({preventScroll:true});announce('게임 시작. 레벨 1.');sync();
}
function pause(){ game.togglePause();clearInputs();sync(); }
function action(name:string){
  if(game.status!=='playing')return;
  if(name==='left')game.move(-1);if(name==='right')game.move(1);if(name==='down')game.move(0,1,true);
  if(name==='rotate')game.rotate(1);if(name==='counter')game.rotate(-1);if(name==='drop')game.hardDrop();if(name==='hold')game.hold();
}
function sync(){
  if(game.score!==lastScore){$('score').textContent=format(game.score);lastScore=game.score;if(game.score>best){best=game.score;save('tetris-man-best',String(best));}}
  if(best!==lastBest){$('best').textContent=format(best);lastBest=best;}
  if(game.level!==lastLevel){$('level').textContent=format(game.level,2);lastLevel=game.level;}
  if(game.lines!==lastLines){$('lines').textContent=format(game.lines,3);$('level-progress').style.width=`${(game.lines%10)*10}%`;$('lines-progress').style.width=`${(game.lines%10)*10}%`;lastLines=game.lines;}
  const sec=Math.floor(game.elapsed/1000),clock=`${format(Math.floor(sec/60),2)}:${format(sec%60,2)}`;
  if(clock!==lastClock){$('clock').textContent=clock;lastClock=clock;}
  const q=game.queue.slice(0,5).join('');
  if(q!==lastQueue){game.queue.slice(0,5).forEach((kind,i)=>{const c=$<HTMLCanvasElement>(`next-${i}`);preview(c,kind);c.setAttribute('aria-label',`다음 ${i+1}번째 블록 ${kind}`);});lastQueue=q;}
  const held=`${game.held}-${game.holdUsed}`;
  if(held!==lastHeld){for(const id of ['hold','mobile-hold']){const c=$<HTMLCanvasElement>(id);preview(c,game.held,game.holdUsed);c.setAttribute('aria-label',game.held?`보관한 블록 ${game.held}`:'보관한 블록 없음');}for(const id of ['hold-btn','mobile-hold-btn']){$(id).setAttribute('aria-disabled',String(game.holdUsed));}lastHeld=held;}
  if(game.status!==lastStatus){
    const status=game.status; const overlay=$('overlay');
    document.body.classList.toggle('in-game',status!=='ready');
    overlay.hidden=status==='playing'||status==='clearing';
    $<HTMLButtonElement>('pause-btn').disabled=status==='ready'||status==='gameover';
    $('pause-btn').innerHTML=icon(status==='paused'?'play':'pause');$('pause-btn').setAttribute('aria-label',status==='paused'?'게임 계속하기':'일시정지');
    const config = status==='paused'?['PAUSED','잠깐 쉬어가도 괜찮아요.','계속하기']:status==='gameover'?['GAME<br>OVER',`${game.lines}줄 클리어 · ${game.score.toLocaleString('ko-KR')}점`,'다시 도전']:['READY<br>PLAYER ONE?','고스트와 함께, 새로운 하이 스코어!','게임 시작'];
    $('overlay-title').innerHTML=config[0];$('overlay-sub').textContent=config[1];$('start-btn').innerHTML=`${icon('play')}<span>${config[2]}</span>`;
    $('board-caption').textContent=status==='ready'?'당신의 다음 한 수를 기다리는 중':status==='paused'?'준비되면, 다시 한 판의 흐름으로':status==='gameover'?'한 번 더? 다음 기록은 더 높이!':'빈틈을 채우고, 고스트를 터뜨려보세요';
    if(status==='paused'){announce('일시정지');$('start-btn').focus({preventScroll:true});}
    if(status==='gameover'){announce(`게임 종료. 점수 ${game.score}점, ${game.lines}줄 클리어.`);$('start-btn').focus({preventScroll:true});}
    lastStatus=status; refreshIcons();
  }
}
$('start-btn').addEventListener('click',()=>{if(game.status==='paused'){audio.unlock();pause();$('board').focus({preventScroll:true});}else start();});
$('pause-btn').addEventListener('click',()=>{pause();if(game.status==='playing'||game.status==='clearing')$('board').focus({preventScroll:true});});
for(const id of ['hold-btn','mobile-hold-btn'])$(id).addEventListener('click',()=>{audio.unlock();action('hold');});
$('sound-btn').addEventListener('click',()=>{audio.unlock();audio.enabled=!audio.enabled;save('tetris-man-sound',String(audio.enabled));soundUI();if(audio.enabled)audio.tone(660);});
$('effects-btn').addEventListener('click',()=>{renderer.effects=!renderer.effects;save('tetris-man-effects',String(renderer.effects));if(!renderer.effects)renderer.reset();effectsUI();});
$('fullscreen-btn').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{announce('이 브라우저에서는 전체 화면을 지원하지 않습니다.');}});
const dialog=$<HTMLDialogElement>('help-dialog');
$('help-btn').addEventListener('click',()=>{if(game.status==='playing'||game.status==='clearing')pause();dialog.showModal();});
$('close-help').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
const mapping:Record<string,string>={ArrowLeft:'left',ArrowRight:'right',ArrowDown:'down',ArrowUp:'rotate',KeyX:'rotate',KeyZ:'counter',Space:'drop',KeyC:'hold',ShiftLeft:'hold',ShiftRight:'hold'};
window.addEventListener('keydown',e=>{
  if(dialog.open)return;
  if(e.code==='Escape'||e.code==='KeyP'){e.preventDefault();if(!e.repeat)pause();return;}
  if(e.code==='Enter'&&(game.status==='ready'||game.status==='gameover')){e.preventDefault();if(!e.repeat)start();return;}
  if(e.code==='Enter'&&game.status==='paused'){e.preventDefault();if(!e.repeat){pause();$('board').focus({preventScroll:true});}return;}
  const a=mapping[e.code];if(!a)return;
  if((e.target as HTMLElement).closest('button')&&e.code==='Space')return;
  e.preventDefault();if(e.repeat||keys.has(e.code))return;
  audio.unlock();action(a);const now=performance.now();keys.set(e.code,{at:now,next:now+(a==='down'?40:150)});
});
window.addEventListener('keyup',e=>{keys.delete(e.code);});
window.addEventListener('blur',()=>{clearInputs();if(game.status==='playing'||game.status==='clearing')pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInputs();if(game.status==='playing'||game.status==='clearing')pause();}});
for(const button of document.querySelectorAll<HTMLButtonElement>('[data-action]')){
  button.addEventListener('pointerdown',e=>{e.preventDefault();audio.unlock();button.setPointerCapture(e.pointerId);const a=button.dataset.action!;action(a);const now=performance.now();pointerAction={action:a,at:now,next:now+(a==='down'?40:150),id:e.pointerId};});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,()=>{pointerAction=null;});
}
let swipe:{x:number;y:number;lastX:number}|null=null;
$('board').addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')return;const p=e as PointerEvent;swipe={x:p.clientX,y:p.clientY,lastX:p.clientX};$('board').setPointerCapture(p.pointerId);});
$('board').style.touchAction='none';
$('board').addEventListener('pointermove',e=>{if(!swipe)return;const p=e as PointerEvent;const cell=$('board').clientWidth/10;const delta=p.clientX-swipe.lastX;if(Math.abs(delta)>=cell){action(delta>0?'right':'left');swipe.lastX=p.clientX;}});
$('board').addEventListener('pointerup',e=>{if(!swipe)return;const p=e as PointerEvent;const dx=p.clientX-swipe.x,dy=p.clientY-swipe.y;if(dy>65&&Math.abs(dx)<45)action('drop');else if(Math.abs(dx)<12&&Math.abs(dy)<12)action('rotate');swipe=null;});
$('board').addEventListener('pointercancel',()=>{swipe=null;});
let last=performance.now();
function frame(now:number){
  const ms=Math.min(100,now-last);last=now;
  if(game.status==='playing'){
    for(const [code,k]of keys){const a=mapping[code];if(['left','right','down'].includes(a)&&now>=k.next){action(a);k.next=now+(a==='down'?35:45);}}
    if(pointerAction&&['left','right','down'].includes(pointerAction.action)&&now>=pointerAction.next){action(pointerAction.action);pointerAction.next=now+(pointerAction.action==='down'?35:45);}
  }
  game.tick(ms);
  for(const event of game.events.splice(0)){
    renderer.event(event);audio.play(event.type,event.count);
    if(event.type==='clear'){
      const notice=$('clear-notice');notice.innerHTML=`<b>${event.label}</b><span>+${event.points?.toLocaleString('ko-KR')}</span>${event.combo?`<em>${event.combo} COMBO!</em>`:''}`;
      notice.classList.remove('show');void notice.offsetWidth;notice.classList.add('show');
      if(noticeTimeout)clearTimeout(noticeTimeout);noticeTimeout=setTimeout(()=>notice.classList.remove('show'),1500);
      announce(`${event.label} ${event.points}점${event.combo?`, ${event.combo} 콤보`:''}`);
    }
    if(event.type==='level')announce(`레벨 ${game.level}! 블록이 더 빨라집니다.`);
  }
  if(game.status==='playing'||game.status==='clearing')audio.music(game.elapsed);
  renderer.draw(ms,now);sync();requestAnimationFrame(frame);
}
sync();requestAnimationFrame(()=>{invalidatePreviews();requestAnimationFrame(frame);});
