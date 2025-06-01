let video;
let predictions = [];
let hands = [];
let facemesh;
let handpose;
let detectionPhase = "face"; // 偵測階段：face、hand、complete 或 question
let countdown = 3; // 倒數計時
let countdownStartTime;
let currentQuestionIndex = 0; // 當前問題索引
let score = 0; // 使用者分數
let showFeedback = false; // 是否顯示答對或答錯的視覺反饋
let feedbackStartTime; // 視覺反饋開始時間
let feedbackType = ""; // "correct" 或 "wrong"
let questionCountdown = 10; // 問題倒數計時

// 問題清單，包含問題文字、選項和正確答案
let questions = [
  {
    question: "這堂課叫什麼名字？",
    options: {
      scissors: "程式設計與實習（二）",
      rock: "慶帆的點名實錄（二）",
      paper: "AI設計與應用（二）"
    },
    correctAnswer: "scissors"
  },
  {
    question: "使用攝影機偵測動作需要在index.html內放入什麼網址？",
    options: {
      scissors: "m15.js",
      rock: "ml5.js",
      paper: "p5.js"
    },
    correctAnswer: "rock"
  },
  {
    question: "為什麼setup中畫布的大小要設置成(640,480)？",
    options: {
      scissors: "這是攝影常用的一個影像解析度",
      rock: "兼容性、影像比例與效能都兼具的選擇",
      paper: "他們都對、選我就對"
    },
    correctAnswer: "paper"
  },
  {
    question: "在visual studio code中如果沒有安裝什麼，則在命令選擇區中輸入>p5.js會無法運行？",
    options: {
      scissors: "github copilot",
      rock: "p5.vscode",
      paper: "Chinese language pack for visual studio code"
    },
    correctAnswer: "rock"
  },
  {
    question: "偵測手部的video影像辨識是使用哪個指令？",
    options: {
      scissors: "handpose",
      rock: "facemesh",
      paper: "bodypose"
    },
    correctAnswer: "scissors"
  }
];

function setup() {
  createCanvas(640, 480); // 設置畫布大小

  // 啟用攝影機
  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  // 啟用 facemesh 模型，用於臉部偵測
  facemesh = ml5.facemesh(video, () => {
    console.log("Facemesh model loaded!");
  });
  facemesh.on("predict", results => {
    predictions = results; // 儲存臉部偵測結果
  });

  // 啟用 handpose 模型，用於手部偵測
  handpose = ml5.handpose(video, () => {
    console.log("Handpose model loaded!");
  });
  handpose.on("predict", results => {
    hands = results; // 儲存手部偵測結果
  });
}

function draw() {
  if (!video) return; // 如果攝影機尚未啟用則不執行

  image(video, 0, 0, width, height); // 顯示攝影機畫面

  // 繪製偵測框
  drawDetectionBox();

  // 根據不同的偵測階段執行對應邏輯
  if (detectionPhase === "face") {
    handleFaceDetection(); // 處理臉部偵測邏輯
  } else if (detectionPhase === "hand") {
    handleHandDetection(); // 處理手部偵測邏輯
  } else if (detectionPhase === "complete") {
    handleCompletionPhase(); // 處理完成偵測階段邏輯
  } else if (detectionPhase === "question") {
    handleQuestionPhase(); // 處理問題階段邏輯
  } else if (detectionPhase === "finished") {
    handleFinishedPhase(); // 處理完成作答階段邏輯
  }

  // 顯示答對或答錯的視覺反饋
  if (showFeedback) {
    handleFeedback(); // 處理視覺反饋邏輯
  }
}

// 繪製偵測框
function drawDetectionBox() {
  const boxX = width / 2 - 100; // 偵測框的 X 座標
  const boxY = height / 2 - 100; // 偵測框的 Y 座標
  const boxWidth = 200; // 偵測框的寬度
  const boxHeight = 200; // 偵測框的高度

  noFill();
  stroke(0, 255, 0); // 設置綠色邊框
  strokeWeight(3); // 設置邊框粗細為 3px
  rect(boxX, boxY, boxWidth, boxHeight); // 繪製矩形框
}

// 判斷點是否在偵測框內
function isInsideBox(x, y) {
  const boxX = width / 2 - 100;
  const boxY = height / 2 - 100;
  const boxWidth = 200;
  const boxHeight = 200;

  // 判斷點是否在框內
  return x > boxX && x < boxX + boxWidth && y > boxY && y < boxY + boxHeight;
}

