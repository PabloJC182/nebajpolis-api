module.exports = app => {
  const auth = require("../controllers/auth.controller.js");
  const { verifyToken } = require("../middlewares/authJwt.js");
  var router = require("express").Router();

  router.post("/signup", auth.signup);
  router.post("/signin", auth.signin);
  router.post("/forgot", auth.forgot);
  router.post("/reset", auth.reset);

  router.get("/me", [verifyToken], auth.me);
  router.put("/me", [verifyToken], auth.updateMe);
  router.post("/change-password", [verifyToken], auth.changePassword);

  app.use("/api/auth", router);
};
