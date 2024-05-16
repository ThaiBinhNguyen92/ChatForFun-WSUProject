import express from 'express'
import { Server } from "socket.io"
import path from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose';
import cors from 'cors';


//MONGO DATABASE
const mongoURI = "mongodb+srv://thy:072510@thy.dw4bsi8.mongodb.net/?retryWrites=true&w=majority&appName=thy";
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });

const userSchema = new mongoose.Schema({
    name: String,
    password: String,
});

const User = mongoose.model('User', userSchema);

mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error: ' + err);
    process.exit(-1);
});

mongoose.connection.once('open', () => {
    console.log('MongoDB connected!');
});


// Convert the file URL of the current module to a file path for __filename emulation
const __filename = fileURLToPath(import.meta.url);

// Get the directory name from the file path for __dirname emulation
const __dirname = path.dirname(__filename);

// Set the server's listening port with a preference for the environment's port, defaulting to 3500
const PORT = process.env.PORT || 3500;

// Define a constant for the admin user's name
const ADMIN = "Admin";

// Create a new Express application
const app = express();

// Use middleware to parse JSON payloads in incoming requests
app.use(express.json());

// Set up CORS to allow specific origins based on the environment
app.use(cors({
    origin: process.env.NODE_ENV === "production" ? false : ["http://localhost:5500", "http://127.0.0.1:5500"],
    methods: ["GET", "POST"]
}));

// Route to register new users and handle user existence checks
app.post('/register', async (req, res) => {
  try {
    console.log(req.body);
    const { name, password } = req.body;
    const existingUser = await User.findOne({ name });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }
    const user = new User({ name, password });
    console.log("user",user);
    await user.save();
    res.status(201).json({ success: true, message: "User registered successfully" });
  } catch (error) {
    console.log('error', error);
    res.status(500).json({ success: false, message: "An error occurred" });
  }
});

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));

// Start the Express server and log the listening port
const expressServer = app.listen(PORT, () => {
    console.log(`listening on port ${PORT}`)
});
// Initialize socket.io to enable real-time communication, setting CORS policies based on environment
const io = new Server(expressServer, {
    cors: {
        origin: process.env.NODE_ENV === "production" ? false : ["http://localhost:5500", "http://127.0.0.1:5500"]
    }
});

// Class to manage user states, such as tracking users and their rooms
class UsersState {
    constructor() {
        this.users = []; // Holds the list of users
    }

    // Update the entire user list
    setUsers(newUsersArray) {
        this.users = newUsersArray;
    }

    // Retrieve a user by their unique socket ID
    getUser(id) {
        return this.users.find(user => user.id === id);
    }

    // Get a list of users in a specific room
    getUsersInRoom(room) {
        return this.users.filter(user => user.room === room);
    }

    // Add or update a user's status as active in a particular room
    activateUser(id, name, room) {
        const user = { id, name, room };
        this.setUsers([
            ...this.users.filter(user => user.id !== id), // Remove any previous instance of the user
            user // Add the updated user information
        ]);
        return user;
    }

    // Remove a user from the users array when they leave the app
    userLeavesApp(id) {
        this.setUsers(this.users.filter(user => user.id !== id));
    }

    // Generate a list of all active rooms by extracting unique room names from the user list
    getAllActiveRooms() {
        return Array.from(new Set(this.users.map(user => user.room)));
    }

    getAllActiveUsers() {
        return this.users.map(user => ({ name: user.name, room: user.room }));
    }    
    
}

const usersState = new UsersState();

// Route to get active users
app.get('/active-users', (req, res) => {
    const activeUsers = usersState.getAllActiveUsers();
    res.json({ activeUsers });
});


io.on('connection', socket => {
    console.log(`User ${socket.id} connected`);

    // Upon connection - only to user
    socket.emit('message', buildMsg(ADMIN, "Welcome to Chat For Fun!"));

    socket.on('enterRoom', ({ name, room }) => {
        // Leave previous room
        const prevRoom = usersState.getUser(socket.id)?.room;
        
        if (prevRoom) {
            socket.leave(prevRoom);
            io.to(prevRoom).emit('message', buildMsg(ADMIN, `${name} has left the room`));
            io.to(prevRoom).emit('userList', {
                users: usersState.getUsersInRoom(prevRoom)
            });
        }

        // Activate (or update) user with new room information
        const user = usersState.activateUser(socket.id, name, room);

        // Join new room
        socket.join(user.room);

        // To user who joined
        socket.emit('message', buildMsg(ADMIN, `You have joined the ${user.room} chat room`));

        // To everyone else in the new room
        socket.broadcast.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} has joined the room`));

        // Update user list for the new room
        io.to(user.room).emit('userList', {
            users: usersState.getUsersInRoom(user.room)
        });

        io.emit('activeUsersUpdate', {
            activeUsers: usersState.getAllActiveUsers()
        });
        
    });

    socket.on('disconnect', () => {
        const user = usersState.getUser(socket.id);

        if (user) {
            io.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} has left the room`));
            io.to(user.room).emit('userList', {
                users: usersState.getUsersInRoom(user.room)
            });
            io.emit('activeUsersUpdate', {
                activeUsers: usersState.getAllActiveUsers()
            });
        }

        console.log(`User ${socket.id} disconnected`);
    });

    // Listening for a message event
    socket.on('message', ({ name, text }) => {
        const room = usersState.getUser(socket.id)?.room;
        if (room) {
            io.to(room).emit('message', buildMsg(name, text));
        }
    });

    // Listen for activity
    socket.on('activity', (name) => {
        const room = usersState.getUser(socket.id)?.room;
        if (room) {
            socket.broadcast.to(room).emit('activity', name);
        }
    });
});


function buildMsg(name, text) {
    return {
        name,
        text,
        time: new Intl.DateTimeFormat('default', {
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric'
        }).format(new Date())
    }
}
