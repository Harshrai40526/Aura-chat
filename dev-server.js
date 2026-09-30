import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const API_PORT = 3001;

async function startServer() {
  const apiApp = express();
  apiApp.use(express.json({ limit: '25mb' }));
  apiApp.use(express.urlencoded({ extended: true, limit: '25mb' }));

  apiApp.use('/api', async (req, res) => {
    try {
      const rawPath = req.path.endsWith('/') ? req.path.slice(0, -1) : req.path;
      const segments = rawPath.split('/').filter(Boolean);
      let moduleName = segments[0] || 'index';
      let action = segments.slice(1).join('/');

      req.query = req.query || {};
      if (action) {
        req.query.action = req.query.action || action;
      }

      let filePath = path.join(__dirname, 'api', `${moduleName}.js`);

      // Check direct subfolder index or file if module file doesn't exist
      if (!fs.existsSync(filePath)) {
        if (fs.existsSync(path.join(__dirname, 'api', moduleName, 'index.js'))) {
          filePath = path.join(__dirname, 'api', moduleName, 'index.js');
        } else if (segments.length >= 2 && fs.existsSync(path.join(__dirname, 'api', moduleName, `${segments[1]}.js`))) {
          filePath = path.join(__dirname, 'api', moduleName, `${segments[1]}.js`);
        }
      }

      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        return res.status(404).json({ success: false, message: `API route not found: ${req.originalUrl}` });
      }

      const fileUrl = pathToFileURL(filePath).href + `?update=${Date.now()}`;
      const handlerModule = await import(fileUrl);
      const handler = handlerModule.default;

      if (typeof handler === 'function') {
        return await handler(req, res);
      } else {
        return res.status(500).json({ success: false, message: 'Invalid API handler default export' });
      }
    } catch (err) {
      console.error('Local API Runner Error:', err);
      return res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
    }
  });

  apiApp.listen(API_PORT, () => {
    console.log(`⚡ Local Serverless API runner active on http://localhost:${API_PORT}`);
  });

  const vite = await createViteServer({
    server: { port: PORT },
  });
  await vite.listen();
  console.log(`🚀 Vite Chat App Frontend running on http://localhost:${PORT}`);
}

startServer();
