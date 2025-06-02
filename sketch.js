let video;
let predictions = [];
let facemesh;
let handpose;
let hands = [];
let gameState = "menu"; // "menu"、"intro0"、"intro1"、"intro2"、"play"
let buttons = [
  { x: 250, y: 170, w: 140, h: 60, label: "新手模式" },
  { x: 250, y: 250, w: 140, h: 60, label: "一般模式" },
  { x: 250, y: 330, w: 140, h: 60, label: "瘋狂模式" }
];

// 手指碰觸按鈕的動畫狀態
let fingerOnBtn = null; // {btnIndex, startTime, fingerPos}
let fingerOnBack = null; // {startTime, fingerPos}
let fingerOnStart = null; // {startTime, fingerPos}

// 返回選單按鈕設定
const backBtn = { x: 20, y: 20, w: 140, h: 60, label: "返回選單" };

// 各模式說明文字
const introTexts = [
  "將隨機出現的紅藍綠三色球拖拉到正確的顏色上，計時15秒。",
  "點選正確的英文字來回答題目，計時15秒。",
  "隨機掉落黑白兩種球，請用手觸控攔截白色球。"
];

let currentMode = null; // 0:新手, 1:一般, 2:瘋狂

// 主要程式入口與遊戲流程控制

/**
 * p5.js setup：初始化畫面與ml5模型
 */
function setup() {
  createCanvas(640, 480);

  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  facemesh = ml5.facemesh(video, () => {
    console.log("Facemesh model loaded!");
  });
  facemesh.on("predict", results => {
    predictions = results;
  });

  handpose = ml5.handpose(video, () => {
    console.log("Handpose model loaded!");
  });
  handpose.on("predict", results => {
    hands = results;
  });
}

/**
 * p5.js draw：主繪圖與流程控制
 */
function draw() {
  background(0);

  // 攝影機畫面成功顯示後才顯示UI
  if (video.loadedmetadata && video.width > 0 && video.height > 0) {
    image(video, 0, 0, width, height);

    // 右上角提示
    drawTopRightHint();

    // 主選單
    if (gameState === "menu") {
      drawMenuButtons();
      // 手指碰觸主選單按鈕
      if (hands.length > 0) {
        let fingerTip = hands[0].landmarks[8];
        let btnIdx = isFingerOnButton(fingerTip);
        if (btnIdx !== null) {
          handleHandButton(btnIdx, fingerTip);
        } else {
          fingerOnBtn = null;
        }
      } else {
        fingerOnBtn = null;
      }
      return;
    }
    // 說明頁
    else if (gameState.startsWith("intro")) {
      let idx = parseInt(gameState.replace("intro", ""));
      drawIntro(idx);
      // 手指碰觸開始按鈕
      if (hands.length > 0) {
        let fingerTip = hands[0].landmarks[8];
        if (isFingerOnStartButton(fingerTip)) {
          handleStartButton(fingerTip, idx);
        } else {
          fingerOnStart = null;
        }
      } else {
        fingerOnStart = null;
      }
      // 返回選單
      drawBackButton();
      if (hands.length > 0) {
        let fingerTip = hands[0].landmarks[8];
        if (isFingerOnBackButton(fingerTip)) {
          handleBackButton(fingerTip);
        } else {
          fingerOnBack = null;
        }
      } else {
        fingerOnBack = null;
      }
      return;
    }
    // 遊戲主流程
    else {
      drawBackButton();
      if (hands.length > 0) {
        let fingerTip = hands[0].landmarks[8];
        if (isFingerOnBackButton(fingerTip)) {
          handleBackButton(fingerTip);
        } else {
          fingerOnBack = null;
        }
      } else {
        fingerOnBack = null;
      }
      // 呼叫對應模式
      if (currentMode === 0) {
        playEasy();
      } else if (currentMode === 1) {
        playNormal();
      } else if (currentMode === 2) {
        playCrazy();
      }
      return;
    }
  } else {
    // 攝影機尚未就緒時顯示提示
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(28);
    text("正在啟動攝影機...", width / 2, height / 2);
    return;
  }

  // 顯示臉部與手部關鍵點（僅debug用）
  noFill();
  strokeWeight(3);

  if (predictions.length > 0) {
    const keypoints = predictions[0].scaledMesh;
    const forehead = keypoints[10];
    const leftCheek = keypoints[234];
    const rightCheek = keypoints[454];
    const noseTip = keypoints[1];
    let circlePos = noseTip;

    if (hands.length > 0) {
      for (let hand of hands) {
        if (hand.landmarks) {
          const gesture = detectGesture(hand.landmarks);
          if (gesture === "rock") {
            circlePos = forehead;
          } else if (gesture === "scissors") {
            circlePos = leftCheek ? leftCheek : noseTip;
          } else if (gesture === "paper") {
            circlePos = rightCheek ? rightCheek : noseTip;
          }
        }
      }
    }

    if (circlePos) {
      noFill();
      stroke(255, 255, 0);
      ellipse(circlePos[0], circlePos[1], 50, 50);
    }
  }

  if (hands.length > 0) {
    for (let hand of hands) {
      if (hand.landmarks) {
        for (let i = 0; i < hand.landmarks.length; i++) {
          let keypoint = hand.landmarks[i];
          fill(255, 255, 0);
          noStroke();
          circle(keypoint[0], keypoint[1], 10);
        }
      }
    }
  }
}

