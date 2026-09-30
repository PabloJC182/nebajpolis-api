
const db = require("../models");
const Review = db.reviews;



exports.create = (req, res) => {
  if (!req.body.movieId || !req.body.rating) {
    return res.status(400).send({ message: "movieId y rating son requeridos." });
  }

  Review.create({
    movieId: req.body.movieId,
    userId: req.userId,
    rating: req.body.rating,
    comment: req.body.comment
  })
    .then(data => res.send(data))
    .catch(err => res.status(500).send({ message: err.message || "Ocurrio un error al crear la reseña." }));
};


exports.findAll = (req, res) => {
  const movieId = req.query.movieId;
  const condition = movieId ? { movieId: movieId } : null;

  Review.findAll({
    where: condition,
    include: [db.appUsers],
    order: [["reviewDate", "DESC"]]
  })
    .then(data => res.send(data))
    .catch(err => res.status(500).send({ message: err.message || "Ocurrio un error al listar las reseñas." }));
};

exports.findOne = (req, res) => {
  const id = req.params.id;

  Review.findByPk(id, { include: [db.appUsers, db.movies] })
    .then(data => {
      if (!data) return res.status(404).send({ message: `Reseña con id=${id} no encontrada.` });
      res.send(data);
    })
    .catch(err => res.status(500).send({ message: "Error al obtener la reseña con id=" + id }));
};


exports.update = async (req, res) => {
  const id = req.params.id;

  try {
    const review = await Review.findByPk(id);
    if (!review) return res.status(404).send({ message: `Reseña con id=${id} no encontrada.` });
    if (review.userId !== req.userId && req.userRole !== "admin") {
      return res.status(403).send({ message: "No tienes permiso para editar esta reseña." });
    }

    await review.update({ rating: req.body.rating, comment: req.body.comment });
    res.send({ message: "Reseña actualizada exitosamente." });
  } catch (err) {
    res.status(500).send({ message: "Error al actualizar la reseña con id=" + id });
  }
};


exports.delete = async (req, res) => {
  const id = req.params.id;

  try {
    const review = await Review.findByPk(id);
    if (!review) return res.status(404).send({ message: `Reseña con id=${id} no encontrada.` });
    if (review.userId !== req.userId && req.userRole !== "admin") {
      return res.status(403).send({ message: "No tienes permiso para eliminar esta reseña." });
    }

    await review.destroy();
    res.send({ message: "Reseña eliminada exitosamente." });
  } catch (err) {
    res.status(500).send({ message: "Error al eliminar la reseña con id=" + id });
  }
};
