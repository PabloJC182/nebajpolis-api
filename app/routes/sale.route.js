
module.exports = app => {
  const sales = require("../controllers/sale.controller.js");
  const { verifyToken, isAdmin } = require("../middlewares/authJwt.js");
  var router = require("express").Router();

  
  router.post("/create/", [verifyToken], sales.create);
  router.get("/mias", [verifyToken], sales.findMine);
  router.get("/:id", [verifyToken], sales.findOne);

  
  router.get("/", [verifyToken, isAdmin], sales.findAll);

  app.use("/api/sales", router);
};
