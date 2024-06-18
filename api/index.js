const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const User = require("./models/Users");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const cookieParser = require("cookie-parser")
const app = express();
const bcrypt = require("bcryptjs")
app.use(express.json())
app.use(cookieParser())

dotenv.config();
mongoose.connect(process.env.MONGO_URL)
const jwtSecet = process.env.JWT_SECRET;
const bcryptSalt = bcrypt.genSaltSync(10)
app.use(cors({ credentials: true, origin: process.env.CLIENT_URL }))



app.get("/", (req, res) => {
    res.json("ok")
})

app.get("/profile", (req, res) => {
    const token = req.cookies?.token;
    if (token) {
        jwt.verify(token, jwtSecet, {}, (err, userData) => {
            if (err) throw err;
            res.json(userData)
        })
    } else {
        res.status(401).json("no token")
    }
})
app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    const foundUser = await User.findOne({ username });
    if (foundUser) {
        const passOk = bcrypt.compareSync(password, foundUser.password);
        if (passOk) {
            jwt.sign({ userId: foundUser._id, username }, jwtSecet, {}, (err, token) => {
                res.cookie("token", token, { sameSite: "none", secure: true }).json({
                    id: foundUser._id
                })
            })
        }
    }
})
app.post("/register", async (req, res) => {
    const { username, password } = req.body;
    try {
        const hashedPassword = bcrypt.hashSync(password, bcryptSalt)
        const createdUser = await User.create({
            username,
            password: hashedPassword
        });
        jwt.sign({ userId: createdUser._id, username }, jwtSecet, {}, (err, token) => {
            if (err) throw err;
            res.cookie("token", token, { sameSite: "none", secure: true }).status(201).json({ id: createdUser._id, username })
        })
    } catch (error) {
        if (error) throw error;
        res.status(500).json("error")
    }

})

app.listen(3000)


// mongodb+srv://abhishekrai1574:test@cluster0.zurl8ll.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0