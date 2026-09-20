const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { isInsideCampus } = require('../utils/geo');
const geofenceService = require('../services/geofenceService');
const NotificationService = require('../services/notificationService');

function startOfDayUTC(date = new Date()) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// Initialize notification service
let notificationService;

exports.checkIn = async (req, res) => {
  const { lat, lng, accuracy } = req.body || {};
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Location coordinates required',
        code: 'LOCATION_REQUIRED'
      }
    });
  }

  try {
    // Convert string coordinates to numbers if needed
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid location coordinates',
          code: 'INVALID_LOCATION'
        }
      });
    }

    const geofence = geofenceService.getGeofence();
    if (!isInsideCampus({ lat: latitude, lng: longitude }, geofence)) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'You are not inside the campus boundary',
          code: 'OUTSIDE_CAMPUS'
        }
      });
    }
    // Initialize notification service if not already initialized
    if (!notificationService) {
      const io = req.app.get('io');
      notificationService = new NotificationService(io);
    }

    const date = startOfDayUTC();
    const now = new Date();

    // Get user information (no populate needed, class field doesn't exist in schema)
    const user = await User.findById(req.user._id);
    const className = user.department || 'Unknown Department';

    const update = {
      $setOnInsert: { user: req.user._id, date },
      $set: {
        status: 'present',
        checkInAt: now,
        lastUpdated: now
      },
      $push: {
        events: {
          type: 'enter',
          location: { lat, lng, accuracy },
          timestamp: now
        }
      }
    };

    const record = await Attendance.findOneAndUpdate(
      { user: req.user._id, date },
      update,
      { upsert: true, new: true }
    );

    // Send real-time notification
    await notificationService.sendAttendanceUpdate(
      req.user._id,
      record._id.toString(),
      'present',
      'Daily Attendance'
    );

    // Emit real-time update to faculty dashboard
    const io = req.app.get('io');
    io.to('faculty').emit('attendance-update', {
      userId: req.user._id,
      userName: user.name || 'Unknown User',
      className,
      status: 'present',
      timestamp: now
    });

    res.status(200).json({
      success: true,
      data: record,
      message: 'Check-in successful'
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Error during check-in',
        code: 'CHECK_IN_ERROR'
      }
    });
  }
};

exports.checkOut = async (req, res) => {
  const { lat, lng, accuracy } = req.body || {};
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Location coordinates required',
        code: 'LOCATION_REQUIRED'
      }
    });
  }

  // Mark absent when leaving campus if during institution hours
  const geofence = geofenceService.getGeofence();
  const inside = isInsideCampus({ lat, lng }, geofence);

  try {
    const date = startOfDayUTC();
    const record = await Attendance.findOne({ user: req.user._id, date });
    const now = new Date();

    if (!record) {
      // If no record yet, create one and mark absent on checkout
      const created = await Attendance.create({
        user: req.user._id,
        date,
        status: inside ? 'present' : 'absent',
        checkOutAt: now,
        events: [{ type: 'exit', location: { lat, lng, accuracy } }]
      });

      return res.status(200).json({
        success: true,
        data: created,
        status: 'checked-out',
        message: 'Check-out successful'
      });
    }

    record.checkOutAt = now;
    record.events.push({ type: 'exit', location: { lat, lng, accuracy } });
    // If user is outside, enforce absent as per requirement
    if (!inside) record.status = 'absent';
    await record.save();

    // Emit notification to faculty room when a student exits during hours or is outside
    try {
      const io = req.app.get('io');
      if (io) {
        io.to('faculty').emit('student_exit', {
          userId: String(req.user._id),
          name: req.user.name,
          time: now.toISOString(),
          outsideCampus: !inside
        });
      }
    } catch (e) {
      // no-op for notification errors
    }

    res.status(200).json({
      success: true,
      data: record,
      status: 'checked-out',
      message: 'Check-out successful'
    });
  } catch (e) {
    console.error('Check-out error:', e);
    res.status(500).json({
      success: false,
      error: {
        message: 'Error during check-out',
        code: 'CHECK_OUT_ERROR'
      }
    });
  }
};

