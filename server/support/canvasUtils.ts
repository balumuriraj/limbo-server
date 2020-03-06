import * as fs from "fs";
import { createCanvas, loadImage, Canvas } from "canvas";
import { extractVideoFrame, createVideoChildProcess } from "./ffmpeg";

const padToFour = number => number <= 9999 ? `000${number}`.slice(-4) : number;

export async function updateFrames(lottieCanvas: Canvas, animation: any, tempDirPath: string, count: number, width: number, height: number) {
  let canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  let tempCanvas = createCanvas(width, height);
  const tempCtx = tempCanvas.getContext("2d");

  const promises = [];

  for (let i = 1; i <= count; i++) {
    const imgPath = `${tempDirPath}/video-${padToFour(i)}.jpg`;
    const image = await loadImage(imgPath);

    ctx.clearRect(0, 0, width, height);
    tempCtx.clearRect(0, 0, width, height);

    // Converting matte image into alpha channel
    tempCtx.drawImage(image, 0, height, width, height, 0, 0, width, height);
    const tempImageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const tempData32 = new Uint32Array(tempImageData.data.buffer);
    let j = 0;
    const len = tempData32.length;
    while (j < len) {
      tempData32[j] = tempData32[j++] << 8;
    }
    ctx.putImageData(tempImageData, 0, 0);

    // draw video image
    ctx.globalCompositeOperation = "source-out";
    ctx.drawImage(image, 0, 0, width, height, 0, 0, width, height);
    ctx.globalCompositeOperation = "destination-over";

    // lottie-node
    animation.goToAndStop(i - 1, true);
    ctx.drawImage(lottieCanvas, 0, 0, width, height);

    const out = fs.createWriteStream(imgPath);
    const stream = canvas.createJPEGStream();
    stream.pipe(out);
    const promise =  new Promise<void>((resolve, reject) => {
      out.on("finish", () => resolve());
    });

    promises.push(promise);
  }

  await Promise.all(promises);

  canvas = null;
  tempCanvas = null;
}

export async function processVideo(lottieCanvas: Canvas, animation: any, tempDirPath: string, count: number, width: number, height: number) {
  const videoPath = `${tempDirPath}/video.mp4`;

  let canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  let tempCanvas = createCanvas(width, height);
  const tempCtx = tempCanvas.getContext("2d");

  return new Promise(async (resolve, reject) => {
    const ffmpeg = createVideoChildProcess(`${tempDirPath}/output.mp4`, resolve, reject);

    for (let i = 0; i < count; i++) {
      const frameBuffer = await extractVideoFrame(i, videoPath);
      const image = await loadImage(frameBuffer);

      ctx.clearRect(0, 0, width, height);
      tempCtx.clearRect(0, 0, width, height);

      // Converting matte image into alpha channel
      tempCtx.drawImage(image, 0, height, width, height, 0, 0, width, height);
      const tempImageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      const tempData32 = new Uint32Array(tempImageData.data.buffer);
      let j = 0;
      const len = tempData32.length;
      while (j < len) {
        tempData32[j] = tempData32[j++] << 8;
      }
      ctx.putImageData(tempImageData, 0, 0);

      // draw video image
      ctx.globalCompositeOperation = "source-out";
      ctx.drawImage(image, 0, 0, width, height, 0, 0, width, height);
      ctx.globalCompositeOperation = "destination-over";

      // lottie-node
      animation.goToAndStop(i, true);
      ctx.drawImage(lottieCanvas, 0, 0, width, height);

      const stream = canvas.createJPEGStream();
      await new Promise<void>((resolve, reject) => {
        stream.on("data", (chunk) => {
          ffmpeg.stdin.write(chunk);
          resolve();
        });

        stream.on("end", () => {});
      });
    }

    ffmpeg.stdin.end();

    canvas = null;
    tempCanvas = null;
  });
}
