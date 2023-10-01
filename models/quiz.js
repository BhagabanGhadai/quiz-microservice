const mongoose = require('mongoose');

const Schema = new mongoose.Schema({
    'title': {
        type: String,
        required: true
    },
    'quiz_description':{
        type: String,
        default: null
    },
    'max_marks': {
        type: Number,
        required: true
    },
    'max_attempts': {
        type: Number,
        required: true
    },
    'quiz_time':{
        type:Number,
        required:true
    },
    'start_time': {
        type: Date,
        default: null
    },
    'deadline': {
        type: Date,
        default: null
    },
    'show_result': {
        type: Boolean,
        required: true
    },
    'published': {
        type: Boolean,
        default: false
    }
}, {timestamps: true})

module.exports = mongoose.model('quiz', Schema, 'quiz')