const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const User = require("./models/Users");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const cookieParser = require("cookie-parser")
const app = express();
const bcrypt = require("bcryptjs")
const ws = require("ws");
const Message = require("./models/Message")
const fs = require('fs');
const { check, validationResult } = require('express-validator');
app.use(express.json())
app.use(cookieParser())


app.use('/uploads', express.static(__dirname + '/uploads'));

dotenv.config();
try {
    mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');
} catch (error) {
    console.error('MongoDB connection error:', error);
}
const jwtSecet = process.env.JWT_SECRET;
const bcryptSalt = bcrypt.genSaltSync(10)
app.use(cors({ credentials: true, origin: [process.env.CLIENT_URL, 'https://your-frontend-vercel-url.vercel.app'] }))

const getUserDataFromRequest = async (req) => {
    return new Promise((resolve, reject) => {
        const token = req.cookies?.token;
        if (token) {
            jwt.verify(token, jwtSecet, {}, (err, userData) => {
                if (err) throw err;
                resolve(userData)
            })
        } else {
            reject("no token!")
        }
    })

}


app.get("/", (req, res) => {
    res.json("ok")
})

app.get("/messages/:userId", async (req, res) => {
    const { userId } = req.params
    const userData = await getUserDataFromRequest(req);
    const ourUserId = userData.userId;
    const messages = await Message.find({
        sender: { $in: [userId, ourUserId] },
        recipient: { $in: [userId, ourUserId] }
    }).sort({ createdAt: 1 })
    res.json(messages)
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

app.get("/people", async (req, res) => {
    const users = await User.find({}, { "_id": 1, username: 1, });
    res.json(users)
})

const validateUser = [
    check('username').notEmpty().withMessage('Username is required'),
    check('password').isLength({ min: 3 }).withMessage('Password must be at least 3 characters long')
];

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



app.post("/logout", (req, res) => {
    res.cookie("token", "", { sameSite: "none", secure: true }).json("ok")
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

// ================================
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
// =================================
// const server = app.listen(3000);

const wss = new ws.WebSocketServer({ server });
wss.on("connection", (connection, req) => {


    const notifyAboutOnlinePeople = () => {
        [...wss.clients].forEach((client) => {
            client.send(JSON.stringify(
                {
                    online: [...wss.clients].map(c => ({ userId: c.userId, username: c.username }))
                }
            ))
        })
    }

    connection.isAlive = true;

    connection.timer = setInterval(() => {
        connection.ping();
        connection.deathTimer = setTimeout(() => {
            connection.isAlive = false;
            clearInterval(connection.timer)
            connection.terminate()
            notifyAboutOnlinePeople()
            console.log("dead")
        }, 1000)
    }, 5000)

    connection.on("pong", () => {
        clearTimeout(connection.deathTimer)
    })

    const cookies = req.headers.cookie;
    if (cookies) {
        const tokenCookieString = cookies.split(";").find(str => str.startsWith("token="))
        if (tokenCookieString) {
            const token = tokenCookieString.split("=")[1];
            if (token) {
                jwt.verify(token, jwtSecet, {}, (err, userData) => {
                    if (err) throw err;
                    const { userId, username } = userData;
                    connection.userId = userId;
                    connection.username = username;

                })
            }
        }
    }



    connection.on('message', async (message) => {
        const messageData = JSON.parse(message.toString());
        const { recipient, text, file } = messageData;
        let filename = null;
        if (file) {
            console.log('size', file.data.length);
            const parts = file.name.split('.');
            const ext = parts[parts.length - 1];
            filename = Date.now() + '.' + ext;
            const path = __dirname + '/uploads/' + filename;
            const bufferData = new Buffer(file.data.split(',')[1], 'base64');
            fs.writeFile(path, bufferData, () => {
                console.log('file saved:' + path);
            });
        }
        if (recipient && (text || file)) {
            const messageDoc = await Message.create({
                sender: connection.userId,
                recipient,
                text,
                file: file ? filename : null,
                createdAt: new Date()
            });
            console.log('created message');
            [...wss.clients]
                .filter(c => c.userId === recipient)
                .forEach(c => c.send(JSON.stringify({
                    text,
                    sender: connection.userId,
                    recipient,
                    file: file ? filename : null,
                    _id: messageDoc._id,
                    createdAt: messageDoc.createdAt
                })));
        }
    });

    notifyAboutOnlinePeople();


})

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// mongodb+srv://abhishekrai1574:test@cluster0.zurl8ll.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0