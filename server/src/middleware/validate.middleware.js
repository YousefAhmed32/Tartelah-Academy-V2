const { sendError } = require('../utils/response')

function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true })
    if (error) {
      const msg = error.details.map(d => d.message).join('. ')
      return sendError(res, msg, 400)
    }
    req.body = value
    next()
  }
}

module.exports = { validate }
