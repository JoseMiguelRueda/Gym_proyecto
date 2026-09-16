const express = require('express');
const router = express.Router();
const asistenciaController = require('../controllers/asistenciaController');

router.get('/validar/:carnet', asistenciaController.validarCliente);
router.post('/', asistenciaController.registrarAsistencia);
router.get('/', asistenciaController.getAsistencias);

module.exports = router;
