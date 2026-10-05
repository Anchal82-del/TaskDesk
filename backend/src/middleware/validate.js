'use strict';

const AppError = require('../utils/AppError');

const JOI_OPTIONS = {
  abortEarly: false, // report every problem, not just the first one
  stripUnknown: true, // drop fields we did not ask for
  convert: true, // "5" from the URL becomes the number 5
  errors: { wrap: { label: false } } // messages read: title is required (no quotes)
};

// validate(schema, 'body') checks req.body; validate(schema, 'params') checks the URL part.
// Clean values are stored in req.validated so controllers never touch raw input.
function validate(schema, source) {
  return (req, _res, next) => {
    // const { error, value } = schema.validate(req[source], JOI_OPTIONS);
    const { error, value } = schema.validate(req[source] ?? {}, JOI_OPTIONS);

    if (error) {
      const details = error.details.map((item) => ({
        field: item.path.join('.') || source,
        message: item.message
      }));
      return next(AppError.badRequest('The request contains invalid data.', details));
    }

    req.validated = { ...req.validated, [source]: value };
    return next();
  };
}

module.exports = validate;
