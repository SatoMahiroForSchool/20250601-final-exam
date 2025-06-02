let video;
let predictions = [];
let facemesh;
let handpose;
let hands = [];
let gameState = "menu"; // "menu" or "play"
let buttons = [
  { x: 250, y: 170, w: 140, h: 60, label: "新手模式" },
  { x: 250, y: 250, w: 140, h: 60, label: "一般模式" },
  { x: 250, y: 330, w: 140, h: 60, label: "瘋狂模式" }
];

// 手指碰觸按鈕的動畫狀態
let fingerOnBtn = null; // {btnIndex, startTime, fingerPos}
let fingerOnBack = null; // {startTime, fingerPos}

// 返回選單按鈕設定
const backBtn = { x: 480, y: 400, w: 140, h: 60, label: "返回選單" };

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

    // 右上角提示（不是按鈕）
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
          fingerOnBtn = null; // 離開按鈕就重置
        }
      } else {
        fingerOnBtn = null;
      }
      return;
    } else {
      // 遊戲主流程右下角顯示返回選單按鈕
      drawBackButton();

      // 手指碰觸返回按鈕偵測與動畫
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

// 右上角提示
function drawTopRightHint() {
  fill(255);
  noStroke();
  rect(width - 320, 20, 300, 40, 10);
  fill(0);
  textSize(18);
  textAlign(LEFT, CENTER);
  text("將手指移動到按鈕上0.5秒以做操作", width - 310, 40);
}

// 畫出中央偏上的三個上下排列按鈕與標題
function drawMenuButtons() {
  // 中央偏上標題
  textAlign(CENTER, CENTER);
  textSize(32);
  fill(0, 102, 204);
  noStroke();
  text("記憶遊戲", width / 2, 120);

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
    // 畫滿就觸發按鈕
    if (progress >= 1) {
      gameState = "play";
      fingerOnBtn = null;
    }
  }
}

// 右下角返回選單按鈕
function drawBackButton() {
  // 按鈕外觀
  fill(255);
  stroke(0);
  rect(backBtn.x, backBtn.y, backBtn.w, backBtn.h, 15);
  fill(0);
  noStroke();
  textSize(22);
  textAlign(CENTER, CENTER);
  text(backBtn.label, backBtn.x + backBtn.w / 2, backBtn.y + backBtn.h / 2);

  // 若有手指動畫，畫出綠色圓圈進度
  if (fingerOnBack) {
    let now = millis();
    let progress = constrain((now - fingerOnBack.startTime) / 500, 0, 1); // 0.5秒
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
    // 畫滿就觸發返回
    if (progress >= 1) {
      gameState = "menu";
      fingerOnBack = null;
    }
  }
}

// 判斷手指是否在按鈕上，回傳按鈕index（0~2），否則回傳null
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

// 判斷手指是否在返回按鈕上
function isFingerOnBackButton(finger) {
  return (
    finger[0] > backBtn.x && finger[0] < backBtn.x + backBtn.w &&
    finger[1] > backBtn.y && finger[1] < backBtn.y + backBtn.h
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
