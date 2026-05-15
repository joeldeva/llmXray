const crypto = require('crypto');
const { readJson, writeJson } = require('../storage/jsonStore');
const { hasPostgres, query } = require('../storage/postgres');

const QUEUE_FILE = 'reviewQueue.json';

async function loadQueue() {
  if (hasPostgres()) {
    const result = await query(
      `SELECT id, timestamp, status, reviewer_note, reviewed_at, event
         FROM review_queue
        ORDER BY timestamp DESC
        LIMIT 1000`
    );
    return result.rows.map(row => ({
      id: row.id,
      timestamp: row.timestamp.toISOString(),
      status: row.status,
      reviewerNote: row.reviewer_note,
      reviewedAt: row.reviewed_at ? row.reviewed_at.toISOString() : null,
      ...row.event,
    }));
  }

  return readJson(QUEUE_FILE, []);
}

function saveQueue(queue) {
  writeJson(QUEUE_FILE, queue);
}

async function addToQueue(event) {
  const id = 'rev_' + crypto.randomBytes(6).toString('hex');
  const timestamp = new Date().toISOString();
  const entry = {
    id,
    timestamp,
    status: 'PENDING',
    reviewerNote: null,
    reviewedAt: null,
    ...event,
  };

  if (hasPostgres()) {
    await query(
      `INSERT INTO review_queue (id, timestamp, status, reviewer_note, reviewed_at, event)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [id, timestamp, entry.status, entry.reviewerNote, entry.reviewedAt, JSON.stringify(event)]
    );
    return id;
  }

  const queue = readJson(QUEUE_FILE, []);
  queue.unshift(entry);
  saveQueue(queue);
  return id;
}

async function updateQueueItem(id, status, reviewerNote) {
  if (hasPostgres()) {
    const result = await query(
      `UPDATE review_queue
          SET status = $2, reviewer_note = $3, reviewed_at = NOW()
        WHERE id = $1
        RETURNING id, timestamp, status, reviewer_note, reviewed_at, event`,
      [id, status, reviewerNote || null]
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      timestamp: row.timestamp.toISOString(),
      status: row.status,
      reviewerNote: row.reviewer_note,
      reviewedAt: row.reviewed_at ? row.reviewed_at.toISOString() : null,
      ...row.event,
    };
  }

  const queue = readJson(QUEUE_FILE, []);
  const idx = queue.findIndex(item => item.id === id);
  if (idx === -1) return null;
  queue[idx].status = status;
  queue[idx].reviewerNote = reviewerNote || null;
  queue[idx].reviewedAt = new Date().toISOString();
  saveQueue(queue);
  return queue[idx];
}

module.exports = { loadQueue, addToQueue, updateQueueItem };
