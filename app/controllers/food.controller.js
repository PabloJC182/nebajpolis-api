const db = require("../models");
const FoodItem = db.foodItems;

// Al publico solo se le dice si esta agotado o quedan pocas; nunca la cifra exacta de existencias
const publico = (i) => {
  const j = i.toJSON();
  const controlado = j.stock !== null && j.stock !== undefined;
  const agotado = controlado && j.stock <= 0;
  const pocas = controlado && !agotado && j.stock <= (j.stockMin ?? 5);
  delete j.stock; delete j.stockMin;
  return { ...j, agotado, pocas };
};

exports.create = (req, res) => {
  if (!req.body.name || req.body.price === undefined) {
    return res.status(400).send({ message: "El nombre y el precio del producto son requeridos." });
  }
  FoodItem.create({
    name: req.body.name,
    description: req.body.description,
    category: req.body.category,
    price: req.body.price,
    imageUrl: req.body.imageUrl,
    status: req.body.status
  })
    .then(data => {
      res.send(data);
    })
    .catch(err => {
      res.status(500).send({
        message: err.message || "Ocurrio un error al crear el producto."
      });
    });
};

// Publico: solo productos disponibles
exports.findAll = (req, res) => {
  FoodItem.findAll({ where: { status: true }, order: [["category", "ASC"], ["name", "ASC"]] })
    .then(data => {
      res.send(data.map(publico));
    })
    .catch(err => {
      res.status(500).send({
        message: err.message || "Ocurrio un error al obtener la comida."
      });
    });
};

// Admin: todos, incluso los no disponibles
exports.findAllAdmin = (req, res) => {
  FoodItem.findAll({ order: [["category", "ASC"], ["name", "ASC"]] })
    .then(data => {
      res.send(data);
    })
    .catch(err => {
      res.status(500).send({
        message: err.message || "Ocurrio un error al obtener la comida."
      });
    });
};

exports.findOne = (req, res) => {
  const id = req.params.id;
  FoodItem.findByPk(id)
    .then(data => {
      if (!data) {
        return res.status(404).send({ message: `Producto con id=${id} no encontrado.` });
      }
      res.send(publico(data));
    })
    .catch(err => {
      res.status(500).send({ message: "Error al obtener el producto con id=" + id });
    });
};

exports.update = (req, res) => {
  const id = req.params.id;
  // Las existencias solo cambian por /inventario o por ventas (queda en el kardex y la bitacora)
  const { stock, stockMin, id: _id, ...permitido } = req.body;
  FoodItem.update(permitido, { where: { id: id } })
    .then(num => {
      if (num == 1) {
        res.send({ message: "Producto actualizado exitosamente." });
      } else {
        res.send({ message: `No se pudo actualizar el producto con id=${id}. Puede que no exista o el body este vacio.` });
      }
    })
    .catch(err => {
      res.status(500).send({ message: "Error al actualizar el producto con id=" + id });
    });
};

exports.delete = (req, res) => {
  const id = req.params.id;
  FoodItem.destroy({ where: { id: id } })
    .then(num => {
      if (num == 1) {
        res.send({ message: "Producto eliminado exitosamente." });
      } else {
        res.send({ message: `No se pudo eliminar el producto con id=${id}. Puede que no exista.` });
      }
    })
    .catch(err => {
      res.status(500).send({ message: "Error al eliminar el producto con id=" + id });
    });
};