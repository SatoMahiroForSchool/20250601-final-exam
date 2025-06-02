let video;
let predictions = [];
let facemesh;
let handpose;
let hands = [];
let gameState = "menu"; // "menu" or "play"
let button1 = { x: 170, y: 200, w: 140, h: 60, label: "開始遊戲" };
let button2 = { x: 330, y: 200, w: 140, h: 60, label: "說明" };

// 手指碰觸按鈕的動畫狀態
let fingerOnBtn = null; // {btnIndex, startTime, fingerPos}

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
  image(video, 0, 0, width, height);

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
  }

  // ...以下為你的遊戲主流程（可保留原本的臉部與手勢偵測）...
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

// 畫出中央兩個按鈕
function drawMenuButtons() {
  textAlign(CENTER, CENTER);
  textSize(28);
  // 按鈕1
  fill(255);
  stroke(0);
  rect(button1.x, button1.y, button1.w, button1.h, 15);
  fill(0);
  noStroke();
  text(button1.label, button1.x + button1.w / 2, button1.y + button1.h / 2);
  // 按鈕2
  fill(255);
  stroke(0);
  rect(button2.x, button2.y, button2.w, button2.h, 15);
  fill(0);
  noStroke();
  text(button2.label, button2.x + button2.w / 2, button2.y + button2.h / 2);

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
      if (fingerOnBtn.btnIndex === 0) {
        gameState = "play";
      } else if (fingerOnBtn.btnIndex === 1) {
        alert("這裡可以放遊戲說明！");
      }
      fingerOnBtn = null;
    }
  }
}

// 判斷手指是否在按鈕上，回傳按鈕index（0或1），否則回傳null
function isFingerOnButton(finger) {
  let btns = [button1, button2];
  for (let i = 0; i < btns.length; i++) {
    let b = btns[i];
    if (
      finger[0] > b.x && finger[0] < b.x + b.w &&
      finger[1] > b.y && finger[1] < b.y + b.h
    ) {
      return i;
    }
  }
  return null;
}

// 控制手指動畫進度
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
