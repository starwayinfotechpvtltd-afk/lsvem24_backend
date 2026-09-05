const _0x40dd05 = _0x1ed8;
function _0x4d63() {
  const _0x3ebac8 = [
    "38829996laNDZI",
    "get",
    "1043ZsyZst",
    "/profile",
    "36528PyuamC",
    "updatePassword",
    "2405280ndMeaR",
    "patch",
    "exports",
    "/login",
    "4295PaSVUE",
    "login",
    "7272624ertAAD",
    "/updateProfile",
    "Router",
    "express",
    "post",
    "2279505sumLVh",
    "update",
    "/setPassword",
    "store",
    "/updatePassword",
    "544NbJTla",
    "7128qiQGfp",
    "getProfile",
    "/create",
  ];
  _0x4d63 = function () {
    return _0x3ebac8;
  };
  return _0x4d63();
}
(function (_0x4cd5c6, _0x1cc707) {
  const _0x14f21c = _0x1ed8,
    _0x10c4fb = _0x4cd5c6();
  while (!![]) {
    try {
      const _0x4ae9ae =
        parseInt(_0x14f21c(0x149)) / 0x1 +
        -parseInt(_0x14f21c(0x152)) / 0x2 +
        -parseInt(_0x14f21c(0x15d)) / 0x3 +
        (-parseInt(_0x14f21c(0x148)) / 0x4) * (-parseInt(_0x14f21c(0x156)) / 0x5) +
        (-parseInt(_0x14f21c(0x150)) / 0x6) * (parseInt(_0x14f21c(0x14e)) / 0x7) +
        -parseInt(_0x14f21c(0x158)) / 0x8 +
        parseInt(_0x14f21c(0x14c)) / 0x9;
      if (_0x4ae9ae === _0x1cc707) break;
      else _0x10c4fb["push"](_0x10c4fb["shift"]());
    } catch (_0x516311) {
      _0x10c4fb["push"](_0x10c4fb["shift"]());
    }
  }
})(_0x4d63, 0xa1113);
const express = require(_0x40dd05(0x15b)),
  route = express[_0x40dd05(0x15a)](),
  checkAccessWithSecretKey = require("../../checkAccess"),
  AdminMiddleware = require("../../middleware/admin.middleware"),
  AdminController = require("../../controllers/admin/admin.controller");
function _0x1ed8(_0x24313a, _0x575c88) {
  const _0x4d639e = _0x4d63();
  return (
    (_0x1ed8 = function (_0x1ed874, _0x5cc009) {
      _0x1ed874 = _0x1ed874 - 0x145;
      let _0x411bd8 = _0x4d639e[_0x1ed874];
      return _0x411bd8;
    }),
    _0x1ed8(_0x24313a, _0x575c88)
  );
}
(route[_0x40dd05(0x15c)](_0x40dd05(0x14b), checkAccessWithSecretKey(), AdminController[_0x40dd05(0x146)]),
  route[_0x40dd05(0x15c)](_0x40dd05(0x155), checkAccessWithSecretKey(), AdminController[_0x40dd05(0x157)]),
  route[_0x40dd05(0x14d)](_0x40dd05(0x14f), AdminMiddleware, checkAccessWithSecretKey(), AdminController[_0x40dd05(0x14a)]),
  route[_0x40dd05(0x153)](_0x40dd05(0x159), AdminMiddleware, checkAccessWithSecretKey(), AdminController[_0x40dd05(0x15e)]),
  route[_0x40dd05(0x15c)]("/forgotPassword", AdminController["forgotPassword"]),
  route["patch"](_0x40dd05(0x147), AdminMiddleware, checkAccessWithSecretKey(), AdminController[_0x40dd05(0x151)]),
  route[_0x40dd05(0x15c)](_0x40dd05(0x145), AdminMiddleware, checkAccessWithSecretKey(), AdminController["setPassword"]),
  (module[_0x40dd05(0x154)] = route));
