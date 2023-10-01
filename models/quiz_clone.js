const mongoose = require('mongoose');

const Schema = new mongoose.Schema({
    data: mongoose.Schema.Types.Mixed
})

module.exports = mongoose.model('quiz-clone', Schema, 'quiz-clone')