const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const WordProcessor = require('./wordProcessor');

const app = express();
const port = 3000;

// 配置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // 确保上传目录存在
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    // 只允许docx文件
    if (path.extname(file.originalname).toLowerCase() === '.docx') {
      cb(null, true);
    } else {
      cb(new Error('只支持.docx文件'));
    }
  }
});

// 设置静态文件目录
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use('/output', express.static('output'));

// 中间件
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 路由
app.get('/', (req, res) => {
  // 读取主页模板
  const indexPath = path.join(__dirname, 'templates', 'index.html');
  const indexHtml = fs.readFileSync(indexPath, 'utf-8');
  res.send(indexHtml);
});

app.post('/convert', upload.single('wordFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: '未上传文件' 
      });
    }

    // 确保output目录存在
    const outputDir = 'output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    // 生成HTML文件名
    const fileName = `assessment_${Date.now()}.html`;
    const outputPath = path.join(outputDir, fileName);
    
    // 使用真正的流式处理方式：边读取、边处理、边生成
    await WordProcessor.streamProcess(req.file.path, outputPath, '在线测评系统');
    
    // 返回成功响应
    res.json({
      success: true,
      url: `/output/${fileName}`,
      message: '转换成功'
    });
  } catch (error) {
    console.error('转换过程中出错:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 启动服务器
app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
});