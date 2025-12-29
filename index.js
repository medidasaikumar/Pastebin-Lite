import app from './src/app.js';

// For Vercel, we export the app as default.
// Vercel handles the server listening part automatically.
export default app;

// For local development, we want to listen on a port.
// We can check if the file is being run directly.
// In ES modules, we can check import.meta.url
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.argv[1] === __filename) {
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}
