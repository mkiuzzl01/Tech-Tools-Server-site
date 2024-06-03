const express = require('express');
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;


// middleware
app.use(cors());
app.use(express.json());


//Token Verify
const verifyToken = (req, res, next) => {
    // console.log(req.headers.authorization);
    if (!req.headers.authorization) {
      return res.status(401).send({ message: "unauthorize access" });
    }
    const token = req.headers.authorization.split(" ")[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
      if (err) {
        return res.status(401).send({ message: "unauthorize access" });
      }
      req.decoded = decoded;
      next();
    });
};


const uri =`mongodb+srv://${process.env.VITE_BD_USER}:${process.env.VITE_BD_PASS}@cluster0.rbychrh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

    const allUsersCollection = client.db("Tech-Tools").collection("All_Users");
    //token Generate
    app.post("/jwt", async (req, res) => {
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
          expiresIn: "1h",
        });
        res.send({ token });
      });

      //save to database all visited users
      app.post("/users", async (req, res) => {
        const info = req.body;
        const query = { email: info.email };
        const existingUser = await allUsersCollection.findOne(query);
        if (existingUser) {
          return res.send({ message: "User Already Exits", insertedId: null });
        }
        const result = await allUsersCollection.insertOne(info);
        res.send(result);
      });



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', async (req,res)=>{
    res.send('Tech-Tools is Running');
})

app.listen(port,()=>{
    console.log(`Tech-Tools is running on the port: ${port}`);
})