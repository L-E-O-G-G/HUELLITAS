const canvas = document.getElementById('juego');
const ctx = canvas.getContext('2d');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

let keys = {};
let gameRunning = false;
let currentLevel = 0;
let timer = 0;
let score = 0;

class Player {
  constructor(x, y, color, controls, type) {
    this.x = x;
    this.y = y;
    this.width = 32;
    this.height = 48;
    this.color = color;
    this.type = type; // 'fuego' o 'agua'
    this.speed = 3;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.controls = controls;
    this.hasKey = false;
    this.alive = true;
    this.animFrame = 0;
    this.animTimer = 0;
  }

  update(platforms, lava, water) {
    if (!this.alive) return;

    // Movimiento horizontal con easing
    if (keys[this.controls.left]) {
      this.vx = Math.max(this.vx - 0.3, -this.speed);
    } else if (keys[this.controls.right]) {
      this.vx = Math.min(this.vx + 0.3, this.speed);
    } else {
      // fricción
      this.vx *= 0.8;
      if (Math.abs(this.vx) < 0.1) this.vx = 0;
    }

    // Salto
    if (keys[this.controls.up] && this.onGround) {
      this.vy = -10;
      this.onGround = false;
    }

    // Gravedad
    this.vy += 0.5;
    if (this.vy > 10) this.vy = 10;

    // Próximo movimiento
    let nextX = this.x + this.vx;
    let nextY = this.y + this.vy;

    // Colisiones con plataformas
    this.onGround = false;
    for (let p of platforms) {
      // Colisión en X
      if (nextX < p.x + p.width &&
          nextX + this.width > p.x &&
          this.y < p.y + p.height &&
          this.y + this.height > p.y) {
        if (this.vx > 0) nextX = p.x - this.width;
        else if (this.vx < 0) nextX = p.x + p.width;
        this.vx = 0;
      }
      // Colisión en Y
      if (this.x < p.x + p.width &&
          this.x + this.width > p.x &&
          nextY < p.y + p.height &&
          nextY + this.height > p.y) {
        if (this.vy > 0) {
          nextY = p.y - this.height;
          this.onGround = true;
        } else if (this.vy < 0) {
          nextY = p.y + p.height;
        }
        this.vy = 0;
      }
    }

    this.x = nextX;
    this.y = nextY;

    // Muerte instantánea si toca zona prohibida
    if (this.type === 'fuego') {
      for (let w of water) {
        if (this.x < w.x + w.width &&
            this.x + this.width > w.x &&
            this.y < w.y + w.height &&
            this.y + this.height > w.y) {
          this.die();
        }
      }
    } else if (this.type === 'agua') {
      for (let l of lava) {
        if (this.x < l.x + l.width &&
            this.x + this.width > l.x &&
            this.y < l.y + l.height &&
            this.y + this.height > l.y) {
          this.die();
        }
      }
    }

    // Animación básica
    this.animTimer++;
    if (this.animTimer > 10) {
      this.animFrame = (this.animFrame + 1) % 4;
      this.animTimer = 0;
    }
  }

  die() {
    this.alive = false;
  }

