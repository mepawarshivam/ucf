export const REPLACEMENT = {
  LRU: 0,
  FIFO: 1
};

function parseHexAddress(addressHex) {
  if (typeof addressHex === 'number') return addressHex >>> 0;
  return Number.parseInt(addressHex, 16) >>> 0;
}

function log2Int(value) {
  return Math.log2(value) | 0;
}

function makeLine() {
  return {
    valid: false,
    dirty: false,
    tag: 0,
    addr: 0,
    stamp: 0
  };
}

function makeCache(level, size, assoc, blockSize, replacementPolicy) {
  if (size === 0) {
    return {
      level,
      size,
      assoc,
      blockSize,
      replacementPolicy,
      sets: 0,
      indexBits: 0,
      offsetBits: log2Int(blockSize),
      indexMask: 0,
      offsetMask: (1 << log2Int(blockSize)) - 1,
      lruCounter: [],
      fifoCounter: [],
      lines: []
    };
  }

  const sets = size / (assoc * blockSize);
  const indexBits = log2Int(sets);
  const offsetBits = log2Int(blockSize);
  const indexMask = (1 << indexBits) - 1;
  const offsetMask = (1 << offsetBits) - 1;
  const lines = Array.from({ length: sets }, () => Array.from({ length: assoc }, makeLine));

  return {
    level,
    size,
    assoc,
    blockSize,
    replacementPolicy,
    sets,
    indexBits,
    offsetBits,
    indexMask,
    offsetMask,
    lruCounter: Array.from({ length: sets }, () => 0),
    fifoCounter: Array.from({ length: sets }, () => 0),
    lines
  };
}

function decode(cache, address) {
  const offset = address & cache.offsetMask;
  const index = cache.sets > 0 ? ((address >> cache.offsetBits) & cache.indexMask) : 0;
  const tag = address >> (cache.offsetBits + cache.indexBits);
  return { offset, index, tag };
}

function chooseVictim(cache, setIndex) {
  const setLines = cache.lines[setIndex];
  let minStamp = Number.MAX_SAFE_INTEGER;
  let victimWay = 0;

  for (let way = 0; way < setLines.length; way += 1) {
    if (setLines[way].stamp < minStamp) {
      minStamp = setLines[way].stamp;
      victimWay = way;
    }
  }

  return victimWay;
}

function updateStamp(cache, setIndex, way, state) {
  if (cache.replacementPolicy === REPLACEMENT.FIFO) {
    if (!state.hit) {
      cache.lines[setIndex][way].stamp = cache.fifoCounter[setIndex];
      cache.fifoCounter[setIndex] += 1;
    }
    return;
  }

  cache.lines[setIndex][way].stamp = cache.lruCounter[setIndex];
  cache.lruCounter[setIndex] += 1;
}

export class CacheSimulator {
  constructor(config) {
    this.config = {
      blockSize: config.blockSize,
      l1Size: config.l1Size,
      l1Assoc: config.l1Assoc,
      l2Size: config.l2Size,
      l2Assoc: config.l2Assoc,
      replacement: config.replacement,
      inclusion: config.inclusion
    };

    this.l1 = makeCache(1, config.l1Size, config.l1Assoc, config.blockSize, config.replacement);
    this.l2 = makeCache(2, config.l2Size, config.l2Assoc, config.blockSize, config.replacement);

    this.stats = {
      l1Reads: 0,
      l1ReadMisses: 0,
      l1Writes: 0,
      l1WriteMisses: 0,
      l1Writebacks: 0,
      l2Reads: 0,
      l2ReadMisses: 0,
      l2Writes: 0,
      l2WriteMisses: 0,
      l2Writebacks: 0,
      memoryTraffic: 0
    };
  }

  snapshot() {
    return {
      config: this.config,
      stats: this.getStats(),
      l1: structuredClone(this.l1),
      l2: structuredClone(this.l2)
    };
  }

  getStats() {
    const l1Total = this.stats.l1Reads + this.stats.l1Writes;
    const l2TotalReads = this.stats.l2Reads;
    return {
      ...this.stats,
      l1MissRate: l1Total === 0 ? 0 : (this.stats.l1ReadMisses + this.stats.l1WriteMisses) / l1Total,
      l2MissRate: l2TotalReads === 0 ? 0 : this.stats.l2ReadMisses / l2TotalReads
    };
  }

  processTrace(trace) {
    const events = [];
    for (let i = 0; i < trace.length; i += 1) {
      events.push(this.step(trace[i], i));
    }
    return events;
  }

