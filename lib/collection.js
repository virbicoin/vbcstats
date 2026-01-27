// Collection class for managing nodes
class Collection {
  constructor(externalPrimus) {
    this.nodes = new Map();
    this.externalPrimus = externalPrimus;
  }

  add(node, callback) {
    this.nodes.set(node.id, node);
    if (callback) callback(null, node);
  }

  update(nodeId, data, callback) {
    const node = this.nodes.get(nodeId);
    if (node) {
      Object.assign(node, data);
      if (callback) callback(null, node);
    } else {
      if (callback) callback(new Error('Node not found'));
    }
  }

  all() {
    return Array.from(this.nodes.values());
  }

  getNode(query) {
    return this.nodes.get(query.id);
  }

  inactive(nodeId, callback) {
    const node = this.nodes.get(nodeId);
    if (node && node.stats) {
      node.stats.active = false;
      if (callback) callback(null, node);
    } else {
      if (callback) callback(new Error('Node not found'));
    }
  }

  addBlock(nodeId, blockData, callback) {
    const node = this.nodes.get(nodeId);
    if (node && node.stats) {
      node.stats.block = blockData;
      if (callback) callback(null, node);
    } else {
      if (callback) callback(new Error('Node not found'));
    }
  }

  updatePending(nodeId, data, callback) {
    const node = this.nodes.get(nodeId);
    if (node && node.stats) {
      // Handle both formats: { pending: N } or just N
      const pendingValue =
        typeof data === 'number' ? data : typeof data.pending === 'number' ? data.pending : 0;
      node.stats.pending = pendingValue;
      node.stats.pendingUpdatedAt = Date.now(); // Track when pending was last updated
      if (callback) callback(null, node);
    } else {
      if (callback) callback(new Error('Node not found'));
    }
  }

  updateStats(nodeId, data, callback) {
    const node = this.nodes.get(nodeId);
    if (node) {
      // Initialize stats if not exists
      if (!node.stats) {
        node.stats = {};
      }
      // Preserve existing latency and pending if new data doesn't have valid values
      const existingLatency = node.stats.latency;
      const existingPending = node.stats.pending;
      const existingPendingUpdatedAt = node.stats.pendingUpdatedAt;
      Object.assign(node.stats, data);
      // Restore latency if it was overwritten with 0 or undefined
      if ((!data.latency || data.latency === 0) && existingLatency > 0) {
        node.stats.latency = existingLatency;
      }
      // Handle pending: reset to 0 if not updated for 30 seconds
      if (data.pending === undefined) {
        if (existingPendingUpdatedAt && Date.now() - existingPendingUpdatedAt > 30000) {
          // Pending hasn't been updated in 30 seconds, reset to 0
          node.stats.pending = 0;
        } else if (existingPending !== undefined) {
          // Preserve existing pending if recent
          node.stats.pending = existingPending;
          node.stats.pendingUpdatedAt = existingPendingUpdatedAt;
        }
      } else {
        // New pending data received, update timestamp
        node.stats.pendingUpdatedAt = Date.now();
      }
      if (callback) callback(null, node);
    } else {
      if (callback) callback(new Error('Node not found'));
    }
  }

  addHistory(sparkId, data, callback) {
    // Mock implementation
    if (callback) callback(null, data);
  }

  updateLatency(nodeId, data, callback) {
    const node = this.nodes.get(nodeId);
    if (node && node.stats) {
      node.stats.latency = data.latency || data;
      if (callback) callback(null, node);
    } else {
      if (callback) callback(new Error('Node not found'));
    }
  }

  setChartsCallback(callback) {
    this.chartsCallback = callback;
    // Mock implementation
    setTimeout(() => callback(null, {}), 1000);
  }

  getCharts() {
    if (this.chartsCallback) {
      this.chartsCallback(null, {});
    }
  }
}

module.exports = Collection;
