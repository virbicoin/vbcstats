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
      node.stats.pending = data.pending || data;
      if (callback) callback(null, node);
    } else {
      if (callback) callback(new Error('Node not found'));
    }
  }

  updateStats(nodeId, data, callback) {
    const node = this.nodes.get(nodeId);
    if (node) {
      Object.assign(node.stats || {}, data);
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
