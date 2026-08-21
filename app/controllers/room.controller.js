// app/controllers/room.controller.js
const db = require("../models");
const Room = db.rooms;

exports.create = (req, res) => {
  if (!req.body.name || !req.body.capacity || !req.body.cinemaId) {
    return res.status(400).send({ message: "name, capacity y cinemaId son requeridos." });
  }

  Room.create({
    name: req.body.name,
    capacity: req.body.capacity,
    roomType: req.body.roomType,
    cinemaId: req.body.cinemaId
  })
    .then(data => res.send(data))
    .catch(err => res.status(500).send({ message: err.message || "Ocurrio un error al crear la sala." }));
};

// Retrieve all Rooms, con filtro opcional por cine (?cinemaId=)
exports.findAll = (req, res) => {
  const cinemaId = req.query.cinemaId;
  const condition = cinemaId ? { cinemaId: cinemaId } : null;

  Room.findAll({ where: condition, include: [db.cinemas] })
    .then(data => res.send(data))
    .catch(err => res.status(500).send({ message: err.message || "Ocurrio un error al obtener las salas." }));
};

exports.findOne = (req, res) => {
  const id = req.params.id;

  Room.findByPk(id, { include: [db.cinemas, db.seats] })
    .then(data => {
      if (!data) return res.status(404).send({ message: `Sala con id=${id} no encontrada.` });
      res.send(data);
    })
    .catch(err => res.status(500).send({ message: "Error al obtener la sala con id=" + id }));
};

exports.update = (req, res) => {
  const id = req.params.id;

  Room.update(req.body, { where: { id: id } })
    .then(num => {
      if (num == 1) res.send({ message: "Sala actualizada exitosamente." });
      else res.send({ message: `No se pudo actualizar la sala con id=${id}. Puede que no exista.` });
    })
    .catch(err => res.status(500).send({ message: "Error al actualizar la sala con id=" + id }));
};

exports.delete = (req, res) => {
  const id = req.params.id;

  Room.destroy({ where: { id: id } })
    .then(num => {
      if (num == 1) res.send({ message: "Sala eliminada exitosamente." });
      else res.send({ message: `No se pudo eliminar la sala con id=${id}. Puede que no exista.` });
    })
    .catch(err => res.status(500).send({ message: "Error al eliminar la sala con id=" + id }));
};
