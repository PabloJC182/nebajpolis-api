module.exports = app => {
  const food = require("../controllers/food.controller.js");
  const { verifyToken, isAdmin } = require("../middlewares/authJwt.js");
  var router = require("express").Router();
  const { auditar } = require("../utils/audit.js");

  router.get("/", food.findAll);
  router.get("/todos", [verifyToken, isAdmin], food.findAllAdmin);
  router.get("/:id", food.findOne);

  router.post("/create/", [verifyToken, isAdmin, auditar("comida", "foodItems", "producto")], food.create);
  router.put("/update/:id", [verifyToken, isAdmin, auditar("comida", "foodItems", "producto")], food.update);
  router.delete("/delete/:id", [verifyToken, isAdmin, auditar("comida", "foodItems", "producto")], food.delete);

  app.use("/api/food", router);
};