  draw(ctx) {
    if (!this.alive) {
      ctx.fillStyle = 'gray';
      ctx.fillRect(this.x, this.y, this.width, this.height);
      return;
    }
    // Dibujo con forma "gota" para agua y "llama" para fuego
    ctx.save();
    ctx.translate(this.x + this.width/2, this.y + this.height/2);

    if (this.type === 'fuego') {
      // Llama animada simple
      let flameColors = ['#FF4500', '#FF6347', '#FF8C00', '#FFA500'];
      ctx.fillStyle = flameColors[this.animFrame];
      ctx.beginPath();
      ctx.moveTo(0, -this.height/2);
      ctx.bezierCurveTo(this.width/4, -this.height/4, this.width/6, this.height/2, 0, this.height/3);
      ctx.bezierCurveTo(-this.width/6, this.height/2, -this.width/4, -this.height/4, 0, -this.height/2);
      ctx.fill();
    } else {
      // Gota de agua animada
      let waterColors = ['#00BFFF', '#1E90FF', '#4169E1', '#4682B4'];
      ctx.fillStyle = waterColors[this.animFrame];
      ctx.beginPath();
      ctx.ellipse(0, 0, this.width/3, this.height/2, Math.sin(this.animTimer/10)*0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }
}

class Platform {
  constructor(x, y, width, height, color = '#654321') {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.color = color;
  }
  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

class Hazard {
  constructor(x, y, width, height, type) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.type = type; // 'lava' o 'water'
    this.animFrame = 0;
    this.animTimer = 0;
  }
  draw(ctx) {
    this.animTimer++;
    if (this.animTimer > 15) {
      this.animFrame = (this.animFrame + 1) % 3;
      this.animTimer = 0;
    }
    if (this.type === 'lava') {
      let lavaColors = ['#FF4500', '#FF6347', '#FF8C00'];
      ctx.fillStyle = lavaColors[this.animFrame];
      ctx.fillRect(this.x, this.y, this.width, this.height);
      // Efecto de burbujas
      ctx.fillStyle = 'rgba(255, 69, 0, 0.3)';
      for (let i = 0; i < 5; i++) {
        let bx = this.x + Math.random() * this.width;
        let by = this.y + Math.random() * this.height / 2;
        ctx.beginPath();
        ctx.arc(bx, by, 3, 0, Math.PI*2);
        ctx.fill();
      }
    } else {
      let waterColors = ['#00BFFF', '#1E90FF', '#4169E1'];
      ctx.fillStyle = waterColors[this.animFrame];
      ctx.fillRect(this.x, this.y, this.width, this.height);
      // Efecto ondas
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      for(let i=0; i<3; i++) {
        ctx.beginPath();
        ctx.ellipse(this.x + this.width/2, this.y + this.height/2 + i*5, this.width/4, 3, 0, 0, Math.PI*2);
        ctx.stroke();
      }
    }
  }
}

class Item {
  constructor(x, y, color, type) {
    this.x = x;
    this.y = y;
    this.width = 20;
    this.height = 20;
    this.color = color;
    this.type = type; // 'fuego' o 'agua'
    this.collected = false;
    this.animTimer = 0;
  }
  update() {
    this.animTimer++;
  }
  draw(ctx) {
    if (this.collected) return;
    ctx.save();
    ctx.translate(this.x + this.width/2, this.y + this.height/2);
    let alpha = 0.6 + 0.4 * Math.sin(this.animTimer / 20);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(0, -this.height/2);
    ctx.bezierCurveTo(this.width/4, -this.height/4, this.width/6, this.height/2, 0, this.height/3);
    ctx.bezierCurveTo(-this.width/6, this.height/2, -this.width/4, -this.height/4, 0, -this.height/2);
    ctx.fill();
    ctx.restore();
  }
}

class Meta {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 50;
    this.height = 70;
    this.unlocked = false;
    this.animTimer = 0;
  }
  update() {
    this.animTimer++;
  }
  draw(ctx) {
    // Fondo de la meta (puerta o portal)
    ctx.save();
    ctx.translate(this.x, this.y);
    let pulse = 1 + 0.05 * Math.sin(this.animTimer / 15);
    ctx.fillStyle = this.unlocked ? 'limegreen' : 'darkred';
    ctx.shadowColor = this.unlocked ? 'limegreen' : 'darkred';
    ctx.shadowBlur = 15 * pulse;
    ctx.fillRect(0, 0, this.width, this.height);

    // Símbolo de meta (estrella)
    ctx.fillStyle = 'white';
    ctx.beginPath();
    let cx = this.width / 2;
    let cy = this.height / 2;
    let spikes = 5;
    let outerRadius = 15 * pulse;
    let innerRadius = 7 * pulse;
    let rot = Math.PI / 2 * 3;
    let step = Math.PI / spikes;
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      let x1 = cx + Math.cos(rot) * outerRadius;
      let y1 = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x1, y1);
      rot += step;
      let x2 = cx + Math.cos(rot) * innerRadius;
      let y2 = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x2, y2);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.fill();

