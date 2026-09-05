#!/usr/bin/env node
/**
 * Live 30fps ASCII "agent face" TUI.
 *
 * No dependencies (blessed/ink not required) — uses raw ANSI escapes so it
 * runs anywhere `node` runs. Renders an ASCII avatar whose expression
 * changes in response to typed commands, plus a live streaming log panel.
 *
 * Run:   node scripts/agent-face-tui.js
 * Try:   !status   -> avatar smiles, shows live metrics
 *        !bug      -> avatar looks shocked, then streams rapid "fixes"
 *        !idle     -> back to neutral/blinking idle face
 *        !help     -> list commands
 *        !quit     -> exit
 */

const FPS = 30;
const FRAME_MS = 1000 / FPS;

const FACES = {
  idle: [
    '   .-------.   ',
    '  /  o   o  \\  ',
    ' |     -     | ',
    '  \\  .___.  /  ',
    '   \'-------\'   ',
  ],
  blink: [
    '   .-------.   ',
    '  /  -   -  \\  ',
    ' |     -     | ',
    '  \\  .___.  /  ',
    '   \'-------\'   ',
  ],
  happy: [
    '   .-------.   ',
    '  /  ^   ^  \\  ',
    ' |     w     | ',
    '  \\ \\_____/ /  ',
    '   \'-------\'   ',
  ],
  shocked: [
    '   .-------.   ',
    '  /  O   O  \\  ',
    ' |     o     | ',
    '  \\   ___   /  ',
    '   \'-------\'   ',
  ],
  thinking: [
    '   .-------.   ',
    '  /  -   o  \\  ',
    ' |     ~     | ',
    '  \\  .___.  /  ',
    '   \'-------\'   ',
  ],
};

const COLORS = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

const state = {
  mood: 'idle',
  moodUntil: 0,
  blinkAt: nextBlinkTime(),
  logs: [],
  streaming: null, // { lines: [...], index, intervalMs }
  metrics: { uptime: 0, tasks: 0, errors: 0 },
  inputBuffer: '',
  frame: 0,
};

function nextBlinkTime() {
  return Date.now() + 2000 + Math.random() * 3000;
}

function pushLog(line, color = COLORS.gray) {
  const ts = new Date().toLocaleTimeString('en-GB', { hour12: false });
  state.logs.push(`${COLORS.gray}[${ts}]${COLORS.reset} ${color}${line}${COLORS.reset}`);
  if (state.logs.length > 200) state.logs.shift();
}

function setMood(mood, holdMs = 1500) {
  state.mood = mood;
  state.moodUntil = Date.now() + holdMs;
}

const FIX_STREAM = [
  'scanning stack trace...',
  'isolating faulty module: payments/webhook.ts',
  'reproducing failure in sandbox...',
  'root cause: unhandled null in retryPolicy()',
  'patching retryPolicy() guard clause',
  'running unit tests... 12/12 passed',
  'running integration tests... 41/41 passed',
  'regenerating type defs',
  'linting patched files... clean',
  'opening hotfix branch hotfix/webhook-null-guard',
  'committing fix (3 files changed, +18 -4)',
  'pushing to origin...',
  'CI pipeline triggered',
  'CI: build ✔  lint ✔  tests ✔',
  'deploying to staging...',
  'staging healthcheck ✔',
  'bug resolved ✅',
];

function startBugStream() {
  setMood('shocked', 900);
  pushLog('!! Exception detected: TypeError: cannot read properties of null', COLORS.red);
  state.streaming = { lines: [...FIX_STREAM], index: 0, everyFrames: 4 };
}

function tickStream() {
  if (!state.streaming) return;
  const s = state.streaming;
  if (state.frame % s.everyFrames !== 0) return;
  if (s.index >= s.lines.length) {
    state.streaming = null;
    setMood('happy', 1800);
    state.metrics.tasks += 1;
    return;
  }
  const line = s.lines[s.index++];
  const color = line.includes('✅') ? COLORS.green : line.includes('CI') ? COLORS.cyan : COLORS.yellow;
  pushLog(line, color);
  if (state.mood === 'shocked' && s.index > 3) setMood('thinking', 400);
}

