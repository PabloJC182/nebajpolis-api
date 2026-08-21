// app/controllers/movie.controller.js
const db = require("../models");
const Movie = db.movies;
const Op = db.Sequelize.Op;

// Create and save a new Movie, con sus generos asociados si se envian
exports.create = (req, res) => {
  if (!req.body.title || !req.body.durationMinutes) {
    return res.status(400).send({ message: "title y durationMinutes son requeridos." });
  }

  Movie.create({
    title: req.body.title,
    synopsis: req.body.synopsis,
    durationMinutes: req.body.durationMinutes,
    releaseDate: req.body.releaseDate,
    rating: req.body.rating,
    posterUrl: req.body.posterUrl,
    originalLanguage: req.body.originalLanguage,
    status: req.body.status !== undefined ? req.body.status : true
  })
    .then(movie => {
      // req.body.genreIds: arreglo opcional de ids de generos, ej. [1, 3]
      if (req.body.genreIds && req.body.genreIds.length > 0) {
        return movie.setGenres(req.body.genreIds).then(() => movie);
      }
      return movie;
    })
    .then(movie => {
      res.send(movie);
    })
    .catch(err => {
      res.status(500).send({ message: err.message || "Ocurrio un error al crear la pelicula." });
    });
};

// Retrieve all Movies, con filtro opcional por titulo (?title=) y por genero (?genreId=)
exports.findAll = (req, res) => {
  const title = req.query.title;
  const condition = title ? { title: { [Op.iLike]: `%${title}%` } } : null;

  Movie.findAll({
    where: condition,
    include: [db.genres]
  })
    .then(data => {
      res.send(data);
    })
    .catch(err => {
      res.status(500).send({ message: err.message || "Ocurrio un error al listar las peliculas." });
    });
};

// Retrieve only Movies currently in cartelera (status = true)
exports.findAllActive = (req, res) => {
  Movie.findAll({
    where: { status: true },
    include: [db.genres]
  })
    .then(data => {
      res.send(data);
    })
    .catch(err => {
      res.status(500).send({ message: err.message || "Ocurrio un error al listar la cartelera." });
    });
};

// Find a single Movie by id, con generos y reparto completos
exports.findOne = (req, res) => {
  const id = req.params.id;

  Movie.findByPk(id, {
    include: [
      db.genres,
      { model: db.persons, through: { attributes: ["role"] } }
    ]
  })
    .then(data => {
      if (!data) {
        return res.status(404).send({ message: `No se encontro la pelicula con id=${id}` });
      }
      res.send(data);
    })
    .catch(err => {
      res.status(500).send({ message: "Error al obtener la pelicula con id=" + id });
    });
};

// Update a Movie by id
exports.update = (req, res) => {
  const id = req.params.id;

  Movie.update(req.body, { where: { id: id } })
    .then(num => {
      if (num == 1) {
        res.send({ message: "Pelicula actualizada exitosamente." });
      } else {
        res.send({ message: `No se pudo actualizar la pelicula con id=${id}. Verifica que exista.` });
      }
    })
    .catch(err => {
      res.status(500).send({ message: "Error al actualizar la pelicula con id=" + id });
    });
};

// Delete a Movie by id
exports.delete = (req, res) => {
  const id = req.params.id;

  Movie.destroy({ where: { id: id } })
    .then(num => {
      if (num == 1) {
        res.send({ message: "Pelicula eliminada exitosamente." });
      } else {
        res.send({ message: `No se pudo eliminar la pelicula con id=${id}. Verifica que exista.` });
      }
    })
    .catch(err => {
      res.status(500).send({ message: "Error al eliminar la pelicula con id=" + id });
    });
};
