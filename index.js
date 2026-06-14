const express = require('express');
const dotenv = require("dotenv")
const cors = require("cors")
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json())
const port = process.env.PORT || 5500;


const uri = process.env.URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    
    // await client.db("admin").command({ ping: 1 });

    const db = client.db("Tutor-booking")
    const tutorList = db.collection("tutors")

    app.post("/tutors", async(req, res) => {
      const tutor = req.body
      const result = await tutorList.insertOne(tutor)
      res.json(result)
    })

    app.get("/tutors", async(req, res) => {
        const cursor = tutorList.find();
        const result = await cursor.toArray();
        // console.log(result)
        res.send(result)
    })

    app.get('/featured', async (req, res) => {
      const cursors = tutorList.find().limit(4)
      const result = await cursors.toArray()
      res.send(result)
    })

    app.get("/tutors/:tutorsId", async(req, res) => {
        const {tutorsId} = req.params;
        // console.log(tutorsId)
        const query = {_id: new ObjectId(tutorsId)}
        const result = await tutorList.findOne(query);
        res.send(result)
    })

    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});