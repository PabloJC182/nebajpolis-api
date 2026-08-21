// app/controllers/genre.controller.js
const db = require("../models");
const Genre = db.genres;

// Crear un nuevo genero
exports.create = (req, res) => {
  if (!req.body.name) {
    return res.status(400).send({ message: "El nombre del genero es requerido." });
  }

  Genre.create({ name: req.body.name })
    .then(data => {
      res.send(data);
    })
    .catch(err => {
      res.status(500).send({
        message: err.message || "Ocurrio un error al crear el genero."
      });
    });
};

// Listar todos los generos
exports.findAll = (req, res) => {
  Genre.findAll()
    .then(data => {
      res.send(data);
    })
    .catch(err => {
      res.status(500).send({
        message: err.message || "Ocurrio un error al obtener los generos."
      });
    });
};

// Obtener un genero por id
exports.findOne = (req, res) => {
  const id = req.params.id;

  Genre.findByPk(id)
    .then(data => {
      if (!data) {
        return res.status(404).send({ message: `Genero con id=${id} no encontrado.` });
      }
      res.send(data);
    })
    .catch(err => {
      res.status(500).send({ message: "Error al obtener el genero con id=" + id });
    });
};

// Actualizar un genero por id
exports.update = (req, res) => {
  const id = req.params.id;

  Genre.update(req.body, { where: { id: id } })
    .then(num => {
      if (num == 1) {
        res.send({ message: "Genero actualizado exitosamente." });
      } else {
        res.send({ message: `No se pudo actualizar el genero con id=${id}. Puede que no exista o el body este vacio.` });
      }
    })
    .catch(err => {
      res.status(500).send({ message: "Error al actualizar el genero con id=" + id });
    });
};

// Eliminar un genero por id
exports.delete = (req, res) => {
  const id = req.params.id;

  Genre.destroy({ where: { id: id } })
    .then(num => {
      if (num == 1) {
        res.send({ message: "Genero eliminado exitosamente." });
      } else {
        res.send({ message: `No se pudo eliminar el genero con id=${id}. Puede que no exista.` });
      }
    })
    .catch(err => {
      res.status(500).send({ message: "Error al eliminar el genero con id=" + id });
    });
};
