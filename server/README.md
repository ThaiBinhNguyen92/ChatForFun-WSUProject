CHAT FOR FUN
===================================================
Welcome to the Chat For Fun! This web-based application allows users to register, join chat rooms, and communicate in real-time.
===================================================


1 - Install npm
    npm install

2 - Running the Application

    npm start

    npm run dev

Notes: please make sure install dependencies if they are shown up.

===================================================

Frontend
In the frontend of my chat application, I have utilized object-oriented JavaScript to structure the code effectively. I've created two ES6 classes: ChatUI and SocketManager, which encapsulate the functionalities needed for handling user interactions and socket communication respectively. These classes manage everything from user input, displaying messages, and communicating with the server via WebSocket connections.

I've implemented multiple event listeners to enhance user interactivity. For example, the DOMContentLoaded event ensures the application initializes only after the entire HTML document is fully loaded. Additionally, I have event listeners for form submissions and message typing, which facilitate real-time communication and improve user experience. I also use the fetch() function to communicate with the backend, retrieving active users and handling user registration.

Backend
On the backend, I've chosen Node.js and ExpressJS to handle my server operations, in line with the project requirements. Data persistence is achieved through MongoDB, a NoSQL database, where user data is stored securely. I've structured my Express application to handle API requests with at least one GET route to fetch active users and one POST route for user registration, which includes handling of JSON data in the request body.

To facilitate real-time communication, I've integrated Socket.IO, which interacts with the frontend to handle events such as user messages and room changes. The backend also adheres to proper HTTP method usage, where GET is used for retrieving data and POST is used for submitting data to be stored.

Additional Requirements
I have successfully incorporated asynchronous JavaScript in both the frontend and backend. The fetch() API calls in the frontend use async/await for handling network responses. Similarly, the backend uses async/await in Express routes for database operations, ensuring non-blocking code execution.

This project setup not only meets the technical requirements laid out but also provides a solid foundation for further enhancement and scalability. The application is designed to be relatively bug-free and maintainable, adhering closely to modern JavaScript practices and architectural patterns