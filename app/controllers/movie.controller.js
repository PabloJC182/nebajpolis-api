
const db = require("../models");
const Movie = db.movies;
const Op = db.Sequelize.Op;


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
    backdropUrl: req.body.backdropUrl,
    originalLanguage: req.body.originalLanguage,
    status: req.body.status !== undefined ? req.body.status : true
  })
    .then(movie => {
      
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


exports.addCast = (req, res) => {
  const movieId = req.params.id;
  const { personId, role } = req.body;

  if (!personId || !role) {
    return res.status(400).send({ message: "personId y role son requeridos." });
  }

  db.movieCasts
    .create({ movieId: movieId, personId: personId, role: role })
    .then(data => res.send(data))
    .catch(err => res.status(500).send({ message: err.message || "Ocurrio un error al agregar al reparto." }));
};


exports.removeCast = (req, res) => {
  const { id: movieId, personId } = req.params;

  db.movieCasts
    .destroy({ where: { movieId: movieId, personId: personId } })
    .then(num => {
      if (num >= 1) res.send({ message: "Se quito a la persona del reparto." });
      else res.send({ message: "Esa persona no estaba en el reparto de esta pelicula." });
    })
    .catch(err => res.status(500).send({ message: err.message || "Ocurrio un error al quitar del reparto." }));
};