/**
 * 右上角操作提示
 */
function drawTopRightHint() {
  fill(255, 230);
  noStroke();
  let boxW = 320;
  let boxH = 38;
  let boxX = width - boxW - 20;
  let boxY = 20;
  rect(boxX, boxY, boxW, boxH, 12);

  fill(0);
  textSize(18);
  textAlign(LEFT, CENTER);
  text("將手指移動到按鈕上0.5秒以做操作", boxX + 16, boxY + boxH / 2);
}

/**
 * 主選單按鈕繪製
 */
function drawMenuButtons() {
  textAlign(CENTER, CENTER);
  textSize(32);
  fill(0, 102, 204);
  noStroke();
  text("互動遊戲", width / 2, 120);

  textSize(24);
  for (let i = 0; i < buttons.length; i++) {
    let btn = buttons[i];
    fill(255);
    stroke(0);
    rect(btn.x, btn.y, btn.w, btn.h, 15);
    fill(0);
    noStroke();
    text(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
  }

  // 手指動畫
  if (fingerOnBtn) {
    let now = millis();
    let progress = constrain((now - fingerOnBtn.startTime) / 500, 0, 1); // 0.5秒
    noFill();
    stroke(0, 255, 0);
    strokeWeight(6);
    let r = 40;
    let startA = -HALF_PI;
    arc(
      fingerOnBtn.fingerPos[0], fingerOnBtn.fingerPos[1],
      r, r,
      startA, startA + progress * TWO_PI
    );
    strokeWeight(1);
    if (progress >= 1) {
      currentMode = fingerOnBtn.btnIndex;
      gameState = "intro" + fingerOnBtn.btnIndex;
      fingerOnBtn = null;
    }
  }
}

/**
 * 說明畫面繪製
 * @param {number} idx - 模式索引
 */
function drawIntro(idx) {
  fill(255, 230);
  noStroke();
  rect(width / 2 - 220, height / 2 - 120, 440, 220, 30);

  fill(0);
  textAlign(CENTER, TOP);
  textSize(24);
  text("說明", width / 2, height / 2 - 100);

  let textBoxX = width / 2 - 200;
  let textBoxY = height / 2 - 60;
  let textBoxW = 400;
  let textBoxH = 80;

  fill(0);
  textAlign(LEFT, TOP);
  textSize(20);
  drawWrappedText(introTexts[idx], textBoxX, textBoxY, textBoxW, textBoxH);

  // 開始按鈕
  let btnX = width / 2 - 70;
  let btnY = height / 2 + 60;
  let btnW = 140;
  let btnH = 50;
  fill(255);
  stroke(0);
  rect(btnX, btnY, btnW, btnH, 15);
  fill(0);
  noStroke();
  textSize(22);
  textAlign(CENTER, CENTER);
  text("開始", width / 2, btnY + btnH / 2);

  // 手指動畫
  if (fingerOnStart) {
    let now = millis();
    let progress = constrain((now - fingerOnStart.startTime) / 500, 0, 1);
    noFill();
    stroke(0, 255, 0);
    strokeWeight(6);
    let r = 40;
    let startA = -HALF_PI;
    arc(
      fingerOnStart.fingerPos[0], fingerOnStart.fingerPos[1],
      r, r,
      startA, startA + progress * TWO_PI
    );
    strokeWeight(1);
    if (progress >= 1) {
      gameState = "play";
      fingerOnStart = null;
    }
  }
}

/**
 * 自動換行繪製文字
 */
function drawWrappedText(txt, x, y, w, h) {
  let words = txt.split('');
  let line = '';
  let lines = [];
  for (let i = 0; i < words.length; i++) {
    let testLine = line + words[i];
    let testWidth = textWidth(testLine);
    if (testWidth > w && line.length > 0) {
      lines.push(line);
      line = words[i];
    } else {
      line = testLine;
    }
  }
  if (line.length > 0) lines.push(line);

  let lineHeight = 26;
  for (let i = 0; i < lines.length && i * lineHeight < h; i++) {
    text(lines[i], x, y + i * lineHeight);
  }
}

/**
 * 判斷手指是否在主選單按鈕上
 */
function isFingerOnButton(finger) {
  for (let i = 0; i < buttons.length; i++) {
    let b = buttons[i];
    if (
      finger[0] > b.x && finger[0] < b.x + b.w &&
      finger[1] > b.y && finger[1] < b.y + b.h
    ) {
      return i;
    }
  }
  return null;
}

/**
 * 判斷手指是否在說明畫面「開始」按鈕上
 */
function isFingerOnStartButton(finger) {
  let btnX = width / 2 - 70;
  let btnY = height / 2 + 60;
  let btnW = 140;
  let btnH = 50;
  return (
    finger[0] > btnX && finger[0] < btnX + btnW &&
    finger[1] > btnY && finger[1] < btnY + btnH
  );
}

/**
 * 控制主選單手指動畫進度
 */
function handleHandButton(btnIndex, fingerPos) {
  if (
    !fingerOnBtn ||
    fingerOnBtn.btnIndex !== btnIndex ||
    dist(fingerOnBtn.fingerPos[0], fingerOnBtn.fingerPos[1], fingerPos[0], fingerPos[1]) > 30
  ) {
    fingerOnBtn = {
      btnIndex: btnIndex,
      startTime: millis(),
      fingerPos: fingerPos.slice()
    };
  } else {
    fingerOnBtn.fingerPos = fingerPos.slice();
  }
}

/**
 * 控制說明畫面開始按鈕手指動畫進度
 */
function handleStartButton(fingerPos) {
  if (
    !fingerOnStart ||
    dist(fingerOnStart.fingerPos[0], fingerOnStart.fingerPos[1], fingerPos[0], fingerPos[1]) > 30
  ) {
    fingerOnStart = {
      startTime: millis(),
      fingerPos: fingerPos.slice()
    };
  } else {
    fingerOnStart.fingerPos = fingerPos.slice();
  }
}

/**
 * 左上角返回選單按鈕繪製與動畫
 */
function drawBackButton() {
  fill(255);
  stroke(0);
  rect(backBtn.x, backBtn.y, backBtn.w, backBtn.h, 15);
  fill(0);
  noStroke();
  textSize(22);
  textAlign(CENTER, CENTER);
  text(backBtn.label, backBtn.x + backBtn.w / 2, backBtn.y + backBtn.h / 2);

  if (fingerOnBack) {
    let now = millis();
    let progress = constrain((now - fingerOnBack.startTime) / 500, 0, 1);
    noFill();
    stroke(0, 255, 0);
    strokeWeight(6);
    let r = 40;
    let startA = -HALF_PI;
    arc(
      fingerOnBack.fingerPos[0], fingerOnBack.fingerPos[1],
      r, r,
      startA, startA + progress * TWO_PI
    );
    strokeWeight(1);
    if (progress >= 1) {
      gameState = "menu";
      fingerOnBack = null;
      fingerOnStart = null;
    }
  }
}

/**
 * 判斷手指是否在返回按鈕上
 */
function isFingerOnBackButton(finger) {
  return (
    finger[0] > backBtn.x && finger[0] < backBtn.x + backBtn.w &&
    finger[1] > backBtn.y && finger[1] < backBtn.y + backBtn.h
  );
}

/**
 * 控制返回按鈕手指動畫進度
 */
function handleBackButton(fingerPos) {
  if (
    !fingerOnBack ||
    dist(fingerOnBack.fingerPos[0], fingerOnBack.fingerPos[1], fingerPos[0], fingerPos[1]) > 30
  ) {
    fingerOnBack = {
      startTime: millis(),
      fingerPos: fingerPos.slice()
    };
  } else {
    fingerOnBack.fingerPos = fingerPos.slice();
  }
}

/**
 * 剪刀石頭布手勢辨識
 */
function detectGesture(landmarks) {
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const ringTip = landmarks[16];
  const pinkyTip = landmarks[20];
  const wrist = landmarks[0];

  function dist(a, b) {
    return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
  }
  const indexDist = dist(indexTip, wrist);
  const middleDist = dist(middleTip, wrist);
  const ringDist = dist(ringTip, wrist);
  const pinkyDist = dist(pinkyTip, wrist);

  // 石頭
  if (
    indexDist < 60 &&
    middleDist < 60 &&
    ringDist < 60 &&
    pinkyDist < 60
  ) {
    return "rock";
  }
  // 剪刀
  if (
    indexDist > 80 &&
    middleDist > 80 &&
    ringDist < 60 &&
    pinkyDist < 60
  ) {
    return "scissors";
  }
  // 布
  if (
    indexDist > 80 &&
    middleDist > 80 &&
    ringDist > 80 &&
    pinkyDist > 80
  ) {
    return "paper";
  }
  return null;
}

/**
 * 結算畫面（所有模式共用）
 */
function drawGameOverPanel(score, onRetry, onMenu, fingerOnRetry, fingerOnMenu) {
  fill(0, 200);
  rect(0, 0, width, height);
  fill(255);
  textSize(32);
  textAlign(CENTER, CENTER);
  text("遊戲結束！分數：" + score, width / 2, height / 2 - 40);

  // 再來一次按鈕
  let retryX = width / 2 - 180, retryY = height / 2 + 20, btnW = 160, btnH = 60;
  fill(255);
  stroke(0);
  rect(retryX, retryY, btnW, btnH, 15);
  fill(0);
  noStroke();
  textSize(22);
  text("再來一次", retryX + btnW / 2, retryY + btnH / 2);

  // 返回選單按鈕
  let menuX = width / 2 + 20, menuY = retryY;
  fill(255);
  stroke(0);
  rect(menuX, menuY, btnW, btnH, 15);
  fill(0);
  noStroke();
  text("返回選單", menuX + btnW / 2, menuY + btnH / 2);

  // 手指動畫
  if (hands.length > 0) {
    let finger = hands[0].landmarks[8];
    // 再來一次
    if (
      finger[0] > retryX && finger[0] < retryX + btnW &&
      finger[1] > retryY && finger[1] < retryY + btnH
    ) {
      if (!fingerOnRetry.startTime) fingerOnRetry.startTime = millis();
      fingerOnRetry.fingerPos = finger.slice();
    } else {
      fingerOnRetry.startTime = null;
    }
    // 返回選單
    if (
      finger[0] > menuX && finger[0] < menuX + btnW &&
      finger[1] > menuY && finger[1] < menuY + btnH
    ) {
      if (!fingerOnMenu.startTime) fingerOnMenu.startTime = millis();
      fingerOnMenu.fingerPos = finger.slice();
    } else {
      fingerOnMenu.startTime = null;
    }
  } else {
    fingerOnRetry.startTime = null;
    fingerOnMenu.startTime = null;
  }

  // 畫動畫
  [fingerOnRetry, fingerOnMenu].forEach((obj) => {
    if (obj.startTime && obj.fingerPos) {
      let now = millis();
      let progress = constrain((now - obj.startTime) / 3000, 0, 1);
      noFill();
      stroke(0, 255, 0);
      strokeWeight(6);
      let r = 40;
      let startA = -HALF_PI;
      arc(
        obj.fingerPos[0], obj.fingerPos[1],
        r, r,
        startA, startA + progress * TWO_PI
      );
      strokeWeight(1);
      if (progress >= 1) {
        obj.startTime = null;
        obj.fingerPos = null;
        obj.action();
      }
    }
  });
}

/**
 * 新手模式主流程
 */
function playEasy() {
  // 結束畫面
  if (easyGameOver) {
    fingerOnEasyRetry.action = () => {
      easyGameStarted = false;
      easyGameOver = false;
      fingerOnEasyRetry.startTime = null;
      fingerOnEasyMenu.startTime = null;
    };
    fingerOnEasyMenu.action = () => {
      gameState = "menu";
      easyGameStarted = false;
      easyGameOver = false;
      fingerOnEasyRetry.startTime = null;
      fingerOnEasyMenu.startTime = null;
    };
    drawGameOverPanel(easyScore, null, null, fingerOnEasyRetry, fingerOnEasyMenu);
    return;
  }

  if (!easyGameStarted) {
    // 初始化：每種顏色5顆，不重疊，球大一點
    easyBalls = [];
    let colors = ["red", "green", "blue"];
    let placed = [];
    let radius = 38;
    for (let c = 0; c < 3; c++) {
      let color = colors[c];
      let count = 0;
      while (count < 5) {
        let tryX = random(80, 560);
        let tryY = random(100, 250);
        let overlap = false;
        for (let b of placed) {
          if (dist(tryX, tryY, b.x, b.y) < radius * 2 + 8) {
            overlap = true;
            break;
          }
        }
        if (!overlap) {
          let ball = { x: tryX, y: tryY, color: color, dragging: false };
          easyBalls.push(ball);
          placed.push(ball);
          count++;
        }
      }
    }
    easyScore = 0;
    easyTimer = millis();
    easyGameStarted = true;
    easyDraggingIdx = null;
    easyGameOver = false;
  }

  // 計時
  let remain = max(0, 15 - int((millis() - easyTimer) / 1000));
  fill(255);
  textSize(22);
  textAlign(LEFT, TOP);
  text("剩餘時間：" + remain + " 秒", 20, 80);
  text("分數：" + easyScore, 20, 110);

  // 畫目標區
  for (let t of easyTargets) {
    fill(t.color);
    stroke(0);
    ellipse(t.x, t.y, 90, 90);
  }
  fill(0);
  textSize(18);
  textAlign(CENTER, CENTER);
  text("紅", easyTargets[0].x, easyTargets[0].y);
  text("綠", easyTargets[1].x, easyTargets[1].y);
  text("藍", easyTargets[2].x, easyTargets[2].y);

  // 畫球
  for (let i = 0; i < easyBalls.length; i++) {
    let b = easyBalls[i];
    fill(b.color);
    stroke(0);
    ellipse(b.x, b.y, 76, 76);
  }

  // 手指拖曳
  if (hands.length > 0) {
    let finger = hands[0].landmarks[8];
    // 拖曳中
    if (easyDraggingIdx !== null) {
      easyBalls[easyDraggingIdx].x = finger[0];
      easyBalls[easyDraggingIdx].y = finger[1];
      // 放到正確目標
      let b = easyBalls[easyDraggingIdx];
      for (let t of easyTargets) {
        if (
          dist(b.x, b.y, t.x, t.y) < 65 &&
          b.color === t.color
        ) {
          easyScore++;
          // 移除該球
          easyBalls.splice(easyDraggingIdx, 1);
          easyDraggingIdx = null;
          break;
        }
      }
    } else {
      // 檢查是否點到球
      for (let i = 0; i < easyBalls.length; i++) {
        let b = easyBalls[i];
        if (dist(finger[0], finger[1], b.x, b.y) < 40) {
          easyDraggingIdx = i;
          break;
        }
      }
    }
  } else {
    easyDraggingIdx = null;
  }

  // 時間到或球全放完
  if (remain <= 0 || easyBalls.length === 0) {
    easyGameOver = true;
  }

  // --- 新增：結束後返回選單按鈕 ---
  if (easyGameOver) {
    // 按鈕參數
    let btnX = width / 2 - 80, btnY = height / 2 + 40, btnW = 160, btnH = 60;
    fill(255);
    stroke(0);
    rect(btnX, btnY, btnW, btnH, 15);
    fill(0);
    noStroke();
    textSize(22);
    textAlign(CENTER, CENTER);
    text("返回選單", btnX + btnW / 2, btnY + btnH / 2);

    // 手指動畫
    if (hands.length > 0) {
      let finger = hands[0].landmarks[8];
      if (
        finger[0] > btnX && finger[0] < btnX + btnW &&
        finger[1] > btnY && finger[1] < btnY + btnH
      ) {
        if (!fingerOnEasyBack) {
          fingerOnEasyBack = { startTime: millis(), fingerPos: finger.slice() };
        } else {
          fingerOnEasyBack.fingerPos = finger.slice();
        }
      } else {
        fingerOnEasyBack = null;
      }
    } else {
      fingerOnEasyBack = null;
    }
    if (fingerOnEasyBack) {
      let now = millis();
      let progress = constrain((now - fingerOnEasyBack.startTime) / 500, 0, 1);
      noFill();
      stroke(0, 255, 0);
      strokeWeight(6);
      let r = 40;
      let startA = -HALF_PI;
      arc(
        fingerOnEasyBack.fingerPos[0], fingerOnEasyBack.fingerPos[1],
        r, r,
        startA, startA + progress * TWO_PI
      );
      strokeWeight(1);
      if (progress >= 1) {
        gameState = "menu";
        easyGameStarted = false;
        easyGameOver = false;
        fingerOnEasyBack = null;
      }
    }
    return;
  }
}

// --- 一般模式 ---
let normalWords = [
  { q: "蘋果", a: "apple" },
  { q: "香蕉", a: "banana" },
  { q: "貓", a: "cat" },
  { q: "狗", a: "dog" },
  { q: "書", a: "book" },
  { q: "桌子", a: "table" },
  { q: "椅子", a: "chair" },
  { q: "魚", a: "fish" },
  { q: "鳥", a: "bird" },
  { q: "太陽", a: "sun" }
];
let normalCurrent = null;
let normalOptions = [];
let normalScore = 0;
let normalTimer = 0;
let normalGameStarted = false;
let normalGameOver = false;
let fingerOnNormalBtn = [null, null, null, null];
let fingerOnNormalBack = null;
let normalBtnState = [null, null, null, null]; // null/true/false
let normalBtnLockTime = 0; // >0時鎖定互動

/**
 * 一般模式主流程
 */
function playNormal() {
  // 結束畫面
  if (normalGameOver) {
    fingerOnNormalRetry.action = () => {
      normalGameStarted = false;
      normalGameOver = false;
      fingerOnNormalRetry.startTime = null;
      fingerOnNormalMenu.startTime = null;
    };
    fingerOnNormalMenu.action = () => {
      gameState = "menu";
      normalGameStarted = false;
      normalGameOver = false;
      fingerOnNormalRetry.startTime = null;
      fingerOnNormalMenu.startTime = null;
    };
    drawGameOverPanel(normalScore, null, null, fingerOnNormalRetry, fingerOnNormalMenu);
    return;
  }

  if (!normalGameStarted) {
    // 初始化
    normalCurrent = floor(random(normalWords.length));
    let correct = normalWords[normalCurrent].a;
    // 隨機選三個錯誤選項
    let options = [correct];
    while (options.length < 4) {
      let w = normalWords[floor(random(normalWords.length))].a;
      if (!options.includes(w)) options.push(w);
    }
    shuffle(options, true);
    normalOptions = options;
    normalScore = 0;
    normalTimer = millis();
    normalGameStarted = true;
    normalGameOver = false;
    fingerOnNormalBtn = [null, null, null, null];
    normalBtnState = [null, null, null, null];
    normalBtnLockTime = 0;
  }

  // 計時
  let remain = max(0, 30 - int((millis() - normalTimer) / 1000));
  fill(255);
  textSize(22);
  textAlign(LEFT, TOP);
  text("剩餘時間：" + remain + " 秒", 20, 80);
  text("分數：" + normalScore, 20, 110);

  // 題目半透明白色方塊
  fill(255, 230);
  noStroke();
  rect(width / 2 - 200, 120, 400, 60, 16);

  // 題目文字
  fill(0);
  textSize(28);
  textAlign(CENTER, CENTER);
  text("請選出「" + normalWords[normalCurrent].q + "」的英文", width / 2, 150);

  // 2x2選項按鈕（兩行兩列，置中且不接觸）
  let btnW = 180, btnH = 60;
  let gapX = 40, gapY = 30;
  let startX = width / 2 - btnW - gapX / 2;
  let startY = 220;
  for (let i = 0; i < 4; i++) {
    let row = floor(i / 2), col = i % 2;
    let btnX = startX + col * (btnW + gapX);
    let btnY = startY + row * (btnH + gapY);

    // 按鈕顏色
    if (normalBtnState[i] === true) {
      fill(0, 180, 0); // 綠色
      stroke(0);
    } else if (normalBtnState[i] === false) {
      fill(220, 0, 0); // 紅色
      stroke(0);
    } else {
      fill(255);
      stroke(0);
    }
    rect(btnX, btnY, btnW, btnH, 12);

    // 文字顏色
    if (normalBtnState[i] === true || normalBtnState[i] === false) {
      fill(255);
    } else {
      fill(0);
    }
    noStroke();
    textSize(22);
    textAlign(CENTER, CENTER);
    text(normalOptions[i], btnX + btnW / 2, btnY + btnH / 2);

    // 手指偵測與3秒動畫（只有沒鎖定時才偵測）
    if (hands.length > 0 && normalBtnLockTime === 0) {
      let finger = hands[0].landmarks[8];
      if (
        finger[0] > btnX && finger[0] < btnX + btnW &&
        finger[1] > btnY && finger[1] < btnY + btnH
      ) {
        if (!fingerOnNormalBtn[i]) {
          fingerOnNormalBtn[i] = { startTime: millis(), fingerPos: finger.slice() };
        } else {
          fingerOnNormalBtn[i].fingerPos = finger.slice();
        }
      } else {
        fingerOnNormalBtn[i] = null;
      }
      if (fingerOnNormalBtn[i]) {
        let now = millis();
        let progress = constrain((now - fingerOnNormalBtn[i].startTime) / 2000, 0, 1); // 2秒
        noFill();
        stroke(0, 255, 0);
        strokeWeight(6);
        let r = 40;
        let startA = -HALF_PI;
        arc(
          fingerOnNormalBtn[i].fingerPos[0], fingerOnNormalBtn[i].fingerPos[1],
          r, r,
          startA, startA + progress * TWO_PI
        );
        strokeWeight(1);
        if (progress >= 1) {
          // 判斷正確與否，並鎖定1秒
          if (normalOptions[i] === normalWords[normalCurrent].a) {
            normalScore++;
            normalBtnState[i] = true;
          } else {
            normalBtnState[i] = false;
          }
          normalBtnLockTime = millis();
        }
      }
    }
  }

  // 鎖定狀態下，1秒後自動切題
  if (normalBtnLockTime > 0 && millis() - normalBtnLockTime > 1000) {
    // 換下一題
    normalCurrent = floor(random(normalWords.length));
    let correct = normalWords[normalCurrent].a;
    let options = [correct];
    while (options.length < 4) {
      let w = normalWords[floor(random(normalWords.length))].a;
      if (!options.includes(w)) options.push(w);
    }
    shuffle(options, true);
    normalOptions = options;
    fingerOnNormalBtn = [null, null, null, null];
    normalBtnState = [null, null, null, null];
    normalBtnLockTime = 0;
  }

  // 時間到
  if (remain <= 0) {
    normalGameOver = true;
  }

  // --- 新增：結束後返回選單按鈕 ---
  if (normalGameOver) {
    // 按鈕參數
    let btnX = width / 2 - 80, btnY = height / 2 + 40, btnW = 160, btnH = 60;
    fill(255);
    stroke(0);
    rect(btnX, btnY, btnW, btnH, 15);
    fill(0);
    noStroke();
    textSize(22);
    textAlign(CENTER, CENTER);
    text("返回選單", btnX + btnW / 2, btnY + btnH / 2);

    // 手指動畫
    if (hands.length > 0) {
      let finger = hands[0].landmarks[8];
      if (
        finger[0] > btnX && finger[0] < btnX + btnW &&
        finger[1] > btnY && finger[1] < btnY + btnH
      ) {
        if (!fingerOnNormalBack) {
          fingerOnNormalBack = { startTime: millis(), fingerPos: finger.slice() };
        } else {
          fingerOnNormalBack.fingerPos = finger.slice();
        }
      } else {
        fingerOnNormalBack = null;
      }
    } else {
      fingerOnNormalBack = null;
    }
    if (fingerOnNormalBack) {
      let now = millis();
      let progress = constrain((now - fingerOnNormalBack.startTime) / 500, 0, 1);
      noFill();
      stroke(0, 255, 0);
      strokeWeight(6);
      let r = 40;
      let startA = -HALF_PI;
      arc(
        fingerOnNormalBack.fingerPos[0], fingerOnNormalBack.fingerPos[1],
        r, r,
        startA, startA + progress * TWO_PI
      );
      strokeWeight(1);
      if (progress >= 1) {
        gameState = "menu";
        normalGameStarted = false;
        normalGameOver = false;
        fingerOnNormalBack = null;
      }
    }
    return;
  }
}

// --- 瘋狂模式：攔截白球 ---
let crazyBalls = [];
let crazyScore = 0;
let crazyTimer = 0;
let crazyGameStarted = false;
let crazyGameOver = false;
let fingerOnCrazyBack = null;

/**
 * 瘋狂模式主流程
 */
function playCrazy() {
  // 結束畫面
  if (crazyGameOver) {
    fingerOnCrazyRetry.action = () => {
      crazyGameStarted = false;
      crazyGameOver = false;
      crazyBallSpeed = 6;
      crazyLastSpeedUp = 0;
      crazyBallGenRemainder = 0;
      fingerOnCrazyRetry.startTime = null;
      fingerOnCrazyMenu.startTime = null;
    };
    fingerOnCrazyMenu.action = () => {
      gameState = "menu";
      crazyGameStarted = false;
      crazyGameOver = false;
      crazyBallSpeed = 6;
      crazyLastSpeedUp = 0;
      crazyBallGenRemainder = 0;
      fingerOnCrazyRetry.startTime = null;
      fingerOnCrazyMenu.startTime = null;
    };
    drawGameOverPanel(crazyScore, null, null, fingerOnCrazyRetry, fingerOnCrazyMenu);
    return;
  }

  // --- 參數設定 ---
  crazyBallSize = 70; // 球變大
  let baseSpeed = 6;
  let speedUpInterval = 5000; // 每5秒加速
  let speedUpRate = 1.1;      // 每次加速10%
  let ballGenInterval = 500;  // 每0.5秒產生球
  let ballsPerGen = 2;        // 每次產生2顆

  if (!crazyGameStarted) {
    crazyBalls = [];
    crazyScore = 0;
    crazyTimer = millis();
    crazyGameStarted = true;
    crazyGameOver = false;
    crazyBallSpeed = baseSpeed;
    crazyLastSpeedUp = millis();
    crazyLastBallGen = millis();
  }

  // 計時
  let remain = max(0, 15 - int((millis() - crazyTimer) / 1000));
  fill(255);
  textSize(22);
  textAlign(LEFT, TOP);
  text("剩餘時間：" + remain + " 秒", 20, 80);
  text("分數：" + crazyScore, 20, 110);

  // --- 動態加速 ---
  if (millis() - crazyLastSpeedUp >= speedUpInterval) {
    crazyBallSpeed *= speedUpRate;
    crazyLastSpeedUp += speedUpInterval;
  }

  // --- 出球量 ---
  if (millis() - crazyLastBallGen >= ballGenInterval && remain > 0) {
    crazyLastBallGen += ballGenInterval;
    for (let i = 0; i < ballsPerGen; i++) {
      let color = random() < 0.5 ? "white" : "black";
      crazyBalls.push({
        x: random(50, width - 50),
        y: -crazyBallSize / 2,
        color: color,
        caught: false
      });
    }
  }

  // 畫球並下落
  for (let b of crazyBalls) {
    if (!b.caught) {
      fill(b.color === "white" ? 255 : 0);
      stroke(0);
      ellipse(b.x, b.y, crazyBallSize, crazyBallSize);
      b.y += crazyBallSpeed;
    }
  }

  // 手指攔截
  if (hands.length > 0) {
    let finger = hands[0].landmarks[8];
    for (let b of crazyBalls) {
      if (
        !b.caught &&
        b.color === "white" &&
        dist(finger[0], finger[1], b.x, b.y) < crazyBallSize / 2 - 5
      ) {
        b.caught = true;
        crazyScore++;
      }
    }
  }

  // 移除已掉出畫面或已攔截的球
  crazyBalls = crazyBalls.filter(b => b.y < height + crazyBallSize && !b.caught);

  // 時間到
  if (remain <= 0) {
    crazyGameOver = true;
  }

  // --- 新增：結束後返回選單按鈕 ---
  if (crazyGameOver) {
    // 按鈕參數
    let btnX = width / 2 - 80, btnY = height / 2 + 40, btnW = 160, btnH = 60;
    fill(255);
    stroke(0);
    rect(btnX, btnY, btnW, btnH, 15);
    fill(0);
    noStroke();
    textSize(22);
    textAlign(CENTER, CENTER);
    text("返回選單", btnX + btnW / 2, btnY + btnH / 2);

    // 手指動畫
    if (hands.length > 0) {
      let finger = hands[0].landmarks[8];
      if (
        finger[0] > btnX && finger[0] < btnX + btnW &&
        finger[1] > btnY && finger[1] < btnY + btnH
      ) {
        if (!fingerOnCrazyBack) {
          fingerOnCrazyBack = { startTime: millis(), fingerPos: finger.slice() };
        } else {
          fingerOnCrazyBack.fingerPos = finger.slice();
        }
      } else {
        fingerOnCrazyBack = null;
      }
    } else {
      fingerOnCrazyBack = null;
    }
    if (fingerOnCrazyBack) {
      let now = millis();
      let progress = constrain((now - fingerOnCrazyBack.startTime) / 500, 0, 1);
      noFill();
      stroke(0, 255, 0);
      strokeWeight(6);
      let r = 40;
      let startA = -HALF_PI;
      arc(
        fingerOnCrazyBack.fingerPos[0], fingerOnCrazyBack.fingerPos[1],
        r, r,
        startA, startA + progress * TWO_PI
      );
      strokeWeight(1);
      if (progress >= 1) {
        gameState = "menu";
        crazyGameStarted = false;
        crazyGameOver = false;
        fingerOnCrazyBack = null;
      }
    }
    return;
  }
}
