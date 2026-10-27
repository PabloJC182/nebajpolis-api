module.exports = app => {
  const banners = require("../controllers/banner.controller.js");
  const { verifyToken, isAdmin } = require("../middlewares/authJwt.js");
  var router = require("express").Router();
  const { auditar } = require("../utils/audit.js");

  router.get("/", banners.findAll);
  router.get("/todos", [verifyToken, isAdmin], banners.findAllAdmin);

  router.post("/create/", [verifyToken, isAdmin, auditar("banners", "banners", "banner")], banners.create);
  router.put("/update/:id", [verifyToken, isAdmin, auditar("banners", "banners", "banner")], banners.update);
  router.delete("/delete/:id", [verifyToken, isAdmin, auditar("banners", "banners", "banner")], banners.delete);

  app.use("/api/banners", router);
};
