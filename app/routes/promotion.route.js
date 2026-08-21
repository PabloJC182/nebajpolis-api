// app/routes/promotion.route.js
module.exports = app => {
  const promotions = require("../controllers/promotion.controller.js");
  const { verifyToken, isAdmin } = require("../middlewares/authJwt.js");
  var router = require("express").Router();

  router.get("/", promotions.findAll);
  router.get("/vigentes", promotions.findAllActive);
  router.get("/:id", promotions.findOne);

  router.post("/create/", [verifyToken, isAdmin], promotions.create);
  router.put("/update/:id", [verifyToken, isAdmin], promotions.update);
  router.delete("/delete/:id", [verifyToken, isAdmin], promotions.delete);

  app.use("/api/promotions", router);
};
