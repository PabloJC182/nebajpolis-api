// app/controllers/cinema.controller.js
const db = require("../models");
const Cinema = db.cinemas;

exports.create = (req, res) => {
  if (!req.body.name) {
    return res.status(400).send({ message: "El nombre del cine es requerido." });
  }

  Cinema.create({
    name: req.body.name,
    address: req.body.address,
    city: req.body.city,
    phone: req.body.phone
  })
    .then(data => res.send(data))
    .catch(err => res.status(500).send({ message: err.message || "Ocurrio un error al crear el cine." }));
};

exports.findAll = (req, res) => {
  Cinema.findAll()
    .then(data => res.send(data))
    .catch(err => res.status(500).send({ message: err.message || "Ocurrio un error al obtener los cines." }));
};

exports.findOne = (req, res) => {
  const id = req.params.id;

  Cinema.findByPk(id, { include: [db.rooms] })
    .then(data => {
      if (!data) return res.status(404).send({ message: `Cine con id=${id} no encontrado.` });
      res.send(data);
    })
    .catch(err => res.status(500).send({ message: "Error al obtener el cine con id=" + id }));
};

exports.update = (req, res) => {
  const id = req.params.id;

  Cinema.update(req.body, { where: { id: id } })
    .then(num => {
      if (num == 1) res.send({ message: "Cine actualizado exitosamente." });
      else res.send({ message: `No se pudo actualizar el cine con id=${id}. Puede que no exista.` });
    })
    .catch(err => res.status(500).send({ message: "Error al actualizar el cine con id=" + id }));
};

exports.delete = (req, res) => {
  const id = req.params.id;

  Cinema.destroy({ where: { id: id } })
    .then(num => {
      if (num == 1) res.send({ message: "Cine eliminado exitosamente." });
      else res.send({ message: `No se pudo eliminar el cine con id=${id}. Puede que no exista.` });
    })
    .catch(err => res.status(500).send({ message: "Error al eliminar el cine con id=" + id }));
};
