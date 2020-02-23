import * as express from "express";
import * as path from "path";
import * as fs from "fs";
import { createCanvas, loadImage } from "canvas";
import * as tmp from "tmp";
import { createVideo, extractVideoFrames, getVideoMeta } from "../../support/ffmpeg";
import { getJSON } from "../../support/utils";
import { getLottieAnimation } from "../../support/lottie";

const router = express.Router();
const padToFour = number => number <= 9999 ? `000${number}`.slice(-4) : number;

const outputFileName = "output.mp4";
const videoFrameFileName = "video-%04d.jpg";
const lottieFrameFileName = "frame-%04d.png";

// TODO
const input = path.join(path.dirname(__dirname), "../", "public", "videos", "shot2.mp4");

router.get("/test/", async (req, res, next) => {
  req.connection.setTimeout( 1000 * 60 * 10 ); // ten minutes
  let tempDir = null;

  try {
    const width = 512; // TODO get from probe
    const height = 512 / 2; // TODO get from probe

    tmp.setGracefulCleanup();
    tempDir = tmp.dirSync({ unsafeCleanup: true });
    const tempDirPath = tempDir.name;
    console.log("tempDirPath: ", tempDirPath);

    // await renderLottie({
    //   path: path.join(path.dirname(__dirname), "../", "public", "dat.json"),
    //   output: `${tempDirPath}/${lottieFrameFileName}`
    // });

    const lottieCanvas = createCanvas(width, height);
    // const json = await getJSON("https://assets5.lottiefiles.com/packages/lf20_OcUkq1.json");
    const json = await getJSON("http://localhost:4000/static/jsons/2.json");
    const assetsPath = `${path.join(path.dirname(__dirname), "../", "public", "images", "/")}`;
    // const d = path.join(path.dirname(__dirname), "../", "public", "1.json");
    // const animation = getLottieAnimation(d, lottieCanvas, {assetsPath});
    const animation = getLottieAnimation(json, lottieCanvas);

    // const frameCount = animation.getDuration(true);
    // console.log("lottie frameCount: ", frameCount);

    let t1 = null; let t2 = null;
    t1 = Date.now();
    await extractVideoFrames(input, tempDirPath);
    t2 = Date.now();
    console.log(`extractVideoFrames: ${(Math.abs(t1 - t2) / 1000) % 60}sec`);

    const info = await getVideoMeta(input);
    const numFramesTotal = info.framesCount;
    console.log("video frameCount: ", numFramesTotal);

    const promises: Promise<void>[] = [];

    t1 = Date.now();
    for (let i = 1; i <= numFramesTotal; i++) {
      const imgPath = `${tempDirPath}/video-${padToFour(i)}.jpg`;
      const image = await loadImage(imgPath);

      const canvas = createCanvas(512, 256);
      const ctx = canvas.getContext("2d");

      const tempCanvas = createCanvas(512, 256);
      const tempCtx = tempCanvas.getContext("2d");

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
      // console.log("loaded: ", animation.isLoaded);
      animation.goToAndStop(i - 1, true);
      ctx.drawImage(lottieCanvas, 0, 0, width, height);

      // puppeteer
      // const framePath = `${tempDirPath}/frame-${padToFour(i)}.png`;
      // const frame = await loadImage(framePath);
      // ctx.drawImage(frame, 0, 0, width, height);

      const out = fs.createWriteStream(imgPath);
      const stream = canvas.createJPEGStream();
      stream.pipe(out);
      const promise = new Promise<void>((resolve, reject) => {
        out.on("finish", () => {
          resolve();
          // console.log("The JPEG file was created: ", i);
        });
      });
      promises.push(promise);
    }
    t2 = Date.now();
    console.log(`forLoop: ${(Math.abs(t1 - t2) / 1000) % 60}sec`);

    t1 = Date.now();
    await Promise.all(promises);
    await createVideo(tempDirPath, outputFileName);
    console.log("all done...");

    t2 = Date.now();
    console.log(`createVideo: ${(Math.abs(t1 - t2) / 1000) % 60}sec`);

    res.download(`${tempDirPath}/${outputFileName}`);

    tempDir.removeCallback();
  } catch (err) {
    console.log(err);
    res.send(err);
    tempDir && tempDir.removeCallback();
  }
});

export default router;
