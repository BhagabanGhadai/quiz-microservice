const multer = require('multer')

const storage = multer.diskStorage({})

const UploadFile = multer({storage: storage})

module.exports.UploadFile = UploadFile 