    ctx.restore();
  }
}

// Niveles (cada uno con plataformas, lava, agua, items, meta)
const levels = [
  {
    platforms: [
      new Platform(0, 340, 640, 20), 
      new Platform(100, 280, 100, 20), 
      new Platform(300, 220, 120, 20),
      new Platform(500, 280, 100, 20)
    ],
    lava: [new Hazard(200, 360-20, 100, 20, 'lava')],
    water: [new Hazard(400, 360-20, 100, 20, 'water')],
    itemsFuego: [new Item(130, 250, '#FF4500', 'fuego')],
    itemsAgua: [new Item(520, 250, '#1E90FF', 'agua')],
    meta: new Meta(580, 270)
  },
  {
    platforms: [
      new Platform(0, 340, 640, 20),
      new Platform(70, 300, 90, 20),
      new Platform(200, 260, 110, 20),
      new Platform(370, 230, 100, 20),
      new Platform(520, 200, 110, 20)
    ],
    lava: [
      new Hazard(150, 360-20, 80, 20, 'lava'),
      new Hazard(420, 360-20, 90, 20, 'lava')
    ],
    water: [
      new Hazard(320, 360-20, 70, 20, 'water'),
      new Hazard(510, 360-20, 90, 20, 'water')
    ],
    itemsFuego: [
      new Item(100, 270, '#FF4500', 'fuego'),
      new Item(390, 210, '#FF6347', 'fuego')
    ],
    itemsAgua: [
      new Item(550, 170, '#1E90FF', 'agua'),
      new Item(230, 230, '#4169E1', 'agua')
    ],
    meta: new Meta(580, 150)
  },
  {
    platforms: [
      new Platform(0, 340, 640, 20),
      new Platform(50, 310, 80, 20),
      new Platform(180, 280, 90, 20),
      new Platform(320, 250, 100, 20),
      new Platform(440, 220, 80, 20),
      new Platform(570, 190, 60, 20)
    ],
    lava: [
      new Hazard(120, 360-20, 80, 20, 'lava'),
      new Hazard(260, 360-20, 70, 20, 'lava'),
      new Hazard(460, 360-20, 80, 20, 'lava')
    ],
    water: [
      new Hazard(350, 360-20, 60, 20, 'water'),
      new Hazard(540, 360-20, 70, 20, 'water')
    ],
    itemsFuego: [
      new Item(70, 280, '#FF4500', 'fuego'),
      new Item(320, 220, '#FF6347', 'fuego'),
      new Item(570, 160, '#FF8C00', 'fuego')
    ],
    itemsAgua: [
      new Item(190, 250, '#1E90FF', 'agua'),
      new Item(430, 200, '#4169E1', 'agua')
    ],
    meta: new Meta(580, 140)
  }
];

// Jugadores
const playerFuego = new Player(30, 280, 'red', {left:'ArrowLeft', right:'ArrowRight', up:'ArrowUp'}, 'fuego');
const playerAgua = new Player(80, 280, 'blue', {left:'a', right:'d', up:'w'}, 'agua');

function resetLevel() {
  const level = levels[currentLevel];

  // Reset posiciones y estado
  playerFuego.x = 30; playerFuego.y = 280; playerFuego.alive = true; playerFuego.hasKey = false; playerFuego.vx = 0; playerFuego.vy = 0;
  playerAgua.x = 80; playerAgua.y = 280; playerAgua.alive = true; playerAgua.hasKey = false; playerAgua.vx = 0; playerAgua.vy = 0;

  // Reset items
  for (let it of level.itemsFuego) it.collected = false;
  for (let it of level.itemsAgua) it.collected = false;

  // Meta bloqueada
  level.meta.unlocked = false;

  timer = 0;
  score = 0;
  gameRunning = true;
  document.getElementById('mensajeFin').innerText = '';
}

