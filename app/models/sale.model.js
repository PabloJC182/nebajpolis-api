
module.exports = (sequelize, Sequelize) => {
  const Sale = sequelize.define("sale", {
    saleDate: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW
    },
    totalAmount: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false
    },
    
    status: {
      type: Sequelize.STRING,
      defaultValue: "pending"
    },
    // Cuando se envio el correo con las entradas
    emailSentAt: {
      type: Sequelize.DATE
    },
    // Compra como invitado (sin cuenta): userId queda en null
    guestEmail: { type: Sequelize.STRING },
    guestName: { type: Sequelize.STRING },
    guestToken: { type: Sequelize.STRING },
    // online (web) | box_office (taquilla, vendida por un admin)
    channel: { type: Sequelize.STRING, defaultValue: "online" },
    soldBy: { type: Sequelize.INTEGER },
    // Reembolso
    refundedAt: { type: Sequelize.DATE },
    refundAmount: { type: Sequelize.DECIMAL(10, 2) },
    refundNote: { type: Sequelize.TEXT },
    // tickets (boletos, con o sin comida) | food (pedido de dulceria sin boletos, se recoge en el cine)
    kind: { type: Sequelize.STRING, defaultValue: "tickets" },
    pickupCinemaId: { type: Sequelize.INTEGER },
    // Promocion aplicada (para reportes)
    promotionId: { type: Sequelize.INTEGER },
    couponId: { type: Sequelize.INTEGER },
    comboId: { type: Sequelize.INTEGER },
    // Descuento total concedido por cupon o combo (para reportes)
    discountAmount: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
    pickedUpAt: { type: Sequelize.DATE }
  });
  return Sale;
};
