const { DataTypes } = require('sequelize');


module.exports = model;

function model(sequelize) {
    const attributes = {
        id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true , autoIncrement: true},
        channelName: { type: DataTypes.STRING, allowNull: false },
        channelId: { type: DataTypes.STRING, allowNull: false },
        twitchName: { type: DataTypes.STRING, allowNull: false },
        youtubeApiKey: { type: DataTypes.STRING, allowNull: false },
        twitchClientSecret: { type: DataTypes.STRING, allowNull: false },
        twitchClientId: { type: DataTypes.STRING, allowNull: false },
        maxResults: { type: DataTypes.INTEGER, allowNull: false },
        playlistId: { type: DataTypes.STRING, allowNull: false },
        eventsMode: { type: DataTypes.STRING, allowNull: false },
    };

    const options = {
        timestamps: false,
        defaultScope: {
            // exclude hash by default
            attributes: { }
        },
        scopes: {
            // include hash with this scope
        }
    };

    return sequelize.define('Settings', attributes, options);
}