function update() {
  if (!gameRunning) return;

  timer += 1/60;

  const level = levels[currentLevel];

  playerFuego.update(level.platforms, level.lava, level.water);
  playerAgua.update(level.platforms, level.lava, level.water);

  // Check items recogidos por fuego
  for (let it of level.itemsFuego) {
    if (!it.collected &&
      playerFuego.x < it.x + it.width &&
      playerFuego.x + playerFuego.width > it.x &&
      playerFuego.y < it.y + it.height &&
      playerFuego.y + playerFuego.height > it.y) {
        it.collected = true;
        playerFuego.hasKey = true;
        score += 10;
    }
    it.update();
  }

  // Check items recogidos por agua
  for (let it of level.itemsAgua) {
    if (!it.collected &&
      playerAgua.x < it.x + it.width &&
      playerAgua.x + playerAgua.width > it.x &&
      playerAgua.y < it.y + it.height &&
      playerAgua.y + playerAgua.height > it.y) {
        it.collected = true;
        playerAgua.hasKey = true;
        score += 10;
    }
    it.update();
  }

  // Desbloquear meta solo si ambos tienen llave
  if (playerFuego.hasKey && playerAgua.hasKey) {
    level.meta.unlocked = true;
  } else {
    level.meta.unlocked = false;
  }

  // Check meta
  if (level.meta.unlocked) {
    if (
      playerFuego.x < level.meta.x + level.meta.width &&
      playerFuego.x + playerFuego.width > level.meta.x &&
      playerFuego.y < level.meta.y + level.meta.height &&
      playerFuego.y + playerFuego.height > level.meta.y &&
      playerAgua.x < level.meta.x + level.meta.width &&
      playerAgua.x + playerAgua.width > level.meta.x &&
      playerAgua.y < level.meta.y + level.meta.height &&
      playerAgua.y + playerAgua.height > level.meta.y
    ) {
      // Pasar al siguiente nivel o ganar
      currentLevel++;
      if (currentLevel >= levels.length) {
        gameRunning = false;
        document.getElementById('mensajeFin').innerText = `¡Felicitaciones! Completaste todos los niveles en ${timer.toFixed(2)} segundos con ${score} puntos.`;
      } else {
        resetLevel();
      }
    }
  }

  // Si uno muere reiniciamos nivel
  if (!playerFuego.alive || !playerAgua.alive) {
    gameRunning = false;
    document.getElementById('mensajeFin').innerText = '¡Uno de los jugadores murió! Presiona Reiniciar para intentar de nuevo.';
  }
}

function draw() {
  // Fondo
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = '#b0e0e6';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const level = levels[currentLevel];

  // Dibujar plataformas
  for (let p of level.platforms) p.draw(ctx);

  // Dibujar lava y agua
  for (let l of level.lava) l.draw(ctx);
  for (let w of level.water) w.draw(ctx);

  // Dibujar items
  for (let it of level.itemsFuego) it.draw(ctx);
  for (let it of level.itemsAgua) it.draw(ctx);

  // Dibujar meta
  level.meta.draw(ctx);

  // Dibujar jugadores
  playerFuego.draw(ctx);
  playerAgua.draw(ctx);

  // UI: timer y score
  ctx.fillStyle = 'black';
  ctx.font = '20px Arial';
  ctx.fillText(`Tiempo: ${timer.toFixed(2)} s`, 10, 25);
  ctx.fillText(`Puntos: ${score}`, 10, 50);

  // Mensaje si no está corriendo
  if (!gameRunning && currentLevel < levels.length) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, HEIGHT/2 - 40, WIDTH, 80);
    ctx.fillStyle = 'white';
    ctx.font = '28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Presiona "Reiniciar" para comenzar', WIDTH/2, HEIGHT/2);
    ctx.textAlign = 'start';
  }
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

window.addEventListener('keydown', e => {
  keys[e.key] = true;
});

window.addEventListener('keyup', e => {
  keys[e.key] = false;
});

// Botones
document.getElementById('btnReiniciar').addEventListener('click', () => {
  resetLevel();
});

document.getElementById('btnPausa').addEventListener('click', () => {
  gameRunning = !gameRunning;
  if (gameRunning) {
    document.getElementById('mensajeFin').innerText = '';
  }
});

// Iniciar la primera vez
resetLevel();
gameLoop();
