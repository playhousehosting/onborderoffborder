const express = require('express');
const router = express.Router();
const graphService = require('../services/graphService');

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  if (!req.session.authenticated) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

/**
 * GET /api/graph/me
 * Get current user information
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await graphService.getUser(req.session);
    res.json(user);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

/**
 * GET /api/graph/users
 * List users
 */
router.get('/users', requireAuth, async (req, res) => {
  try {
    const options = {
      top: req.query.top ? parseInt(req.query.top) : undefined,
      filter: req.query.filter,
      select: req.query.select,
      search: req.query.search,
      orderby: req.query.orderby
    };
    
    const users = await graphService.listUsers(req.session, options);
    res.json(users);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

/**
 * GET /api/graph/users/:id
 * Get specific user
 */
router.get('/users/:id', requireAuth, async (req, res) => {
  try {
    const user = await graphService.getUser(req.session, req.params.id);
    res.json(user);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

/**
 * POST /api/graph/users
 * Create user
 */
router.post('/users', requireAuth, async (req, res) => {
  try {
    const user = await graphService.createUser(req.session, req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

/**
 * PATCH /api/graph/users/:id
 * Update user
 */
router.patch('/users/:id', requireAuth, async (req, res) => {
  try {
    await graphService.updateUser(req.session, req.params.id, req.body);
    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

/**
 * DELETE /api/graph/users/:id
 * Delete user
 */
router.delete('/users/:id', requireAuth, async (req, res) => {
  try {
    await graphService.deleteUser(req.session, req.params.id);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

/**
 * GET /api/graph/groups
 * List groups
 */
router.get('/groups', requireAuth, async (req, res) => {
  try {
    const options = {
      top: req.query.top ? parseInt(req.query.top) : undefined,
      filter: req.query.filter,
      select: req.query.select
    };
    
    const groups = await graphService.listGroups(req.session, options);
    res.json(groups);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

/**
 * GET /api/graph/devices
 * List managed devices
 */
router.get('/devices', requireAuth, async (req, res) => {
  try {
    const options = {
      top: req.query.top ? parseInt(req.query.top) : undefined,
      filter: req.query.filter
    };
    
    const devices = await graphService.listManagedDevices(req.session, options);
    res.json(devices);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

/**
 * POST /api/graph/proxy
 * Generic proxy for any Graph API endpoint
 */
router.all('/proxy/*', requireAuth, async (req, res) => {
  try {
    const endpoint = '/' + req.params[0];
    const method = req.method;
    const data = req.body;
    const useBeta = req.query.beta === 'true';
    
    const result = await graphService.makeGraphRequest(req.session, endpoint, method, data, useBeta);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

module.exports = router;
