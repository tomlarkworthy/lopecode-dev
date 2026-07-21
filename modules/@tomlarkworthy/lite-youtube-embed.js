const _mspxh2 = function _1(md){return(
md`# [lite-youtube-embed@0.3.3](https://github.com/paulirish/lite-youtube-embed)

\`lite-youtube-embed\` is an attractive alternative to the official player because it is smaller, faster and prioritises privacy. It install as custom webcomponent which is automatically loaded when you instantiate the CSS.
~~~js
import {lite_youtube_css} from '@tomlarkworthy/lite-youtube-embed'
~~~

~~~html
<lite-youtube videoid="goiWrNiaT0I" playlabel="Play: Crayon Physics Deluxe - Trailer HD"></lite-youtube>
~~~`
)};
const _1dkqcpd = function _2(md){return(
md`<lite-youtube videoid="goiWrNiaT0I" playlabel="Play: Crayon Physics Deluxe - Trailer HD"></lite-youtube>`
)};
const _1p2mllg = function _lite_youtube_css(lite_youtube_js,htl){return(
htl.html`<style>
  
${() => {lite_youtube_js}}
lite-youtube {
    background-color: #000;
    position: relative;
    display: block;
    contain: content;
    background-position: center center;
    background-size: cover;
    cursor: pointer;
    max-width: 720px;
}

/* gradient */
lite-youtube::before {
    content: attr(data-title);
    display: block;
    position: absolute;
    top: 0;
    /* Pixel-perfect port of YT's gradient PNG, using https://github.com/bluesmoon/pngtocss plus optimizations */
    background-image: linear-gradient(180deg, rgb(0 0 0 / 67%) 0%, rgb(0 0 0 / 54%) 14%, rgb(0 0 0 / 15%) 54%, rgb(0 0 0 / 5%) 72%, rgb(0 0 0 / 0%) 94%);
    height: 99px;
    width: 100%;
    font-family: "YouTube Noto",Roboto,Arial,Helvetica,sans-serif;
    color: hsl(0deg 0% 93.33%);
    text-shadow: 0 0 2px rgba(0,0,0,.5);
    font-size: 18px;
    padding: 25px 20px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    box-sizing: border-box;
}

lite-youtube:hover::before {
    color: white;
}

/* responsive iframe with a 16:9 aspect ratio
    thanks https://css-tricks.com/responsive-iframes/
*/
lite-youtube::after {
    content: "";
    display: block;
    padding-bottom: calc(100% / (16 / 9));
}
lite-youtube > iframe {
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
    border: 0;
}

/* play button */
lite-youtube > .lyt-playbtn {
    display: block;
    /* Make the button element cover the whole area for a large hover/click target… */
    width: 100%;
    height: 100%;
    /* …but visually it's still the same size */
    background: no-repeat center/68px 48px;
    /* YT's actual play button svg */
    background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 48"><path d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55c-2.93.78-4.63 3.26-5.42 6.19C.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z" fill="red"/><path d="M45 24 27 14v20" fill="white"/></svg>');
    position: absolute;
    cursor: pointer;
    z-index: 1;
    filter: grayscale(100%);
    transition: filter .1s cubic-bezier(0, 0, 0.2, 1);
    border: 0;
}

lite-youtube:hover > .lyt-playbtn,
lite-youtube .lyt-playbtn:focus {
    filter: none;
}

/* Post-click styles */
lite-youtube.lyt-activated {
    cursor: unset;
}
lite-youtube.lyt-activated::before,
lite-youtube.lyt-activated > .lyt-playbtn {
    opacity: 0;
    pointer-events: none;
}

.lyt-visually-hidden {
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    height: 1px;
    overflow: hidden;
    position: absolute;
    white-space: nowrap;
    width: 1px;
  }
</style>`
)};
const _1skch2w = async function _lite_youtube_js(unzip, FileAttachment) {
    if (!window.customElements.get('lite-youtube')) {
        const blob = await unzip(FileAttachment('lite-youtube-embed.js.gz'));
        const objectURL = URL.createObjectURL(new Blob([blob], { type: 'application/javascript' }));
        try {
            await import(objectURL);
        } finally {
            URL.revokeObjectURL(objectURL);
        }
    }
    if (window.location.protocol === 'file:' && !window.__liteYoutubeFileFallback) {
        window.__liteYoutubeFileFallback = true;
        window.document.addEventListener('click', e => {
            const lyt = e.target.closest && e.target.closest('lite-youtube');
            if (!lyt || lyt.classList.contains('lyt-activated'))
                return;
            const id = lyt.getAttribute('videoid');
            if (!id)
                return;
            e.preventDefault();
            e.stopImmediatePropagation();
            window.open(`https://www.youtube.com/watch?v=${ encodeURIComponent(id) }`, '_blank', 'noopener');
        }, true);
    }
    return window.customElements.get('lite-youtube');
};
const _17n6uge = function _unzip(Response,DecompressionStream){return(
async (attachment) =>
  await new Response(
    (await attachment.stream()).pipeThrough(new DecompressionStream("gzip"))
  ).blob()
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["lite-youtube-embed.js.gz"].map((name) => {
    const module_name = "@tomlarkworthy/lite-youtube-embed";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  $def("_mspxh2", null, ["md"], _mspxh2);  
  $def("_1dkqcpd", null, ["md"], _1dkqcpd);  
  $def("_1p2mllg", "lite_youtube_css", ["lite_youtube_js","htl"], _1p2mllg);  
  $def("_1skch2w", "lite_youtube_js", ["unzip","FileAttachment"], _1skch2w);  
  $def("_17n6uge", "unzip", ["Response","DecompressionStream"], _17n6uge);
  return main;
}