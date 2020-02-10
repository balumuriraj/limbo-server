import * as fs from 'fs';

function generateJSON(): void {
  const str = fs.readFileSync('../data/raw.txt', 'utf8');
  const lines = str.split("\n");

  const frames: any = [];

  let isScaleActive = false;
  let isPositionActive = false;
  let isRotationActive = false;

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

      if (!frames[index]) {
        frames[index] = {};
      }

      if (isScaleActive) {
        frames[index].scale = Number(arr[1]);
      }   
      
      if (isPositionActive) {
        frames[index].position = [Number(arr[1]), Number(arr[2])];
      } 

      if (isRotationActive) {
        frames[index].rotation = Number(arr[1]);
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

  fs.writeFile("../data/data.json", JSON.stringify(frames), (err) => {
    if (err) {
        console.error(err);
        return;
    };
    console.log("File has been created");
});
}

generateJSON();
