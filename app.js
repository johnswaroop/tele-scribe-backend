// index.js

const express = require('express');
require("dotenv").config()
const app = express();
const port = 5500;
let supabase = require("./supabase")
let manageJobPooling = require("./manager")
let sendEmail = require("./sendmail")
// Middleware to parse JSON requests
app.use(express.json());

manageJobPooling()


// Basic route
app.get('/', async (req, res) => {
    let db_res = await supabase.from("jobs").select("*");
    console.log(db_res)
    res.send('Hello, world!');
});

app.get("/send-email", async (req, res) => {
    let id = req.query.id;
    sendEmail(id)
    res.send("send email")
})

app.get("/pooling", (req, res) => {
    manageJobPooling()
    res.send('pooling started');
})

// Start the server
app.listen(port, () => {
    console.log(`Server is running on ${port}`);
});

