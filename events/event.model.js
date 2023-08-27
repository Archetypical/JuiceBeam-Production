const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        event_id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true , autoIncrement: true},
        username: { type: DataTypes.STRING, allowNull: false },
        eventname: { type: DataTypes.STRING, allowNull: false },
        isRunning: { type: DataTypes.STRING, allowNull: false },
    };

    const options = {
        defaultScope: {
            // exclude hash by default
            attributes: { }
        },
        scopes: {
            // include hash with this scope
            withIsRunning: { attributes: {}, }
        }
    };

    return sequelize.define('Event', attributes, options);
}