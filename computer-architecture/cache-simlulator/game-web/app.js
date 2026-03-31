import { CacheSimulator, REPLACEMENT } from './sim-core.js';

const elements = {
  blockSize: document.querySelector('#blockSize'),
  l1Size: document.querySelector('#l1Size'),
  l1Assoc: document.querySelector('#l1Assoc'),
  l2Size: document.querySelector('#l2Size'),
  l2Assoc: document.querySelector('#l2Assoc'),
  replacement: document.querySelector('#replacement'),
  inclusion: document.querySelector('#inclusion'),
  traceInput: document.querySelector('#traceInput'),
  loadStarter: document.querySelector('#loadStarter'),
  resetGame: document.querySelector('#resetGame'),
  stepBtn: document.querySelector('#stepBtn'),
  runBtn: document.querySelector('#runBtn'),
  l1Table: document.querySelector('#l1Table'),
  l2Table: document.querySelector('#l2Table'),
  scoreboard: document.querySelector('#scoreboard'),
  eventLog: document.querySelector('#eventLog'),
  turnInfo: document.querySelector('#turnInfo')
};

let simulator = null;
let trace = [];
let pointer = 0;

function buildConfig() {
  return {
    blockSize: Number(elements.blockSize.value),
    l1Size: Number(elements.l1Size.value),
    l1Assoc: Number(elements.l1Assoc.value),
    l2Size: Number(elements.l2Size.value),
    l2Assoc: Number(elements.l2Assoc.value),
    replacement: Number(elements.replacement.value),
    inclusion: Number(elements.inclusion.value)
  };
}

function parseTrace(raw) {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [access, address] = line.split(/\s+/);
      if (!(access === 'r' || access === 'w')) {
        throw new Error(`Invalid access mode in line: ${line}`);
      }
      const normalized = address.startsWith('0x') ? address : `0x${address}`;
      if (Number.isNaN(Number.parseInt(normalized, 16))) {
        throw new Error(`Invalid address in line: ${line}`);
      }
      return { access, address: normalized };
    });
}

