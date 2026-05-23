const sharp =
require("sharp");

exports.compressImage =
async (
input,
output
)=>{

await sharp(input)

.rotate()

.resize({

width:1280,

withoutEnlargement:true

})

.jpeg({

quality:92,

mozjpeg:true

})

.toFile(
output
);

return output;

};