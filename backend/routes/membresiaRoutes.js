const express = require('express');
const router = express.Router();
const membresiaController = require('../controllers/membresiaController');

router.get('/', membresiaController.getMembresias);
router.post('/', membresiaController.createMembresia);
router.patch('/:id/estado', membresiaController.updateEstado);

module.exports = router;
