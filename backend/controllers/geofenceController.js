const geofenceService = require('../services/geofenceService');
const { isInsideCampus, haversineDistanceMeters } = require('../utils/geo');

// Get current geofence (cached)
exports.getGeofence = async (req, res) => {
  try {
    const gf = geofenceService.getGeofence();
    return res.json({ success: true, geofence: gf });
  } catch (e) {
    console.error('Get geofence error:', e);
    return res.status(500).json({ success: false, msg: 'Error fetching geofence' });
  }
};

// Admin update geofence
exports.updateGeofence = async (req, res) => {
  try {
    // Only admins should be allowed here; middleware will enforce
    const { center, radiusMeters, note } = req.body;
    if (!center || typeof center.lat !== 'number' || typeof center.lng !== 'number') {
      return res.status(400).json({ success: false, msg: 'Invalid center coordinates' });
    }
    if (typeof radiusMeters !== 'number' || radiusMeters <= 0) {
      return res.status(400).json({ success: false, msg: 'Invalid radiusMeters' });
    }

    // Check if there's an existing geofence to update
    const currentGeofence = geofenceService.getGeofence();
    let doc;

    if (currentGeofence.id) {
      // Update existing geofence
      doc = await geofenceService.updateExistingGeofence(currentGeofence.id, {
        center,
        radiusMeters,
        updatedBy: req.user._id,
        note
      });
    } else {
      // Create new geofence
      doc = await geofenceService.updateGeofence({
        center,
        radiusMeters,
        updatedBy: req.user._id,
        note
      });
    }

    return res.json({ success: true, message: 'Geofence updated', geofence: doc });
  } catch (e) {
    console.error('Update geofence error:', e);
    return res.status(500).json({ success: false, msg: e.message || 'Error updating geofence' });
  }
};

// Add function to test geofence with specific coordinates
exports.testGeofence = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ success: false, msg: 'Invalid coordinates' });
    }

    const gf = geofenceService.getGeofence();

    // Check if geofence is valid
    if (!gf || !gf.center) {
      return res.status(400).json({ success: false, msg: 'Geofence not configured properly' });
    }

    // Pass the geofence object directly to avoid circular dependency lookups
    const inside = isInsideCampus({ lat, lng }, gf);
    const distance = haversineDistanceMeters(gf.center, { lat, lng });

    return res.json({
      success: true,
      inside,
      coordinates: { lat, lng },
      geofence: gf,
      distance
    });
  } catch (e) {
    console.error('Test geofence error:', e);
    return res.status(500).json({ success: false, msg: 'Error testing geofence: ' + e.message });
  }
};