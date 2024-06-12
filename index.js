const express = require("express");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const cors = require("cors");
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

const uri = `mongodb+srv://${process.env.VITE_BD_USER}:${process.env.VITE_BD_PASS}@cluster0.rbychrh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const allUsersCollection = client.db("Tech-Tools").collection("All_Users");
    const productsCollection = client
      .db("Tech-Tools")
      .collection("All_Products");
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

    //=============user related api==================
    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const result = await allUsersCollection.findOne(query);
      res.send(result);
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

    app.patch("/user-subscription/:id", async (req, res) => {
      const id = req.params.id;
      const info = req.body;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const subscription = { $set: { ...info } };
      const result = await allUsersCollection.updateOne(
        query,
        subscription,
        options
      );
      res.send(result);
    });

    //Get Related API
    app.get("/Review-Queue", async (req, res) => {
      const result = await productsCollection
        .aggregate([
          {
            $addFields: {
              sortOrder: {
                $cond: {
                  if: { $eq: ["$status", "pending"] },
                  then: 1,
                  else: 2,
                },
              },
            },
          },
          { $sort: { sortOrder: 1 } },
          { $project: { sortOrder: 0 } }, // Remove the sortOrder field from the result
        ])
        .toArray();

      res.send(result);
    });

    app.get("/Featured-Products", async (req, res) => {
      const result = await productsCollection
        .find()
        .sort({ dateTime: -1 })
        .limit(4)
        .toArray();
      res.send(result);
    });

    app.get("/Trending-Products", async (req, res) => {
      const result = await productsCollection
        .find()
        .sort({ vote: -1 })
        .limit(6)
        .toArray();
      res.send(result);
    });

    app.get("/products-count", async (req, res) => {
      const search = req.query.search;
      let query = {};
      if (search) {
        query = { expertise: { $regex: search, $options: "i" } };
      }
      const numbers = await productsCollection.countDocuments(query);
      res.send({ numbers });
    });

    //search product by using product tags
    app.get("/products-search", async (req, res) => {
      const size = parseInt(req.query.size);
      const page = parseInt(req.query.page) - 1;
      const search = req.query.search;
      let query = {};
      if (search) {
        query = { productTags: { $regex: search, $options: "i" } };
      }
      const totalDocuments = await productsCollection.countDocuments(query);
      const products = await productsCollection
        .find(query)
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send({ data: products, totalDocuments });
    });

    app.get("/Product-Details/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productsCollection.findOne(query);
      res.send(result);
    });

    app.get("/products/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { ownerEmail: email };
      const result = await productsCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/product-review/:email", async (req, res) => {
      const email = req.params.email;
      const query = { reviewerEmail: email };
      const result = await reviewCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/product-report/:email", async (req, res) => {
      const email = req.params.email;
      const query = { reporterEmail: email };
      const result = await reportedCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/existing-voter/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { voter: email };
      const result = await productsCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/review-products/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { "product._id": id };
      const result = await reviewCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/reported-products", async (req, res) => {
      const result = await reportedCollection.find().toArray();
      res.send(result);
    });

    //=============== Post Related Api =======================

    //save to product from users
    app.post("/products", verifyToken, async (req, res) => {
      const productInfo = req.body;
      const result = await productsCollection.insertOne(productInfo);
      res.send(result);
    });

    //Post All Review Products
    app.post("/product-review", async (req, res) => {
      const review = req.body;
      const query = { "product._id": review.product._id };
      try {
        if (review.product.ownerEmail === review.reviewerEmail) {
          return res
            .status(400)
            .send("Product owner cannot review their own product");
        }
        const existingReviewer = await reviewCollection.findOne({
          ...query,
          "reviewer.email": review.reviewerEmail,
        });

        if (existingReviewer) {
          return res
            .status(400)
            .send("Reviewer has already reviewed this product");
        }

        const existingProductReview = await reviewCollection.findOne(query);
        console.log(existingProductReview);
        if (existingProductReview) {
          const update = {
            $addToSet: {
              reviewer: {
                reviewerName: review.reviewerName,
                email: review.reviewerEmail,
                reviewerImage: review.reviewerImage,
                reviewDescription: review.reviewDescription,
                productRating: review.productRating,
              },
            },
          };

          await reviewCollection.updateOne(query, update);
          return res.send("Review updated with new reviewer");
        } else {
          const newReview = {
            product: review.product,
            reviewer: [
              {
                reviewerName: review.reviewerName,
                email: review.reviewerEmail,
                reviewerImage: review.reviewerImage,
                reviewDescription: review.reviewDescription,
                productRating: review.productRating,
              },
            ],
          };

          const result = await reviewCollection.insertOne(newReview);
          return res.send(result);
        }
      } catch (error) {
        console.error("Error reviewing product:", error);
        res.status(500).send("Internal Server Error");
      }
    });

    //Post All Reported Product
    app.post("/reported-products", verifyToken, async (req, res) => {
      const info = req.body;

      const query = { "product._id": info.product._id };

      try {
        if (info.product.ownerEmail === info.reporterEmail) {
          return res
            .status(400)
            .send("Product owner cannot review their own product");
        }

        const existingReporter = await reportedCollection.findOne({
          ...query,
          "reporters.email": info.reporterEmail,
        });
        if (existingReporter) {
          return res
            .status(400)
            .send("Reporter has already reported this product");
        }

        const existingReport = await reportedCollection.findOne(query);
        if (existingReport) {
          const update = {
            $addToSet: {
              reporters: {
                email: info.reporterEmail,
                comment: info.comment,
              },
            },
          };

          const result = await reportedCollection.updateOne(query, update);
          return res.send(result);
        } else {
          const newReport = {
            product: info.product,
            reporters: [
              {
                email: info.reporterEmail,
                comment: info.comment,
              },
            ],
          };

          const result = await reportedCollection.insertOne(newReport);
          return res.send(result);
        }
      } catch (error) {
        console.error("Error reporting product:", error);
        res.status(500).send("Internal server error");
      }
    });

    //Update Related API
    app.patch("/update-product/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const info = req.body;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const update = {
        $set: {
          ...info,
        },
      };
      const result = await productsCollection.updateOne(query, update, options);
      res.send(result);
    });

    //upto vote related api
    app.patch("/upVote/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const info = req.body;
      // console.log(id, info);
      const query = { _id: new ObjectId(id) };
      try {
        const find = await productsCollection.findOne(query);
        if (find.ownerEmail === info.voter) {
          return res.status(400).send("You cannot vote on your own product");
        }

        if (find.voter) {
          return res.status(400).send("You have already voted on this product");
        }

        const update = {
          $inc: { vote: 1 },
          $addToSet: { voter: info.voter },
        };

        const result = await productsCollection.updateOne(query, update);
        res.send(result);
      } catch (error) {
        console.error("Error updating vote:", error);
        res.status(500).send("An error occurred while updating the vote");
      }
    });

    //Delete Related API
    app.delete("/product-delete/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productsCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", async (req, res) => {
  res.send("Tech-Tools is Running");
});

app.listen(port, () => {
  console.log(`Tech-Tools is running on the port: ${port}`);
});
