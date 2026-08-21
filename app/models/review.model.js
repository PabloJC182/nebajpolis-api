// app/models/review.model.js
module.exports = (sequelize, Sequelize) => {
  const Review = sequelize.define("review", {
    rating: {
      type: Sequelize.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 5 }
    },
    comment: {
      type: Sequelize.TEXT
    },
    reviewDate: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW
    }
  });
  return Review;
};
