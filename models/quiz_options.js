const mongoose = require('mongoose');

const Schema = new mongoose.Schema({
    'quiz_id': {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'quiz'
    },
    'question_id': {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'quiz-questions'
    },
    'option_text': {
        type: String,
        default: null
    },
    'option_image': {
        type: String,
        default: null
    },
    'is_correct':{
        type:Boolean,
        default:false
    },
    'marks': {
        type: Number,
        required: true
    }
}, {timestamps: true})

module.exports = mongoose.model('quiz-question-options', Schema, 'quiz-question-options')