// 處理臉部偵測邏輯
function handleFaceDetection() {
  drawSpeechBubble("請將臉部置於方框之中"); // 提示使用者將臉部置於框內

  if (predictions.length > 0) {
    const keypoints = predictions[0].scaledMesh; // 取得臉部關鍵點座標
    const nose = keypoints[1]; // 假設鼻子作為臉部中心點

    if (nose && isInsideBox(nose.x, nose.y)) {
      drawSpeechBubble("成功偵測到臉部！");
      if (!countdownStartTime) countdownStartTime = millis(); // 開始倒數計時
      if (millis() - countdownStartTime > 1000) {
        countdown--;
        countdownStartTime = millis(); // 重置倒數計時
      }
      if (countdown <= 0) detectionPhase = "hand"; // 切換到手部偵測階段
    }
  }
}

// 處理手部偵測邏輯
function handleHandDetection() {
  drawSpeechBubble("偵測手部"); // 提示使用者進行手部偵測

  if (hands.length > 0) {
    for (let hand of hands) {
      if (hand.landmarks) {
        for (let i = 0; i < hand.landmarks.length; i++) {
          let keypoint = hand.landmarks[i];
          fill(255, 255, 0); // 設置黃色填充
          noStroke();
          circle(keypoint[0], keypoint[1], 10); // 繪製手部關鍵點
        }
      }
    }
    detectionPhase = "complete"; // 切換到完成階段
    countdown = 5; // 設置完成提示的倒數時間
    countdownStartTime = millis();
  }
}

// 處理完成偵測階段邏輯
function handleCompletionPhase() {
  drawSpeechBubble(`已經完成偵測步驟，接下來開始回答問題 (${countdown})`);
  if (millis() - countdownStartTime > 1000) {
    countdown--;
    countdownStartTime = millis();
  }
  if (countdown <= 0) {
    detectionPhase = "question"; // 切換到問題階段
    questionCountdown = 10; // 問題倒數時間
    countdownStartTime = millis();
  }
}

// 處理問題階段邏輯
function handleQuestionPhase() {
  const currentQuestion = questions[currentQuestionIndex];
  drawSpeechBubble(`${currentQuestion.question} (${questionCountdown})`); // 顯示問題

  if (hands.length > 0) {
    for (let hand of hands) {
      if (hand.landmarks) {
        let userAnswer = detectGesture(hand.landmarks); // 偵測手勢
        if (userAnswer) {
          feedbackType = userAnswer === currentQuestion.correctAnswer ? "correct" : "wrong";
          if (feedbackType === "correct") score += 20; // 答對加分
          showFeedback = true;
          feedbackStartTime = millis();
          currentQuestionIndex++;
          if (currentQuestionIndex >= questions.length) detectionPhase = "finished"; // 所有問題完成
          return;
        }
      }
    }
  }

  if (millis() - countdownStartTime > 1000) {
    questionCountdown--;
    countdownStartTime = millis();
  }
  if (questionCountdown <= 0) {
    currentQuestionIndex++;
    if (currentQuestionIndex >= questions.length) detectionPhase = "finished"; // 所有問題完成
  }
}

// 處理完成作答階段邏輯
function handleFinishedPhase() {
  drawSpeechBubble(`作答完成，你的分數為 ${score} 分`); // 顯示最終分數
}

// 處理視覺反饋邏輯
function handleFeedback() {
  if (feedbackType === "correct") {
    fill(0, 255, 0, 150); // 綠色圈圈
    ellipse(width / 2, height / 2, 100, 100);
  } else if (feedbackType === "wrong") {
    fill(255, 0, 0, 150); // 紅色叉叉
    textSize(32);
    textAlign(CENTER, CENTER);
    text("X", width / 2, height / 2);
  }
  if (millis() - feedbackStartTime > 1000) showFeedback = false; // 1 秒後隱藏反饋
}

// 偵測手勢函式
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
  if (indexDist < 60 && middleDist < 60 && ringDist < 60 && pinkyDist < 60) return "rock";
  // 剪刀：食指與中指伸直，其餘彎曲
  if (indexDist > 80 && middleDist > 80 && ringDist < 60 && pinkyDist < 60) return "scissors";
  // 布：四指伸直
  if (indexDist > 80 && middleDist > 80 && ringDist > 80 && pinkyDist > 80) return "paper";
  return null;
}

// 繪製對話氣泡函式
function drawSpeechBubble(text) {
  const bubbleX = width - 150; // 氣泡固定在右側
  const bubbleTextX = width - 100;

  fill(255);
  stroke(0);
  strokeWeight(2);
  beginShape();
  vertex(bubbleX, 50);
  vertex(bubbleX + 100, 50);
  vertex(bubbleX + 100, 150);
  vertex(bubbleX + 50, 150);
  vertex(bubbleX + 30, 170);
  vertex(bubbleX + 30, 150);
  vertex(bubbleX, 150);
  endShape(CLOSE);

  fill(0);
  noStroke();
  textSize(14);
  textAlign(CENTER, CENTER);
  text(text, bubbleTextX, 100); // 顯示文字
}
