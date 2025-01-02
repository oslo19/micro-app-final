const User = require('../models/User');

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({});
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new user
const createUser = async (req, res) => {
  try {
    const { uid, email, provider, progress } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(200).json({ message: "User already exists", user: existingUser });
    }

    const user = new User({
      uid,
      email,
      displayName: email.split('@')[0],
      provider,
      progress: progress || {
        totalScore: 0,
        gamesPlayed: 0,
        correctAnswers: 0,
        averageAttempts: 0,
        patternStats: {
          numeric: { attempted: 0, correct: 0 },
          symbolic: { attempted: 0, correct: 0 },
          shape: { attempted: 0, correct: 0 },
          logical: { attempted: 0, correct: 0 }
        }
      }
    });

    await user.save();
    console.log('User saved to MongoDB:', user);
    res.status(201).json({ message: 'User created successfully', user });
  } catch (error) {
    console.error('MongoDB save error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get user by email
const getUserByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update user role
const updateUserRole = async (req, res) => {
  try {
    const { uid } = req.params;
    const { role } = req.body;

    const user = await User.findOneAndUpdate(
      { uid },
      { role },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'Role updated successfully', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update user progress
const updateProgress = async (req, res) => {
  try {
    const { uid } = req.params;
    const { score, isCorrect, attempts, patternType } = req.body;

    const user = await User.findOne({ uid });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Update progress
    user.progress.totalScore += score;
    user.progress.gamesPlayed += 1;
    user.progress.correctAnswers += isCorrect ? 1 : 0;
    
    // Update pattern stats
    if (!user.progress.patternStats[patternType]) {
      user.progress.patternStats[patternType] = { attempted: 0, correct: 0 };
    }
    user.progress.patternStats[patternType].attempted += 1;
    user.progress.patternStats[patternType].correct += isCorrect ? 1 : 0;

    // Update average attempts
    const totalAttempts = (user.progress.averageAttempts * (user.progress.gamesPlayed - 1)) + attempts;
    user.progress.averageAttempts = totalAttempts / user.progress.gamesPlayed;
    user.progress.lastPlayed = new Date();

    await user.save();
    res.json(user.progress);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add this new function to get user by uid
const getUserByUid = async (req, res) => {
  try {
    const { uid } = req.params;
    console.log('Searching for user with UID:', uid); // Debug log

    const user = await User.findOne({ uid: uid });
    console.log('Found user:', user); // Debug log
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Initialize progress if it doesn't exist
    if (!user.progress) {
      user.progress = {
        totalScore: 0,
        gamesPlayed: 0,
        correctAnswers: 0,
        averageAttempts: 0,
        patternStats: {
          numeric: { attempted: 0, correct: 0 },
          symbolic: { attempted: 0, correct: 0 },
          shape: { attempted: 0, correct: 0 },
          logical: { attempted: 0, correct: 0 }
        },
        lastPlayed: new Date()
      };
      await user.save();
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Error in getUserByUid:', error);
    res.status(500).json({ message: error.message });
  }
};

// Add a function to update user UID
const updateUserUid = async (req, res) => {
  try {
    const { oldUid, newUid } = req.body;
    const user = await User.findOneAndUpdate(
      { uid: oldUid },
      { uid: newUid },
      { new: true }
    );
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllUsers,
  createUser,
  getUserByEmail,
  updateUserRole,
  updateProgress,
  getUserByUid,
  updateUserUid
}; 