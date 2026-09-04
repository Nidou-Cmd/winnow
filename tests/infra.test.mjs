import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('Docker Compose file is present and valid for production', () => {
  const composePath = path.resolve('docker-compose.yml');
  const fileExists = fs.existsSync(composePath);
  assert.strictEqual(fileExists, true, 'docker-compose.yml should exist');
  
  const content = fs.readFileSync(composePath, 'utf8');
  assert.ok(content.includes('read_only: true'), 'Container should be read_only for Zero-Trust');
  assert.ok(content.includes('no-new-privileges:true'), 'Container should drop privileges');
  assert.ok(content.includes('INFISICAL_TOKEN'), 'Infisical token should be injected');
});

test('Dockerfile drops to non-root user', () => {
  const dockerfilePath = path.resolve('Dockerfile');
  const fileExists = fs.existsSync(dockerfilePath);
  assert.strictEqual(fileExists, true, 'Dockerfile should exist');
  
  const content = fs.readFileSync(dockerfilePath, 'utf8');
  assert.ok(content.includes('USER node'), 'Dockerfile should drop to node user');
});