function handleCommand(raw) {
  const cmd = raw.trim();
  if (!cmd) return;
  pushLog(`> ${cmd}`, COLORS.bold + COLORS.cyan);

  switch (cmd) {
    case '!status':
      setMood('happy', 2000);
      pushLog(
        `uptime=${state.metrics.uptime}s tasks=${state.metrics.tasks} errors=${state.metrics.errors} mem=${(40 + Math.random() * 20).toFixed(1)}MB`,
        COLORS.green
      );
      break;
    case '!bug':
      state.metrics.errors += 1;
      startBugStream();
      break;
    case '!idle':
      setMood('idle', 0);
      break;
    case '!help':
      pushLog('commands: !status  !bug  !idle  !help  !quit', COLORS.magenta);
      break;
    case '!quit':
    case '!exit':
      shutdown();
      break;
    default:
      pushLog(`unknown command: ${cmd} (try !help)`, COLORS.red);
  }
}

function currentFace() {
  if (Date.now() < state.moodUntil) return FACES[state.mood] || FACES.idle;
  if (Date.now() >= state.blinkAt) {
    if (Date.now() - state.blinkAt < 150) return FACES.blink;
    state.blinkAt = nextBlinkTime();
  }
  return FACES.idle;
}

function render() {
  const cols = process.stdout.columns || 80;
  const rows = process.stdout.rows || 24;
  const face = currentFace();

  let out = '\x1b[H\x1b[2J'; // home + clear
  out += `${COLORS.bold}${COLORS.cyan}DEVPULSE AGENT${COLORS.reset}  ${COLORS.gray}(30fps live TUI — type a command, Enter to send)${COLORS.reset}\n`;
  out += '-'.repeat(Math.min(cols, 72)) + '\n';

  face.forEach((l) => (out += `  ${COLORS.yellow}${l}${COLORS.reset}\n`));
  out += `\n  mood: ${COLORS.magenta}${state.mood}${COLORS.reset}   frame: ${COLORS.gray}${state.frame}${COLORS.reset}\n`;
  out += '-'.repeat(Math.min(cols, 72)) + '\n';

  const logRows = Math.max(5, rows - face.length - 8);
  const visible = state.logs.slice(-logRows);
  out += `${COLORS.bold}live log:${COLORS.reset}\n`;
  out += visible.join('\n') + '\n';

  out += '-'.repeat(Math.min(cols, 72)) + '\n';
  out += `${COLORS.bold}> ${COLORS.reset}${state.inputBuffer}\u2588`;

  process.stdout.write(out);
}

function shutdown() {
  process.stdout.write('\x1b[?25h\x1b[2J\x1b[H');
  process.stdin.setRawMode && process.stdin.setRawMode(false);
  process.stdin.pause();
  console.log('agent TUI closed.');
  process.exit(0);
}

function main() {
  process.stdout.write('\x1b[?25l'); // hide cursor
  pushLog('agent booted. type !help for commands.', COLORS.green);

  if (process.stdin.isTTY) process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  process.stdin.on('data', (key) => {
    if (key === '\u0003') shutdown(); // Ctrl+C
    else if (key === '\r' || key === '\n') {
      const cmd = state.inputBuffer;
      state.inputBuffer = '';
      handleCommand(cmd);
    } else if (key === '\u007f' || key === '\b') {
      state.inputBuffer = state.inputBuffer.slice(0, -1);
    } else if (key >= ' ' && key <= '~') {
      state.inputBuffer += key;
    }
  });

  const start = Date.now();
  setInterval(() => {
    state.frame += 1;
    state.metrics.uptime = Math.floor((Date.now() - start) / 1000);
    tickStream();
    render();
  }, FRAME_MS);
}

main();
