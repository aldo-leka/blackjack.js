import server from './app';
import config from './config/config';
import { logInfo } from './log';

server.listen(config.port, () => {
    logInfo(`Server running on port ${config.port}`);
});