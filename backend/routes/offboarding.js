const express = require('express');
const router = express.Router();
const offboardingService = require('../services/offboardingService');
const { requireAuth, getTenantParams } = require('../middleware/tenantContext');

// Note: requireAuth middleware now comes from tenantContext
// It provides both authentication check and tenant context extraction

// GET /api/offboarding/scheduled
router.get('/scheduled', requireAuth, async (req, res) => {
  try {
    const { tenantId, sessionId } = getTenantParams(req);
    const items = await offboardingService.list(tenantId, sessionId);
    res.json(items);
  } catch (err) {
    console.error('Error fetching scheduled offboardings:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/offboarding/scheduled
router.post('/scheduled', requireAuth, async (req, res) => {
  try {
    const { tenantId, sessionId } = getTenantParams(req);
    const created = await offboardingService.create(req.body, tenantId, sessionId);
    res.status(201).json(created);
  } catch (err) {
    console.error('Error creating scheduled offboarding:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/offboarding/scheduled/:id
router.put('/scheduled/:id', requireAuth, async (req, res) => {
  try {
    const { tenantId, sessionId } = getTenantParams(req);
    const updated = await offboardingService.update(req.params.id, req.body, tenantId, sessionId);
    if (!updated) return res.status(404).json({ error: 'Not found or access denied' });
    res.json(updated);
  } catch (err) {
    console.error('Error updating scheduled offboarding:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/offboarding/scheduled/:id
router.delete('/scheduled/:id', requireAuth, async (req, res) => {
  try {
    const { tenantId, sessionId } = getTenantParams(req);
    const ok = await offboardingService.remove(req.params.id, tenantId, sessionId);
    if (!ok) return res.status(404).json({ error: 'Not found or access denied' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting scheduled offboarding:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/offboarding/scheduled/:id/execute
router.post('/scheduled/:id/execute', requireAuth, async (req, res) => {
  try {
    const { tenantId, sessionId } = getTenantParams(req);
    const executed = await offboardingService.execute(req.params.id, tenantId, sessionId);
    if (!executed) return res.status(404).json({ error: 'Not found or access denied' });
    // In a real implementation this would enqueue a workflow
    res.json(executed);
  } catch (err) {
    console.error('Error executing scheduled offboarding:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
