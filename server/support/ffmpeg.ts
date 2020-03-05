import * as ffmpeg from "fluent-ffmpeg";
import { downloadFile } from "./firebaseUtils";

const pathToFfmpeg = require("ffmpeg-static");
ffmpeg.setFfmpegPath(pathToFfmpeg);

const fps = "25";
const audioFileName = "audio.mp3";
const videoFrameFileName = "video-%04d.jpg";

export async function extractVideoFrames(fsPath: string, tempDirPath: string): Promise<any> {
  const outputPath = `${tempDirPath}/${videoFrameFileName}`;
  const audioPath = `${tempDirPath}/${audioFileName}`;
  const videoPath = `${tempDirPath}/video.mp4`;
  await downloadFile(fsPath, videoPath);

  return new Promise((resolve, reject) => {
    ffmpeg()
      .on("start", (cmd) => { })
      .on("end", () => resolve(outputPath))
      .on("error", (err) => reject(err))
      .input(videoPath)
      .outputOptions(["-r", fps])
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

  return new Promise((resolve, reject) => {
    ffmpeg()
      .on("start", (cmd) => console.log(cmd))
      .on("end", () => resolve(outputPath))
      .on("error", (err) => reject(err))
      .input(inputPath)
      .input(audioPath)
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
