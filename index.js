const express = require('express');
const app = express();
const cors = require('cors');
// const jwt = require('jsonwebtoken');
require('dotenv').config();
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = "mongodb+srv://mahadi-matrimony:RYYvU8aEVCg76Tk5@cluster0.lyuai16.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

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

        const userCollection = client.db("matrimonyDb").collection("users");
        const bioCollection = client.db("matrimonyDb").collection("bioData");

        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'user already exists', insertedId: null })
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        });

        // Bio Added
        app.post('/bioAdd', async (req, res) => {
            const bioInfo = req.body;
            const result = await bioCollection.insertOne(bioInfo);
            res.send(result);
        });


        // All Bio Get
        app.get('/bio-data', async (req, res) => {
            // const email = req.params.id;
            const data = await bioCollection.find().toArray();
            res.send(data);
        })

        // Bio Get for home page
        app.get('/bio-data-home', async (req, res) => {
            // const email = req.params.id;
            const data = await bioCollection.find().sort({_id: -1}).limit(6).toArray();
            res.send(data);
        })

        // Bio Get
        app.get('/bio-data/:id', async (req, res) => {
            const email = req.params.id;
            const data = await bioCollection.find({ 'contact_email': email }).toArray();
            res.send(data);
        })

        // Bio Update
        app.put('/bioData/:id', async (req, res) => {
            const id = req.params.id;
            
            const filter = { _id: new ObjectId(id) };
            console.log(filter);
            const options = { upsert: true };
            const updateData = {
                $set: req.body
            };
            const result = await bioCollection.updateOne(filter, updateData, options);
            console.log(`A document was inserted with the _id: ${result}`);
            res.send(result);
        })


        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Matrimony server is running')
})

app.listen(port, () => {
    console.log(`Matrimony server on port ${port}`);
})