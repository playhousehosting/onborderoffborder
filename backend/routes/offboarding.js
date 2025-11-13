const express = require('express');
const router = express.Router();
const offboardingService = require('../services/offboardingService');

// Require authenticated session
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.authenticated) return res.status(401).json({ error: 'Authentication required' });
  next();
};

// GET /api/offboarding/scheduled
router.get('/scheduled', requireAuth, async (req, res) => {
  try {
    const items = await offboardingService.list();
    res.json(items);
  } catch (err) {
    console.error('Error fetching scheduled offboardings:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/offboarding/scheduled
router.post('/scheduled', requireAuth, async (req, res) => {
  try {
    const created = await offboardingService.create(req.body);
    res.status(201).json(created);
  } catch (err) {
    console.error('Error creating scheduled offboarding:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/offboarding/scheduled/:id
router.put('/scheduled/:id', requireAuth, async (req, res) => {
  try {
    const updated = await offboardingService.update(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (err) {
    console.error('Error updating scheduled offboarding:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/offboarding/scheduled/:id
router.delete('/scheduled/:id', requireAuth, async (req, res) => {
  try {
    const ok = await offboardingService.remove(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting scheduled offboarding:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/offboarding/scheduled/:id/execute
router.post('/scheduled/:id/execute', requireAuth, async (req, res) => {
  try {
    const executed = await offboardingService.execute(req.params.id);
    if (!executed) return res.status(404).json({ error: 'Not found' });
    // In a real implementation this would enqueue a workflow
    res.json(executed);
  } catch (err) {
    console.error('Error executing scheduled offboarding:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
