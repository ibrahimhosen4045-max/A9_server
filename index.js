const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
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

const JWKS = createRemoteJWKSet(
  new URL("http://localhost:3000/api/auth/jwks")
)

const verifyToken = async (req, res, next) => {
  const authHeader = req?.headers.authorization

  if(!authHeader) {
    return res.status(401).json({message: "Unauthorized"})
  }
  const token = authHeader.split(" ")[1]
  if(!token){
    return res.status(401).json({message: "Unauthorized"})
  }
  
  try{
    const {payload} = await jwtVerify(token, JWKS)
    next()
  } catch {
    return res.status(401).json({message : "Forbidden"})
  }
}

async function run() {
  try {
    // Connect the client to the server (optional starting in v4.7)

    await client.connect();

    // await client.db("admin").command({ ping: 1 });

    const db = client.db("Tutor-booking");
    const tutorList = db.collection("tutors");
    const bookingList = db.collection("bookings");

    app.post("/tutors", verifyToken , async (req, res) => {
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
      const cursors = tutorList.find().limit(6);
      const result = await cursors.toArray();
      res.send(result);
    });

    app.get("/tutors/:tutorsId", verifyToken, async (req, res) => {
      const { tutorsId } = req.params;
      const query = { _id: new ObjectId(tutorsId) };
      const result = await tutorList.findOne(query);

      res.send(result);
    });

     app.get("/my-tutors/:userId", verifyToken, async (req, res) => {
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

   app.post("/booking", verifyToken, async (req, res) => {
  const bookingData = req.body;

  console.log("BOOKING DATA:", bookingData);

  const existingBooking = await bookingList.findOne({
    userID: bookingData.userID,
    tutorId: bookingData.tutorId,
    status: "booked",
  });


  if (existingBooking) {
    return res.status(400).json({
      error: true,
      message: "You already booked this tutor",
    });
  }

  const tutor = await tutorList.findOne({
    _id: new ObjectId(bookingData.tutorId),
  });

  if (!tutor) {
    return res.status(404).json({ message: "Tutor not found" });
  }

  console.log("TUTOR:", tutor);

  // SLOT FORCE NUMBER CHECK
  if (Number(tutor.slot) <= 0) {
    return res.status(400).json({
      error: true,
      message: "No slots available",
    });
  }

  // DATE CHECK SAFE VERSION
  const today = new Date();
  const sessionDate = new Date(tutor.date);

  if (isNaN(sessionDate.getTime())) {
    return res.status(400).json({
      error: true,
      message: "Invalid tutor date format",
    });
  }

  today.setHours(0,0,0,0);
  sessionDate.setHours(0,0,0,0);

  console.log("COMPARE:", today, sessionDate);

  if (today < sessionDate) {
    return res.status(400).json({
      error: true,
      message: "Booking not available yet",
    });
  }

  const updateResult = await tutorList.updateOne(
    { _id: new ObjectId(bookingData.tutorId), slot: { $gt: 0 } },
    { $inc: { slot: -1 } }
  );

  console.log("UPDATE RESULT:", updateResult);

  if (updateResult.modifiedCount === 0) {
    return res.status(400).json({
      error: true,
      message: "Slot update failed",
    });
  }

  const result = await bookingList.insertOne(bookingData);

  res.json(result);
});

    app.get("/booking/:userID", verifyToken, async (req, res) => {
      const { userID } = req.params;
      const result = await bookingList.find({ userID: userID }).toArray();
      res.json(result);
    });

    app.patch("/booking/cancel/:id", async (req, res) => {
       const id = req.params.id;

      const booking = await bookingList.findOne({
        _id: new ObjectId(id),
      });
    
      if (!booking) {
        return res.status(404).json({
          error: true,
          message: "Booking not found",
        });
      }
    
  
      const updateBooking = await bookingList.updateOne(
        {
          _id: new ObjectId(id),
        },
        {
          $set: {
            status: "cancelled",
          },
        }
      );
    
    
      await tutorList.updateOne(
        {
          _id: new ObjectId(booking.tutorId),
        },
        {
          $inc: {
            slot: 1,
          },
        }
      );
    
    
      res.json(updateBooking);
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
