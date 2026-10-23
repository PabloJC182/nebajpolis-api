module.exports = app => {
  const banners = require("../controllers/banner.controller.js");
  const { verifyToken, isAdmin } = require("../middlewares/authJwt.js");
  var router = require("express").Router();

  router.get("/", banners.findAll);
  router.get("/todos", [verifyToken, isAdmin], banners.findAllAdmin);

  router.post("/create/", [verifyToken, isAdmin], banners.create);
  router.put("/update/:id", [verifyToken, isAdmin], banners.update);
  router.delete("/delete/:id", [verifyToken, isAdmin], banners.delete);

  app.use("/api/banners", router);
};
