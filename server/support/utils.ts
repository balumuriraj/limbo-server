import * as fetch from "node-fetch";
import * as path from "path";

export async function getJSON(url: string) {
  return fetch(url)
    .then(res => res.json())
    .then((json) => { // Processing
      const assetsPath = `${path.join(path.dirname(__dirname), "public", "images", "/")}`;
      // Map of readable names
      const paths = { file: "p", folder: "u", preserveAspectRatio: "pr" };
      // Filter out images
      const images = (json.assets || []).filter(asset => asset[paths.folder]); // Only images have folders
      // Change image path to empty string since we've flattened the folder structure
      images.forEach(asset => {
        // asset[paths.folder] = `${path.join(path.dirname(__dirname), "../", "public", "images")}/`; // Set folder to the same directory as data.json
        asset[paths.folder] = "";
        asset[paths.file] = "http://localhost:4000/static/images/placeholder.png"; // Override image
        asset["e"] = 1;
        // asset[paths.preserveAspectRatio] = "xMidYMid meet"; // "Contain" image, See https://github.com/airbnb/lottie-web/issues/1046
      });

      return json;
    });
}
