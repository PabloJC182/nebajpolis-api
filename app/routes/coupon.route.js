module.exports = app => {
  const c = require("../controllers/coupon.controller.js");
  const { verifyToken, isAdmin, optionalAuth } = require("../middlewares/authJwt.js");
  const { auditar } = require("../utils/audit.js");
  const router = require("express").Router();

  router.post("/validar", [optionalAuth], c.validar);
  router.get("/", [verifyToken, isAdmin], c.findAll);
  router.post("/create/", [verifyToken, isAdmin, auditar("cupones", "coupons", "cupón")], c.create);
  router.put("/update/:id", [verifyToken, isAdmin, auditar("cupones", "coupons", "cupón")], c.update);
  router.delete("/delete/:id", [verifyToken, isAdmin, auditar("cupones", "coupons", "cupón")], c.delete);

  app.use("/api/cupones", router);
};
