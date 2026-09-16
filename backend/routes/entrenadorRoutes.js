const express = require('express');
const router = express.Router();
const entrenadorController = require('../controllers/entrenadorController');

router.get('/', entrenadorController.getEntrenadores);
router.get('/:id', entrenadorController.getEntrenadorById);
router.post('/', entrenadorController.createEntrenador);
router.put('/:id', entrenadorController.updateEntrenador);
router.delete('/:id', entrenadorController.deleteEntrenador);

// Horarios asociados
router.post('/horarios', entrenadorController.addHorario);
router.delete('/horarios/:id', entrenadorController.deleteHorario);

module.exports = router;
