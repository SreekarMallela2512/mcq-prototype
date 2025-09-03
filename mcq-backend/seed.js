const mongoose = require('mongoose');
const Question = require('./server').Question; // Assuming Question model is exported

const sampleQuestions = [
    {
        topic: "General Meteorology",
        question: "Lowest layer of atmosphere is",
        options: ["Troposphere", "Tropopause", "Stratosphere", "Mesosphere"],
        correctAnswer: "Troposphere",
        difficulty: "easy"
    },
    {
        topic: "General Meteorology",
        question: "The greenhouse effect is primarily caused by",
        options: ["Oxygen", "Nitrogen", "Carbon dioxide", "Helium"],
        correctAnswer: "Carbon dioxide",
        difficulty: "medium"
    },
    {
        topic: "Physics",
        question: "The speed of light in vacuum is approximately",
        options: ["3 × 10⁸ m/s", "3 × 10⁶ m/s", "3 × 10⁷ m/s", "3 × 10⁹ m/s"],
        correctAnswer: "3 × 10⁸ m/s",
        difficulty: "medium"
    },
    {
        topic: "Physics",
        question: "Newton's first law is also known as",
        options: ["Law of inertia", "Law of acceleration", "Law of action-reaction", "Law of gravitation"],
        correctAnswer: "Law of inertia",
        difficulty: "easy"
    },
    {
        topic: "Chemistry",
        question: "The chemical symbol for gold is",
        options: ["Go", "Gd", "Au", "Ag"],
        correctAnswer: "Au",
        difficulty: "easy"
    },
    {
        topic: "Chemistry",
        question: "Water has the chemical formula",
        options: ["H2O", "H2O2", "HO2", "H3O"],
        correctAnswer: "H2O",
        difficulty: "easy"
    },
    {
        topic: "Mathematics",
        question: "What is the value of π (pi) approximately?",
        options: ["3.14159", "2.71828", "1.41421", "1.73205"],
        correctAnswer: "3.14159",
        difficulty: "easy"
    },
    {
        topic: "Mathematics",
        question: "The square root of 144 is",
        options: ["12", "14", "16", "10"],
        correctAnswer: "12",
        difficulty: "easy"
    }
];

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('MongoDB connected for seeding...');
    return Question.insertMany(sampleQuestions);
})
.then(() => {
    console.log('Sample questions inserted successfully!');
    mongoose.connection.close();
})
.catch(err => {
    console.error('Error during seeding:', err);
    mongoose.connection.close();
});