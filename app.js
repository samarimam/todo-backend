require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("./models/User");
const bcrypt = require("bcrypt");
const Todo = require("./models/Todo");

app.use(cors());
app.use(express.json());

app.post("/signup", async (req, res) => {
    const newUser = new User({
        username: req.body.username,
        password: bcrypt.hashSync(req.body.password, 10),
    });

    let token;
    try {
        await newUser.save();
        token = jwt.sign({ userId: newUser._id }, "secretkey");
        console.log(token);
    } catch (e) {
        console.log(e);
        res.status(500).json({ error: "something wrong" });
        throw new Error("Username already in use");
    }
    return res.status(201).json({
        title: "user added succesfully",
        token: token,
    });
});

app.post("/login", (req, res) => {
    User.findOne({ username: req.body.username }, (err, user) => {
        if (err)
            return res.status(500).json({
                title: "server error",
                error: err,
            });

        if (!user) {
            return res.status(400).json({
                title: "user is not found",
                error: "invalid username or password",
            });
        }
        if (!bcrypt.compareSync(req.body.password, user.password)) {
            return res.status(401).json({
                title: "login failed",
                error: "invalid username or password",
            });
        }

        // authentication is done, give them a token
        let token = jwt.sign({ userId: user._id }, "secretkey");
        return res.status(200).json({
            title: "login successful",
            token: token,
        });
    });
});

// get todo route
app.get("/todos", (req, res) => {
    // verify
    // console.log("jkbhvhvvv")
    jwt.verify(req.headers.token, "secretkey", (err, decoded) => {
        // console.log(req.headers.token)
        if (err)
            return res.status(401).json({
                title: "not authorized",
            });

        // now we know token is valid
        Todo.find({ author: decoded.userId }, (err, todos) => {
            if (err) return console.log(err);

            return res.status(200).json({
                title: "success",
                todos: todos,
            });
        });
    });
});

// add todo route
// mark todo as completed route
app.post("/todo", (req, res) => {
    // verify
    jwt.verify(req.body.token, "secretkey", (err, decoded) => {
        console.log(err);
        if (err)
            return res.status(401).json({
                title: "not authorized",
            });

        let newTodo = new Todo({
            title: req.body.title,
            content: req.body.content,
            isCompleted: false,
            author: decoded.userId,
        });

        newTodo.save((error) => {
            if (error) return console.log(error);
            return res.status(200).json({
                title: "successfully added",
                todo: newTodo,
            });
        });
    });
});

app.delete("/todo/:todoId", async (req, res) => {
    const todoId = req.params.todoId;
    jwt.verify(req.headers.token, "secretkey", async (err, decoded) => {
        if (err)
            return res.status(401).json({
                title: "not authorized",
            });

        // now we know token is valid
        try {
            const note = await Todo.findById(todoId);
            await note.remove();
        } catch (e) {
            console.log(e);
        }
        return res.status(200).json({ message: "deleted successfully" });
    });
});

app.post("/todo/:todoId", async (req, res) => {
    console.log("--------------------------");
    const todoId = req.params.todoId;
    jwt.verify(req.body.token, "secretkey", async (err, decoded) => {
        if (err)
            return res.status(401).json({
                title: "not authorized",
            });

        try {
            await Todo.findByIdAndUpdate(todoId, { $set: req.body });
        } catch (e) {
            console.log(e);
        }
        return res.status(200).json({ message: "edit successfully" });
    });
});

// app.get('/user', (req, res) => {
//   let token = req.headers.token;
//   // verify
//   jwt.verify(token, 'secretkey', (err, decoded) => {
//     if (err) return res.status(401).json({
//       title: 'not authorized'
//     });

//     // now we know token is valid
//     User.findOne({ _id: decoded.userId }, (err, user) => {
//       if (err) return console.log(err);
//       return res.status(200).json({
//         title: 'success',
//         user: {
//           username: user.username
//         }
//       })
//     })
//   })
// })

const port = process.env.PORT || 5000;

mongoose
    .connect(process.env.MONGO_URL, {
        useUnifiedTopology: true,
        useCreateIndex: true,
        useNewUrlParser: true,
    })
    .then(() => {
        console.log("Database connected");

        app.listen(port, (err) => {
            if (err) return console.log(err);
            console.log("Server running on port: ", port);
        });
    })
    .catch((e) => {
        console.log(e);
    });
