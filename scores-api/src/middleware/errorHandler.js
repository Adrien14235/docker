function errorHandler(err, req, res, next) {
  console.error('Erreur API :', err.message);

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Format JSON invalide.'
    });
  }

  if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.message.includes('timeout')) {
    return res.status(503).json({
      error: 'Service temporairement indisponible : la base de données ne répond pas.'
    });
  }

  const statusCode = err.status || err.statusCode || 500;
  return res.status(statusCode).json({
    error: err.message || 'Une erreur interne est survenue.'
  });
}

module.exports = errorHandler;
