const mongoose = require('mongoose');

const Schema = new mongoose.Schema({
    'quiz_id': {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'quiz'
    },
    'quiz_page_id': {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'quiz-page'
    },
    'question_title': {
        type: String,
        default: null
    },
    'question_description': {
        type: String,
        default: null
    },
    'question_image': {
        type: String,
        default: null
    },
    'question_type': {
        type: String,
        validate:{
            validator: (v)=>{
                if(!(v=='Single' || v=='Multi' || v=='null')){
                    return false
                }
                return true
            },
            msg:'Invalid Question Type'
        },
        default: 'Multi'
    },
    // 'options':[
    //     {
    //         "option_text": String,
    //         "is_correct": Boolean,
    //         "marks": Number
    //     }
    // ],
    'answers': {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'quiz-question-options',
        default: null
    },
    // 'answers':[
    //     {
    //         "option_text": String,
    //         "is_correct": Boolean,
    //         "marks": Number
    //     }
    // ],
    'answer_explanation': {
        type: String,
        default: null
    },
    'marks': {
        type: Number
    },
    'sequence_no': {
        type: Number,
        default: 0
    }
}, {timestamps: true})

module.exports = mongoose.model('quiz-questions', Schema, 'quiz-questions')