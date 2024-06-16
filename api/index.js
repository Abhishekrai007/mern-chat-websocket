const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const User = require("./models/Users");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
app.use(express.json())


dotenv.config();
mongoose.connect(process.env.MONGO_URL)
const jwtSecet = process.env.JWT_SECRET;

app.use(cors({ credentials: true, origin: process.env.CLIENT_URL }))

app.get("/", (req, res) => {
    res.json("ok")
})

app.post("/register", async (req, res) => {
    const { username, password } = req.body;
    try {
        const createdUser = await User.create({ username, password });
        jwt.sign({ userId: createdUser._id }, jwtSecet, {}, (err, token) => {
            if (err) throw err;
            res.cookie("token", token).status(201).json({ id: createdUser._id })
        })
    } catch (error) {
        if (error) throw error;
        res.status(500).json("error")
    }

})

app.listen(3000)


// mongodb+srv://abhishekrai1574:test@cluster0.zurl8ll.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0