// app/controllers/seat.controller.js
const db = require("../models");
const Seat = db.seats;

exports.create = (req, res) => {
  if (!req.body.rowLabel || !req.body.seatNumber || !req.body.roomId) {
    return res.status(400).send({ message: "rowLabel, seatNumber y roomId son requeridos." });
  }

  Seat.create({
    rowLabel: req.body.rowLabel,
    seatNumber: req.body.seatNumber,
    seatType: req.body.seatType,
    roomId: req.body.roomId
  })
    .then(data => res.send(data))
    .catch(err => res.status(500).send({ message: err.message || "Ocurrio un error al crear el asiento." }));
};

// Creacion masiva: arma de un solo request todo el layout de asientos de una sala.
// Body esperado: { roomId, seats: [{ rowLabel, seatNumber, seatType }, ...] }
exports.createBulk = (req, res) => {
  const { roomId, seats } = req.body;

  if (!roomId || !Array.isArray(seats) || seats.length === 0) {
    return res.status(400).send({ message: "roomId y un arreglo seats no vacio son requeridos." });
  }

  const seatsConSala = seats.map(seat => ({ ...seat, roomId: roomId }));

  Seat.bulkCreate(seatsConSala)
    .then(data => res.send(data))
    .catch(err => res.status(500).send({ message: err.message || "Ocurrio un error al crear los asientos." }));
};

// Retrieve all Seats de una sala especifica (?roomId=)
exports.findAll = (req, res) => {
  const roomId = req.query.roomId;
  const condition = roomId ? { roomId: roomId } : null;

  Seat.findAll({ where: condition, order: [["rowLabel", "ASC"], ["seatNumber", "ASC"]] })
    .then(data => res.send(data))
    .catch(err => res.status(500).send({ message: err.message || "Ocurrio un error al obtener los asientos." }));
};

exports.findOne = (req, res) => {
  const id = req.params.id;

  Seat.findByPk(id)
    .then(data => {
      if (!data) return res.status(404).send({ message: `Asiento con id=${id} no encontrado.` });
      res.send(data);
    })
    .catch(err => res.status(500).send({ message: "Error al obtener el asiento con id=" + id }));
};

exports.update = (req, res) => {
  const id = req.params.id;

  Seat.update(req.body, { where: { id: id } })
    .then(num => {
      if (num == 1) res.send({ message: "Asiento actualizado exitosamente." });
      else res.send({ message: `No se pudo actualizar el asiento con id=${id}. Puede que no exista.` });
    })
    .catch(err => res.status(500).send({ message: "Error al actualizar el asiento con id=" + id }));
};

exports.delete = (req, res) => {
  const id = req.params.id;

  Seat.destroy({ where: { id: id } })
    .then(num => {
      if (num == 1) res.send({ message: "Asiento eliminado exitosamente." });
      else res.send({ message: `No se pudo eliminar el asiento con id=${id}. Puede que no exista.` });
    })
    .catch(err => res.status(500).send({ message: "Error al eliminar el asiento con id=" + id }));
};
