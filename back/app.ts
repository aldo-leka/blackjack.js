import express from 'express';
import itemRoutes from './routes/itemRoutes';
import userRoutes from './routes/userRoutes';
import { errorHandler } from './middlewares/errorHandler';
import cors from "cors";
import config from './config/config';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";

const app = express();

app.use(
    cors({
        origin: config.frontendUrl,
        credentials: true, // Allow credentials (cookies, authorization headers, etc.)
    })
);

app.all('/api/auth/*', toNodeHandler(auth));

app.use(express.json());

// Routes
app.use('/api/items', itemRoutes);
app.use('/api/users', userRoutes);

// Global error handler (should be after routes)
app.use(errorHandler);

const server = createServer(app);
const io = new Server(server);

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

export default server;
