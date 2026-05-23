const ffmpegPath = require("ffmpeg-static");
const { spawn } = require("child_process");

exports.compressVideo = (
  input,
  output,
  isShort = false
) => {

return new Promise(
(resolve,reject)=>{

const args = [

"-i",
input,

"-c:v",
"libx264",

"-preset",
"medium",

"-crf",
isShort
? "21"
: "20",

"-movflags",
"+faststart",

"-c:a",
"aac",

"-b:a",
isShort
? "128k"
: "192k",

"-vf",

isShort
? "scale=720:-2"
: "scale=1280:-2",

"-y",

output

];

const ffmpeg =
spawn(
ffmpegPath,
args
);

let error = "";

ffmpeg.stderr.on(
"data",
(data)=>{
error += data;
}
);

ffmpeg.on(
"close",
(code)=>{

if(code===0){

resolve(output);

}else{

reject(
new Error(error)
);

}

}
);

});

};