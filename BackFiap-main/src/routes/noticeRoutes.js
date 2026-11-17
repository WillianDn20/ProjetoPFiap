const express = require('express');
const router = express.Router();
const noticeController = require('../controllers/noticeController');
const { requireAuth, requireTeacher } = require('../middleware/auth');

router.get('/', noticeController.getNotices);
router.post('/', requireAuth, requireTeacher, noticeController.createNotice);
router.delete('/:id', requireAuth, requireTeacher, noticeController.deleteNotice);

module.exports = router;