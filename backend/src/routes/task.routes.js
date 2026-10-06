'use strict';

const { Router } = require('express');
const taskController = require('../controllers/task.controller');
const validate = require('../middleware/validate');
const { optionalAuthenticate } = require('../middleware/auth.middleware');
const { taskBodySchema, taskParamsSchema } = require('../validators/task.validator');

const router = Router();

router.use(optionalAuthenticate);

router.get('/', taskController.listTasks);
router.get('/:id', validate(taskParamsSchema, 'params'), taskController.getTask);
router.post('/', validate(taskBodySchema, 'body'), taskController.createTask);
router.put(
  '/:id',
  validate(taskParamsSchema, 'params'),
  validate(taskBodySchema, 'body'),
  taskController.updateTask
);
router.delete('/:id', validate(taskParamsSchema, 'params'), taskController.deleteTask);

module.exports = router;
