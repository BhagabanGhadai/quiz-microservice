const mongoose = require('mongoose');

const Schema = new mongoose.Schema({
    'quiz_id': {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'quiz'
    },
    'sequence_no': {
        type: Number,
        default: 0
    }
}, {timestamps: true})

module.exports = mongoose.model('quiz-page', Schema, 'quiz-page')