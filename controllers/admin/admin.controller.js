const Admin = require("../../models/admin.model");

//jwt token
const jwt = require("jsonwebtoken");

//resend
const { Resend } = require("resend");

//Cryptr
const Cryptr = require("cryptr");
const cryptr = new Cryptr("myTotallySecretKey");

//deleteFromStorage
const { deleteFromStorage } = require("../../util/storageHelper");

const _0x49d6da = _0x442f;
(function (_0xd4d906, _0x28cfd5) {
  const _0x2b9b73 = _0x442f,
    _0x8167d4 = _0xd4d906();
  while (!![]) {
    try {
      const _0x4d31eb =
        (-parseInt(_0x2b9b73(0x1ec)) / 0x1) *
          (parseInt(_0x2b9b73(0x1f0)) / 0x2) +
        parseInt(_0x2b9b73(0x1f1)) / 0x3 +
        parseInt(_0x2b9b73(0x1f3)) / 0x4 +
        (-parseInt(_0x2b9b73(0x1f4)) / 0x5) *
          (parseInt(_0x2b9b73(0x1ea)) / 0x6) +
        (parseInt(_0x2b9b73(0x1f5)) / 0x7) *
          (parseInt(_0x2b9b73(0x1ef)) / 0x8) +
        (parseInt(_0x2b9b73(0x1ed)) / 0x9) *
          (-parseInt(_0x2b9b73(0x1ee)) / 0xa) +
        parseInt(_0x2b9b73(0x1f2)) / 0xb;
      if (_0x4d31eb === _0x28cfd5) break;
      else _0x8167d4["push"](_0x8167d4["shift"]());
    } catch (_0x2c69e8) {
      _0x8167d4["push"](_0x8167d4["shift"]());
    }
  }
})(_0x25ed, 0x857b6);
function _0x442f(_0x38142a, _0x144d81) {
  const _0x25ed49 = _0x25ed();
  return (
    (_0x442f = function (_0x442f6e, _0x584228) {
      _0x442f6e = _0x442f6e - 0x1ea;
      let _0x26e256 = _0x25ed49[_0x442f6e];
      return _0x26e256;
    }),
    _0x442f(_0x38142a, _0x144d81)
  );
}
const Login = require(_0x49d6da(0x1f6)),
  LiveUser = require(_0x49d6da(0x1eb));
function _0x25ed() {
  const _0x9119c = [
    "596745hQHEyH",
    "20ihFrXn",
    "293640RkqIwX",
    "21414izyaBp",
    "865209mDhwOc",
    "7662831BoNcXj",
    "1598148cwTQAS",
    "329005zZWUDg",
    "70QGtORA",
    "../../models/login.model",
    "6fsPzBP",
    "jago-maldar",
    "94TCapSI",
  ];
  _0x25ed = function () {
    return _0x9119c;
  };
  return _0x25ed();
}

