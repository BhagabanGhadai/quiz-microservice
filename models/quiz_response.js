const mongoose = require('mongoose');

const Schema = new mongoose.Schema({
    // 'user_id': {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'user'
    // },
    'quiz_id': {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'quiz'
    },
    'submission_id': {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'quiz-submissions'
    },
    "question": {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'quiz-questions'
    },
    "answer": {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'quiz-question-options',
        default: null
    },
    "descriptive": {
        type: String,
        default: null
    }

}, { timestamps: true })

module.exports = mongoose.model('quiz-response', Schema, 'quiz-response')