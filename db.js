const Sequelize = require('sequelize')

const databaseUrl = process.env.DATABASE_URL ||'postgres://postgres:passwd@localhost:5432/postgres'
sequelizeObj = new Sequelize(databaseUrl,{
    logging: false

})
sequelizeObj.sync()          //.sync({ force: true })
            .then(() => console.log("database has been updated \n\n\n\n\n\n"))
            .catch(err => console.error("Got some error:", err))

module.exports = sequelizeObj