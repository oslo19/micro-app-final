const express = require('express');
const router = express.Router();
const { getHint } = require('../controllers/aiController');

router.post('/get-hint', getHint);

module.exports = router; 