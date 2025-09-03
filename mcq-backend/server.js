// Add this line at the very top to load environment variables
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
// mongo connections
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('MongoDB connected successfully!');
}).catch(err => {
    console.error('MongoDB connection error:', err);
});


// User Schema
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    stats: {
        testsTaken: { type: Number, default: 0 },
        practiceQuestions: { type: Number, default: 0 },
        averageScore: { type: Number, default: 0 },
        bestScore: { type: Number, default: 0 },
        studyStreak: { type: Number, default: 0 }
    },
    preferences: {
        theme: { type: String, default: 'light' }
    }
}, { timestamps: true });

// Question Schema  
const questionSchema = new mongoose.Schema({
    topic: { type: String, required: true },
    question: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctAnswer: { type: String, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' }
}, { timestamps: true });

// Test Result Schema
const testResultSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    score: { type: Number, required: true },
    timeTaken: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    correctAnswers: { type: Number, required: true },
    topics: [String],
    results: [{
        questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
        question: String,
        topic: String,
        userAnswer: String,
        correctAnswer: String,
        isCorrect: Boolean,
        options: [String]
    }]
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
// Define the other two models here
const Question = mongoose.model('Question', questionSchema);
const TestResult = mongoose.model('TestResult', testResultSchema);

// Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ name, email, password: hashedPassword });
        await user.save();

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
        res.json({ 
            success: true, 
            user: { ...user.toObject(), password: undefined }, 
            token 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ email });
        if (!user || !await bcrypt.compare(password, user.password)) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
        res.json({ 
            success: true, 
            user: { ...user.toObject(), password: undefined }, 
            token 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// User Profile Route
app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Questions Routes
app.get('/api/questions/topics', async (req, res) => {
    try {
        const topics = await Question.distinct('topic');
        res.json({ success: true, topics });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/questions/by-topic', async (req, res) => {
    try {
        const { topic } = req.query;
        const filter = topic ? { topic } : {};
        const questions = await Question.find(filter);
        res.json({ success: true, questions });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Questions for Test Route
app.post('/api/questions/for-test', async (req, res) => {
    try {
        const { topics, count } = req.body;
        const questions = await Question.aggregate([
            { $match: { topic: { $in: topics } } },
            { $sample: { size: parseInt(count) } }
        ]);
        res.json({ success: true, questions });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Practice Route
app.post('/api/practice/submit', authenticateToken, async (req, res) => {
    try {
        const { questionId, userAnswer } = req.body;
        const question = await Question.findById(questionId);
        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        const isCorrect = userAnswer === question.correctAnswer;
        
        // Update user practice stats
        await User.findByIdAndUpdate(req.user.id, { $inc: { 'stats.practiceQuestions': 1 } });

        res.json({
            success: true,
            correct: isCorrect,
            correctAnswer: question.correctAnswer
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Test Routes
app.post('/api/test/submit', authenticateToken, async (req, res) => {
    try {
        const { questions, answers, timeTaken, topics } = req.body;
        
        let correctAnswers = 0;
        const results = questions.map((question, index) => {
            const userAnswer = answers[index];
            const isCorrect = userAnswer === question.correctAnswer;
            if (isCorrect) correctAnswers++;
            
            return {
                questionId: question._id,
                question: question.question,
                topic: question.topic,
                userAnswer,
                correctAnswer: question.correctAnswer,
                isCorrect,
                options: question.options
            };
        });

        const score = Math.round((correctAnswers / questions.length) * 100);
        
        const testResult = new TestResult({
            userId: req.user.id,
            score,
            timeTaken,
            totalQuestions: questions.length,
            correctAnswers,
            topics,
            results
        });
        
        await testResult.save();
        
        // Update user stats
        await User.findByIdAndUpdate(req.user.id, {
            $inc: { 'stats.testsTaken': 1 },
            $max: { 'stats.bestScore': score }
        });
        
        res.json({ success: true, result: testResult });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/test/history', authenticateToken, async (req, res) => {
    try {
        const tests = await TestResult.find({ userId: req.user.id }).sort({ date: -1 });
        res.json({ success: true, tests });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(process.env.PORT || 3000, () => {
    console.log(`Server running on port ${process.env.PORT || 3000}`);
});