const express = require('express');
const app = express();
const cors = require('cors');
// const jwt = require('jsonwebtoken');
require('dotenv').config();
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const port = process.env.PORT || 5000;

// middleware
// app.use(cors());
// app.use(express.json());

app.get('/', (req, res) => {
    res.send('Matrimony server is running')
})

app.listen(port, () => {
    console.log(`Matrimony server on port ${port}`);
})