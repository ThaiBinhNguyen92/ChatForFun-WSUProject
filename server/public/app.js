//Establishes a WebSocket connection with the server
const socket = io('ws://localhost:3500')

// Initializes the chat user interface and socket connections once the HTML document has been fully loaded and parsed.
document.addEventListener('DOMContentLoaded', () => {
    const socketManager = new SocketManager('ws://localhost:3500');
    const chatUI = new ChatUI(socketManager.socket);
    initializeRegistration();
    fetchActiveUsers();

    // Toggle Active Users List
    const toggleButton = document.getElementById('toggle-users-btn');
    const usersListElement = document.querySelector('.all-users-list');
    toggleButton.addEventListener('click', () => {
        const isHidden = usersListElement.style.display === 'none' || usersListElement.style.display === '';
        usersListElement.style.display = isHidden ? 'block' : 'none';
        toggleButton.textContent = isHidden ? 'Hide Active Users' : 'Show Active Users';
    });
});

//Manages the user interface for the chat application and handles socket event listeners 
//for receiving and displaying messages, user activities, and room information.
class ChatUI {
    constructor(socket) {
        this.socket = socket;
        this.initializeUI();
        this.initializeSocketListeners();
    }

    //Sets up the user interface elements and event listeners for sending messages and joining rooms.
    initializeUI() {
        this.msgInput = document.querySelector('#message');
        this.nameInput = document.querySelector('#name');
        this.chatRoom = document.querySelector('#room');
        this.activity = document.querySelector('.activity');
        this.usersList = document.querySelector('.user-list');
        this.chatDisplay = document.querySelector('.chat-display');
        
        document.querySelector('.form-msg').addEventListener('submit', (e) => this.sendMessage(e));
        document.querySelector('.form-join').addEventListener('submit', (e) => this.enterRoom(e));
        this.msgInput.addEventListener('keypress', () => {
            this.socket.emit('activity', this.nameInput.value);
        });
    }

    //Configures the socket event listeners to handle incoming data for chat messages, user activities, user list, and room list updates.
    initializeSocketListeners() {
        this.socket.on("userListUpdate", (data) => this.showUsers(data.users));
        this.socket.on("message", (data) => this.displayMessage(data));
        this.socket.on('activity', (name) => this.showActivity(name));
        this.socket.on('userList', ({ users }) => this.showUsers(users));
        this.socket.on('activeUsersUpdate', (data) => {
            displayActiveUsers(data.activeUsers);
        });
    }

    //Emits a 'message' event to the server with the user's name and message text.
    sendMessage(e) {
        e.preventDefault();
        if (this.nameInput.value && this.msgInput.value && this.chatRoom.value) {
            this.socket.emit('message', {
                name: this.nameInput.value,
                text: this.msgInput.value
            });
            this.msgInput.value = "";
        }
        this.msgInput.focus();
    }

    //Emits an 'enterRoom' event to the server with the user's name and selected chat room.
    enterRoom(e) {
        e.preventDefault();
        if (this.nameInput.value && this.chatRoom.value) {
            this.socket.emit('enterRoom', {
                name: this.nameInput.value,
                room: this.chatRoom.value
            });
        }
    }

    //Displays a chat message in the chat window.    
    displayMessage({ name, text, time }) {
        this.activity.textContent = "";
        const li = document.createElement('li');
        li.className = 'post';
        if (name === this.nameInput.value) {
            li.classList.add('post--left');
        } else if (name !== 'Admin') {
            li.classList.add('post--right');
        }
        if (name !== 'Admin') {
            li.innerHTML = `<div class="post__header ${name === this.nameInput.value ? 'post__header--user' : 'post__header--reply'}">
                <span class="post__header--name">${name}</span>
                <span class="post__header--time">${time}</span>
            </div>
            <div class="post__text">${text}</div>`;
        } else {
            li.innerHTML = `<div class="post__text">${text}</div>`;
        }
    
        this.chatDisplay.appendChild(li);
        this.chatDisplay.scrollTop = this.chatDisplay.scrollHeight;
    }
    
    //Displays an activity status, such as a user typing.
    showActivity(name) {
        this.activity.textContent = `${name} is typing...`;
        clearTimeout(this.activityTimer);
        this.activityTimer = setTimeout(() => {
            this.activity.textContent = "";
        }, 3000);
    }

    //Updates the display of the user list for a chat room.
    showUsers(users) {
        this.usersList.innerHTML = '';
        if (users && users.length > 0) {
            let content = `<em>Users in ${this.chatRoom.value}:</em>`;
            content += users.map(user => ` ${user.name}`).join(",");
            this.usersList.innerHTML = content;
        } else {
            this.usersList.innerHTML = 'No users in room.';
        }
    }
    
}

class SocketManager {
    constructor(url) {
        this.socket = io(url);
    }
    //Emits a specified event with data to the server.
    emit(event, data) {
        this.socket.emit(event, data);
    }
    //Listens for a specified event from the server and handles it with the provided function.
    on(event, handler) {
        this.socket.on(event, handler);
    }
}

//Handles the registration process by posting the new user's credentials to the server.
function initializeRegistration() {
    const registrationForm = document.getElementById('form-registration');
    registrationForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('register-name').value;
        const password = document.getElementById('register-password').value;
        //Send user's information to backend
        fetch('http://localhost:3500/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, password }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById('registration').style.display = 'none';
                document.getElementById('join-chat').style.display = 'block';
            } else {
                alert('Registration failed: ' + data.message);
            }
        })
        .catch((error) => {
            console.error('Error:', error);
        });
    });
}

function fetchActiveUsers() {
    fetch('http://localhost:3500/active-users')
    .then(response => response.json())
    .then(data => {
        displayActiveUsers(data.activeUsers);
    })
    .catch(error => console.error('Error fetching active users:', error));
}

function displayActiveUsers(users) {
    const usersListElement = document.querySelector('.all-users-list');
    usersListElement.innerHTML = '';
    users.forEach(user => {
        const userElement = document.createElement('li');
        userElement.textContent = `${user.name} (Room: ${user.room})`;
        usersListElement.appendChild(userElement);
    });
}