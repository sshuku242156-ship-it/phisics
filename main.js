// 3Dベクトル表現（x, y, z軸）
// ディスプレイ上ではx, yを使用（zは奥行き）
class Vector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  // 外積計算（3D）
  static cross(a, b) {
    return new Vector3(
      a.y * b.z - a.z * b.y,
      a.z * b.x - a.x * b.z,
      a.x * b.y - a.y * b.x
    );
  }

  // 大きさ
  magnitude() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  // 正規化
  normalize() {
    const mag = this.magnitude();
    if (mag === 0) return new Vector3(0, 0, 0);
    return new Vector3(this.x / mag, this.y / mag, this.z / mag);
  }

  // スケーリング
  scale(factor) {
    return new Vector3(this.x * factor, this.y * factor, this.z * factor);
  }

  // 文字列表現
  toString() {
    return `(${this.x.toFixed(2)}, ${this.y.toFixed(2)}, ${this.z.toFixed(2)})`;
  }
}

// 方向定義（3D）
const DIRECTIONS = {
  0: new Vector3(1, 0, 0),      // →（右）
  1: new Vector3(-1, 0, 0),     // ←（左）
  2: new Vector3(0, 1, 0),      // ↑（上）
  3: new Vector3(0, -1, 0),     // ↓（下）
  4: new Vector3(0, 0, 1),      // ⊙（手前）
  5: new Vector3(0, 0, -1),     // ⊗（奥）
};

// 画面表示用の方向インデックスから（x, y）への変換
const DISPLAY_DIRECTIONS = {
  0: { x: 1, y: 0 },      // →（右）
  1: { x: -1, y: 0 },     // ←（左）
  2: { x: 0, y: -1 },     // ↑（上）
  3: { x: 0, y: 1 },      // ↓（下）
  4: { x: 0.7, y: -0.7 }, // ⊙（手前）
  5: { x: -0.7, y: 0.7 }, // ⊗（奥）
};

// 色定義
const COLORS = {
  magnetic: '#ff6b6b',   // 赤
  current: '#4ecdc4',    // 青緑
  force: '#00ff88',      // 緑
  grid: 'rgba(100, 200, 255, 0.1)',
  text: '#ecf0f1'
};

// シミュレーションステート
let state = {
  magneticDirectionIndex: 0,
  currentDirectionIndex: 2,
  magneticStrength: 1.5,
  currentStrength: 1.5,
};

// Canvas初期化
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ベクトルをディスプレイ座標に変換（3D → 2D表示）
function vectorToDisplay(vec, strength = 1) {
  // z軸方向の場合は斜め表示
  let displayDir;
  if (vec.z !== 0) {
    // z軸成分がある場合
    if (vec.z > 0) {
      displayDir = DISPLAY_DIRECTIONS[4];
    } else {
      displayDir = DISPLAY_DIRECTIONS[5];
    }
  } else if (vec.x !== 0) {
    displayDir = vec.x > 0 ? DISPLAY_DIRECTIONS[0] : DISPLAY_DIRECTIONS[1];
  } else if (vec.y !== 0) {
    displayDir = vec.y > 0 ? DISPLAY_DIRECTIONS[3] : DISPLAY_DIRECTIONS[2];
  } else {
    return { x: 0, y: 0 };
  }

  const length = Math.sqrt(displayDir.x ** 2 + displayDir.y ** 2) || 1;
  return {
    x: (displayDir.x / length) * strength,
    y: (displayDir.y / length) * strength
  };
}

