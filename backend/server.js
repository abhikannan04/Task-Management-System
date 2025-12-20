import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import assignmentRoutes from './routes/assignments.js';
import statusRoutes from './routes/statuses.js';
import reportRoutes from './routes/reports.js';
import userRoutes from './routes/users.js';
import uploadRoutes from './routes/uploads.js';
import supervisorRoutes from './routes/supervisor.js';
import actionPlanRoutes from './routes/actionPlans.js';

// Import middleware
import { authenticate } from './middleware/auth.js';

// Import utils
import logger from './utils/logger.js';

// Load environment variables
dotenv.config({ path: './env' });

// Create Express app
const app = express();
const PORT = process.env.PORT || 3002;

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CORS configuration - allow access from any origin for IP access
app.use(cors({
  origin: process.env.FRONTEND_URL || ['http://localhost:5173', 'http://localhost:3002', 'http://10.40.41.92:3002', '*'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (increased for development)
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({
  limit: '5mb',
  verify: (req, res, buf, encoding) => {
    // Add raw body to request for debugging
    req.rawBody = buf.toString();
  }
}));

app.use(express.urlencoded({ extended: true }));

// Add middleware to handle JSON parsing errors
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    console.error('Bad JSON:', error.message);
    console.error('Request body:', req.rawBody);
    return res.status(400).json({ error: 'Invalid JSON format in request body' });
  }
  next();
});

// Middleware to disable HTTPS upgrade headers
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=0');
  next();
});

// Serve static files from frontend dist folder with proper headers and MIME types
const frontendDistPath = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendDistPath, {
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (path.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json');
    } else if (path.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (path.endsWith('.gif')) {
      res.setHeader('Content-Type', 'image/gif');
    } else if (path.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml');
    } else if (path.endsWith('.ico')) {
      res.setHeader('Content-Type', 'image/x-icon');
    } else if (path.endsWith('.woff')) {
      res.setHeader('Content-Type', 'font/woff');
    } else if (path.endsWith('.woff2')) {
      res.setHeader('Content-Type', 'font/woff2');
    }

    // Add cache control for all static assets
    if (path.endsWith('.js') || path.endsWith('.css')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// Explicitly serve assets folder (this might be redundant with the above, but let's keep it for clarity)
app.use('/assets', express.static(path.join(frontendDistPath, 'assets')));

// Serve static files
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/statuses', statusRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/supervisor', supervisorRoutes);
app.use('/api/action-plans', actionPlanRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Catch-all handler to serve index.html for client-side routing
// IMPORTANT: This must come AFTER all other routes and static file serving
app.get('*', (req, res, next) => {
  // Don't serve index.html for API routes or static assets
  if (req.path.startsWith('/api/') ||
    req.path.startsWith('/uploads/') ||
    req.path.startsWith('/public/') ||
    req.path.startsWith('/assets/')) {
    // Let the static middleware or other routes handle these
    return next();
  }

  // For paths that look like file requests (contain a dot), let express handle 404s
  // This prevents serving index.html for JS/CSS files that don't exist
  if (req.path.includes('.')) {
    return next();
  }

  // For all other routes, serve index.html for client-side routing
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler - this should come after all other routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running on port ${PORT}`);
  console.log(`Server running on port ${PORT}`);
  console.log(`Access the application at: http://localhost:${PORT}`);
  console.log(`Or from another device using your IP address: http://10.40.41.92:${PORT}`);
});

export default app;