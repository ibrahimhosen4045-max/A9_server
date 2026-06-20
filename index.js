const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
const port = process.env.PORT || 5500;
const uri = process.env.URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server (optional starting in v4.7)

    await client.connect();

    // await client.db("admin").command({ ping: 1 });

    const db = client.db("Tutor-booking");
    const tutorList = db.collection("tutors");
    const bookingList = db.collection("bookings");

    app.post("/tutors", async (req, res) => {
      const tutor = req.body;
      const result = await tutorList.insertOne(tutor);
      res.json(result);
    });

    app.get("/tutors", async (req, res) => {
      const cursor = tutorList.find();
      const result = await cursor.toArray();
      res.send(result);
    });


    app.get("/featured", async (req, res) => {
      const cursors = tutorList.find().limit(4);
      const result = await cursors.toArray();
      res.send(result);
    });

    app.get("/tutors/:tutorsId", async (req, res) => {
      const { tutorsId } = req.params;
      const query = { _id: new ObjectId(tutorsId) };
      const result = await tutorList.findOne(query);

      res.send(result);
    });

     app.get("/my-tutors/:userId", async (req, res) => {
      const { userId } = req.params;
      const result = await tutorList.find({ userId: userId }).toArray();
      res.json(result);
    });

    app.patch('/tutors/:id', async (req, res) => {
      const {id} = req.params;
      const updateTutor = req.body;

      const filter = {
        _id: new ObjectId(id)
      }
      const updates = {
        $set: updateTutor
      }
      const result = await tutorList.updateOne(filter, updates)
      res.json(result)
    })

    app.delete('/tutors/:id', async (req, res) => {
      const {id} = req.params;
      const result = await tutorList.deleteOne({_id: new ObjectId(id)})
      res.json(result)
    })

    app.post("/booking", async (req, res) => {
      const bookingData = req.body;

      const existingBooking = await bookingList.findOne({
        userID: bookingData.userID,
        tutorId: bookingData.tutorId,
        status: "booked",
      });

      if (existingBooking) {
        return res.status(400).json({
          error: true,
          message: "You have already an active session with this tutor!",
        });
      }

      const result = await bookingList.insertOne(bookingData);

      res.json(result);
    });

    app.get("/booking/:userID", async (req, res) => {
      const { userID } = req.params;
      const result = await bookingList.find({ userID: userID }).toArray();
      res.json(result);
    });

    app.patch("/booking/cancel/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: { status: "cancelled" },
      };

      const result = await bookingList.updateOne(filter, updateDoc);

      res.json(result);
    });

    app.delete("/booking/:bookingId", async (req, res) => {
      const { bookingId } = req.params;

      const result = await bookingList.deleteOne({
        _id: new ObjectId(bookingId),
      });

      res.json(result);
    });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
