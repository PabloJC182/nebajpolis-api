
const db = require("../models");
const Promotion = db.promotions;
const { diasATexto } = require("../utils/promo.js");

exports.create = (req, res) => {
  if (!req.body.name || req.body.discountPercentage === undefined) {
    return res.status(400).send({ message: "name y discountPercentage son requeridos." });
  }

  const pct = Number(req.body.discountPercentage);
  if (!(pct > 0 && pct <= 100)) {
    return res.status(400).send({ message: "discountPercentage debe estar entre 0 y 100." });
  }

  Promotion.create({
    name: req.body.name,
    description: req.body.description,
    discountPercentage: req.body.discountPercentage,
    validFrom: req.body.validFrom,
    validTo: req.body.validTo,
    validDays: diasATexto(req.body.validDays),
    status: req.body.status !== undefined ? req.body.status : true
  })
    .then(data => res.send(data))
    .catch(err => res.status(500).send({ message: err.message || "Ocurrio un error al crear la promocion." }));
};

exports.findAll = (req, res) => {
  Promotion.findAll()
    .then(data => res.send(data))
    .catch(err => res.status(500).send({ message: err.message || "Ocurrio un error al listar las promociones." }));
};


exports.findAllActive = (req, res) => {
  const now = new Date();
  Promotion.findAll({
    where: {
      status: true,
      validFrom: { [db.Sequelize.Op.lte]: now },
      validTo: { [db.Sequelize.Op.gte]: now }
    }
  })
    .then(data => res.send(data))
    .catch(err => res.status(500).send({ message: err.message || "Ocurrio un error al listar las promociones vigentes." }));
};

exports.findOne = (req, res) => {
  const id = req.params.id;

  Promotion.findByPk(id, { include: [db.shows] })
    .then(data => {
      if (!data) return res.status(404).send({ message: `Promocion con id=${id} no encontrada.` });
      res.send(data);
    })
    .catch(err => res.status(500).send({ message: "Error al obtener la promocion con id=" + id }));
};

exports.update = (req, res) => {
  const id = req.params.id;

  const datos = { ...req.body };
  if ("validDays" in datos) datos.validDays = diasATexto(datos.validDays);
  Promotion.update(datos, { where: { id: id } })
    .then(num => {
      if (num == 1) res.send({ message: "Promocion actualizada exitosamente." });
      else res.send({ message: `No se pudo actualizar la promocion con id=${id}. Puede que no exista.` });
    })
    .catch(err => res.status(500).send({ message: "Error al actualizar la promocion con id=" + id }));
};

exports.delete = (req, res) => {
  const id = req.params.id;

  Promotion.destroy({ where: { id: id } })
    .then(num => {
      if (num == 1) res.send({ message: "Promocion eliminada exitosamente." });
      else res.send({ message: `No se pudo eliminar la promocion con id=${id}. Puede que no exista.` });
    })
    .catch(err => res.status(500).send({ message: "Error al eliminar la promocion con id=" + id }));
};
