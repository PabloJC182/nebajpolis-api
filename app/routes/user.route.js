module.exports = app => {
  const users = require("../controllers/user.controller.js");
  const { verifyToken, isAdmin } = require("../middlewares/authJwt.js");
  const router = require("express").Router();

  router.get("/", [verifyToken, isAdmin], users.findAll);
  router.put("/:id/role", [verifyToken, isAdmin], users.setRole);

  app.use("/api/users", router);
};
