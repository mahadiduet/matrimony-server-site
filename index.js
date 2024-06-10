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
        'http://localhost:5173',
        'https://matrimony-859d8.web.app',
        'https://matrimony-859d8.firebaseapp.com'
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
        const premiumCollection = client.db("matrimonyDb").collection("premiums");


        // jwt related api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token });
        })

        // middlewares 
        const verifyToken = (req, res, next) => {
            // console.log(req.headers);
            // console.log(req.headers.authorization);
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unauthorized access' });
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorized access' })
                }
                req.decoded = decoded;
                next();
            })
        }

        // use verify admin after verifyToken
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            next();
        }

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

        // All Users get API
        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        });

        // User get by email
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };

            try {
                const result = await userCollection.findOne(query);
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send("An error occurred while fetching the user.");
            }

        })

        // Make Admin API
        app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })

        // Make Admin API
        app.patch('/users/admin/premium/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    premiumMember: 1
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })

        // Delete User API
        app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await userCollection.deleteOne(query);
            res.send(result);
        })



        // Admin User
        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;

            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'Forbidden Access' })
            }

            const query = { email: email };
            const user = await userCollection.findOne(query);
            let admin = false;
            if (user) {
                admin = user?.role === 'admin';
            }
            res.send({ admin });
        })



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
            bioInfo.createdAt = new Date();


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
            const filter = { status: 'approve' };
            const data = await bioCollection.find(filter).sort({ _id: -1 }).limit(6).toArray();
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
            console.log('Total amount', amount)

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

        app.get('/payments', async (req, res) => {
            try {
                const paymentData = await payCollection.find().toArray();
                if (paymentData.length === 0) {
                    return res.send([])
                }
                const biodataIds = paymentData.map(payment => payment.BiodateID);
                const bioData = await bioCollection.find({ BiodataId: { $in: biodataIds } }).toArray();
                const mergedData = paymentData.map(payment => {
                    const matchingBioData = bioData.find(bioData => bioData.BiodataId === payment.BiodateID);
                    return { ...payment, ...matchingBioData };
                });
                return res.send(mergedData);
            } catch (err) {
                return res.status(500).json({ error: err.message });
            }
        })

        app.patch('/payments/:id', async (req, res) => {
            const id = parseInt(req.params.id);
            const filter = { BiodateID: id };
            const updatedDoc = {
                $set: {
                    status: 'approve'
                }
            }
            const result = await payCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })

        // Payment data retrive by specific user
        app.get('/payments/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            try {
                const paymentData = await payCollection.find({ email }).toArray();
                if (paymentData.length === 0) {
                    return res.send([])
                }
                const biodataIds = paymentData.map(payment => payment.BiodateID);
                const bioData = await bioCollection.find({ BiodataId: { $in: biodataIds } }).toArray();
                const mergedData = paymentData.map(payment => {
                    const matchingBioData = bioData.find(bioData => bioData.BiodataId === payment.BiodateID);
                    return { ...payment, ...matchingBioData };
                });
                return res.send(mergedData);
            } catch (err) {
                return res.status(500).json({ error: err.message });
            }
        })

        // Premium Post API
        app.post('/premium', async (req, res) => {
            const data = req.body;
            // console.log(data.id);
            const query = { id: data.id }
            // console.log(query)
            const existData = await premiumCollection.findOne(query);
            console.log(existData);
            if (existData) {
                return res.send({ message: 'Request already exists', insertedId: null })
            }
            try {

                const premium = req.body;
                const premiumResult = await premiumCollection.insertOne(premium);
                res.send(premiumResult);
            } catch (error) {
                if (error.code === 11000) {
                    // Handle duplicate key error
                    res.status(400).json({ error: 'Duplicate key error: Premium already exists' });
                } else {
                    // Handle other errors
                    res.status(500).json({ error: 'Internal server error' });
                }
            }
        })

        // Get All premium bio for admin panel
        app.get('/premium', verifyToken, verifyAdmin, async (req, res) => {
            const result = await premiumCollection.find().toArray();
            res.send(result);
        })

        // Premium Bio Approve API
        app.patch('/premium/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            // console.log(id)
            const filter = { id: id };
            const filter1 = { _id: new ObjectId(req.params.id) }
            const updatedDoc = {
                $set: {
                    status: 'approve'
                }
            }
            try {
                const result = await premiumCollection.updateOne(filter, updatedDoc);
                const result1 = await bioCollection.updateOne(filter1, updatedDoc);
                res.send(result);
            } catch (err) {
                console.error('Error updating premiumCollection:', err);
            }



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