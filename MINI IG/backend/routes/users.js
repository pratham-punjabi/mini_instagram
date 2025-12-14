const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// Follow a user
router.post('/follow/:id', auth, async (req, res) => {
  try {
    const userToFollow = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user.id);

    if (!userToFollow) return res.status(404).json({ msg: 'User not found' });

    if (currentUser.following.includes(userToFollow._id)) {
      return res.status(400).json({ msg: 'Already following' });
    }

    currentUser.following.unshift(userToFollow._id);
    userToFollow.followers.unshift(currentUser._id);

    await currentUser.save();
    await userToFollow.save();

    res.json({ following: currentUser.following });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Unfollow a user
router.post('/unfollow/:id', auth, async (req, res) => {
  try {
    const userToUnfollow = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user.id);

    if (!userToUnfollow) return res.status(404).json({ msg: 'User not found' });

    if (!currentUser.following.includes(userToUnfollow._id)) {
      return res.status(400).json({ msg: 'Not following' });
    }

    currentUser.following = currentUser.following.filter(
      id => id.toString() !== userToUnfollow._id.toString()
    );
    userToUnfollow.followers = userToUnfollow.followers.filter(
      id => id.toString() !== currentUser._id.toString()
    );

    await currentUser.save();
    await userToUnfollow.save();

    res.json({ following: currentUser.following });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get user profile
router.get('/profile/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('followers following', 'username');
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;