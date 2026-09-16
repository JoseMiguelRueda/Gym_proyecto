const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clienteController');

router.get('/', clienteController.getClientes);
router.get('/:id', clienteController.getClienteById);
router.post('/', clienteController.createCliente);
router.put('/:id', clienteController.updateCliente);
router.patch('/:id/estado', clienteController.updateEstado);
router.delete('/:id', clienteController.deleteCliente);

module.exports = router;
