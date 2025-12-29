const app = require('./src/app');
const port = process.env.PORT || 3000;

// Export the app for Vercel
module.exports = app;

// Only listen if NOT running on Vercel (or similar serverless environment)
// Vercel doesn't run the 'start' script in the same way for serverless functions,
// but for local dev (npm start), we need to listen.
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}
