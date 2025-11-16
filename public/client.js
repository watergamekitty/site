// Minimal Pong client using Socket.IO
const socket = io();

const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
let W = (canvas.width = innerWidth);
let H = (canvas.height = innerHeight);

window.addEventListener('resize', () => {
  W = canvas.width = innerWidth;
  H = canvas.height = innerHeight;
});

// UI
const overlay = document.getElementById('overlay');
const nameInput = document.getElementById('name');
const joinBtn = document.getElementById('join');

let username = '';
let playerIndex = null; // 0 = left, 1 = right
let players = [];

joinBtn.onclick = () => {
  const name = nameInput.value.trim() || 'Player' + Math.floor(Math.random()*1000);
  username = name;
  socket.emit('setUsername', username);
  overlay.classList.add('hidden');
}

// Game state
const PADDLE_W = 12;
const PADDLE_H = 120;
let paddles = [{y:0},{y:0}];
let ball = {x:0,y:0,vx:0,vy:0};
let score = [0,0];

let running = false;

socket.on('start', (data) => {
  players = data.players || [];
  playerIndex = players.indexOf(username);
  if (playerIndex === -1) playerIndex = 0;
  // reset state
  paddles = [{y:(H-PADDLE_H)/2},{y:(H-PADDLE_H)/2}];
  score = [0,0];
  // host is playerIndex 0
  if (playerIndex === 0) initBall();
  running = true;
});

socket.on('opponentPaddleMove', (data) => {
  // data {index, y}
  paddles[data.index].y = data.y * (H - PADDLE_H);
});

socket.on('ballUpdate', (data) => {
  ball.x = data.x * W;
  ball.y = data.y * H;
  ball.vx = data.vx * W;
  ball.vy = data.vy * H;
});

socket.on('score', (data) => {
  score = data.score;
  // reset local ball if not host
  if (playerIndex !== 0) {
    ball.x = W/2; ball.y = H/2; ball.vx = 0; ball.vy = 0;
  }
});

socket.on('opponentLeft', () => {
  running = false;
  overlay.classList.remove('hidden');
  document.querySelector('.card h1').textContent = 'Opponent left — Play again';
});

function initBall(){
  ball.x = W/2; ball.y = H/2;
  const speed = Math.max(6, Math.min(12, W/100));
  ball.vx = (Math.random() > 0.5 ? 1 : -1) * speed;
  ball.vy = (Math.random()*2 - 1) * speed;
}

function clamp(v,a,b){return Math.max(a,Math.min(b,v));}

// input
let mouseY = H/2;
canvas.addEventListener('mousemove', (e) => {
  mouseY = e.clientY;
  if (playerIndex !== null) {
    const normalized = clamp((mouseY - PADDLE_H/2) / (H - PADDLE_H), 0, 1);
    // local paddle
    paddles[playerIndex].y = normalized * (H - PADDLE_H);
    socket.emit('paddleMove', { index: playerIndex, y: normalized });
  }
});

function step(dt){
  if (!running) return;
  // host authoritative ball
  if (playerIndex === 0){
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    // top/bottom collision
    if (ball.y < 8){ ball.y = 8; ball.vy *= -1; }
    if (ball.y > H-8){ ball.y = H-8; ball.vy *= -1; }
    // paddles
    // left paddle
    if (ball.x - 8 < PADDLE_W){
      const py = paddles[0].y;
      if (ball.y > py && ball.y < py + PADDLE_H){
        ball.x = PADDLE_W + 8;
        ball.vx *= -1.05;
        ball.vy += (Math.random()-0.5) * 2;
      }
    }
    // right paddle
    if (ball.x + 8 > W - PADDLE_W){
      const py = paddles[1].y;
      if (ball.y > py && ball.y < py + PADDLE_H){
        ball.x = W - PADDLE_W - 8;
        ball.vx *= -1.05;
        ball.vy += (Math.random()-0.5) * 2;
      }
    }
    // scoring
    if (ball.x < 0){ score[1]++; socket.emit('score', { score }); initBall(); }
    if (ball.x > W){ score[0]++; socket.emit('score', { score }); initBall(); }

    // broadcast normalized ball state
    socket.emit('ballUpdate', { x: ball.x / W, y: ball.y / H, vx: ball.vx / W, vy: ball.vy / H });
  }
}

function draw(){
  ctx.clearRect(0,0,W,H);
  // center line
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  const seg = 20;
  for (let y=0;y<H;y+=seg*2){ ctx.fillRect(W/2-2,y,4,seg); }

  // paddles
  ctx.fillStyle = '#fff';
  // left
  ctx.fillRect(8, paddles[0].y, PADDLE_W, PADDLE_H);
  // right
  ctx.fillRect(W - PADDLE_W - 8, paddles[1].y, PADDLE_W, PADDLE_H);

  // ball
  ctx.beginPath(); ctx.arc(ball.x || W/2, ball.y || H/2, 8, 0, Math.PI*2); ctx.fill();

  // score
  ctx.font = '32px system-ui'; ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.textAlign = 'center'; ctx.fillText(score[0], W/2 - 60, 60); ctx.fillText(score[1], W/2 + 60, 60);
}

let last = performance.now();
function loop(t){
  const dt = Math.min(0.05, (t - last)/16);
  step(dt);
  draw();
  last = t;
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
