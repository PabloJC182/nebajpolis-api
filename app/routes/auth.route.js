// app/routes/auth.route.js
module.exports = app => {
  const auth = require("../controllers/auth.controller.js");
  var router = require("express").Router();

  router.post("/signup", auth.signup);
  router.post("/signin", auth.signin);

  app.use("/api/auth", router);
};
