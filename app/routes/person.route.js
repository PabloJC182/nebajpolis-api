
module.exports = app => {
  const persons = require("../controllers/person.controller.js");
  const { verifyToken, isAdmin } = require("../middlewares/authJwt.js");
  var router = require("express").Router();
  const { auditar } = require("../utils/audit.js");

  router.get("/", persons.findAll);
  router.get("/:id", persons.findOne);

  router.post("/create/", [verifyToken, isAdmin, auditar("personas", "persons", "persona")], persons.create);
  router.put("/update/:id", [verifyToken, isAdmin, auditar("personas", "persons", "persona")], persons.update);
  router.delete("/delete/:id", [verifyToken, isAdmin, auditar("personas", "persons", "persona")], persons.delete);

  app.use("/api/persons", router);
};
