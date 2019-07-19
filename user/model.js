const Sequelize = require('sequelize')
const sequelize = require('../db')


const Users = sequelize.define('users', {
    name: {
        type: Sequelize.STRING,
        allowNull: false
    },
    email: {
        type: Sequelize.STRING,
        allowNull: false
    },
    password: {
        type: Sequelize.STRING,
        allowNull: false
    }
}, {
        timestamps: false,
        tableName: 'users'
    })

module.exports = Users