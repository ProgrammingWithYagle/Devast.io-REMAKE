// Read-only acquisition of the public client observed by the browser asset inventory.
// Never execute this client or bundle its code into the remake.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const url='https://devast.io/js/MUElzLXE2uUR.js';
const response=await fetch(url);if(!response.ok)throw Error(`Reference request failed: ${response.status}`);
const text=await response.text();await fs.mkdir('vendor/devast-reference',{recursive:true});await fs.writeFile('vendor/devast-reference/client.js',text);
await fs.writeFile('vendor/devast-reference/observation.json',JSON.stringify({url,observed:new Date().toISOString(),bytes:Buffer.byteLength(text),sha256:crypto.createHash('sha256').update(text).digest('hex'),purpose:'Public reference inspection only. Not executed or included in the remake.'},null,2));
console.log(`Saved ${Buffer.byteLength(text)} bytes of public reference text.`);
