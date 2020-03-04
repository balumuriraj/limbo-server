import * as ffmpeg from "fluent-ffmpeg";
import { downloadFile } from "./firebaseUtils";

const pathToFfmpeg = require("ffmpeg-static");
ffmpeg.setFfmpegPath(pathToFfmpeg);

const probe = require("node-ffprobe");
const ffprobeInstaller = require("@ffprobe-installer/ffprobe");

// console.log(ffprobeInstaller.path, ffprobeInstaller.version);
probe.FFPROBE_PATH = ffprobeInstaller.path;

const fps = "25";
const audioFileName = "audio.mp3";
const videoFrameFileName = "video-%04d.jpg";

export async function extractVideoFrames(fsPath: string, tempDirPath: string): Promise<any> {
  const outputPath = `${tempDirPath}/${videoFrameFileName}`;
  const audioPath = `${tempDirPath}/${audioFileName}`;
  const videoPath = `${tempDirPath}/video.mp4`;
  await downloadFile(fsPath, videoPath);
  const cmd = ffmpeg(videoPath).outputOptions(["-r", fps]);

  return new Promise((resolve, reject) => {
    cmd
      .on("start", (cmd) => { })
      .on("end", () => resolve(outputPath))
      .on("error", (err) => reject(err))
      .output(outputPath)
      .output(audioPath)
      .input(videoPath).withNoVideo()
      .run();
  });
}

export async function createVideo(tempDirPath: string, outputFileName: string) {
  const outputPath = `${tempDirPath}/${outputFileName}`;
  const audioPath = `${tempDirPath}/${audioFileName}`;
  const inputPath = `${tempDirPath}/${videoFrameFileName}`;
  const cmd = ffmpeg();

  return new Promise((resolve, reject) => {
    cmd
      .on("start", (cmd) => { })
      .on("end", () => resolve(outputPath))
      .on("error", (err) => reject(err))
      .input(inputPath)
      .input(audioPath)
      .withFPS(25)
      // .videoFilter(["movie=assets/demo2/soa-watermark.png [watermark]; [in][watermark] overlay=10:main_h-overlay_h-10 [out]"])
      // .input('assets/demo2/folds-of-spacetime.m4a')
      .output(outputPath)
      .format("mp4")
      .outputFPS(25)
      .run();
  });
}

export async function getVideoMeta(videoPath: string) {
  const info = await probe(videoPath);
  const numFramesTotal = parseInt(info.streams[0].nb_frames, null);

  return {
    framesCount: numFramesTotal
  };
}
