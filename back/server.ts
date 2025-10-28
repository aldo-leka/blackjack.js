import server from './app';
import config from './config/config';

server.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
});