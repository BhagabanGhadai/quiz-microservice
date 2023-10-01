const mongoose = require('mongoose');

const Schema = new mongoose.Schema({
    'user':{
        user_id:mongoose.Schema.Types.ObjectId,
        name:String,
        email:String,
        phone:Number
    },
    'quiz_id': {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'quiz'
    },
    'result_overview': {
        type: Object,
        required: false
    },
    'subjective_responses':[Object],
    'is_submitted': {
        type: Boolean,
        default: false
    },
    'start_time': {
        type: Date,
        default: null
    },
    'submitted_time': {
        type: Date,
        default: null
    }
    
}, {timestamps: true})

module.exports = mongoose.model('quiz-submissions', Schema, 'quiz-submissions')