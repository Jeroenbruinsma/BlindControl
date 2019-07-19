const Sequelize = require('sequelize')
const sequelize = require('../db')
const House = require('../events/house')


const Blind = sequelize.define('blind', {
    eventId: {
        type: Sequelize.INTEGER,
        allowNull: false
    }
}, {
        timestamps: false,
        tableName: 'blind'
    })

Blind.belongsTo(House)

module.exports = Blind