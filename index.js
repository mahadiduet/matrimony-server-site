const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const port = process.env.PORT || 5000;

// middleware
app.use(cors({
    origin: [
        'http://localhost:5173'
    ],
    credentials: true
}));
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lyuai16.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
        const favCollection = client.db("matrimonyDb").collection("favData");
        const payCollection = client.db("matrimonyDb").collection("payments");
        // db.counters.insertOne({ _id: "biodataid", sequence_value: 0 });


        // jwt related api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token });
        })

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

            const lastBiodata = await bioCollection
                .find()
                .sort({ BiodataId: -1 })
                .limit(1)
                .toArray();

            let newBiodataId = 1;
            if (lastBiodata.length > 0) {
                newBiodataId = lastBiodata[0].BiodataId + 1;
            }

            bioInfo.BiodataId = newBiodataId;


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
            const data = await bioCollection.find().sort({ _id: -1 }).limit(6).toArray();
            res.send(data);
        })

        // Bio Get
        app.get('/bio-data/:id', async (req, res) => {
            const email = req.params.id;
            const data = await bioCollection.find({ 'contact_email': email }).toArray();
            res.send(data);
        })

        // Bio data details page API specific Id
        app.get('/view/:id', async (req, res) => {
            const id = req.params.id;

            const filter = { _id: new ObjectId(id) };
            console.log(filter);
            const data = await bioCollection.find(filter).toArray();
            res.send(data);
        })

        // Similar Bio get
        app.get('/similar-bio', async (req, res) => {
            const { id: _id, gender: biodata_type } = req.query;
            // const gender = req.query.biodata_type;
            const id = new ObjectId(req.query._id);
            console.log(id);
            // console.log('Bio Similar',_id, id)
            const result = await bioCollection.find({ _id: { $ne: new ObjectId(_id) }, biodata_type: biodata_type }).limit(3).toArray();
            res.send(result);
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

        // Favourite Bio Add
        app.post('/favouriteAdd', async (req, res) => {
            const favInfo = req.body;
            console.log(favInfo);
            const result = await favCollection.insertOne(favInfo);
            res.send(result);
        });

        // Favourite Bio Get
        app.get('/fav-data/:id', async (req, res) => {
            const email = req.params.id;
            const data = await favCollection.find({ 'email': email }).toArray();
            res.send(data);
        })

        // Delete Favourite API
        app.delete('/fav-delete/:id', async (req, res) => {
            const fav_id = new ObjectId(req.params.id);
            const query = { _id: fav_id };
            const result = await favCollection.deleteOne(query);
            res.send(result);
        });

        // payment intent
        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);
            console.log(amount, 'Total amount')

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });

            res.send({
                clientSecret: paymentIntent.client_secret
            })
        });

        // Payment API
        app.post('/payments', async (req, res) => {
            console.log(req.body);
            const payment = req.body;
            const paymentResult = await payCollection.insertOne(payment);

            res.send(paymentResult);
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