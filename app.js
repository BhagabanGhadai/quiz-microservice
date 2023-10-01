const express = require('express');
const { AppRoutes } = require('./app.routes');
const { env } = require('./env');
const { DB_CONNECTION } = require('./services/db.connection');
var cors = require('cors')
const morgan = require('morgan')
const app = express();
DB_CONNECTION()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(morgan('dev'))
app.use('/api', AppRoutes)

app.listen(env.PORT, () => {
    console.log('service running on port ', env.PORT);
}).on('error', (err) => {
    console.log(err)
    process.exit()
})
