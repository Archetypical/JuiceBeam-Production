const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        email: { type: DataTypes.STRING, allowNull: false },
        username: { type: DataTypes.STRING, allowNull: false },
        rank: { type: DataTypes.STRING, allowNull: false },
        points: { type: DataTypes.INTEGER, allowNull: false },
        hash: { type: DataTypes.STRING, allowNull: false },
        twitchID: { type: DataTypes.INTEGER, allowNull: false },
        role: { type: DataTypes.STRING, allowNull: false },
    };

    const options = {
        defaultScope: {
            // exclude hash by default
            attributes: { exclude: ['hash'] }
        },
        scopes: {
            // include hash with this scope
            withHash: { attributes: {}, }
        }
    };

    return sequelize.define('User', attributes, options);
}