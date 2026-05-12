const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const QUEUE_FILE = path.join(__dirname, '../../data/reviewQueue.json');

function loadQueue() {
  if (!fs.existsSync(QUEUE_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function saveQueue(queue) {
  fs.mkdirSync(path.dirname(QUEUE_FILE), { recursive: true });
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
}

function addToQueue(event) {
  const queue = loadQueue();
  const id = 'rev_' + crypto.randomBytes(6).toString('hex');
  const entry = {
    id,
    timestamp: new Date().toISOString(),
    status: 'PENDING',
    reviewerNote: null,
    reviewedAt: null,
    ...event,
  };
  queue.unshift(entry);
  saveQueue(queue);
  return id;
}

function updateQueueItem(id, status, reviewerNote) {
  const queue = loadQueue();
  const idx = queue.findIndex(item => item.id === id);
  if (idx === -1) return null;
  queue[idx].status = status;
  queue[idx].reviewerNote = reviewerNote || null;
  queue[idx].reviewedAt = new Date().toISOString();
  saveQueue(queue);
  return queue[idx];
}

module.exports = { loadQueue, addToQueue, updateQueueItem };
