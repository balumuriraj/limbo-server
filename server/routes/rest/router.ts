import * as express from "express";
import * as fs from "fs";
import { createCanvas } from "canvas";
import * as tmp from "tmp";
import { createVideoFromFrames, extractVideoFrames } from "../../support/ffmpeg";
import { getLottieAnimation } from "../../support/lottie";
import { updateFrames, processVideo } from "../../support/canvasUtils";
import { downloadFile } from "../../support/firebaseUtils";

const router = express.Router();

const outputFileName = "output.mp4";
const videoFrameFileName = "video-%04d.jpg";
const lottieFrameFileName = "frame-%04d.png";

function handleResponse(req: any, res: any, tempDirPath: string) {
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
}

async function processRequest(id: string, facePaths: string, framesCount: string, size: string, tempDirPath: string) {
  const clipPath = `media/clips/${id}.mp4`;
  const animationPath = `data/jsons/${id}.json`;

  const [width, height] = size.split(",").map((dim) => parseInt(dim.trim(), null));
  let lottieCanvas = createCanvas(width, height);
  const animation = await getLottieAnimation(lottieCanvas, animationPath, facePaths.split(",").map((path) => path.trim()), { width, height });

  let t1 = null; let t2 = null;
  t1 = Date.now();
  const videoPath = `${tempDirPath}/video.mp4`;
  await downloadFile(clipPath, videoPath);
  await extractVideoFrames(videoPath, `${tempDirPath}/${videoFrameFileName}`);
  t2 = Date.now();
  console.log(`extractVideoFrames: ${(Math.abs(t1 - t2) / 1000) % 60}sec`);

  t1 = Date.now();
  const count = parseInt(framesCount, null);
  await updateFrames(lottieCanvas, animation, tempDirPath, count, width, height);
  t2 = Date.now();
  console.log(`forLoop: ${(Math.abs(t1 - t2) / 1000) % 60}sec`);

  // destroy unwanted
  animation.renderer.renderConfig.clearCanvas = false;
  animation.destroy();
  lottieCanvas = null;

  t1 = Date.now();
  await createVideoFromFrames(tempDirPath, outputFileName);
  t2 = Date.now();
  console.log(`createVideoFromFrames: ${(Math.abs(t1 - t2) / 1000) % 60}sec`);
}

async function processRequest_alt(id: string, facePaths: string, framesCount: string, size: string, tempDirPath: string) {
  const clipPath = `media/clips/${id}.mp4`;
  const animationPath = `data/jsons/${id}.json`;

  const [width, height] = size.split(",").map((dim) => parseInt(dim.trim(), null));
  let lottieCanvas = createCanvas(width, height);
  const animation = await getLottieAnimation(lottieCanvas, animationPath, facePaths.split(",").map((path) => path.trim()), { width, height });

  let t1 = null; let t2 = null;
  t1 = Date.now();

  const videoPath = `${tempDirPath}/video.mp4`;
  await downloadFile(clipPath, videoPath);

  const count = parseInt(framesCount, null);
  await processVideo(lottieCanvas, animation, tempDirPath, count, width, height);

  t2 = Date.now();
  console.log(`processVideo: ${(Math.abs(t1 - t2) / 1000) % 60}sec`);

  // destroy unwanted
  animation.renderer.renderConfig.clearCanvas = false;
  animation.destroy();
  lottieCanvas = null;
}

router.get("/create/:id", async (req, res, next) => {
  req.connection.setTimeout(1000 * 60 * 5); // 5 minutes
  const id = req.params.id;
  const { facePaths, framesCount, size } = req.query;

  let tempDir = null;

  try {
    tmp.setGracefulCleanup();
    tempDir = tmp.dirSync({ unsafeCleanup: true });
    const tempDirPath = tempDir.name;
    // console.log("tempDirPath: ", tempDirPath);

    await processRequest(id, facePaths, framesCount, size, tempDirPath);

    const used = process.memoryUsage();
    for (const key in used) {
      console.log(`${key} ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`);
    }

    console.log("----------------------------------");

    handleResponse(req, res, tempDirPath);
  } catch (err) {
    // console.log(err);
    res.status(500).send({ error: "err" });
  } finally {
    if (tempDir) {
      tempDir.removeCallback();
    }
  }
});

export default router;
