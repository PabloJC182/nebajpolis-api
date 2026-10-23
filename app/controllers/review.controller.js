
const db = require("../models");
const Review = db.reviews;



exports.create = async (req, res) => {
  const { movieId, comment } = req.body;
  const rating = parseInt(req.body.rating, 10);

  if (!movieId || !rating) {
    return res.status(400).send({ message: "movieId y rating son requeridos." });
  }
  if (rating < 1 || rating > 5) {
    return res.status(400).send({ message: "El rating debe estar entre 1 y 5." });
  }

  try {
    const existente = await Review.findOne({ where: { movieId, userId: req.userId } });
    if (existente) {
      return res.status(409).send({ message: "Ya dejaste una reseña para esta pelicula. Puedes editarla." });
    }
    const data = await Review.create({ movieId, userId: req.userId, rating, comment });
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: err.message || "Ocurrio un error al crear la reseña." });
  }
};


exports.findAll = (req, res) => {
  const movieId = req.query.movieId;
  const condition = movieId ? { movieId: movieId } : null;

  Review.findAll({
    where: condition,
    include: [{ model: db.appUsers, attributes: ["id", "fullName"] }],
    order: [["reviewDate", "DESC"]]
  })
    .then(data => res.send(data))
    .catch(err => res.status(500).send({ message: err.message || "Ocurrio un error al listar las reseñas." }));
};

exports.findOne = (req, res) => {
  const id = req.params.id;

  Review.findByPk(id, { include: [{ model: db.appUsers, attributes: ["id", "fullName"] }, db.movies] })
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

    const rating = parseInt(req.body.rating, 10);
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).send({ message: "El rating debe estar entre 1 y 5." });
    }

    await review.update({ rating, comment: req.body.comment });
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
