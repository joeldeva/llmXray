function requireString(field, { max = 10000, min = 1 } = {}) {
  return value => {
    if (typeof value !== 'string') return `${field} must be a string`;
    const trimmed = value.trim();
    if (trimmed.length < min) return `${field} is required`;
    if (trimmed.length > max) return `${field} is too long`;
    return null;
  };
}

function optionalString(field, { max = 1000 } = {}) {
  return value => {
    if (value === undefined || value === null) return null;
    if (typeof value !== 'string') return `${field} must be a string`;
    if (value.length > max) return `${field} is too long`;
    return null;
  };
}

function oneOf(field, values) {
  return value => {
    if (!values.includes(value)) return `${field} must be one of: ${values.join(', ')}`;
    return null;
  };
}

function validateBody(shape) {
  return (req, res, next) => {
    const errors = [];
    for (const [field, validator] of Object.entries(shape)) {
      const error = validator(req.body?.[field], req.body || {});
      if (error) errors.push(error);
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: 'validation failed', details: errors });
    }

    return next();
  };
}

module.exports = { oneOf, optionalString, requireString, validateBody };
