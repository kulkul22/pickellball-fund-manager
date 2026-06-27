const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const pkgPath = path.join(__dirname, '../package.json');
const changelogPath = path.join(__dirname, '../CHANGELOG.md');

function runCmd(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch (e) {
    return '';
  }
}

// 1. Read package.json
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const currentVersion = pkg.version || '1.0.0';
console.log(`Current version: ${currentVersion}`);

// Calculate potential new versions
const [major, minor, patch] = currentVersion.split('.').map(Number);
const nextPatch = `${major}.${minor}.${patch + 1}`;
const nextMinor = `${major}.${minor + 1}.0`;
const nextHighlight = `${major + 1}.0.0`;

console.log('\nSelect release type:');
console.log(`1. Patch (${nextPatch}) - For bug fixes`);
console.log(`2. Minor (${nextMinor}) - For new features`);
console.log(`3. Major (${nextHighlight}) - For breaking changes`);

rl.question('\nEnter selection (1/2/3): ', (answer) => {
  let nextVersion;
  if (answer === '1') nextVersion = nextPatch;
  else if (answer === '2') nextVersion = nextMinor;
  else if (answer === '3') nextVersion = nextHighlight;
  else {
    console.log('Invalid selection.');
    rl.close();
    process.exit(1);
  }

  rl.question('Enter release notes (features/fixes list): ', (notes) => {
    // 2. Update package.json version
    pkg.version = nextVersion;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`\n✔ Updated package.json version to ${nextVersion}`);

    // 3. Update CHANGELOG.md
    const dateStr = new Date().toLocaleDateString('vi-VN');
    const newLogEntry = `## [${nextVersion}] - ${dateStr}\n\n### Chỉnh sửa / Tính năng mới:\n- ${notes || 'Bản phát hành mới'}\n\n`;

    let changelogContent = '';
    if (fs.existsSync(changelogPath)) {
      changelogContent = fs.readFileSync(changelogPath, 'utf8');
    } else {
      changelogContent = `# Lịch sử phiên bản (Changelog)\n\n`;
    }

    // Insert new entry after first title heading block
    const updatedChangelog = changelogContent.replace(
      /# Lịch sử phiên bản \(Changelog\)\n\n/,
      `# Lịch sử phiên bản (Changelog)\n\n${newLogEntry}`
    );
    
    fs.writeFileSync(changelogPath, updatedChangelog);
    console.log('✔ Updated CHANGELOG.md');

    // 4. Git actions
    console.log('✔ Staging version configuration files...');
    runCmd('git add package.json CHANGELOG.md');
    
    console.log('✔ Committing changes...');
    runCmd(`git commit -m "chore(release): version ${nextVersion}"`);
    
    console.log(`✔ Creating Git tag v${nextVersion}...`);
    runCmd(`git tag -a v${nextVersion} -m "Release version ${nextVersion}: ${notes}"`);

    console.log(`\n✅ Release v${nextVersion} created locally!`);
    console.log('To push code and tags to GitHub, run:');
    console.log(`  git push origin main --tags\n`);

    rl.close();
  });
});