function renderCache(cache, root) {
  if (cache.size === 0) {
    root.innerHTML = '<p>Disabled for this configuration.</p>';
    return;
  }

  const rows = [];
  for (let set = 0; set < cache.lines.length; set += 1) {
    for (let way = 0; way < cache.lines[set].length; way += 1) {
      const line = cache.lines[set][way];
      rows.push(`
        <tr>
          <td>${set}</td>
          <td>${way}</td>
          <td>${line.valid ? 1 : 0}</td>
          <td class="${line.dirty ? 'dirty' : ''}">${line.dirty ? 1 : 0}</td>
          <td>${line.valid ? `0x${line.tag.toString(16)}` : '-'}</td>
          <td>${line.valid ? `0x${line.addr.toString(16).padStart(8, '0')}` : '-'}</td>
          <td>${line.valid ? line.stamp : '-'}</td>
        </tr>
      `);
    }
  }

  root.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Set</th>
          <th>Way</th>
          <th>V</th>
          <th>D</th>
          <th>Tag</th>
          <th>Address</th>
          <th>Stamp</th>
        </tr>
      </thead>
      <tbody>${rows.join('')}</tbody>
    </table>
  `;
}

function renderStats(stats) {
  elements.scoreboard.innerHTML = `
    <table>
      <tbody>
        <tr><td>a. L1 reads</td><td>${stats.l1Reads}</td></tr>
        <tr><td>b. L1 read misses</td><td>${stats.l1ReadMisses}</td></tr>
        <tr><td>c. L1 writes</td><td>${stats.l1Writes}</td></tr>
        <tr><td>d. L1 write misses</td><td>${stats.l1WriteMisses}</td></tr>
        <tr><td>e. L1 miss rate</td><td>${stats.l1MissRate.toFixed(6)}</td></tr>
        <tr><td>f. L1 writebacks</td><td>${stats.l1Writebacks}</td></tr>
        <tr><td>g. L2 reads</td><td>${stats.l2Reads}</td></tr>
        <tr><td>h. L2 read misses</td><td>${stats.l2ReadMisses}</td></tr>
        <tr><td>i. L2 writes</td><td>${stats.l2Writes}</td></tr>
        <tr><td>j. L2 write misses</td><td>${stats.l2WriteMisses}</td></tr>
        <tr><td>k. L2 miss rate</td><td>${stats.l2MissRate.toFixed(6)}</td></tr>
        <tr><td>l. L2 writebacks</td><td>${stats.l2Writebacks}</td></tr>
        <tr><td>m. Total memory traffic</td><td>${stats.memoryTraffic}</td></tr>
      </tbody>
    </table>
  `;
}

function addLogLine(text) {
  const li = document.createElement('li');
  li.textContent = text;
  elements.eventLog.appendChild(li);
  elements.eventLog.scrollTop = elements.eventLog.scrollHeight;
}

function renderState() {
  const state = simulator.snapshot();
  renderCache(state.l1, elements.l1Table);
  renderCache(state.l2, elements.l2Table);
  renderStats(state.stats);
}

function resetSimulation() {
  trace = parseTrace(elements.traceInput.value);
  simulator = new CacheSimulator(buildConfig());
  pointer = 0;
  elements.eventLog.innerHTML = '';
  elements.turnInfo.textContent = `Ready: ${trace.length} request(s) loaded.`;
  renderState();
}

function eventSummary(event) {
  const l1Badge = event.l1.status === 'hit' ? 'L1 HIT' : 'L1 MISS';
  let l2Part = '';
  if (event.l2?.status === 'hit') l2Part = ', L2 HIT';
  else if (event.l2?.status === 'miss') l2Part = ', L2 MISS';
  return `#${event.traceIndex + 1}: ${event.access.toUpperCase()} ${event.addressHex} => ${l1Badge}${l2Part}`;
}

function runStep() {
  if (!simulator) resetSimulation();
  if (pointer >= trace.length) {
    elements.turnInfo.textContent = 'Trace complete. Reset to replay.';
    return;
  }

  const event = simulator.step(trace[pointer], pointer);
  pointer += 1;

  const l1Class = event.l1.status === 'hit' ? 'badge-hit' : 'badge-miss';
  elements.turnInfo.innerHTML = `
    <strong>Turn ${pointer}/${trace.length}</strong> —
    <span class="${l1Class}">${event.l1.status.toUpperCase()}</span>
    on ${event.addressHex}
  `;

  addLogLine(eventSummary(event));
  event.notes.forEach((note) => addLogLine(`  • ${note}`));
  renderState();
}

function runAll() {
  while (pointer < trace.length) {
    runStep();
  }
}

async function loadStarterTrace() {
  const response = await fetch('./data/starter-trace.txt');
  const text = await response.text();
  elements.traceInput.value = text.trim();
  resetSimulation();
}

function wireEvents() {
  elements.loadStarter.addEventListener('click', () => {
    loadStarterTrace().catch((err) => {
      elements.turnInfo.textContent = `Could not load starter trace: ${err.message}`;
    });
  });
  elements.resetGame.addEventListener('click', () => {
    try {
      resetSimulation();
    } catch (err) {
      elements.turnInfo.textContent = err.message;
    }
  });
  elements.stepBtn.addEventListener('click', () => {
    try {
      runStep();
    } catch (err) {
      elements.turnInfo.textContent = err.message;
    }
  });
  elements.runBtn.addEventListener('click', () => {
    try {
      runAll();
    } catch (err) {
      elements.turnInfo.textContent = err.message;
    }
  });
}

function setDefaults() {
  elements.replacement.value = String(REPLACEMENT.LRU);
}

setDefaults();
wireEvents();
loadStarterTrace();