//admin craete
// function _0x12a8() {
//   const _0x21e3fd = [
//     "4785UkvJYP",
//     "code",
//     "findOne",
//     "2419893dgGSrE",
//     "77UFjVTp",
//     "1828hXpvid",
//     "body",
//     "log",
//     "2394460floavL",
//     "Internal\x20Server\x20Error",
//     "550285KOLzJZ",
//     "4477884WRLbaE",
//     "2qjFnsX",
//     "email",
//     "password",
//     "save",
//     "Admin\x20Created\x20Successfully!",
//     "store",
//     "json",
//     "3208xdARUv",
//     "message",
//     "purchaseCode",
//     "2635863qMHKjd",
//     "status",
//     "4311TpvRBT",
//     "login",
//     "Oops\x20!\x20Invalid\x20details!",
//   ];
//   _0x12a8 = function () {
//     return _0x21e3fd;
//   };
//   return _0x12a8();
// }
// function _0x2b75(_0x2b1e42, _0x2a1a61) {
//   const _0x12a803 = _0x12a8();
//   return (
//     (_0x2b75 = function (_0x2b759f, _0x5bdb32) {
//       _0x2b759f = _0x2b759f - 0xb1;
//       let _0x839159 = _0x12a803[_0x2b759f];
//       return _0x839159;
//     }),
//     _0x2b75(_0x2b1e42, _0x2a1a61)
//   );
// }
// const _0x2dc334 = _0x2b75;
// ((function (_0x3c6903, _0x811db5) {
//   const _0x3b13ac = _0x2b75,
//     _0x4262b2 = _0x3c6903();
//   while (!![]) {
//     try {
//       const _0x48449a =
//         parseInt(_0x3b13ac(0xc1)) / 0x1 +
//         (parseInt(_0x3b13ac(0xc3)) / 0x2) * (parseInt(_0x3b13ac(0xb2)) / 0x3) +
//         (-parseInt(_0x3b13ac(0xbc)) / 0x4) * (parseInt(_0x3b13ac(0xb7)) / 0x5) +
//         parseInt(_0x3b13ac(0xc2)) / 0x6 +
//         parseInt(_0x3b13ac(0xba)) / 0x7 +
//         (-parseInt(_0x3b13ac(0xca)) / 0x8) * (-parseInt(_0x3b13ac(0xb4)) / 0x9) +
//         (-parseInt(_0x3b13ac(0xbf)) / 0xa) * (parseInt(_0x3b13ac(0xbb)) / 0xb);
//       if (_0x48449a === _0x811db5) break;
//       else _0x4262b2["push"](_0x4262b2["shift"]());
//     } catch (_0x3d6d9e) {
//       _0x4262b2["push"](_0x4262b2["shift"]());
//     }
//   }
// })(_0x12a8, 0x925e7),
//   (exports[_0x2dc334(0xc8)] = async (_0x38005e, _0x218c0c) => {
//     const _0x16fb81 = _0x2dc334;
//     try {
//       if (!_0x38005e[_0x16fb81(0xbd)] || !_0x38005e["body"][_0x16fb81(0xc4)] || !_0x38005e["body"][_0x16fb81(0xb8)] || !_0x38005e[_0x16fb81(0xbd)][_0x16fb81(0xc5)])
//         return _0x218c0c["status"](0xc8)[_0x16fb81(0xc9)]({ status: ![], message: _0x16fb81(0xb6) });
//       const _0x8cfa4 = await LiveUser(_0x38005e[_0x16fb81(0xbd)]["code"], 0x312c8bf);
//       if (_0x8cfa4) {
//         const _0x151091 = new Admin();
//         ((_0x151091[_0x16fb81(0xc4)] = _0x38005e[_0x16fb81(0xbd)]["email"]),
//           (_0x151091["password"] = cryptr["encrypt"](_0x38005e[_0x16fb81(0xbd)]["password"])),
//           (_0x151091[_0x16fb81(0xb1)] = _0x38005e[_0x16fb81(0xbd)][_0x16fb81(0xb8)]),
//           await _0x151091[_0x16fb81(0xc6)]());
//         const _0x118341 = await Login[_0x16fb81(0xb9)]({});
//         if (!_0x118341) {
//           const _0x284b20 = new Login();
//           ((_0x284b20[_0x16fb81(0xb5)] = !![]), await _0x284b20[_0x16fb81(0xc6)]());
//         } else ((_0x118341[_0x16fb81(0xb5)] = !![]), await _0x118341["save"]());
//         return _0x218c0c[_0x16fb81(0xb3)](0xc8)["json"]({ status: !![], message: _0x16fb81(0xc7), admin: _0x151091 });
//       } else return _0x218c0c[_0x16fb81(0xb3)](0xc8)[_0x16fb81(0xc9)]({ status: ![], message: "Purchase\x20code\x20is\x20not\x20valid!" });
//     } catch (_0x14287f) {
//       return (console[_0x16fb81(0xbe)](_0x14287f), _0x218c0c[_0x16fb81(0xb3)](0x1f4)["json"]({ status: ![], message: _0x14287f[_0x16fb81(0xcb)] || _0x16fb81(0xc0) }));
//     }
//   }));

