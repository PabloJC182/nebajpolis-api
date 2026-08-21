// app/controllers/show.controller.js
const db = require("../models");
const Show = db.shows;
const Op = db.Sequelize.Op;

// Create and save a new Show, con promociones asociadas si se envian
exports.create = (req, res) => {
  if (!req.body.movieId || !req.body.roomId || !req.body.showDatetime || !req.body.basePrice) {
    return res.status(400).send({ message: "movieId, roomId, showDatetime y basePrice son requeridos." });
  }

  Show.create({
    movieId: req.body.movieId,
    roomId: req.body.roomId,
    showDatetime: req.body.showDatetime,
    basePrice: req.body.basePrice,
    format: req.body.format,
    status: req.body.status !== undefined ? req.body.status : true
  })
    .then(show => {
      // req.body.promotionIds: arreglo opcional de ids de promociones aplicables, ej. [1, 2]
      if (req.body.promotionIds && req.body.promotionIds.length > 0) {
        return show.setPromotions(req.body.promotionIds).then(() => show);
      }
      return show;
    })
    .then(show => res.send(show))
    .catch(err => res.status(500).send({ message: err.message || "Ocurrio un error al crear la funcion." }));
};

// Retrieve all Shows, con filtros opcionales por pelicula, sala o rango de fecha
exports.findAll = (req, res) => {
  const { movieId, roomId, from, to } = req.query;
  const condition = {};
  if (movieId) condition.movieId = movieId;
  if (roomId) condition.roomId = roomId;
  if (from && to) condition.showDatetime = { [Op.between]: [from, to] };

  Show.findAll({
    where: condition,
    include: [db.movies, { model: db.rooms, include: [db.cinemas] }, db.promotions],
    order: [["showDatetime", "ASC"]]
  })
    .then(data => res.send(data))
    .catch(err => res.status(500).send({ message: err.message || "Ocurrio un error al listar las funciones." }));
};

exports.findOne = (req, res) => {
  const id = req.params.id;

  Show.findByPk(id, { include: [db.movies, { model: db.rooms, include: [db.cinemas] }, db.promotions] })
    .then(data => {
      if (!data) return res.status(404).send({ message: `Funcion con id=${id} no encontrada.` });
      res.send(data);
    })
    .catch(err => res.status(500).send({ message: "Error al obtener la funcion con id=" + id }));
};

// Devuelve todos los asientos de la sala de la funcion, marcando cuales ya estan vendidos.
// Es la base para la pantalla de seleccion de asientos del frontend.
exports.findAvailableSeats = (req, res) => {
  const id = req.params.id;

  Show.findByPk(id)
    .then(show => {
      if (!show) return res.status(404).send({ message: `Funcion con id=${id} no encontrada.` });

      return db.seats.findAll({
        where: { roomId: show.roomId },
        include: [{
          model: db.tickets,
          required: false,
          where: { showId: id }
        }],
        order: [["rowLabel", "ASC"], ["seatNumber", "ASC"]]
      });
    })
    .then(seats => {
      if (!seats) return; // ya se respondio 404 arriba
      const seatsConDisponibilidad = seats.map(seat => ({
        id: seat.id,
        rowLabel: seat.rowLabel,
        seatNumber: seat.seatNumber,
        seatType: seat.seatType,
        // Si el include trajo algun ticket para esta funcion, el asiento ya esta ocupado
        available: seat.tickets.length === 0
      }));
      res.send(seatsConDisponibilidad);
    })
    .catch(err => res.status(500).send({ message: err.message || "Error al obtener disponibilidad de asientos." }));
};

exports.update = (req, res) => {
  const id = req.params.id;

  Show.update(req.body, { where: { id: id } })
    .then(num => {
      if (num == 1) res.send({ message: "Funcion actualizada exitosamente." });
      else res.send({ message: `No se pudo actualizar la funcion con id=${id}. Puede que no exista.` });
    })
    .catch(err => res.status(500).send({ message: "Error al actualizar la funcion con id=" + id }));
};

exports.delete = (req, res) => {
  const id = req.params.id;

  Show.destroy({ where: { id: id } })
    .then(num => {
      if (num == 1) res.send({ message: "Funcion eliminada exitosamente." });
      else res.send({ message: `No se pudo eliminar la funcion con id=${id}. Puede que no exista.` });
    })
    .catch(err => res.status(500).send({ message: "Error al eliminar la funcion con id=" + id }));
};
