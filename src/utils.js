import fs from 'fs';

export function loadData(file) {
  return JSON.parse(fs.readFileSync(file));
}