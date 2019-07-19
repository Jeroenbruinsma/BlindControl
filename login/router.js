const express = require('express')
const User = require('../user/model')
var router = express.Router();
const bcrypt = require('bcrypt')
const {toJWT,toData} = require('./jwt')



router.post('/login', function (req, res) {
    const email = req.body.email
    const passwd = req.body.password
    console.log("User try login w:", email, passwd)

    if ((email != undefined) &&( passwd != undefined) && ( passwd != "")) {
      User
      .findOne({
        where: {
          email: req.body.email
        }
      })
      .then(entity => {
        if (!entity) {
          res.status(400).send({
            message: 'User with that email does not exist(NOT SAVE!)'
          })
        }
 
        if (bcrypt.compareSync(req.body.password, entity.password)) {
 
          res.send({
            jwt: toJWT({ userId: entity.id }),
            name: entity.dataValues.name
          })
        }
        else {
          res.status(400).send({
            message: 'Password was incorrect'
          })
        }
      })
      .catch(err => {
        res.status(500).send({
          message: 'Something went wrong'
        })
      })
    } else {
        res.status(400).send({
            message: 'Please supply a valid email and password'
        })
    }
})

module.exports = router;