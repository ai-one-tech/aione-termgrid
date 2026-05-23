const fs = require('fs');
const path = require('path');

const webviewDir = path.join(__dirname, '..', 'src', 'webview');

function findTsxFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory() && item !== 'node_modules') {
      findTsxFiles(fullPath, files);
    } else if (stat.isFile() && item.endsWith('.tsx') && !item.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

function addTestId(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath, '.tsx');
  
  // 检查是否已经包含 data-testid
  if (content.includes('data-testid')) {
    console.log(`Skipping ${fileName} (already has data-testid)`);
    return;
  }

  // 找到组件的 return 语句中的第一个 JSX 元素
  const returnRegex = /return\s*\(\s*<([A-Za-z][A-Za-z0-9]*)/;
  const match = content.match(returnRegex);
  
  if (match) {
    const tagName = match[1];
    const searchStr = `return (\n    <${tagName}`;
    const replaceStr = `return (\n    <${tagName} data-testid="${fileName}"`;
    
    if (content.includes(searchStr)) {
      content = content.replace(searchStr, replaceStr);
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`Added data-testid to ${fileName}`);
    } else {
      // 尝试单行格式
      const singleLineSearch = `return (<${tagName}`;
      const singleLineReplace = `return (<${tagName} data-testid="${fileName}"`;
      if (content.includes(singleLineSearch)) {
        content = content.replace(singleLineSearch, singleLineReplace);
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`Added data-testid to ${fileName}`);
      } else {
        console.log(`Could not find JSX in ${fileName}`);
      }
    }
  } else {
    console.log(`No return JSX found in ${fileName}`);
  }
}

const tsxFiles = findTsxFiles(webviewDir);
console.log(`Found ${tsxFiles.length} TSX files\n`);

for (const file of tsxFiles) {
  addTestId(file);
}

console.log('\nDone! Now you can:');
console.log('1. Build the project: npm run build:webview');
console.log('2. Open VS Code WebView');
console.log('3. Inspect element to see data-testid');
console.log('4. Search in VS Code to find the component');
