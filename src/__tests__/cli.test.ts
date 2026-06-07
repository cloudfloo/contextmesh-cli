import { spawnSync } from 'child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('CLI metadata', () => {
  let packageDir: string;

  beforeEach(() => {
    packageDir = mkdtempSync(join(tmpdir(), 'contextmesh-cli-test-'));
    cpSync(join(__dirname, '..', '..', 'dist'), join(packageDir, 'dist'), { recursive: true });

    const packageJson = JSON.parse(
      readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8')
    );
    packageJson.version = '1.2.3';
    writeFileSync(join(packageDir, 'package.json'), JSON.stringify(packageJson, null, 2));
  });

  afterEach(() => {
    rmSync(packageDir, { recursive: true, force: true });
  });

  it('prints the runtime package version', () => {
    const result = spawnSync(process.execPath, [join(packageDir, 'dist', 'cli.js'), '--version'], {
      cwd: packageDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        NODE_PATH: join(__dirname, '..', '..', 'node_modules'),
      },
    });

    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe('1.2.3');
    expect(result.stderr).toBe('');
  });
});
