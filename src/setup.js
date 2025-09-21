const fs = require('fs');

// 创建必要的目录
const dirs = ['uploads', 'output', 'samples'];
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
    console.log(`创建目录: ${dir}`);
  }
});

console.log('环境初始化完成');