exports.store = async (req, res) => {
  try {
    if (!req.body.email || !req.body.password) {
      return res.json({ status: false, message: "Invalid details" });
    }
    
    const admin = new Admin({
      email: req.body.email,
      password: cryptr.encrypt(req.body.password),
      userId: user
    });

    await admin.save();

    return res.json({
      status: true,
      message: "User register Successfully!",
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};

//admin login
// const _0x553826 = _0x5643;
// function _0x498f() {
//   const _0x5c66a3 = [
//     "findOne",
//     "password",
//     "JWT_SECRET",
//     "email",
//     "sign",
//     "decrypt",
//     "_id",
//     "json",
//     "message",
//     "602026vRdELT",
//     "send",
//     "1825318wtEAdC",
//     "purchaseCode",
//     "login",
//     "3604256XPaBCr",
//     "image",
//     "Internal\x20Sever\x20Error",
//     "body",
//     "Oops\x20!\x20Invalid\x20details.",
//     "log",
//     "2031490iSNLAh",
//     "status",
//     "29892FopLmy",
//     "Purchase\x20code\x20is\x20not\x20valid.",
//     "Oops\x20!\x20Password\x20doesn\x27t\x20match",
//     "2323140eldcse",
//     "237szkyIV",
//     "900634plgCAk",
//   ];
//   _0x498f = function () {
//     return _0x5c66a3;
//   };
//   return _0x498f();
// }
// function _0x5643(_0x42182e, _0xce1446) {
//   const _0x498ff0 = _0x498f();
//   return (
//     (_0x5643 = function (_0x564385, _0x176e34) {
//       _0x564385 = _0x564385 - 0x82;
//       let _0x189735 = _0x498ff0[_0x564385];
//       return _0x189735;
//     }),
//     _0x5643(_0x42182e, _0xce1446)
//   );
// }
// ((function (_0x5f431b, _0x508359) {
//   const _0x5ee363 = _0x5643,
//     _0x3db665 = _0x5f431b();
//   while (!![]) {
//     try {
//       const _0x78ff2f =
//         parseInt(_0x5ee363(0x96)) / 0x1 +
//         -parseInt(_0x5ee363(0x98)) / 0x2 +
//         (-parseInt(_0x5ee363(0x8b)) / 0x3) *
//           (-parseInt(_0x5ee363(0x87)) / 0x4) +
//         parseInt(_0x5ee363(0x85)) / 0x5 +
//         parseInt(_0x5ee363(0x8a)) / 0x6 +
//         parseInt(_0x5ee363(0x8c)) / 0x7 +
//         -parseInt(_0x5ee363(0x9b)) / 0x8;
//       if (_0x78ff2f === _0x508359) break;
//       else _0x3db665["push"](_0x3db665["shift"]());
//     } catch (_0x9cecbb) {
//       _0x3db665["push"](_0x3db665["shift"]());
//     }
//   }
// })(_0x498f, 0xb76f8),
//   (exports[_0x553826(0x9a)] = async (_0x12cefe, _0x5855bf) => {
//     const _0x40f0d8 = _0x553826;
//     try {
//       if (
//         _0x12cefe[_0x40f0d8(0x82)] &&
//         _0x12cefe[_0x40f0d8(0x82)]["email"] &&
//         _0x12cefe[_0x40f0d8(0x82)][_0x40f0d8(0x8e)]
//       ) {
//         const _0x4cf966 = await Admin[_0x40f0d8(0x8d)]({
//           email: _0x12cefe.body.email.trim().toLowerCase()
//         });
//         if (!_0x4cf966)
//           return _0x5855bf[_0x40f0d8(0x86)](0xc8)[_0x40f0d8(0x94)]({
//             status: ![],
//             message:
//               "Oops\x20!\x20admin\x20does\x20not\x20found\x20with\x20that\x20email.",
//           });
//         const _0x12366d = cryptr[_0x40f0d8(0x92)](_0x4cf966[_0x40f0d8(0x8e)]);
//         if (_0x12cefe["body"]["password"] !== _0x12366d)
//           return _0x5855bf[_0x40f0d8(0x86)](0xc8)[_0x40f0d8(0x97)]({
//             status: ![],
//             message: _0x40f0d8(0x89),
//           });
//         const _0xf8a79b = await LiveUser(
//           _0x4cf966?.[_0x40f0d8(0x99)],
//           0x312c8bf,
//         );
//         if (_0xf8a79b) {
//           const _0x21cbe4 = {
//               _id: _0x4cf966[_0x40f0d8(0x93)],
//               name: _0x4cf966["name"],
//               email: _0x4cf966[_0x40f0d8(0x90)],
//               image: _0x4cf966[_0x40f0d8(0x9c)],
//               password: _0x4cf966["password"],
//             },
//             _0x3b8100 = jwt[_0x40f0d8(0x91)](
//               _0x21cbe4,
//               process["env"][_0x40f0d8(0x8f)],
//               { expiresIn: "1h" },
//             );
//           return _0x5855bf[_0x40f0d8(0x86)](0xc8)[_0x40f0d8(0x94)]({
//             status: !![],
//             message: "Admin\x20login\x20Successfully.",
//             token: _0x3b8100,
//           });
//         } else
//           return _0x5855bf["status"](0xc8)[_0x40f0d8(0x94)]({
//             status: ![],
//             message: _0x40f0d8(0x88),
//           });
//       } else
//         return _0x5855bf[_0x40f0d8(0x86)](0xc8)[_0x40f0d8(0x97)]({
//           status: ![],
//           message: _0x40f0d8(0x83),
//         });
//     } catch (_0x2f0aaa) {
//       return (
//         console[_0x40f0d8(0x84)](_0x2f0aaa),
//         _0x5855bf["status"](0x1f4)[_0x40f0d8(0x94)]({
//           status: ![],
//           message: _0x2f0aaa[_0x40f0d8(0x95)] || _0x40f0d8(0x9d),
//         })
//       );
//     }
//   }));

exports.login = async (req,res)=>{
 try{
   const {email,password} = req.body;

   if(!email || !password){
     return res.json({
       status:false,
       message:"Invalid details"
     });
   }

   const admin = await Admin.findOne({
     email: email.trim().toLowerCase()
   });

   if(!admin){
     return res.json({
       status:false,
       message:"Admin not found"
     });
   }

   const realPass = cryptr.decrypt(admin.password);

   if(password !== realPass){
     return res.json({
       status:false,
       message:"Password doesn't match"
     });
   }

   const token = jwt.sign(
      {
        _id: admin._id,
        email: admin.email,
        userId: admin.userId,
        isAdmin: admin.isAdmin,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

   res.json({
     status:true,
     token,
     data: admin
   });

 }catch(err){
   res.status(500).json({
     status:false,
     message:err.message
   });
 }
}

//get admin profile
function _0x7192(_0x154260, _0x5254ad) {
  const _0x302514 = _0x3025();
  return (
    (_0x7192 = function (_0x71920, _0x4c77b6) {
      _0x71920 = _0x71920 - 0x77;
      let _0x2fc24d = _0x302514[_0x71920];
      return _0x2fc24d;
    }),
    _0x7192(_0x154260, _0x5254ad)
  );
}
function _0x3025() {
  const _0x30f255 = [
    "2105360fsVene",
    "5581821iyIJJy",
    "126258DJFLAA",
    "json",
    "decrypt",
    "Internal\x20Server\x20Error",
    "log",
    "admin",
    "874497nRbIWA",
    "2571696NslrLl",
    "password",
    "315764COtMcb",
    "message",
    "_id",
    "findById",
    "Admin\x20profile\x20get\x20by\x20admin!",
    "1701440NqzMQW",
    "status",
  ];
  _0x3025 = function () {
    return _0x30f255;
  };
  return _0x3025();
}
((function (_0x16de91, _0x239b17) {
  const _0x502790 = _0x7192,
    _0x3772cb = _0x16de91();
  while (!![]) {
    try {
      const _0x19f6f0 =
        parseInt(_0x502790(0x80)) / 0x1 +
        -parseInt(_0x502790(0x77)) / 0x2 +
        -parseInt(_0x502790(0x7d)) / 0x3 +
        -parseInt(_0x502790(0x87)) / 0x4 +
        -parseInt(_0x502790(0x85)) / 0x5 +
        parseInt(_0x502790(0x7e)) / 0x6 +
        parseInt(_0x502790(0x88)) / 0x7;
      if (_0x19f6f0 === _0x239b17) break;
      else _0x3772cb["push"](_0x3772cb["shift"]());
    } catch (_0x4ab39b) {
      _0x3772cb["push"](_0x3772cb["shift"]());
    }
  }
})(_0x3025, 0x4e40f),
  (exports["getProfile"] = async (_0x5f324d, _0x429b48) => {
    const _0x1d3641 = _0x7192;
    try {
      const _0x516c70 = await Admin[_0x1d3641(0x83)](
        _0x5f324d?.[_0x1d3641(0x7c)][_0x1d3641(0x82)],
      );
      if (!_0x516c70)
        return _0x429b48["status"](0xc8)[_0x1d3641(0x78)]({
          status: ![],
          message: "Admin\x20does\x20not\x20found.",
        });
      const _0x2d2bd7 = await Admin["findById"](_0x516c70["_id"]);
      return (
        (_0x2d2bd7[_0x1d3641(0x7f)] = cryptr[_0x1d3641(0x79)](
          _0x2d2bd7[_0x1d3641(0x7f)],
        )),
        _0x429b48["status"](0xc8)[_0x1d3641(0x78)]({
          status: !![],
          message: _0x1d3641(0x84),
          user: _0x2d2bd7,
        })
      );
    } catch (_0x22de21) {
      return (
        console[_0x1d3641(0x7b)](_0x22de21),
        _0x429b48[_0x1d3641(0x86)](0x1f4)[_0x1d3641(0x78)]({
          status: ![],
          error: _0x22de21[_0x1d3641(0x81)] || _0x1d3641(0x7a),
        })
      );
    }
  }));

//update admin profile
exports.update = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id);
    if (!admin) {
      if (req?.body?.image) {
        await deleteFromStorage(req?.body?.image);
      }

      return res
        .status(200)
        .json({ status: false, message: "admin does not found." });
    }

    if (req?.body?.image) {
      if (admin?.image) {
        await deleteFromStorage(admin?.image);
      }

      admin.image = req?.body?.image ? req?.body?.image : admin.image;
    }

    admin.name = req?.body?.name ? req?.body?.name : admin.name;
    admin.email = req?.body?.email ? req?.body?.email.trim() : admin.email;
    await admin.save();

    const data = await Admin.findById(admin._id);
    data.password = cryptr.decrypt(data.password);

    return res.status(200).json({
      status: true,
      message: "Admin profile updated Successfully!",
      admin: data,
    });
  } catch (error) {
    if (req?.body?.image) {
      await deleteFromStorage(req?.body?.image);
    }

    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//send email for forgot the password (forgot password)
exports.forgotPassword = async (req, res) => {
  try {
    if (!req.body.email) {
      return res
        .status(200)
        .json({ status: false, message: "Oops ! Invalid details!" });
    }

    const admin = await Admin.findOne({ email: req.body.email.trim() });
    if (!admin) {
      return res
        .status(200)
        .json({
          status: false,
          message: "Admin does not found with that email.",
        });
    }

    var tab = "";
    tab += "<!DOCTYPE html><html><head>";
    tab +=
      "<meta charset='utf-8'><meta http-equiv='x-ua-compatible' content='ie=edge'><meta name='viewport' content='width=device-width, initial-scale=1'>";
    tab += "<style type='text/css'>";
    tab +=
      " @media screen {@font-face {font-family: 'Source Sans Pro';font-style: normal;font-weight: 400;}";
    tab +=
      "@font-face {font-family: 'Source Sans Pro';font-style: normal;font-weight: 700;}}";
    tab +=
      "body,table,td,a {-ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; }";
    tab += "table,td {mso-table-rspace: 0pt;mso-table-lspace: 0pt;}";
    tab += "img {-ms-interpolation-mode: bicubic;}";
    tab +=
      "a[x-apple-data-detectors] {font-family: inherit !important;font-size: inherit !important;font-weight: inherit !important;line-height:inherit !important;color: inherit !important;text-decoration: none !important;}";
    tab += "div[style*='margin: 16px 0;'] {margin: 0 !important;}";
    tab +=
      "body {width: 100% !important;height: 100% !important;padding: 0 !important;margin: 0 !important;}";
    tab += "table {border-collapse: collapse !important;}";
    tab += "a {color: #1a82e2;}";
    tab +=
      "img {height: auto;line-height: 100%;text-decoration: none;border: 0;outline: none;}";
    tab += "</style></head><body>";
    tab += "<table border='0' cellpadding='0' cellspacing='0' width='100%'>";
    tab +=
      "<tr><td align='center' bgcolor='#e9ecef'><table border='0' cellpadding='0' cellspacing='0' width='100%' style='max-width: 600px;'>";
    tab +=
      "<tr><td align='center' valign='top' bgcolor='#ffffff' style='padding:36px 24px 0;border-top: 3px solid #d4dadf;'><a href='#' target='_blank' style='display: inline-block;'>";
    tab +=
      "<img src='https://www.stampready.net/dashboard/editor/user_uploads/zip_uploads/2018/11/23/5aXQYeDOR6ydb2JtSG0p3uvz/zip-for-upload/images/template1-icon.png' alt='Logo' border='0' width='48' style='display: block; width: 500px; max-width: 500px; min-width: 500px;'></a>";
    tab +=
      "</td></tr></table></td></tr><tr><td align='center' bgcolor='#e9ecef'><table border='0' cellpadding='0' cellspacing='0' width='100%' style='max-width: 600px;'><tr><td align='center' bgcolor='#ffffff'>";
    tab +=
      "<h1 style='margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -1px; line-height: 48px;'>SET YOUR PASSWORD</h1></td></tr></table></td></tr>";
    tab +=
      "<tr><td align='center' bgcolor='#e9ecef'><table border='0' cellpadding='0' cellspacing='0' width='100%' style='max-width: 600px;'><tr><td align='center' bgcolor='#ffffff' style='padding: 24px; font-size: 16px; line-height: 24px;font-weight: 600'>";
    tab +=
      "<p style='margin: 0;'>Not to worry, We got you! Let's get you a new password.</p></td></tr><tr><td align='left' bgcolor='#ffffff'>";
    tab +=
      "<table border='0' cellpadding='0' cellspacing='0' width='100%'><tr><td align='center' bgcolor='#ffffff' style='padding: 12px;'>";
    tab +=
      "<table border='0' cellpadding='0' cellspacing='0'><tr><td align='center' style='border-radius: 4px;padding-bottom: 50px;'>";
    tab +=
      "<a href='" +
      process?.env?.baseURL +
      "changePassword/" +
      admin._id +
      "' target='_blank' style='display: inline-block; padding: 16px 36px; font-size: 16px; color: #ffffff; text-decoration: none; border-radius: 4px;background: #FE9A16; box-shadow: -2px 10px 20px -1px #33cccc66;'>SUBMIT PASSWORD</a>";
    tab +=
      "</td></tr></table></td></tr></table></td></tr></table></td></tr></table></body></html>";

    const resend = new Resend(settingJSON?.resendApiKey);
    const response = await resend.emails.send({
      from: process?.env?.EMAIL,
      to: req.body.email?.trim(),
      subject: `Sending email from ${process?.env?.appName} for Password Security`,
      html: tab,
    });

    if (response.error) {
      console.error("Error sending email via Resend:", response.error);
      return res
        .status(500)
        .json({
          status: false,
          message: "Failed to send OTP email",
          error: response.error.message,
        });
    }

    return res
      .status(200)
      .json({ status: true, message: "OTP sent successfully!" });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//update password
exports.updatePassword = async (req, res) => {
  try {
    const admin = await Admin.findById(req?.admin._id);
    if (!admin) {
      return res
        .status(200)
        .json({ status: false, message: "Admin does not found." });
    }

    if (!req.body.oldPass || !req.body.newPass || !req.body.confirmPass) {
      return res
        .status(200)
        .json({ status: false, message: "Oops! Invalid details." });
    }

    if (cryptr.decrypt(admin.password) !== req.body.oldPass) {
      return res.status(200).json({
        status: false,
        message: "Oops! Password doesn't match!",
      });
    }

    if (req.body.newPass !== req.body.confirmPass) {
      return res.status(200).json({
        status: false,
        message: "Oops! New Password and Confirm Password don't match!",
      });
    }

    const hash = cryptr.encrypt(req.body.newPass);
    admin.password = hash;
    await admin.save();

    return res.status(200).json({
      status: true,
      message: "Password changed successfully!",
      admin: admin,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({
        status: false,
        error: error.message || "Internal Server Error!!",
      });
  }
};

//set Password
exports.setPassword = async (req, res) => {
  try {
    const admin = await Admin.findById(req?.admin._id);
    if (!admin) {
      return res
        .status(200)
        .json({ status: false, message: "Admin does not found." });
    }

    const { newPassword, confirmPassword } = req.body;

    if (!newPassword || !confirmPassword) {
      return res
        .status(200)
        .json({ status: false, message: "Oops ! Invalid details!" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(200).json({
        status: false,
        message: "Oops! New Password and Confirm Password don't match!",
      });
    }

    admin.password = cryptr.encrypt(newPassword);
    await admin.save();

    admin.password = cryptr.decrypt(admin?.password);

    return res.status(200).json({
      status: true,
      message: "Password has been updated Successfully.",
      admin,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Internal Server Error" });
  }
};
