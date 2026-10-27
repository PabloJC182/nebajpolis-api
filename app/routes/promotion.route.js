
module.exports = app => {
  const promotions = require("../controllers/promotion.controller.js");
  const { verifyToken, isAdmin } = require("../middlewares/authJwt.js");
  var router = require("express").Router();
  const { auditar } = require("../utils/audit.js");

  router.get("/", promotions.findAll);
  router.get("/vigentes", promotions.findAllActive);
  router.get("/:id", promotions.findOne);

  router.post("/create/", [verifyToken, isAdmin, auditar("promociones", "promotions", "promoción")], promotions.create);
  router.put("/update/:id", [verifyToken, isAdmin, auditar("promociones", "promotions", "promoción")], promotions.update);
  router.delete("/delete/:id", [verifyToken, isAdmin, auditar("promociones", "promotions", "promoción")], promotions.delete);

  app.use("/api/promotions", router);
};
