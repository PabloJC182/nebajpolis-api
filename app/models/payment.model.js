// app/models/payment.model.js
module.exports = (sequelize, Sequelize) => {
  const Payment = sequelize.define("payment", {
    // "card" por ahora, ya que el procesamiento real lo hace Stripe
    method: {
      type: Sequelize.STRING,
      defaultValue: "card"
    },
    amount: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false
    },
    // "pending", "completed", "failed" — actualizado por el webhook de Stripe
    status: {
      type: Sequelize.STRING,
      defaultValue: "pending"
    },
    // id de la sesion de Stripe Checkout, util para conciliar con el webhook
    stripeSessionId: {
      type: Sequelize.STRING
    }
  });
  return Payment;
};
