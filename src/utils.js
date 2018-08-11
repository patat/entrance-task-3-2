import fs from 'fs';

export function loadData(file) {
  return JSON.parse(fs.readFileSync(file, { encoding: 'utf8' }));
}

export function appendGeneratedInput(file, input) {
  let fileContents;
  try {
    fileContents = loadData(file);
  } catch(ex) {
    fileContents = [];
    fs.writeFileSync(file, JSON.stringify(fileContents));
  }
  fileContents.push(input);
  fs.writeFileSync(file, JSON.stringify(fileContents));
}