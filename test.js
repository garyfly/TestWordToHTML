const fs = require('fs');
const path = require('path');

// 创建示例Word文档内容
const sampleContent = `1. 中国的首都是哪里？
A. 上海
B. 广州
C. 北京
D. 深圳

2. 以下哪个是编程语言？
A. HTML
B. CSS
C. JavaScript
D. 图片

3. 下列哪位是《红楼梦》的作者？
A. 罗贯中
B. 曹雪芹
C. 吴承恩
D. 施耐庵

4. 计算机网络中，HTTP协议的默认端口号是？
A. 21
B. 25
C. 80
D. 110

5. 请简述你对人工智能发展的看法。

`;

// 创建示例文件
const sampleDir = 'samples';
if (!fs.existsSync(sampleDir)) {
    fs.mkdirSync(sampleDir);
}

const samplePath = path.join(sampleDir, 'sample_questions.txt');
fs.writeFileSync(samplePath, sampleContent);

console.log('示例文件已创建: samples/sample_questions.txt');
console.log('请按照此格式准备您的Word文档(.docx)');

// 创建一个简单的启动脚本
const setupScript = `const fs = require('fs');

// 创建必要的目录
const dirs = ['uploads', 'output', 'samples'];
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
    console.log(\`创建目录: \${dir}\`);
  }
});

console.log('环境初始化完成');
`;

fs.writeFileSync('setup.js', setupScript);