// app/controllers/person.controller.js
const db = require("../models");
const Person = db.persons;

exports.create = (req, res) => {
  if (!req.body.fullName) {
    return res.status(400).send({ message: "fullName es requerido." });
  }

  Person.create({
    fullName: req.body.fullName,
    photoUrl: req.body.photoUrl,
    birthDate: req.body.birthDate,
    biography: req.body.biography
  })
    .then(data => res.send(data))
    .catch(err => res.status(500).send({ message: err.message || "Ocurrio un error al crear la persona." }));
};

exports.findAll = (req, res) => {
  Person.findAll({ order: [["fullName", "ASC"]] })
    .then(data => res.send(data))
    .catch(err => res.status(500).send({ message: err.message || "Ocurrio un error al listar el elenco." }));
};

exports.findOne = (req, res) => {
  const id = req.params.id;

  Person.findByPk(id, { include: [{ model: db.movies, through: { attributes: ["role"] } }] })
    .then(data => {
      if (!data) return res.status(404).send({ message: `Persona con id=${id} no encontrada.` });
      res.send(data);
    })
    .catch(err => res.status(500).send({ message: "Error al obtener la persona con id=" + id }));
};

exports.update = (req, res) => {
  const id = req.params.id;

  Person.update(req.body, { where: { id: id } })
    .then(num => {
      if (num == 1) res.send({ message: "Persona actualizada exitosamente." });
      else res.send({ message: `No se pudo actualizar la persona con id=${id}. Puede que no exista.` });
    })
    .catch(err => res.status(500).send({ message: "Error al actualizar la persona con id=" + id }));
};

exports.delete = (req, res) => {
  const id = req.params.id;

  Person.destroy({ where: { id: id } })
    .then(num => {
      if (num == 1) res.send({ message: "Persona eliminada exitosamente." });
      else res.send({ message: `No se pudo eliminar la persona con id=${id}. Puede que no exista.` });
    })
    .catch(err => res.status(500).send({ message: "Error al eliminar la persona con id=" + id }));
};
