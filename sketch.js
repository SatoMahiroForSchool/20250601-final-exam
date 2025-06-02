let video;
let predictions = [];
let hands = [];
let facemesh;
let handpose;
let detectionPhase = "face"; // 階段：face 或 hand

function setup() {
  createCanvas(640, 480); // 設置畫布大小為 640x480

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

  // 臉部偵測完成後自動進入手部偵測
  if (detectionPhase === "face") {
    if (predictions.length > 0) {
      detectionPhase = "hand";
    }
  } else if (detectionPhase === "hand") {
    if (hands.length > 0) {
      // 可在此處加入你要的手部偵測後續處理
      // 例如繪製手部關鍵點
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
}
