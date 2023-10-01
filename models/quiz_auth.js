const mongoose = require("mongoose");
const { mankavit_db } = require('../services/db.connection');

const adminSchema = new mongoose.Schema({
}, { timestamps: true })

module.exports.AdminModel = mankavit_db.model("admins", adminSchema,"admins")