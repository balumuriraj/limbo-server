import * as path from "path";
import * as fs from "fs";
import * as jsdom from "jsdom";
import { JSDOM } from "jsdom";
import { Canvas, Image } from "canvas";
import * as fetch from "node-fetch";

// This is probably not the best way to handle Lottie image loading in Node.
// JSDOM's wrapped `Image` object should work, but attempts resulted in "Image given has not completed loading"
const createContent = `CVImageElement.prototype.createContent = function() {
  var assetPath = this.globalData.getAssetsPath(this.assetData);
  var img = this.img;
  img.src = assetPath;

  // fs.readFile(assetPath, (err, data) => {
  //   console.log("fs.readFile: ", err)
  //   if (!err) {
  //     img.src = data;
  //   }
  //   this[err ? 'imageFailed' : 'imageLoaded']();
  // });

  fetch(assetPath).then(data => {
    img.src = data;
    // this.imageLoaded();
  }).catch(err => {
    console.log(err);
  })
}`;

const createImageData = `function createImageData(assetData) {
  var path = getAssetsPath(assetData, this.assetsPath, this.path);
  var img = createTag('img');

  img.onload = function() {
      this._imageLoaded();
  }.bind(this);

  img.onerror = function(err) {
      ob.img = proxyImage;
      this._imageLoaded();
  }.bind(this);

  img.src = path;

  var ob = {
      img: img,
      assetData: assetData
  }
  return ob;
}`;


const virtualConsole = new jsdom.VirtualConsole();
virtualConsole.sendTo(console);

export function getLottieAnimation(animationData: any, canv: any, options: any = {}) {
  const { window } = new JSDOM("", {
    pretendToBeVisual: true,
    virtualConsole
  });
  const { document, navigator } = window;
  window.fetch = fetch;

  // Avoid jsdom's canvas/image-wrappers because of:
  // * https://github.com/Automattic/node-canvas/issues/487
  // * https://github.com/jsdom/jsdom/issues/2067
  const { createElement } = document;
  document.createElement = localName => {
    if (localName === "canvas") {
      return new Canvas(512, 256);
    }

    if (localName === "img") {
      return new Image();
    }

    return createElement.call(document, localName);
  };

  const lottiePath = require.resolve("lottie-web/build/player/lottie.js");
  const src = fs.readFileSync(path.resolve(__dirname, lottiePath), "utf8");
  // Over-specify createContent (add a Node.js-compatible variant into the code after the first)
  let patchedSrc = src.replace("CVImageElement.prototype.destroy", `${createContent}; CVImageElement.prototype.destroy`);
  patchedSrc = patchedSrc.replace("function loadAssets(assets, cb){", `${createImageData}; function loadAssets(assets, cb){`);

  // "Shadow" the Node.js module, so lottie won't reach it
  const module = {};

  // This goes against the recommendations in:
  // https://github.com/jsdom/jsdom/wiki/Don't-stuff-jsdom-globals-onto-the-Node-global#running-code-inside-the-jsdom-context
  // But using window.eval or script element occasionally causes frame skip/freeze in the output for some reason
  // This is the next best thing since it doesn't pollute globals.
  // tslint:disable-next-line:no-eval
  eval(patchedSrc);

  // Allow passing path instead of animationData object
  if (typeof animationData === "string") {
    animationData = JSON.parse(fs.readFileSync(animationData, "utf8"));
  }
  // Allow passing canvas instead of rendererSettings, since there isn't much choice for Node.js anyway
  const rendererSettings = { context: canv.getContext("2d"), clearCanvas: true };
  return window.lottie.loadAnimation({ ...options, animationData, renderer: "canvas", rendererSettings });
}
