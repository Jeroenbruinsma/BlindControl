const User = require('../user/model')
const {toJWT,toData} = require('./jwt')

function auth(req, res, next) {
 // console.log("Got an auth req", req.headers)
  //console.log("Got an auth req uthorization", req.headers.authorization)
  
  const auth = req.headers.authorization && req.headers.authorization.split(' ')
  if (auth && auth[0] === 'Bearer' && auth[1]) {
    try {
      const data = toData(auth[1])
      User
        .findByPk(data.userId)
        .then(user => {
          if (!user) return next('User does not exist')
          req.user = user
          next()
        })
        .catch(next)
    }
    catch(error) {
      res.status(400).send({
        message: `Error ${error.name}: ${error.message}`,
      })
    }
  }
  else {
    res.status(401).send({
      message: 'Please supply some valid credentials (mw)'
    })
  }
}

module.exports = auth