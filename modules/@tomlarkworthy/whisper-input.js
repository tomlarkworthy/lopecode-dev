const _1yzmw91 = function _1(md){return(
md`# OpenAI Whisper Input

~~~js
  import {whisperInput} from "@tomlarkworthy/whisper-input"

  viewof myText = whisperInput({
    API_KEY: <YOUR OPEN API KEY>,
    content: <OPTIONAL BUTTON CONTENT, defaults to 🎙️>
  })
~~~

This is an input so it after transcripting it emits its value. This also means you can bind it to an ordinary text input.
`
)};
const _1tyhoo1 = function _example(whisperInput,OPENAI_API_KEY){return(
whisperInput({
  API_KEY: OPENAI_API_KEY
})
)};
const _4me580 = (G, _) => G.input(_);
const _neiyhe = function _3(example){return(
example
)};
const _5a1hda = function _4(Inputs,$0){return(
Inputs.bind(Inputs.text(), $0)
)};
const _hvyzpv = function _whisperInput(htl,MediaRecorder,audioBlobToFile,transcribeAudio,Event)
{
  ({
    prompt:
      "Create a builder that creates a single button in a view, while it is pushed it should transcribes audio, when released, it emits the text as a value. Follow the structure\n\nwhisperInput = (API_KEY) => {\n    let recording = undefined\n    return view`<button onmousedown=${()=> {...}} onmouseup=...>`\n}",
    time: 1725302054331
  });
  return ({ API_KEY, content = "🎙️" } = {}) => {
    let mediaRecorder;
    let audioChunks = [];

    const ui = htl.html`<div><button onmousedown=${async () => {
      console.log("starting");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async (evt) => {
        const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
        const audioFile = audioBlobToFile(audioBlob, "recording.wav");
        stream.getTracks().forEach((track) => track.stop());
        try {
          const transcribedText = await transcribeAudio(audioFile);
          console.log("transcribedText", transcribedText);
          audioChunks = []; // Reset audio chunks for the next recording
          ui.value = transcribedText;
          ui.dispatchEvent(new Event("input", { bubbles: true }));
        } catch (error) {
          console.error("Transcription error:", error);
        }
      };

      mediaRecorder.start();
    }} onmouseup=${async () => {
      console.log("stopping");
      mediaRecorder.stop();
    }}>${content}</button>`;
    ui.value = undefined;
    return ui;
  };
};
const _qa7vm5 = function _transcribeAudio(OPENAI_API_KEY,FormData){return(
{
  prompt:
    'The whisper API looks like this\n\n```\n\ncurl https://api.openai.com/v1/audio/transcriptions \\\n  -H "Authorization: Bearer $OPENAI_API_KEY" \\\n  -H "Content-Type: multipart/form-data" \\\n  -F model="whisper-1" \\\n  -F file="@/path/to/file/openai.mp3"\n```\n\n\nand returns\n\n```\n{\n  "text": "Imagine the wildest idea that you\'ve ever had, and you\'re curious about how it might scale to something that\'s a 100, a 1,000 times bigger..."\n}\n```\ncan you wrap that in a function using web api concepts',
  time: 1725301616943
} &&
  async function transcribeAudio(file) {
    const apiKey = OPENAI_API_KEY;
    const url = "https://api.openai.com/v1/audio/transcriptions";

    const formData = new FormData();
    formData.append("model", "whisper-1");
    formData.append("file", file);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.text;
  }
)};
const _klaqzm = function _audioBlobToFile(){return(
{
  prompt: "Convert audioBlob to a file for formData in a function",
  time: 1725301694316
} &&
  function audioBlobToFile(blob, filename) {
    return new File([blob], filename, { type: blob.type });
  }
)};
const _ueb3sx = function _OPENAI_API_KEY(Inputs,localStorageView){return(
Inputs.bind(
  Inputs.password({
    width: "100%",
    label: "OPENAI_API_KEY",
    placeholder: "paste openAI key here"
  }),
  localStorageView("OPENAI_API_KEY")
)
)};
const _13dv669 = (G, _) => G.input(_);
const _1ltjld5 = function _10(md){return(
md`---`
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/local-storage-view", async () => runtime.module((await import("/@tomlarkworthy/local-storage-view.js?v=4")).default));  
  $def("_1yzmw91", null, ["md"], _1yzmw91);  
  $def("_1tyhoo1", "viewof example", ["whisperInput","OPENAI_API_KEY"], _1tyhoo1);  
  $def("_4me580", "example", ["Generators","viewof example"], _4me580);  
  $def("_neiyhe", null, ["example"], _neiyhe);  
  $def("_5a1hda", null, ["Inputs","viewof example"], _5a1hda);  
  $def("_hvyzpv", "whisperInput", ["htl","MediaRecorder","audioBlobToFile","transcribeAudio","Event"], _hvyzpv);  
  $def("_qa7vm5", "transcribeAudio", ["OPENAI_API_KEY","FormData"], _qa7vm5);  
  $def("_klaqzm", "audioBlobToFile", [], _klaqzm);  
  $def("_ueb3sx", "viewof OPENAI_API_KEY", ["Inputs","localStorageView"], _ueb3sx);  
  $def("_13dv669", "OPENAI_API_KEY", ["Generators","viewof OPENAI_API_KEY"], _13dv669);  
  main.define("localStorageView", ["module @tomlarkworthy/local-storage-view", "@variable"], (_, v) => v.import("localStorageView", _));  
  $def("_1ltjld5", null, ["md"], _1ltjld5);
  return main;
}