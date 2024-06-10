const express = require('express');
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
    const productsCollection = client.db("Tech-Tools").collection("All_Products");
    const reviewCollection = client.db("Tech-Tools").collection("Reviews");
    const reportedCollection = client.db("Tech-Tools").collection("Reports");
    //token Generate
    app.post("/jwt", async (req, res) => {
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
          expiresIn: "1h",
        });
        res.send({ token });
      });



      //Get Related API
      app.get('/Featured-Products',async(req,res)=>{
        const result = await productsCollection.find().sort({ dateTime: -1 }).limit(4).toArray();
        res.send(result);
      })


      app.get('/Trending-Products',async(req,res)=>{
        const result = await productsCollection.find().sort({ vote: -1 }).limit(6).toArray();
        res.send(result);
      })


      app.get('/Product-Details/:id',verifyToken, async (req,res)=>{
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        const result = await productsCollection.findOne(query);
        res.send(result);
      })

      app.get('/products/:email', async (req,res)=>{
        const email = req.params.email;
        const query = {ownerEmail:email};
        const result = await productsCollection.find(query).toArray();
        res.send(result);
      })

      app.get('/product-review/:email',async (req,res)=>{
        const email = req.params.email;
        const query = {reviewerEmail:email};
        const result = await reviewCollection.find(query).toArray();
        res.send(result);
      })
      app.get('/product-report/:email',async (req,res)=>{
        const email = req.params.email;
        const query = {reporterEmail:email};
        const result = await reportedCollection.find(query).toArray();
        res.send(result);
      })
      
      //=============== Post Related Api =======================
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

      //save to product from users
      app.post('/products',async(req,res)=>{
        const productInfo = req.body;
        const result = await productsCollection.insertOne(productInfo);
        res.send(result);
      })

      //Post All Review Products
      app.post('/product-review',async (req,res)=>{
        const review = req.body;
        const result = await reviewCollection.insertOne(review);
        res.send(result);
      })

      //Post All Reported Product
      app.post('/reported-products',async (req,res)=>{
        const info = req.body;
        const result = await reportedCollection.insertOne(info);
        res.send(result);
      })

      //Update Related API
      app.patch('/update-product/:id', async (req,res)=>{
        const id = req.params.id;
        const info = req.body;
        const query = {_id: new ObjectId(id)};
        const options = { upsert: true }
        const update = {
          $set:{
           ...info
          }
        }
        const result = await productsCollection.updateOne(query,update,options);
        res.send(result);
      })


      //Delete Related API
      app.delete('/product-delete/:id',async(req,res)=>{
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        const result = await productsCollection.deleteOne(query);
        res.send(result);
      })

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