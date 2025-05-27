const canvas = document.getElementById("juego");
const ctx = canvas.getContext("2d");
const WIDTH = canvas.width, HEIGHT = canvas.height;

let keys = {}, gameRunning = false, timer = 0, score = 0, currentLevel = 0, particles = [];
const sounds = {
  jump: new Audio("https://cdn.pixabay.com/download/audio/2022/03/15/audio_956a5dfc2f.mp3"),
  die: new Audio("https://cdn.pixabay.com/download/audio/2021/11/11/audio_3b2cf845b5.mp3"),
  win: new Audio("https://cdn.pixabay.com/download/audio/2022/03/31/audio_4dcf8e9ad1.mp3")
};

class Entity {
  constructor(x, y, w, h) { this.x = x; this.y = y; this.width = w; this.height = h; }
  isColliding(other) {
    return this.x < other.x + other.width && this.x + this.width > other.x &&
           this.y < other.y + other.height && this.y + this.height > other.y;
  }
}

class Platform extends Entity {
  constructor(x, y, w, h, type = "static", range = 0) {
    super(x, y, w, h);
    this.type = type; this.originY = y; this.range = range; this.direction = 1;
  }
  update() {
    if (this.type === "moving") {
      this.y += this.direction * 1.5;
      if (this.y > this.originY + this.range || this.y < this.originY - this.range) this.direction *= -1;
    }
  }
  draw() {
    ctx.fillStyle = this.type === "moving" ? "#5555ff" : "#555555";
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.strokeStyle = "#222";
    ctx.strokeRect(this.x, this.y, this.width, this.height);
  }
}

class Hazard extends Entity {
  constructor(x, y, w, h, type) { super(x, y, w, h); this.type = type; }
  draw() {
    ctx.fillStyle = this.type === "lava" ? "#e63946" : "#457b9d";
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.strokeStyle = "#222";
    ctx.strokeRect(this.x, this.y, this.width, this.height);
  }
}

class Meta extends Entity {
  constructor(x, y) { super(x, y, 50, 60); this.pulse = 0; }
  draw() {
    this.pulse += 0.1;
    ctx.fillStyle = "#2a9d8f";
    ctx.shadowColor = "#2a9d8f";
    ctx.shadowBlur = 10 + Math.sin(this.pulse) * 5;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.shadowBlur = 0;
  }
}

