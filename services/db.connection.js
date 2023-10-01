const mongoose=require('mongoose')
const {env}=require('../env')

const DB_CONNECTION=async()=>{
    try {
        await mongoose.connect(env.mongo_db, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('mongodb connected');
        
    } catch (error) {
        console.error('Error ============ ON DB Connection')
        console.log(error);
    }
 
}
var inst1 = mongoose.createConnection(`mongodb+srv://${env.mankavit_db.MONGO_DB_USER}:${env.mankavit_db.MONGO_DB_PASSWORD}@cluster0.izbjwtv.mongodb.net/${env.mankavit_db.MONGO_DB_DATABASE}`
)
module.exports = {
    DB_CONNECTION:DB_CONNECTION,
    mankavit_db: inst1
}