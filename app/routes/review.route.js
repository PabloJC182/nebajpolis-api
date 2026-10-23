
module.exports = app => {
  const reviews = require("../controllers/review.controller.js");
  const { verifyToken } = require("../middlewares/authJwt.js");
  var router = require("express").Router();

  
  router.get("/", reviews.findAll);
  router.get("/:id", reviews.findOne);

  
  router.post("/create/", [verifyToken], reviews.create);
  router.put("/update/:id", [verifyToken], reviews.update);
  router.delete("/delete/:id", [verifyToken], reviews.delete);

  app.use("/api/reviews", router);
};