class Collectible extends Entity {
  constructor(x, y) {
    super(x, y, 20, 20);
    this.collected = false;
    this.pulse = 0;
  }
  draw() {
    if (this.collected) return;
    this.pulse += 0.1;
    ctx.fillStyle = "#f4a261";
    ctx.shadowColor = "#f4a261";
    ctx.shadowBlur = 10 + Math.sin(this.pulse) * 5;
    ctx.beginPath();
    ctx.arc(this.x + this.width/2, this.y + this.height/2, 10, 0, Math.PI*2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

class Player extends Entity {
  constructor(x, y, controls, type) {
    super(x, y, 30, 40);
    this.spawnX = x; this.spawnY = y;
    this.vx = 0; this.vy = 0;
    this.speed = 3.5; this.jump = 11;
    this.gravity = 0.6; this.onGround = false;
    this.lives = 3; this.alive = true;
    this.controls = controls; this.type = type; this.anim = 0;
  }
  reset() {
    this.x = this.spawnX; this.y = this.spawnY;
    this.vx = this.vy = 0; this.alive = true;
  }
  update(platforms, collectibles=[]) {
    if (!this.alive) return;
    this.vx = keys[this.controls.left] ? -this.speed : keys[this.controls.right] ? this.speed : 0;
    if (keys[this.controls.up] && this.onGround) {
      this.vy = -this.jump;
      this.onGround = false;
      sounds.jump.play();
      spawnParticles(this.x, this.y, this.type);
    }
    this.vy += this.gravity;
    let nextX = this.x + this.vx, nextY = this.y + this.vy;
    this.onGround = false;
    for (let p of platforms) {
      p.update();
      if (nextX < p.x + p.width && nextX + this.width > p.x &&
          nextY < p.y + p.height && nextY + this.height > p.y) {
        if (this.vy > 0 && this.y + this.height <= p.y) {
          nextY = p.y - this.height; this.vy = 0; this.onGround = true;
        }
      }
    }

    // Detect collectible collisions
    for (let c of collectibles) {
      if (!c.collected && this.isColliding(c)) {
        c.collected = true;
        score++;
        sounds.jump.play();
      }
    }

    this.x = nextX; this.y = nextY; this.anim = (this.anim + 1) % 60;
  }
  draw() {
    ctx.save();
    ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
    ctx.fillStyle = this.type === "fuego" ? (this.anim % 20 < 10 ? "#ff5722" : "#ffab91") :
                                           (this.anim % 20 < 10 ? "#2196f3" : "#90caf9");
    ctx.beginPath();
    if(this.type === "fuego"){
      ctx.moveTo(0, -20);
      ctx.lineTo(15, 20);
      ctx.lineTo(-15, 20);
    } else {
      ctx.ellipse(0, 0, 12, 20, 0, 0, Math.PI * 2);
    }
    ctx.closePath();
    ctx.fill(); 
    ctx.restore();
  }
  die() {
    this.lives--;
    sounds.die.play();
    if (this.lives <= 0) {
      this.alive = false; gameRunning = false;
      document.getElementById("mensajeFin").textContent = `${this.type.toUpperCase()} perdió todas sus vidas.`;
    } else {
      this.reset();
    }
  }
}

function spawnParticles(x, y, type) {
  for (let i = 0; i < 10; i++) {
    particles.push({ x, y, vx: Math.random() * 2 - 1, vy: -Math.random() * 2, life: 30,
      color: type === "fuego" ? "#ff6600" : "#00ccff" });
  }
}
function updateParticles() {
  for (let p of particles) {
    p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life--;
  }
  particles = particles.filter(p => p.life > 0);
}
function drawParticles() {
  for (let p of particles) {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life / 30;
    ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

const levels = [
  {
    platforms: [
      new Platform(0, 360, 2000, 40),
      new Platform(200, 310, 120, 20),
      new Platform(400, 270, 150, 20),
      new Platform(650, 240, 120, 20),
      new Platform(900, 200, 150, 20),
      new Platform(1150, 160, 130, 20),
      new Platform(1400, 200, 120, 20)
    ],
    hazards: [
      new Hazard(350, 340, 50, 20, "lava"),
      new Hazard(800, 340, 100, 20, "agua"),
      new Hazard(1200, 340, 60, 20, "lava")
    ],
    collectibles: [
      new Collectible(230, 270),
      new Collectible(450, 230),
      new Collectible(680, 200),
      new Collectible(930, 160),
      new Collectible(1170, 120),
      new Collectible(1450, 170)
    ],
    meta: new Meta(1800, 120)
  }
];

let playerFuego = new Player(50, 320, {left:"ArrowLeft", right:"ArrowRight", up:"ArrowUp"}, "fuego");
let playerAgua = new Player(120, 320, {left:"a", right:"d", up:"w"}, "agua");

let cameraX = 0;

function resetLevel() {
  let lvl = levels[currentLevel];
  playerFuego.x = 50; playerFuego.y = 320; playerFuego.lives = 3; playerFuego.alive = true;
  playerAgua.x = 120; playerAgua.y = 320; playerAgua.lives = 3; playerAgua.alive = true;
  score = 0;
  timer = 0;
  gameRunning = true;
  cameraX = 0;
  for (let c of lvl.collectibles) c.collected = false;
  document.getElementById("mensajeFin").textContent = "";
}

function update() {
  if (!gameRunning) return;
  let lvl = levels[currentLevel];
  playerFuego.update(lvl.platforms, lvl.collectibles);
  playerAgua.update(lvl.platforms, lvl.collectibles);

  // Peligros y daño
  for (let hazard of lvl.hazards) {
    if (hazard.type === "lava") {
      if (playerFuego.isColliding(hazard)) playerFuego.die();
    } else if (hazard.type === "agua") {
      if (playerAgua.isColliding(hazard)) playerAgua.die();
    }
  }

  // Ambos deben llegar a la meta
  if (playerFuego.isColliding(lvl.meta) && playerAgua.isColliding(lvl.meta)) {
    sounds.win.play();
    currentLevel++;
    if (currentLevel >= levels.length) {
      gameRunning = false;
      document.getElementById("mensajeFin").textContent = "¡Ganaste el juego!";
      currentLevel = 0;
    } else {
      resetLevel();
    }
  }

  updateParticles();

  timer++;
  if (timer > 60 * 300) {
    gameRunning = false;
    document.getElementById("mensajeFin").textContent = "Tiempo agotado.";
  }
}

function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  let lvl = levels[currentLevel];
  const levelWidth = 2000; // Ancho del nivel

  // Cámara centrada entre jugadores
  let targetX = (playerFuego.x + playerAgua.x) / 2 - WIDTH / 2;
  if (targetX < 0) targetX = 0;
  if (targetX > levelWidth - WIDTH) targetX = levelWidth - WIDTH;
  cameraX += (targetX - cameraX) * 0.1; // Lerp suave

  ctx.save();
  ctx.translate(-cameraX, 0);

  // Fondo
  ctx.fillStyle = "#121212";
  ctx.fillRect(cameraX, 0, WIDTH, HEIGHT);

  // Plataformas
  for (let p of lvl.platforms) p.draw();

  // Peligros
  for (let h of lvl.hazards) h.draw();

  // Meta
  lvl.meta.draw();

  // Coleccionables
  if (lvl.collectibles) for (let c of lvl.collectibles) c.draw();

  // Jugadores
  playerFuego.draw();
  playerAgua.draw();

  // Partículas
  drawParticles();

  ctx.restore();

  // HUD
  ctx.fillStyle = "#fff";
  ctx.font = "18px Arial";
  ctx.fillText(`Vidas Fuego: ${playerFuego.lives}`, 10, 20);
  ctx.fillText(`Vidas Agua: ${playerAgua.lives}`, 10, 40);
  ctx.fillText(`Coleccionables: ${score}`, 10, 60);
  ctx.fillText(`Nivel: ${currentLevel + 1}`, 10, 80);
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

window.addEventListener("keydown", e => keys[e.key] = true);
window.addEventListener("keyup", e => keys[e.key] = false);

resetLevel();
gameLoop();
