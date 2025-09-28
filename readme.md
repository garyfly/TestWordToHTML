# Word测试题转换为测评网页工具

该工具可以将Word文档(.docx)中的测试题自动转换为在线测评网页。

## 功能特点

1. 支持解析Word文档中的选择题
2. 自动生成美观的在线测评网页
3. 支持在线答题和提交
4. 实时显示测评结果

## 安装和使用

### 使用 Docker（推荐）

```bash
# 构建 Docker 镜像
docker build -t word-to-assessment .

# 运行容器
docker run -p 3000:3000 word-to-assessment
```

然后在浏览器中访问 `http://localhost:3000`

### 1. 安装依赖

```bash
npm install
```

### 2. 启动服务

```bash
npm start
```

或者开发模式：

```bash
npm run dev
```

### 3. 使用工具

1. 打开浏览器访问 `http://localhost:3000`
2. 点击上传按钮选择你的Word文档(.docx)
3. 点击"转换为测评网页"按钮
4. 系统会自动生成在线测评页面并在新窗口中打开

## Word文档格式要求

为了正确解析Word文档中的测试题，请遵循以下格式：

1. 题号以数字开头，后跟点号或顿号，如：
   - `1. 题目内容`
   - `1、题目内容`

2. 选择题选项以大写字母开头，后跟点号或顿号，如：
   - `A. 选项内容`
   - `A、选项内容`

3. 题目之间应有空行分隔

### 示例格式：

```
1. 中国的首都是哪里？
A. 上海
B. 广州
C. 北京
D. 深圳

2. 以下哪个是编程语言？
A. HTML
B. CSS
C. JavaScript
D. 图片
```

## Jenkins 集成

本项目支持使用 Jenkins 进行持续集成和部署。项目根目录下包含了 [Jenkinsfile](./Jenkinsfile)，定义了完整的 CI/CD 流水线。

### 配置要求

- Jenkins 服务器需要安装 Node.js 插件
- 需要配置 Node.js 工具（版本 16）
- Jenkins 服务器需要安装并配置 Docker（用于构建和运行容器）

### 流水线阶段

1. Checkout - 拉取代码
2. Install Dependencies - 安装项目依赖
3. Build Docker Image - 构建 Docker 镜像
4. Run Tests - 运行测试（如果有）
5. Deploy - 部署应用

### 配置步骤

1. 在 Jenkins 中创建多分支流水线项目
2. 指向项目的代码仓库
3. Jenkins 会自动发现并使用 [Jenkinsfile](./Jenkinsfile) 中定义的流水线

## 技术实现

- 使用 Node.js + Express 构建后端服务
- 使用 docxtemplater 解析Word文档
- 使用原生JavaScript实现前端交互
- 自动生成响应式网页

## 目录结构

```
.
├── index.js          # 主入口文件
├── server.js         # Express服务器
├── wordProcessor.js  # Word文档处理模块
├── package.json      # 项目依赖配置
├── uploads/          # 上传文件存储目录
├── output/           # 生成的测评网页存储目录
└── README.md         # 说明文档
```

## 注意事项

1. 目前仅支持 .docx 格式的Word文档
2. 确保Word文档遵循指定格式以获得最佳解析效果
3. 工具会自动清理上传的文件以节省存储空间