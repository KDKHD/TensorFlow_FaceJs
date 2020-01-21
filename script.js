const video = document.getElementById("video");

// const labeled = {
//     Kenneth: [
//       "https://i.ibb.co/fGs7Wyj/Screenshot-2020-01-20-at-23-46-15.png",
//       "https://i.ibb.co/0DY15V7/IMG-8453.jpg"
//     ],
//     Maurits: [
//         "https://i.ibb.co/yB3G2Xk/Screenshot-2020-01-20-at-23-53-18.png"
//     ]
//   };

const labeled = {};

function processForm() {
  var name = document.getElementById("name").value;
  var url = document.getElementById("url").value;

  if (name in labeled) {
    labeled[name].push(url);
  } else {
    labeled[name] = [url];
  }

  document.getElementById("name").value = "";
  document.getElementById("url").value = "";
  document.getElementById("status").innerHTML =
    'Images ready to be processed. Click "Refresh"';

  console.log(labeled);
}

function reloadImages() {
  start();
}

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri("./models"),
  faceapi.nets.faceLandmark68Net.loadFromUri("./models"),
  faceapi.nets.faceRecognitionNet.loadFromUri("./models"),
  faceapi.nets.faceExpressionNet.loadFromUri("./models"),
  faceapi.nets.ssdMobilenetv1.loadFromUri("./models")
]).then(startVideo);

function startVideo() {
  navigator.getUserMedia(
    {
      video: {}
    },
    stream => (video.srcObject = stream),
    err => console.error(err)
  );
}

video.addEventListener("play", () => {
  start();
});

async function start() {
  document.getElementById("status").innerHTML = "Loading...";
  const canvas = faceapi.createCanvasFromMedia(video);
  const labeledFaceDescriptors = await loadLabeledImages();
  console.log("loaded");
  document.getElementById("status").innerHTML = "Ready";

  const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.8);

  document.getElementById("videoContainer").append(canvas);
  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, displaySize);
  setInterval(async () => {
    const detections = await faceapi
      .detectAllFaces(video)
      .withFaceLandmarks()
      .withFaceExpressions()
      .withFaceDescriptors();
    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    const results = resizedDetections.map(d =>
      faceMatcher.findBestMatch(d.descriptor)
    );

    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    results.forEach((result, i) => {
      const box = resizedDetections[i].detection.box;
      const drawBox = new faceapi.draw.DrawBox(box, {
        label: result.toString()
      });
      drawBox.draw(canvas);
    });
    // faceapi.draw.drawDetections(canvas, resizedDetections)
    //faceapi.draw.drawFaceLandmarks(canvas, resizedDetections)
    faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
  }, 100);
}

function loadLabeledImages() {
  //const labels = ['Black Widow', 'Captain America', 'Captain Marvel', 'Hawkeye', 'Jim Rhodes', 'Thor', 'Tony Stark']

  return Promise.all(
    Object.keys(labeled).map(async label => {
      const descriptions = [];
      for (let i = 0; i < labeled[label].length; i++) {
        console.log(labeled[label][i]);
        const img = await faceapi.fetchImage(labeled[label][i]);
        const detections = await faceapi
          .detectSingleFace(img)
          .withFaceLandmarks()
          .withFaceDescriptor();
        descriptions.push(detections.descriptor);
      }

      return new faceapi.LabeledFaceDescriptors(label, descriptions);
    })
  );
}
