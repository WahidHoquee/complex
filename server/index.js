const keys = require("./keys");

//Express App Setup
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");


const app = express();

app.use(cors());
app.use(bodyParser.json());


//Postgres Client Setup - We will store only the indices not the value of that index, For which index we want the fibonacci number
const { Pool } = require("pg");
const pgClient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  // password: keys.pgPassword,
  port: keys.pgPort,
});


pgClient
  .on("error", () => console.log("Lost PG Connection"));

pgClient
  .query('CREATE TABLE IF NOT EXISTS values (number INT)')
  .catch((err) => console.log(err));


//Redis Client Setup
const redis = require('redis');

const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000
})

const redisPublisher =  redisClient.duplicate();


//Express Route Handler

app.get('/', (req, res) => {
  res.send('Hi')
})

//To fetch all indices from Postgres
app.get('/values/all', async(req, res) => {
  console.log('*******************************')

  const values = await pgClient.query('SELECT * FROM values');
  console.log('*******************************')
  console.log('*******************************')
  console.log('')
  console.log(values.rows)
  console.log('')
  console.log('*******************************')
  console.log('*******************************')
  console.log('*******************************')
  res.send(values.rows)
})
console.log('objecssssssst')
//To fetch all calculated values with indices & its calculated values from redis
app.get('/values/current', async(req, res) => {
  redisClient.hgetall('values', (err, values) => {
    res.send(values)
  })
})


//To calculate a new fibonacci number for a certain indexx
app.post('/values', async(req, res) => {
  const index = req.body.index;

  if(parseInt(index) > 40){
    return res.status(422).send('Index too high')
  }

  redisClient.hset('values', index, 'Nothing yet!');

  //Inserting Message to worker process
  redisPublisher.publish('insert', index);

  //Storing the index to postgres
  pgClient.query('INSERT INTO values(number) VALUES($1)', [index])

  res.send({ working: true })
})


app.listen(5000, err => {
  console.log('Listening')
})