  step(entry, traceIndex = 0) {
    const accessMode = entry.access;
    const address = parseHexAddress(entry.address);

    if (accessMode === 'w') this.stats.l1Writes += 1;
    else this.stats.l1Reads += 1;

    const event = {
      traceIndex,
      access: accessMode,
      address,
      addressHex: `0x${address.toString(16).padStart(8, '0')}`,
      l1: null,
      l2: null,
      notes: []
    };

    const l1Result = this.#accessCache(this.l1, accessMode, address, {
      countStats: { reads: 'l1Reads', writes: 'l1Writes', readMisses: 'l1ReadMisses', writeMisses: 'l1WriteMisses', writebacks: 'l1Writebacks' },
      onMissRead: () => {
        if (this.l2.size > 0) {
          const l2Result = this.#accessCache(this.l2, 'r', address, {
            countStats: { reads: 'l2Reads', writes: 'l2Writes', readMisses: 'l2ReadMisses', writeMisses: 'l2WriteMisses', writebacks: 'l2Writebacks' },
            onMissRead: () => {
              this.stats.memoryTraffic += 1;
            },
            onWriteback: (victimAddr) => {
              this.#handleL2Writeback(victimAddr);
            }
          });
          event.l2 = l2Result;
        } else {
          this.stats.memoryTraffic += 1;
        }
      },
      onWriteback: (victimAddr) => {
        if (this.l2.size > 0) {
          const wbResult = this.#accessCache(this.l2, 'w', victimAddr, {
            countStats: { reads: 'l2Reads', writes: 'l2Writes', readMisses: 'l2ReadMisses', writeMisses: 'l2WriteMisses', writebacks: 'l2Writebacks' },
            onMissRead: () => {},
            onWriteback: (addr) => {
              this.#handleL2Writeback(addr);
            }
          });
          event.notes.push(`L1 dirty victim written to L2 (${wbResult.status}).`);
        } else {
          this.stats.memoryTraffic += 1;
          event.notes.push('L1 dirty victim written to memory.');
        }
      }
    });

    event.l1 = l1Result;

    if (event.l2 === null && this.l2.size > 0 && l1Result.status === 'hit') {
      event.l2 = { status: 'not-accessed' };
    }

    if (event.l1.status === 'hit') event.notes.push('L1 hit.');
    else event.notes.push('L1 miss.');

    return event;
  }

  #handleL2Writeback(victimAddr) {
    this.stats.memoryTraffic += 1;
    if (this.config.inclusion) {
      this.#invalidateInL1(victimAddr);
    }
  }

  #invalidateInL1(address) {
    if (this.l1.size === 0) return;
    const fields = decode(this.l1, address);
    const setLines = this.l1.lines[fields.index];
    for (let way = 0; way < setLines.length; way += 1) {
      const line = setLines[way];
      if (line.valid && line.tag === fields.tag) {
        if (line.dirty) {
          this.stats.memoryTraffic += 1;
        }
        line.valid = false;
        line.dirty = false;
        return;
      }
    }
  }

  #accessCache(cache, accessMode, address, hooks) {
    if (cache.size === 0) {
      return { status: 'no-cache', index: 0, tag: 0, way: -1, evicted: null };
    }

    if (hooks.countStats && cache.level === 2) {
      if (accessMode === 'w') this.stats[hooks.countStats.writes] += 1;
      else this.stats[hooks.countStats.reads] += 1;
    }

    const fields = decode(cache, address);
    const setLines = cache.lines[fields.index];
    let invalidWay = -1;

    for (let way = 0; way < setLines.length; way += 1) {
      const line = setLines[way];
      if (line.valid && line.tag === fields.tag) {
        if (accessMode === 'w') line.dirty = true;
        updateStamp(cache, fields.index, way, { hit: true });
        return { status: 'hit', index: fields.index, tag: fields.tag, way, evicted: null };
      }
      if (!line.valid && invalidWay === -1) invalidWay = way;
    }

    if (hooks.countStats) {
      if (accessMode === 'w') this.stats[hooks.countStats.writeMisses] += 1;
      else this.stats[hooks.countStats.readMisses] += 1;
    }

    hooks.onMissRead?.();

    let targetWay = invalidWay;
    let evicted = null;

    if (targetWay === -1) {
      targetWay = chooseVictim(cache, fields.index);
      const victim = setLines[targetWay];
      evicted = { ...victim };
      if (victim.dirty) {
        if (hooks.countStats) this.stats[hooks.countStats.writebacks] += 1;
        hooks.onWriteback?.(victim.addr);
      }
    }

    setLines[targetWay] = {
      valid: true,
      dirty: accessMode === 'w',
      tag: fields.tag,
      addr: address,
      stamp: 0
    };
    updateStamp(cache, fields.index, targetWay, { hit: false });

    return { status: 'miss', index: fields.index, tag: fields.tag, way: targetWay, evicted };
  }
}
