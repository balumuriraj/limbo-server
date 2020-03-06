import * as ffmpeg from "fluent-ffmpeg";
import { downloadFile } from "./firebaseUtils";
import { spawn } from "child_process";
import { JPEGStream } from "canvas";

const pathToFfmpeg = require("ffmpeg-static");
ffmpeg.setFfmpegPath(pathToFfmpeg);

const fps = 25;
const audioFileName = "audio.mp3";
const videoFrameFileName = "video-%04d.jpg";

export async function extractVideoFrames_spawn(fsPath: string, tempDirPath: string) {
  const outputPath = `${tempDirPath}/${videoFrameFileName}`;
  const videoPath = `${tempDirPath}/video.mp4`;
  await downloadFile(fsPath, videoPath);

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(pathToFfmpeg, ["-i", videoPath, "-r", "25", "-f", "image2pipe", "pipe:1"]);
    ffmpeg.on("error", (err) => reject);
    ffmpeg.stdout.on("data", (data) => console.log(data));
    ffmpeg.on("close", resolve);
  });
}

export async function extractVideoFrames(videoPath: string, outputPath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .on("start", (cmd) => {})
      .on("end", () => resolve(outputPath))
      .on("error", (err) => reject(err))
      .input(videoPath)
      .outputOptions(["-r", `${fps}`])
      .output(outputPath)
      .run();
  });
}

export async function extractVideoFrame(frame: number, videoPath: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const cmd = ffmpeg()
      .on("start", (cmd) => {})
      .on("end", () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer);
      })
      .on("error", (err) => reject(err))
      .input(videoPath)
      .seekInput(frame / fps)
      .frames(1)
      .fps(fps)
      .addOutputOption(["-f image2pipe"]);

    const ffstream = cmd.pipe();
    ffstream.on("data", (chunk) => chunks.push(chunk));
  });
}

export function createVideoChildProcess(outputPath: string, resolve: () => void, reject: () => void) {
  const ffmpeg =  spawn(pathToFfmpeg, ["-f", "image2pipe", "-i", "pipe:0", "-y", "-r", "25", "-f", "mp4", outputPath]);
  ffmpeg.on("error", (err) => reject);
  ffmpeg.on("close", resolve);

  return ffmpeg;
}

export async function createVideoFromFrames(tempDirPath: string, outputFileName: string) {
  const outputPath = `${tempDirPath}/${outputFileName}`;
  const videoPath = `${tempDirPath}/video.mp4`;
  const inputPath = `${tempDirPath}/${videoFrameFileName}`;

  return new Promise((resolve, reject) => {
    ffmpeg()
      .on("start", (cmd) => {})
      .on("end", () => resolve(outputPath))
      .on("error", (err) => reject(err))
      .input(inputPath)
      .input(videoPath)
      // .videoCodec("copy")
      .outputOptions(["-map 0:v:0", "-map 1:a:0"])
      // .videoFilter(["movie=assets/demo2/soa-watermark.png [watermark]; [in][watermark] overlay=10:main_h-overlay_h-10 [out]"])
      // .input('assets/demo2/folds-of-spacetime.m4a')
      .videoFilters([
        { filter: "pad", options: "ceil(iw/2)*2:ceil(ih/2)*2" },
        { filter: "format", options: "yuv420p" }
      ]) // https://stackoverflow.com/questions/58138520/ffmpeg-height-not-divisible-by-2
      .output(outputPath)
      .format("mp4")
      .run();
  });
}
