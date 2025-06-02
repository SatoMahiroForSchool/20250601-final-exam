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

function draw() {
  background(0);

  // 攝影機畫面成功顯示後才顯示UI
  if (video.loadedmetadata && video.width > 0 && video.height > 0) {
    image(video, 0, 0, width, height);

    // 右上角提示（只顯示純文字）
    drawTopRightHint();

    if (gameState === "menu") {
      drawMenuButtons();

      // 手指碰觸按鈕偵測與動畫
      if (hands.length > 0) {
        let fingerTip = hands[0].landmarks[8]; // 取第一隻手的食指指尖
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
    } else if (gameState.startsWith("intro")) {
      let idx = parseInt(gameState.replace("intro", ""));
      drawIntro(idx);

      // 手指碰觸開始按鈕偵測與動畫
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
    } else {
      // 遊戲主流程左上角顯示返回選單按鈕
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
    }
  } else {
    // 攝影機尚未就緒時顯示提示
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(28);
    text("正在啟動攝影機...", width / 2, height / 2);
    return;
  }

  // ...以下為你的遊戲主流程...
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

// 右上角提示（只顯示純文字，無方框）
function drawTopRightHint() {
  // 白色半透明底框
  fill(255, 230);
  noStroke();
  let boxW = 320;
  let boxH = 38;
  let boxX = width - boxW - 20;
  let boxY = 20;
  rect(boxX, boxY, boxW, boxH, 12);

  // 黑色文字
  fill(0);
  textSize(18);
  textAlign(LEFT, CENTER);
  text("將手指移動到按鈕上0.5秒以做操作", boxX + 16, boxY + boxH / 2);
}

// 畫出中央偏上的三個上下排列按鈕與標題
function drawMenuButtons() {
  // 中央偏上標題
  textAlign(CENTER, CENTER);
  textSize(32);
  fill(0, 102, 204);
  noStroke();
  text("互動遊戲", width / 2, 120);

  // 按鈕
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

  // 若有手指動畫，畫出綠色圓圈進度
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
    // 畫滿就切換到對應 intro 畫面
    if (progress >= 1) {
      gameState = "intro" + fingerOnBtn.btnIndex;
      fingerOnBtn = null;
    }
  }
}

// 中央置中說明方塊與開始按鈕
function drawIntro(idx) {
  // 半透明白色方塊
  fill(255, 230);
  noStroke();
  rect(width / 2 - 220, height / 2 - 120, 440, 220, 30);

  // 說明標題
  fill(0);
  textAlign(CENTER, TOP);
  textSize(24);
  text("說明", width / 2, height / 2 - 100);

  // 說明文字區塊（略小於白色方塊，並靠左上角）
  let textBoxX = width / 2 - 200;
  let textBoxY = height / 2 - 60;
  let textBoxW = 400;
  let textBoxH = 80;

  fill(0);
  textAlign(LEFT, TOP);
  textSize(20);

  // 自動換行顯示說明文字
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

  // 若有手指動畫，畫出綠色圓圈進度
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

// 工具函式：自動換行繪製文字
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

// 判斷手指是否在主選單按鈕上
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

// 判斷手指是否在說明畫面「開始」按鈕上
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

// 控制手指動畫進度（主選單按鈕）
function handleHandButton(btnIndex, fingerPos) {
  if (
    !fingerOnBtn ||
    fingerOnBtn.btnIndex !== btnIndex ||
    dist(fingerOnBtn.fingerPos[0], fingerOnBtn.fingerPos[1], fingerPos[0], fingerPos[1]) > 30
  ) {
    // 新進入或換按鈕或手指移動太多，重置
    fingerOnBtn = {
      btnIndex: btnIndex,
      startTime: millis(),
      fingerPos: fingerPos.slice()
    };
  } else {
    // 更新手指位置
    fingerOnBtn.fingerPos = fingerPos.slice();
  }
}

// 控制手指動畫進度（說明畫面開始按鈕）
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

// 左上角返回選單按鈕
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
    // 無論目前在哪個頁面，返回都直接回主選單
    if (progress >= 1) {
      gameState = "menu";
      fingerOnBack = null;
      fingerOnStart = null;
    }
  }
}

// 判斷手指是否在返回按鈕上（左上角）
function isFingerOnBackButton(finger) {
  return (
    finger[0] > backBtn.x && finger[0] < backBtn.x + backBtn.w &&
    finger[1] > backBtn.y && finger[1] < backBtn.y + backBtn.h
  );
}

// 控制手指動畫進度（返回按鈕）
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

// 手勢辨識函式（剪刀石頭布）
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

  // 石頭：五指都彎曲
  if (
    indexDist < 60 &&
    middleDist < 60 &&
    ringDist < 60 &&
    pinkyDist < 60
  ) {
    return "rock";
  }
  // 剪刀：食指與中指伸直，其餘彎曲
  if (
    indexDist > 80 &&
    middleDist > 80 &&
    ringDist < 60 &&
    pinkyDist < 60
  ) {
    return "scissors";
  }
  // 布：四指伸直
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
