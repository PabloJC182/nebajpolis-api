module.exports = app => {
  const c = require("../controllers/combo.controller.js");
  const { verifyToken, isAdmin } = require("../middlewares/authJwt.js");
  const { auditar } = require("../utils/audit.js");
  const router = require("express").Router();

  router.get("/", c.vigentes);
  router.get("/todos", [verifyToken, isAdmin], c.todos);
  router.post("/create/", [verifyToken, isAdmin, auditar("combos", "combos", "combo")], c.create);
  router.put("/update/:id", [verifyToken, isAdmin, auditar("combos", "combos", "combo")], c.update);
  router.delete("/delete/:id", [verifyToken, isAdmin, auditar("combos", "combos", "combo")], c.delete);

  app.use("/api/combos", router);
};
