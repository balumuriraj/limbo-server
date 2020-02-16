import * as fs from "fs";

function generateJSON(): void {
  const result: any = {
    position: null,
    scale: null,
    rotation: null,
    anchorPoint: null,
    frames: []
  };
  const info = fs.readFileSync("server/data/info.txt", "utf8");
  const infoLines = info.split("\n");

  process(infoLines, result, false);

  const str = fs.readFileSync("server/data/raw.txt", "utf8");
  const lines = str.split("\n");

  process(lines, result, true);

  fs.writeFile("server/data/data.json", JSON.stringify(result), (err) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log("File has been created");
  });
}

function process(lines: string[], result: any, isFrames: boolean) {
  let isScaleActive = false;
  let isPositionActive = false;
  let isRotationActive = false;

  const frames = result.frames;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) {
      isScaleActive = false;
      isPositionActive = false;
      isRotationActive = false;
      continue;
    }

    if (
      line === "Frame	X percent	Y percent	Z percent" ||
      line === "Frame	X pixels	Y pixels	Z pixels" ||
      line === "Frame	degrees"
    ) {
      continue;
    }

    if (isScaleActive || isPositionActive || isRotationActive) {
      const arr = line.split("\t");
      const index = arr[0];

      if (isFrames && !frames[index]) {
        frames[index] = {};
      }

      if (isScaleActive) {
        if (isFrames) {
          frames[index].scale = Number(arr[1]);
        } else {
          result.scale = Number(arr[1]);
        }
      }

      if (isPositionActive) {
        if (isFrames) {
          frames[index].position = [Number(arr[1]), Number(arr[2])];
        } else {
          result.position = [Number(arr[1]), Number(arr[2])];
        }
      }

      if (isRotationActive) {
        if (isFrames) {
          frames[index].rotation = Number(arr[1]);
        } else {
          result.rotation = Number(arr[1]);
        }
      }

      continue;
    }

    if (line === "Transform	Scale") {
      isScaleActive = true;
      continue;
    }

    if (line === "Transform	Position") {
      isPositionActive = true;
      continue;
    }

    if (line === "Transform	Rotation") {
      isRotationActive = true;
      continue;
    }

    if (line === "End of Keyframe Data") {
      break;
    }
  }
}

generateJSON();
