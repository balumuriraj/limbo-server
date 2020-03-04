import * as express from "express";
import * as fs from "fs";
import { createCanvas, loadImage } from "canvas";
import * as tmp from "tmp";
import { createVideo, extractVideoFrames } from "../../support/ffmpeg";
import { getJSON } from "../../support/utils";
import { getLottieAnimation } from "../../support/lottie";
import { getDownloadUrl } from "../../support/firebaseUtils";

const router = express.Router();
const padToFour = number => number <= 9999 ? `000${number}`.slice(-4) : number;

const outputFileName = "output.mp4";
const videoFrameFileName = "video-%04d.jpg";
const lottieFrameFileName = "frame-%04d.png";

router.get("/create/:id", async (req, res, next) => {
  req.connection.setTimeout(1000 * 60 * 5); // 5 minutes
  const id = req.params.id;
  const videoPath = `media/clips/${id}.mp4`;
  const animationPath = `data/jsons/${id}.json`;
  const { size, facePaths, framesCount } = req.query;

  let tempDir = null;

  try {
    const dimensions = JSON.parse(size);
    const width = parseInt(dimensions[0], null);
    const height = parseInt(dimensions[1], null);

    tmp.setGracefulCleanup();
    tempDir = tmp.dirSync({ unsafeCleanup: true });
    const tempDirPath = tempDir.name;
    // console.log("tempDirPath: ", tempDirPath);

    const faces = JSON.parse(facePaths);
    const faceUrls: string[] = [];

    for (const facePath of faces) {
      const faceUrl = await getDownloadUrl(facePath);
      faceUrls.push(faceUrl);
    }

    const animationUrl = await getDownloadUrl(animationPath);
    const lottieCanvas = createCanvas(width, height);
    const json = await getJSON(animationUrl, faceUrls);
    const animation = getLottieAnimation(json, lottieCanvas, { width, height });

    // let t1 = null; let t2 = null;
    // t1 = Date.now();
    await extractVideoFrames(videoPath, tempDirPath);
    // t2 = Date.now();
    // console.log(`extractVideoFrames: ${(Math.abs(t1 - t2) / 1000) % 60}sec`);

    const promises: Promise<void>[] = [];

    // t1 = Date.now();
    const count = parseInt(framesCount, null);
    for (let i = 1; i <= count; i++) {
      const imgPath = `${tempDirPath}/video-${padToFour(i)}.jpg`;
      const image = await loadImage(imgPath);

      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      const tempCanvas = createCanvas(width, height);
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
      animation.goToAndStop(i - 1, true);
      ctx.drawImage(lottieCanvas, 0, 0, width, height);

      const out = fs.createWriteStream(imgPath);
      const stream = canvas.createJPEGStream();
      stream.pipe(out);
      const promise = new Promise<void>((resolve, reject) => {
        out.on("finish", () => resolve());
      });
      promises.push(promise);
    }
    // t2 = Date.now();
    // console.log(`forLoop: ${(Math.abs(t1 - t2) / 1000) % 60}sec`);

    // t1 = Date.now();
    await Promise.all(promises);
    await createVideo(tempDirPath, outputFileName);
    // console.log("all done...");

    // t2 = Date.now();
    // console.log(`createVideo: ${(Math.abs(t1 - t2) / 1000) % 60}sec`);

    // res.download(`${tempDirPath}/${outputFileName}`);

    const path = `${tempDirPath}/${outputFileName}`;
    const stat = fs.statSync(path);
    const fileSize = stat.size;
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1]
        ? parseInt(parts[1], 10)
        : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(path, { start, end });
      const head = {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": "video/mp4"
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        "Content-Length": fileSize,
        "Content-Type": "video/mp4"
      };
      res.writeHead(200, head);
      fs.createReadStream(path).pipe(res);
    }
  } catch (err) {
    console.log(err);
    res.send(err);
  } finally {
    if (tempDir) {
      tempDir.removeCallback();
    }
  }
});

export default router;
