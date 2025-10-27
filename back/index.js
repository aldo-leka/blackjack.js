import './config.js';
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import cors from "cors";
import log from "./log.js";

const app = express();

const corsOrigin = process.env.CORS;
app.use(
  cors({
    origin: corsOrigin,
    // methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true, // Allow credentials (cookies, authorization headers, etc.)
  })
);

const server = createServer(app);
const io = new Server(server, {
    connectionStateRecovery: {}
});

app.get('/', (req, res) => {
    res.sendStatus(200);
});

io.on('connection', async (socket) => {
    socket.on('chat message', async (msg) => {
        let result;
        try {
            // store the message in the database
            // result = await db.run('INSERT INTO messages (content) VALUES (?)', msg);
        } catch (e) {
            // TODO handle the failure
            return;
        }
        // include the offset with the message
        io.emit('chat message', msg);
    });

    if (!socket.recovered) {
        // if the connection state recovery was not successful
    }
});

const port = 3001;
server.listen(port, () => {
    log(`server running at http://localhost:${port}`);
});