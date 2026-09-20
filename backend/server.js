const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const attendanceRoutes = require('./routes/attendance');
const faceRoutes = require('./routes/face');
const qrRoutes = require('./routes/qr');
const marksRoutes = require('./routes/marks');
const adminFaceRoutes = require('./routes/adminFace');
const adminGeofenceRoutes = require('./routes/adminGeofence');
const timetableRoutes = require('./routes/timetable');
const testRoutes = require('./routes/test');

// Import middleware
const { protect } = require('./middleware/auth');

// Import services
const geofenceService = require('./services/geofenceService');

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(cors({
  origin: [process.env.FRONTEND_URL || 'http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004', 'http://localhost:3005'],
  credentials: true
}));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smartattendance', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    // Load geofence data from database after successful connection
    try {
      await geofenceService.loadFromDb();
      console.log('✅ Geofence data loaded');
    } catch (error) {
      console.error('❌ Error loading geofence data:', error.message);
    }
  })
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/face', faceRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/marks', marksRoutes);
app.use('/api/admin/face', adminFaceRoutes);
app.use('/api/admin/geofence', adminGeofenceRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/test', testRoutes);

// Serve static files in production - REMOVED for separate deployment
// The frontend is deployed as a separate service on Render
app.get('/', (req, res) => {
  res.send('Solvra Backend API is running');
});

const PORT = process.env.PORT || 5005;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});