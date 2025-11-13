const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'scheduledOffboardings.json');

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify([]), 'utf8');
}

function readAll() {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function writeAll(items) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2), 'utf8');
}

function list() {
  return readAll();
}

function get(id) {
  return readAll().find(i => i.id === id) || null;
}

function create(schedule) {
  const items = readAll();
  const id = (Date.now() + Math.floor(Math.random() * 1000)).toString();
  const now = new Date().toISOString();
  const newItem = Object.assign({ id, createdAt: now, status: 'scheduled' }, schedule);
  items.push(newItem);
  writeAll(items);
  return newItem;
}

function update(id, updates) {
  const items = readAll();
  const idx = items.findIndex(i => i.id === id);
  if (idx === -1) return null;
  items[idx] = Object.assign({}, items[idx], updates);
  writeAll(items);
  return items[idx];
}

function remove(id) {
  let items = readAll();
  const before = items.length;
  items = items.filter(i => i.id !== id);
  writeAll(items);
  return items.length < before;
}

function execute(id) {
  const item = get(id);
  if (!item) return null;
  // Mark as completed for now; real execution would trigger offboarding workflow
  item.status = 'completed';
  item.executedAt = new Date().toISOString();
  update(id, item);
  return item;
}

module.exports = {
  list,
  get,
  create,
  update,
  remove,
  execute
};
