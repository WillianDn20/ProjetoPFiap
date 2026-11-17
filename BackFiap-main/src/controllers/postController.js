const Post = require('../models/Post');

exports.getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching posts.' });
  }
};

exports.getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    res.status(200).json(post);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching post.' });
  }
};

exports.createPost = async (req, res) => {
  try {
    const { title, content, attachments, coverColor, coverText, coverImage } = req.body;

    const newPost = new Post({ 
      title, 
      content, 
      author: req.user.name, 
      attachments: attachments || [], 
      coverColor, 
      coverText,
      coverImage
});
    
    const savedPost = await newPost.save();
    res.status(201).json(savedPost);
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({ error: 'Error creating post.' });
  }
};

exports.updatePost = async (req, res) => {
  try {
    const { title, content, attachments, coverImage } = req.body;
    const updatedPost = await Post.findByIdAndUpdate(
      req.params.id,
      { title, content, attachments, coverImage, author: req.user.name },
      { returnDocument: 'after', runValidators: true }
    );
    if (!updatedPost) return res.status(404).json({ error: 'Post not found.' });
    res.status(200).json(updatedPost);
  } catch (error) {
    res.status(500).json({ error: 'Error updating post.' });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const deletedPost = await Post.findByIdAndDelete(req.params.id);
    if (!deletedPost) return res.status(404).json({ error: 'Post not found.' });
    res.status(200).json({ message: 'Post deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting post.' });
  }
};

exports.searchPosts = async (req, res) => {
  try {
    const term = req.query.term || '';
    const posts = await Post.find({
      $or: [
        { title: { $regex: term, $options: 'i' } },
        { content: { $regex: term, $options: 'i' } },
        { author: { $regex: term, $options: 'i' } } 
      ]
    }).sort({ createdAt: -1 }); 
    
    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ error: 'Error searching posts.' });
  }
};

exports.addComment = async (req, res) => {
  try {
    const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
    if (!text) return res.status(400).json({ error: 'Comment text is required.' });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    post.comments.push({
      text,
      author: req.user?.name || 'Visitante',
    });

    await post.save();
    res.status(200).json(post);
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ error: 'Error adding comment.' });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found.' });

    if (req.user.role === 'teacher' || comment.author === req.user.name) {
      post.comments.pull(commentId);
      await post.save();
      return res.status(200).json(post);
    } else {
      return res.status(403).json({ error: 'Access denied. You can only delete your own comments.' });
    }
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ error: 'Error deleting comment.' });
  }
};