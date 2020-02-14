import * as express from "express";
import * as path from "path";
import * as fs from "fs";
import * as ffmpeg from "fluent-ffmpeg";
import { createCanvas, loadImage } from "canvas";

const data = require("../../data/data.json");

const input = path.join(path.dirname(__dirname), "../", "data", "final.mp4");
const output = path.join(path.dirname(__dirname), "../", "data", "result", "%04d.jpg");

const pathToFfmpeg = require("ffmpeg-static");
ffmpeg.setFfmpegPath(pathToFfmpeg);

const probe = require("node-ffprobe");
const ffprobeInstaller = require("@ffprobe-installer/ffprobe");

console.log(ffprobeInstaller.path, ffprobeInstaller.version);
probe.FFPROBE_PATH = ffprobeInstaller.path;

const router = express.Router();
const fps = "25";

function extractFrames(): Promise<any> {
  const audioPath = path.join(path.dirname(__dirname), "../", "data", "audio.mp3");
  const cmd = ffmpeg(input).outputOptions(["-r", fps]);

  return new Promise((resolve, reject) => {
    cmd
      .on("start", (cmd) => console.log({ cmd }))
      .on("end", () => resolve(output))
      .on("error", (err) => reject(err))
      .output(output)
      .output(audioPath)
      .input(input).withNoVideo()
      .run();
  });
}

function createVideo() {
  const inputPath = path.join(path.dirname(__dirname), "../", "data", "result", "%04d.jpg");
  const audioPath = path.join(path.dirname(__dirname), "../", "data", "audio.mp3");
  const cmd = ffmpeg();

  return new Promise((resolve, reject) => {
    cmd
      .on("start", (cmd) => console.log({ cmd }))
      .on("end", () => resolve(output))
      .on("error", (err) => reject(err))
      .input(inputPath)
      .input(audioPath)
      .withFPS(25)
      // .videoFilter(["movie=assets/demo2/soa-watermark.png [watermark]; [in][watermark] overlay=10:main_h-overlay_h-10 [out]"])
      // .input('assets/demo2/folds-of-spacetime.m4a')
      .output(path.join(path.dirname(__dirname), "../", "data", "result.mp4"))
      .format("mp4")
      .outputFPS(25)
      .run();
  });
}

const padToFour = number => number <= 9999 ? `000${number}`.slice(-4) : number;

const headCanvas = createCanvas(512, 256);
const headCtx = headCanvas.getContext("2d");

router.get("/test/", async (req, res, next) => {
  try {
    await extractFrames();
    const info = await probe(input);
    const numFramesTotal = parseInt(info.streams[0].nb_frames, null);
    console.log("numFramesTotal: ", numFramesTotal);

    const width = 512; // TODO get from probe
    const height = 512 / 2; // TODO get from probe

    const scale = data.scale;
    const rotation = data.rotation;
    const position = data.position;

    // load face img
    const headPath = path.join(path.dirname(__dirname), "../", "data", "head.png");
    const headImg = await loadImage(headPath);
    const headWidth = (headImg.naturalWidth / headImg.naturalHeight) * headCanvas.height;
    headCtx.drawImage(headImg, 0, 0, headImg.naturalWidth, headImg.naturalHeight, headCanvas.width / 2 - headWidth / 2, 0, headWidth, headCanvas.height);

    const promises: Promise<void>[] = [];

    for (let i = 1; i <= numFramesTotal; i++) {
      const imgPath = path.join(path.dirname(__dirname), "../", "data", "result", `${padToFour(i)}.jpg`); //`../../data/result/test-${i}.png`;
      const image = await loadImage(imgPath);

      const canvas = createCanvas(512, 256);
      const ctx = canvas.getContext("2d");

      const tempCanvas = createCanvas(512, 256);
      const tempCtx = tempCanvas.getContext("2d");

      const faceCanvas = createCanvas(512, 256);
      const faceCtx = faceCanvas.getContext("2d");

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
      // tempCtx.drawImage(image, 0, height, width, height, 0, 0, width, height);

      // draw head image
      faceCtx.translate(width / 2, height / 2);

      faceCtx.transform(
        scale / 100,
        rotation * Math.PI / 180,
        -rotation * Math.PI / 180,
        scale / 100,
        position[0] - width / 2, position[1] - height / 2
      );

      const frame = data.frames[i - 1];

      if (frame) {
        faceCtx.translate(-position[0], -position[1]);

        faceCtx.transform(
          frame.scale / 100,
          (frame.rotation * Math.PI / 180),
          -(frame.rotation * Math.PI / 180),
          frame.scale / 100,
          frame.position[0],
          frame.position[1]
        );
      }

      faceCtx.translate(-width / 2, -height / 2);

      faceCtx.drawImage(headCanvas, 0, 0);

      // const imageData = faceCtx.getImageData(0, 0, canvas.width, canvas.height);
      // const dat = imageData.data;
      // const tempImageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      // const tempData = tempImageData.data;

      // for (let i = 0; i < dat.length; i += 4) {
      //   if (tempData[i] !== 255) {
      //     dat[i] = dat[i + 1] = dat[i + 2] = dat[i + 3] = 0;
      //   }
      // }

      // faceCtx.putImageData(imageData, 0, 0, 0, 0, width, height);
      ctx.globalCompositeOperation = "destination-over";
      ctx.drawImage(faceCanvas, 0, 0);

      const outPath = path.join(path.dirname(__dirname), "../", "data", "result", `${padToFour(i)}.jpg`);
      const out = fs.createWriteStream(outPath);
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

    await Promise.all(promises);
    await createVideo();
    console.log("all done...");
  } catch (err) {
    console.log(err);
  }

  res.send("done");
});

export default router;
