import dotenv from 'dotenv';
dotenv.config();

import app from './app';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`[Document Repository API] Server listening on http://localhost:${PORT}`);
  console.log(`[Document Repository API] Health check at http://localhost:${PORT}/api/health`);
});
