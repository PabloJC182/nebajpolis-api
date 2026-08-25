// app/routes/person.route.js
module.exports = app => {
  const persons = require("../controllers/person.controller.js");
  const { verifyToken, isAdmin } = require("../middlewares/authJwt.js");
  var router = require("express").Router();

  router.get("/", persons.findAll);
  router.get("/:id", persons.findOne);

  router.post("/create/", [verifyToken, isAdmin], persons.create);
  router.put("/update/:id", [verifyToken, isAdmin], persons.update);
  router.delete("/delete/:id", [verifyToken, isAdmin], persons.delete);

  app.use("/api/persons", router);
};
