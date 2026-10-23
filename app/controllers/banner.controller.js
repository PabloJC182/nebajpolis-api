const db = require("../models");
const Banner = db.banners;
const Op = db.Sequelize.Op;

// Solo rutas internas o https: evita enlaces tipo javascript:
const ENLACE_OK = /^(\/(?!\/)|https:\/\/)/;

const limpiar = (b, { crear = false } = {}) => {
  const d = {};
  if (crear || "title" in b) d.title = String(b.title || "").trim().slice(0, 120);
  if (crear || "subtitle" in b) d.subtitle = String(b.subtitle || "").trim().slice(0, 200) || null;
  if (crear || "imageUrl" in b) d.imageUrl = String(b.imageUrl || "").trim();
  if (crear || "linkUrl" in b) d.linkUrl = String(b.linkUrl || "").trim() || null;
  if (crear || "buttonText" in b) d.buttonText = String(b.buttonText || "").trim().slice(0, 40) || null;
  if ("sortOrder" in b) d.sortOrder = parseInt(b.sortOrder, 10) || 0;
  if ("validFrom" in b) d.validFrom = b.validFrom || null;
  if ("validTo" in b) d.validTo = b.validTo || null;
  if ("status" in b) d.status = !!b.status;
  return d;
};

const error = (d) => {
  if ("title" in d && !d.title) return "El titulo es requerido.";
  if ("imageUrl" in d && !/^(https:\/\/|\/)/.test(d.imageUrl)) return "La imagen debe ser una URL https o una ruta interna.";
  if (d.linkUrl && !ENLACE_OK.test(d.linkUrl)) return "El enlace debe empezar con / (ruta interna) o https://";
  return null;
};

// Publico: banners activos y vigentes, en orden
exports.findAll = (req, res) => {
  const ahora = new Date();
  Banner.findAll({
    where: {
      status: true,
      [Op.and]: [
        { [Op.or]: [{ validFrom: null }, { validFrom: { [Op.lte]: ahora } }] },
        { [Op.or]: [{ validTo: null }, { validTo: { [Op.gte]: ahora } }] }
      ]
    },
    order: [["sortOrder", "ASC"], ["id", "ASC"]]
  })
    .then(data => res.send(data))
    .catch(err => res.status(500).send({ message: err.message || "Error al listar los banners." }));
};

// Admin: todos
exports.findAllAdmin = (req, res) => {
  Banner.findAll({ order: [["sortOrder", "ASC"], ["id", "ASC"]] })
    .then(data => res.send(data))
    .catch(err => res.status(500).send({ message: err.message || "Error al listar los banners." }));
};

exports.create = (req, res) => {
  const d = limpiar(req.body, { crear: true });
  const e = error(d);
  if (e) return res.status(400).send({ message: e });
  Banner.create(d)
    .then(data => res.send(data))
    .catch(err => res.status(500).send({ message: err.message || "Error al crear el banner." }));
};

exports.update = (req, res) => {
  const d = limpiar(req.body);
  const e = error(d);
  if (e) return res.status(400).send({ message: e });
  Banner.update(d, { where: { id: req.params.id } })
    .then(([num]) => res.send({ message: num === 1 ? "Banner actualizado." : `No se encontro el banner con id=${req.params.id}.` }))
    .catch(err => res.status(500).send({ message: err.message || "Error al actualizar el banner." }));
};

exports.delete = (req, res) => {
  Banner.destroy({ where: { id: req.params.id } })
    .then(num => res.send({ message: num === 1 ? "Banner eliminado." : `No se encontro el banner con id=${req.params.id}.` }))
    .catch(err => res.status(500).send({ message: err.message || "Error al eliminar el banner." }));
};