// Proxy attendance functions
exports.proxyCheckIn = async (req, res) => {
  const { targetUserId, lat, lng, accuracy, reason } = req.body || {};

  if (!targetUserId) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Target user ID is required for proxy attendance',
        code: 'TARGET_USER_REQUIRED'
      }
    });
  }

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Location coordinates required',
        code: 'LOCATION_REQUIRED'
      }
    });
  }

  try {
    // Check if the requesting user is authorized to mark proxy attendance
    const requestingUser = await User.findById(req.user._id);
    if (!requestingUser) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Requesting user not found',
          code: 'USER_NOT_FOUND'
        }
      });
    }

    // Only faculty, HOD, and Dean can mark proxy attendance
    if (!['faculty', 'hod', 'dean'].includes(requestingUser.role)) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Only authorized personnel can mark proxy attendance',
          code: 'UNAUTHORIZED_PROXY'
        }
      });
    }

    // Check if the target user exists
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Target user not found',
          code: 'TARGET_USER_NOT_FOUND'
        }
      });
    }

    // Check if the target user has enabled proxy attendance
    if (!targetUser.securitySettings || !targetUser.securitySettings.allowProxyAttendance) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Target user has not enabled proxy attendance',
          code: 'PROXY_NOT_ALLOWED'
        }
      });
    }

    // Convert string coordinates to numbers if needed
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid location coordinates',
          code: 'INVALID_LOCATION'
        }
      });
    }

    // Check if the proxy user is inside campus
    const geofence = geofenceService.getGeofence();
    if (!isInsideCampus({ lat: latitude, lng: longitude }, geofence)) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Proxy user is not inside the campus boundary',
          code: 'PROXY_OUTSIDE_CAMPUS'
        }
      });
    }

    // Initialize notification service if not already initialized
    if (!notificationService) {
      const io = req.app.get('io');
      notificationService = new NotificationService(io);
    }

    const date = startOfDayUTC();
    const now = new Date();

    const className = targetUser.department || 'Unknown Department';

    const update = {
      $setOnInsert: { user: targetUserId, date },
      $set: {
        status: 'present',
        checkInAt: now,
        lastUpdated: now,
        'proxy.isProxy': true,
        'proxy.proxyUser': req.user._id,
        'proxy.reason': reason,
        'proxy.approved': true // Auto-approve for authorized personnel
      },
      $push: {
        events: {
          type: 'enter',
          location: { lat, lng, accuracy },
          timestamp: now
        }
      }
    };

    const record = await Attendance.findOneAndUpdate(
      { user: targetUserId, date },
      update,
      { upsert: true, new: true }
    );

    // Send real-time notification
    await notificationService.sendAttendanceUpdate(
      targetUserId,
      record._id.toString(),
      'present',
      'Daily Attendance (Proxy)'
    );

    // Emit real-time update to faculty dashboard
    const io = req.app.get('io');
    io.to('faculty').emit('attendance-update', {
      userId: targetUserId,
      userName: targetUser.name || 'Unknown User',
      className,
      status: 'present',
      timestamp: now,
      proxy: true,
      proxyUserName: requestingUser.name
    });

    res.status(200).json({
      success: true,
      data: record,
      message: 'Proxy check-in successful'
    });
  } catch (error) {
    console.error('Proxy check-in error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Error during proxy check-in',
        code: 'PROXY_CHECK_IN_ERROR'
      }
    });
  }
};

exports.getProxyAttendanceHistory = async (req, res) => {
  try {
    // Only faculty, HOD, and Dean can view proxy attendance history
    const user = await User.findById(req.user._id);
    if (!['faculty', 'hod', 'dean'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Only authorized personnel can view proxy attendance history',
          code: 'UNAUTHORIZED_VIEW_PROXY'
        }
      });
    }

    const records = await Attendance.find({ 'proxy.isProxy': true })
      .populate('user', 'name email studentId department')
      .populate('proxy.proxyUser', 'name email role')
      .sort({ createdAt: -1 })
      .limit(100); // Limit to last 100 proxy records

    res.status(200).json({
      success: true,
      data: records
    });
  } catch (error) {
    console.error('Error fetching proxy attendance history:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Error fetching proxy attendance history',
        code: 'PROXY_HISTORY_ERROR'
      }
    });
  }
};

