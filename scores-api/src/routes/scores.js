const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT id, username, score, created_at FROM scores ORDER BY score DESC, created_at ASC LIMIT 10'
    );
    res.json({ scores: result.rows });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { username, score } = req.body;

    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      return res.status(400).json({ error: 'Le champ username est obligatoire et doit être une chaîne non vide.' });
    }

    const cleanUsername = username.trim();
    if (cleanUsername.length > 30) {
      return res.status(400).json({ error: 'Le champ username ne doit pas dépasser 30 caractères.' });
    }

    if (score === undefined || typeof score !== 'number' || !Number.isInteger(score) || score < 0) {
      return res.status(400).json({ error: 'Le champ score est obligatoire et doit être un entier positif.' });
    }

    if (score > 500) {
      return res.status(400).json({ error: 'Score invalide : valeur aberrante détectée.' });
    }

    const insertQuery = `
      INSERT INTO scores (username, score)
      VALUES ($1, $2)
      RETURNING id, username, score, created_at
    `;
    const result = await db.query(insertQuery, [cleanUsername, score]);

    res.status(201).json({
      message: 'Score enregistré avec succès !',
      score: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
