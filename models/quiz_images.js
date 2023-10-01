const mongoose = require('mongoose');

const Schema = new mongoose.Schema({
    'question_image': {
        type: String,
        default: null
    }
}, {timestamps: true})

module.exports = mongoose.model('quiz-image', Schema, 'quiz-image')