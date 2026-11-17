const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { requireAuth, requireTeacher } = require('../middleware/auth');

router.get('/', eventController.getEvents);
router.post('/', requireAuth, requireTeacher, eventController.createEvent);
router.delete('/:id', requireAuth, requireTeacher, eventController.deleteEvent);

module.exports = router;