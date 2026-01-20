/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Quick one-off helper to convert the legacy KITCN.geojson JS blob
 * (it defines global vars instead of exporting JSON) into a consumable
 * JSON file for the Next.js app.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const legacyPath = path.join(__dirname, '..', 'data', 'legacy', 'KITCN.geojson');
const outputPath = path.join(__dirname, '..', 'src', 'data', 'legacy-grid.json');

const raw = fs.readFileSync(legacyPath, 'utf8');
const context = {};
vm.createContext(context);
vm.runInContext(raw, context);

const { zaehler, gebaeude, stations, lines } = context;

if (!zaehler || !gebaeude || !stations || !lines) {
  throw new Error('Failed to read legacy grid data');
}

const grid = {
  meters: zaehler,
  buildings: gebaeude,
  stations,
  lines,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(grid, null, 2));

console.log(`Wrote ${outputPath}`);
