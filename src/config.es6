import path from 'path';
import fs from 'fs';
import {promisify} from 'bluebird';

const readFile = promisify(fs.readFile);
const {CONFIG_FILE} = process.env;

export default async function resolveConfig() {
  return await fileSource(CONFIG_FILE || path.join(__dirname, '../config.json'));
}

async function fileSource(filePath) {
  const contents = await readFile(filePath, 'utf8');
  const parsed = JSON.parse(contents);
  return parsed;
}
