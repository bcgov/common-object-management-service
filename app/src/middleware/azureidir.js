/**
 * @function coerceAzureIDIRQueryParam
 * Converts `azureidir` to `idir` whenever it appears in the request parameters or body.
 * This prevents treating of the same (human) user between the 2 IDPs as separate.
 * @param {object} req Express request object
 * @param {object} _res Express response object
 * @param {function} next The next callback function
 * @returns
 */
const coerceAzureIDIRQueryParam = (req, res, next) => {
  if (req.query.idp) {
    if (req.query.idp === 'azureidir')
      req.query.idp = 'idir';
    else if (Array.isArray(req.query.idp))
      req.query.idp.map(idpValue => idpValue === 'azureidir' ? 'idir' : idpValue);
  }
  else if (req.body.idp === 'azureidir')
    req.body.idp = 'idir';
  next();
};

module.exports = {
  coerceAzureIDIRQueryParam: coerceAzureIDIRQueryParam
};
