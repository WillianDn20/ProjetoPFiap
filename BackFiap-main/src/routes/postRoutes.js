const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { optionalAuth, requireAuth, requireTeacher } = require('../middleware/auth');

router.get('/', postController.getAllPosts);
router.post('/', requireAuth, requireTeacher, postController.createPost);
router.get('/search', postController.searchPosts);
router.get('/:id', postController.getPostById);
router.put('/:id', requireAuth, requireTeacher, postController.updatePost);
router.delete('/:id', requireAuth, requireTeacher, postController.deletePost);

// Rota de comentários
router.post('/:id/comments', optionalAuth, postController.addComment);

// Rota para deletar um comentário
router.delete('/:postId/comments/:commentId', requireAuth, requireTeacher, postController.deleteComment);

module.exports = router;