exports.toggleProxyAttendancePermission = async (req, res) => {
  try {
    const { allowProxyAttendance } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { 'securitySettings.allowProxyAttendance': allowProxyAttendance },
      { new: true }
    ).select('securitySettings.allowProxyAttendance');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        }
      });
    }

    res.status(200).json({
      success: true,
      data: user.securitySettings,
      message: `Proxy attendance ${allowProxyAttendance ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error) {
    console.error('Error toggling proxy attendance permission:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Error updating proxy attendance permission',
        code: 'PROXY_PERMISSION_ERROR'
      }
    });
  }
};

exports.getAttendance = async (req, res) => {
  try {
    const records = await Attendance.find({ user: req.user._id }).sort({ date: -1 });
    res.json(records);
  } catch (e) {
    res.status(500).json({ msg: 'Error fetching attendance' });
  }
};

exports.getSummary = async (req, res) => {
  try {
    const agg = await Attendance.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    const summary = { present: 0, absent: 0 };
    agg.forEach(row => { summary[row._id] = row.count; });
    res.json(summary);
  } catch (e) {
    res.status(500).json({ msg: 'Error fetching summary' });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const { period = '30' } = req.query; // days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Daily attendance trends
    const dailyTrends = await Attendance.aggregate([
      {
        $match: {
          user: req.user._id,
          date: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            status: "$status"
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.date": 1 } }
    ]);

    // Weekly summary
    const weeklySummary = await Attendance.aggregate([
      {
        $match: {
          user: req.user._id,
          date: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            week: { $week: "$date" },
            year: { $year: "$date" }
          },
          present: {
            $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] }
          },
          absent: {
            $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] }
          }
        }
      },
      { $sort: { "_id.year": 1, "_id.week": 1 } }
    ]);

    // Monthly summary
    const monthlySummary = await Attendance.aggregate([
      {
        $match: {
          user: req.user._id,
          date: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            month: { $month: "$date" },
            year: { $year: "$date" }
          },
          present: {
            $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] }
          },
          absent: {
            $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] }
          }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    // Overall statistics
    const overallStats = await Attendance.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: null,
          totalDays: { $sum: 1 },
          presentDays: {
            $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] }
          },
          absentDays: {
            $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] }
          },
          avgCheckInTime: { $avg: "$checkInAt" },
          avgCheckOutTime: { $avg: "$checkOutAt" }
        }
      }
    ]);

    res.json({
      dailyTrends,
      weeklySummary,
      monthlySummary,
      overallStats: overallStats[0] || { totalDays: 0, presentDays: 0, absentDays: 0, avgCheckInTime: null, avgCheckOutTime: null }
    });
  } catch (e) {
    res.status(500).json({ msg: 'Error fetching analytics' });
  }
};

// Faculty-specific functions

// Get all students for faculty
exports.getStudents = async (req, res) => {
  try {
    const students = await User.find({ role: 'student' })
      .select('name email studentId department year phone isActive')
      .sort({ studentId: 1 });

    res.status(200).json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ msg: 'Server error fetching students' });
  }
};

// Get subjects for faculty
exports.getSubjects = async (req, res) => {
  try {
    // Mock subjects data - replace with actual subjects from database
    const subjects = [
      { id: 'CS101', name: 'Computer Science Fundamentals', department: 'Computer Science' },
      { id: 'CS102', name: 'Data Structures', department: 'Computer Science' },
      { id: 'CS103', name: 'Algorithms', department: 'Computer Science' },
      { id: 'MATH101', name: 'Calculus I', department: 'Mathematics' },
      { id: 'MATH102', name: 'Linear Algebra', department: 'Mathematics' },
      { id: 'PHYS101', name: 'Physics I', department: 'Physics' },
      { id: 'CHEM101', name: 'Chemistry I', department: 'Chemistry' }
    ];

    res.status(200).json(subjects);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ msg: 'Server error fetching subjects' });
  }
};

// Get faculty overview of all attendance
exports.getFacultyOverview = async (req, res) => {
  try {
    const today = startOfDayUTC();

    const attendance = await Attendance.find({ date: today })
      .populate('user', 'name studentId department year')
      .sort({ checkInAt: -1 });

    res.status(200).json(attendance);
  } catch (error) {
    console.error('Error fetching faculty overview:', error);
    res.status(500).json({ msg: 'Server error fetching faculty overview' });
  }
};

// Get attendance for a specific date
exports.getAttendanceForDate = async (req, res) => {
  try {
    const { date } = req.params;
    const targetDate = startOfDayUTC(new Date(date));

    const attendance = await Attendance.find({ date: targetDate })
      .populate('user', 'name studentId department year')
      .sort({ checkInAt: -1 });

    res.status(200).json(attendance);
  } catch (error) {
    console.error('Error fetching attendance for date:', error);
    res.status(500).json({ msg: 'Server error fetching attendance for date' });
  }
};

// Get attendance analytics for faculty
exports.getFacultyAnalytics = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Overall attendance statistics
    const overallStats = await Attendance.aggregate([
      { $match: { date: { $gte: startDate } } },
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          presentCount: {
            $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] }
          },
          absentCount: {
            $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] }
          }
        }
      }
    ]);

    // Daily attendance trends
    const dailyTrends = await Attendance.aggregate([
      { $match: { date: { $gte: startDate } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }
          },
          present: {
            $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] }
          },
          absent: {
            $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] }
          }
        }
      },
      { $sort: { "_id.date": 1 } }
    ]);

    // Department-wise statistics
    const departmentStats = await Attendance.aggregate([
      { $match: { date: { $gte: startDate } } },
      { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'userInfo' } },
      { $unwind: '$userInfo' },
      {
        $group: {
          _id: '$userInfo.department',
          present: {
            $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] }
          },
          absent: {
            $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] }
          }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    res.status(200).json({
      overallStats: overallStats[0] || { totalRecords: 0, presentCount: 0, absentCount: 0 },
      dailyTrends,
      departmentStats
    });
  } catch (error) {
    console.error('Error fetching faculty analytics:', error);
    res.status(500).json({ msg: 'Server error fetching faculty analytics' });
  }
};
