
const db = require("../models");
const Show = db.shows;
const Op = db.Sequelize.Op;


// La fecha y hora de una funcion nueva (o cambiada) no puede estar en el pasado
const MSG_PASADA = "La fecha y hora de la funcion ya paso. Elige una hora futura.";
const fechaValida = (v) => { const t = new Date(v).getTime(); return Number.isNaN(t) ? null : t; };

exports.create = (req, res) => {
  if (!req.body.movieId || !req.body.roomId || !req.body.showDatetime || !req.body.basePrice) {
    return res.status(400).send({ message: "movieId, roomId, showDatetime y basePrice son requeridos." });
  }
  const cuando = fechaValida(req.body.showDatetime);
  if (cuando === null) return res.status(400).send({ message: "La fecha y hora de la funcion no es valida." });
  if (cuando < Date.now()) return res.status(400).send({ message: MSG_PASADA });

  Show.create({
    movieId: req.body.movieId,
    roomId: req.body.roomId,
    showDatetime: req.body.showDatetime,
    basePrice: req.body.basePrice,
    format: req.body.format,
    status: req.body.status !== undefined ? req.body.status : true
  })
    .then(show => {
      
      if (req.body.promotionIds && req.body.promotionIds.length > 0) {
        return show.setPromotions(req.body.promotionIds).then(() => show);
      }
      return show;
    })
    .then(show => res.send(show))
    .catch(err => res.status(500).send({ message: err.message || "Ocurrio un error al crear la funcion." }));
};


exports.findAll = (req, res) => {
  const { movieId, roomId, from, to, cinemaId, upcoming } = req.query;
  const condition = {};
  // upcoming=1: solo funciones activas que aun no terminan de empezar (30 min de gracia)
  if (upcoming) {
    condition.status = true;
    condition.showDatetime = { [Op.gte]: new Date(Date.now() - 30 * 60 * 1000) };
  }
  if (movieId) condition.movieId = movieId;
  if (roomId) condition.roomId = roomId;
  if (from && to) condition.showDatetime = { [Op.between]: [from, to] };

  Show.findAll({
    where: condition,
    include: [
      db.movies,
      { model: db.rooms, include: [db.cinemas], ...(cinemaId ? { where: { cinemaId }, required: true } : {}) },
      db.promotions
    ],
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
      if (!seats) return; 
      const seatsConDisponibilidad = seats.map(seat => ({
        id: seat.id,
        rowLabel: seat.rowLabel,
        seatNumber: seat.seatNumber,
        seatType: seat.seatType,
        
        available: seat.tickets.length === 0
      }));
      res.send(seatsConDisponibilidad);
    })
    .catch(err => res.status(500).send({ message: err.message || "Error al obtener disponibilidad de asientos." }));
};

exports.update = async (req, res) => {
  const id = req.params.id;

  // Si cambia la fecha/hora, la nueva no puede estar en el pasado (si no cambia, se pueden editar los demas campos)
  if (req.body.showDatetime !== undefined) {
    const nueva = fechaValida(req.body.showDatetime);
    if (nueva === null) return res.status(400).send({ message: "La fecha y hora de la funcion no es valida." });
    const actual = await Show.findByPk(id, { attributes: ["id", "showDatetime"] }).catch(() => null);
    const cambio = !actual || new Date(actual.showDatetime).getTime() !== nueva;
    if (cambio && nueva < Date.now()) return res.status(400).send({ message: MSG_PASADA });
  }

  const { promotionIds, ...campos } = req.body;

  const actualizar = Object.keys(campos).length ? Show.update(campos, { where: { id: id } }).then(r => r[0]) : Show.count({ where: { id: id } });
  actualizar
    .then(async num => {
      if (num == 1) {
        if (Array.isArray(promotionIds)) {
          const show = await Show.findByPk(id);
          await show.setPromotions(promotionIds);
        }
        res.send({ message: "Funcion actualizada exitosamente." });
      }
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
