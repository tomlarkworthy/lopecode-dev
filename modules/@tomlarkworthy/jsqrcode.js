const _1h8jmym = async function _1(FileAttachment,md){return(
md`# QR code scanning with [jsqrcode](https://github.com/LazarSoft/jsqrcode) and [webqr](http://www.webqr.com)

<img style="max-width: 480px" src=${await FileAttachment("61340.jpg").url()}></img>

This is a UI component that streams the webcam and resolves to any readable decoded QR information as the value. Works on mobile, which is nice.

~~~js
import {webcamQRReader} from '@tomlarkworthy/jsqrcode'
~~~

~~~
viewof data = webcamQRReader({
  width: 200,
  height: 400
})
~~~
### Credits 

<a href="https://www.freepik.com/vectors/technology">Technology vector created by studiogstock - www.freepik.com</a>

This is a port of QRCODE reader Copyright 2011 by Lazar Laszlo (APL 2.0)
- http://www.webqr.com
- https://github.com/LazarSoft/jsqrcode

Which in turn is a port of ZXing qrcode scanner
- http://code.google.com/p/zxing.

All are Apache-2.0 license (including this) https://github.com/zxing/zxing/blob/master/LICENSE



`
)};
const _4zoc6m = function _2(md){return(
md`<mark>maybe I should use https://github.com/zxing-js/library?</mark>`
)};
const _djoj7i = function _3(md){return(
md`## Implementation`
)};
const _1tco5y2 = function _webcamQRReader(htl,FileAttachment,qrcode,Event){return(
async ({ width = 640, height = (width / 640) * 480 } = {}) => {
  const mainbody = htl.html`<span>
    <canvas style="display: none" id="qr-canvas"></canvas>
    <div>
      <button onclick=${setwebcam}>
        <img src="${await FileAttachment("vid.png").url()}" />
      </button>
    </div>
    <span id="outdiv"></span>`;

  var gCtx = null;
  var gCanvas = null;
  var c = 0;
  var stype = 0;
  var gUM = false;
  var webkit = false;
  var moz = false;
  var v = null;

  const vidhtml = `<video width="${width}px" height="${height}px" id="v" autoplay="">`;

  function initCanvas(w, h) {
    gCanvas = mainbody.querySelector("#qr-canvas");
    gCanvas.style.width = w + "px";
    gCanvas.style.height = h + "px";
    gCanvas.width = w;
    gCanvas.height = h;
    gCtx = gCanvas.getContext("2d");
    gCtx.clearRect(0, 0, w, h);
  }

  function captureToCanvas() {
    if (stype != 1) return;
    if (gUM) {
      try {
        gCtx.drawImage(v, 0, 0);
        try {
          qrcode.decode();
          setTimeout(captureToCanvas, 250);
        } catch (e) {
          console.log(e);
          setTimeout(captureToCanvas, 250);
        }
      } catch (e) {
        console.log(e);
        setTimeout(captureToCanvas, 250);
      }
    }
  }

  function htmlEntities(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function read(a) {
    mainbody.value = {
      time: Date.now(),
      data: a
    };
    mainbody.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function isCanvasSupported() {
    var elem = document.createElement("canvas");
    return !!(elem.getContext && elem.getContext("2d"));
  }
  function success(stream) {
    v.srcObject = stream;
    v.play();

    gUM = true;
    setTimeout(captureToCanvas, 500);
  }

  function error(error) {
    gUM = false;
    return;
  }

  function load() {
    if (isCanvasSupported() && window.File && window.FileReader) {
      initCanvas(800, 600);
      qrcode.callback = read;
      setwebcam();
    } else {
      mainbody.innerHTML =
        '<p id="mp1">QR code scanner for HTML5 capable browsers</p><br>' +
        '<br><p id="mp2">sorry your browser is not supported</p><br><br>' +
        '<p id="mp1">try <a href="http://www.mozilla.com/firefox"><img src="firefox.png"/></a> or <a href="http://chrome.google.com"><img src="chrome_logo.gif"/></a> or <a href="http://www.opera.com"><img src="Opera-logo.png"/></a></p>';
    }
  }

  function setwebcam() {
    var options = true;
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      try {
        navigator.mediaDevices.enumerateDevices().then(function (devices) {
          devices.forEach(function (device) {
            if (device.kind === "videoinput") {
              if (device.label.toLowerCase().search("back") > -1)
                options = {
                  deviceId: { exact: device.deviceId },
                  facingMode: "environment"
                };
            }
            console.log(
              device.kind + ": " + device.label + " id = " + device.deviceId
            );
          });
          setwebcam2(options);
        });
      } catch (e) {
        console.log(e);
      }
    } else {
      console.log("no navigator.mediaDevices.enumerateDevices");
      setwebcam2(options);
    }
  }

  function setwebcam2(options) {
    console.log(options);
    if (stype == 1) {
      setTimeout(captureToCanvas, 500);
      return;
    }
    var n = navigator;
    mainbody.querySelector("#outdiv").innerHTML = vidhtml;
    v = mainbody.querySelector("#v");

    if (n.mediaDevices.getUserMedia) {
      n.mediaDevices
        .getUserMedia({ video: options, audio: false })
        .then(function (stream) {
          success(stream);
        })
        .catch(function (error) {
          console.log(error);
        });
    } else if (n.getUserMedia) {
      webkit = true;
      n.getUserMedia({ video: options, audio: false }, success, error);
    } else if (n.webkitGetUserMedia) {
      webkit = true;
      n.webkitGetUserMedia({ video: options, audio: false }, success, error);
    }

    stype = 1;
    setTimeout(captureToCanvas, 500);
  }
  load();

  return mainbody;
}
)};
const _1de6u2g = function _5(md){return(
md`## Example`
)};
const _1155ij1 = function _6(qrCodeData){return(
qrCodeData
)};
const _11al3fo = async function* _qrCodeData(Inputs,md,invalidation,webcamQRReader)
{
  let continueCallback;

  yield Inputs.button(
    md`**run the example**. _(prompts for webcam permission)_`,
    {
      value: invalidation,
      reduce: () => continueCallback()
    }
  );

  await new Promise((resolve) => (continueCallback = resolve));

  yield webcamQRReader({
    width: 320
  });
};
const _itys0q = (G, _) => G.input(_);
const _1pb29lo = async function _qrcode(FileAttachment)
{
  // Port of instrucitons here https://github.com/LazarSoft/jsqrcode
  const sources = [
    await FileAttachment("grid.js").url(),
    await FileAttachment("version.js").url(),
    await FileAttachment("detector.js").url(),
    await FileAttachment("formatinf.js").url(),
    await FileAttachment("errorlevel.js").url(),
    await FileAttachment("bitmat.js").url(),
    await FileAttachment("datablock.js").url(),
    await FileAttachment("bmparser.js").url(),
    await FileAttachment("datamask.js").url(),
    await FileAttachment("rsdecoder.js").url(),
    await FileAttachment("gf256poly.js").url(),
    await FileAttachment("gf256.js").url(),
    await FileAttachment("decoder.js").url(),
    await FileAttachment("qrcode.js").url(),
    await FileAttachment("findpat.js").url(),
    await FileAttachment("alignpat.js").url(),
    await FileAttachment("databr.js").url()
  ];

  const promises = [];

  for (var i = 0; i < sources.length; i++) {
    var scriptTag = document.createElement("script");

    const loaded = new Promise((resolve) => {
      scriptTag.addEventListener("load", resolve);
    });
    scriptTag.src = sources[i];
    document.head.appendChild(scriptTag);
    await loaded;
  }

  return window.qrcode;
};
const _bg907w = function _10(footer){return(
footer
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["decoder.js","gf256.js","version.js","gf256poly.js","databr.js","detector.js","qrcode.js","datamask.js","errorlevel.js","datablock.js","findpat.js","formatinf.js","rsdecoder.js","bitmat.js","alignpat.js","bmparser.js","grid.js","vid.png","61340.jpg"].map((name) => {
    const module_name = "@tomlarkworthy/jsqrcode";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @tomlarkworthy/footer", async () => runtime.module((await import("/@tomlarkworthy/footer.js?v=4")).default));  
  $def("_1h8jmym", null, ["FileAttachment","md"], _1h8jmym);  
  $def("_4zoc6m", null, ["md"], _4zoc6m);  
  $def("_djoj7i", null, ["md"], _djoj7i);  
  $def("_1tco5y2", "webcamQRReader", ["htl","FileAttachment","qrcode","Event"], _1tco5y2);  
  $def("_1de6u2g", null, ["md"], _1de6u2g);  
  $def("_1155ij1", null, ["qrCodeData"], _1155ij1);  
  $def("_11al3fo", "viewof qrCodeData", ["Inputs","md","invalidation","webcamQRReader"], _11al3fo);  
  $def("_itys0q", "qrCodeData", ["Generators","viewof qrCodeData"], _itys0q);  
  $def("_1pb29lo", "qrcode", ["FileAttachment"], _1pb29lo);  
  main.define("footer", ["module @tomlarkworthy/footer", "@variable"], (_, v) => v.import("footer", _));  
  $def("_bg907w", null, ["footer"], _bg907w);
  return main;
}