// 矢印を描画
function drawArrow(fromX, fromY, toX, toY, color, thickness = 3) {
  const headlen = 15;
  const angle = Math.atan2(toY - fromY, toX - fromX);

  // 矢印の軸
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = thickness;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  // 矢印の先端
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

// グリッドを描画
function drawGrid() {
  const gridSize = 40;
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;

  for (let x = 0; x < canvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  for (let y = 0; y < canvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

// テキストを描画
function drawText(text, x, y, color = COLORS.text, size = 14, align = 'left') {
  ctx.fillStyle = color;
  ctx.font = `bold ${size}px Arial`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

// シミュレーション描画
function draw() {
  // 背景
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // グリッド
  drawGrid();

  // 中心座標
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const arrowScale = 80;

  // 3Dベクトル
  const magneticVec = DIRECTIONS[state.magneticDirectionIndex].scale(state.magneticStrength);
  const currentVec = DIRECTIONS[state.currentDirectionIndex].scale(state.currentStrength);
  
  // フレミングの法則：F = I × B（外積）
  const forceVec = Vector3.cross(currentVec, magneticVec);

  // ディスプレイ座標に変換
  const bDisplay = vectorToDisplay(magneticVec, arrowScale);
  const iDisplay = vectorToDisplay(currentVec, arrowScale);
  const fDisplay = vectorToDisplay(forceVec, arrowScale * 0.8); // 力は少し短め

  // 矢印を描画
  drawArrow(centerX, centerY, centerX + bDisplay.x, centerY + bDisplay.y, COLORS.magnetic, 4);
  drawArrow(centerX, centerY, centerX + iDisplay.x, centerY + iDisplay.y, COLORS.current, 4);
  drawArrow(centerX, centerY, centerX + fDisplay.x, centerY + fDisplay.y, COLORS.force, 5);

  // ラベル
  const labelOffset = 100;
  drawText('磁場 (B)', centerX + bDisplay.x * 1.2 + 20, centerY + bDisplay.y * 1.2 - 20, COLORS.magnetic, 12);
  drawText('電流 (I)', centerX + iDisplay.x * 1.2 + 20, centerY + iDisplay.y * 1.2 + 20, COLORS.current, 12);
  drawText('力 (F)', centerX + fDisplay.x * 1.3 + 20, centerY + fDisplay.y * 1.3, COLORS.force, 13, 'left');

  // 中心点
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.beginPath();
  ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
  ctx.fill();

  // 更新表示
  updateDisplay(magneticVec, currentVec, forceVec);
}

// 情報表示の更新
function updateDisplay(magneticVec, currentVec, forceVec) {
  // ベクトル情報
  document.getElementById('bVector').textContent = magneticVec.toString();
  document.getElementById('iVector').textContent = currentVec.toString();
  document.getElementById('fVector').textContent = forceVec.toString();
}

// パラメータ値表示の更新
function updateValueDisplays() {
  document.getElementById('magneticStrengthValue').textContent = state.magneticStrength.toFixed(1);
  document.getElementById('currentStrengthValue').textContent = state.currentStrength.toFixed(1);
}

// イベントリスナー設定
function setupEventListeners() {
  // 磁場方向ボタン
  document.getElementById('magneticDirection').addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
      document.querySelectorAll('#magneticDirection button').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      state.magneticDirectionIndex = parseInt(e.target.dataset.value);
      draw();
    }
  });

  // 電流方向ボタン
  document.getElementById('currentDirection').addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
      document.querySelectorAll('#currentDirection button').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      state.currentDirectionIndex = parseInt(e.target.dataset.value);
      draw();
    }
  });

  // 磁場強度スライダー
  document.getElementById('magneticStrength').addEventListener('input', (e) => {
    state.magneticStrength = parseFloat(e.target.value);
    updateValueDisplays();
    draw();
  });

  // 電流強度スライダー
  document.getElementById('currentStrength').addEventListener('input', (e) => {
    state.currentStrength = parseFloat(e.target.value);
    updateValueDisplays();
    draw();
  });
}

// 初期化
setupEventListeners();
updateValueDisplays();
draw();

// アニメーションループ
function animate() {
  draw();
  requestAnimationFrame(animate);
}

const light = new THREE.DirectionalLight(0xffffff, 1.2);
light.position.set(5, 5, 5);
scene.add(light);

const ambient = new THREE.AmbientLight(0x606060, 1.0);
scene.add(ambient);

const grid = new THREE.GridHelper(10, 10, 0x888888, 0x222222);
scene.add(grid);

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

function animate() {
  requestAnimationFrame(animate);
  sphereGroup.rotation.x += 0.01;
  sphereGroup.rotation.y += 0.013;
  renderer.render(scene, camera);
}

animate();
