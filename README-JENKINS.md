# 使用 Docker 中的 Jenkins 部署项目

本文档介绍了如何使用 Docker 运行 Jenkins，并通过 Jenkins Pipeline 自动部署 Word 测试题转换为测评网页工具。

## 准备工作

1. 确保已安装 Docker 和 Docker Compose
2. 克隆或下载本项目到本地

## 启动 Jenkins

1. 在项目根目录下运行以下命令启动 Jenkins：

```bash
docker-compose up -d jenkins
```

2. 等待 Jenkins 启动完成（大约需要1-2分钟）

3. 访问 Jenkins 界面：
   - 打开浏览器并访问 `http://localhost:8080`
   - 首次访问需要输入初始管理员密码

4. 获取初始管理员密码：

```bash
docker exec jenkins_word_converter cat /var/jenkins_home/secrets/initialAdminPassword
```

5. 按照 Jenkins 安装向导完成安装，推荐安装推荐插件

## 配置 Jenkins

### 安装必要插件

确保安装了以下插件：
- Docker Pipeline
- NodeJS Plugin
- Git plugin（如果从 Git 仓库获取代码）

### 配置 Node.js

1. 进入 Jenkins 管理界面：`Manage Jenkins` > `Global Tool Configuration`
2. 找到 `NodeJS` 部分，点击 `Add NodeJS`
3. 配置如下：
   - Name: `nodejs-16`
   - Version: `NodeJS 16.x.x`
4. 保存配置

### 配置 Docker 权限

为了让 Jenkins 能够运行 Docker 命令，需要将 Jenkins 用户添加到 docker 组：

```bash
# 进入 Jenkins 容器
docker exec -u root -it jenkins_word_converter bash

# 在容器内执行
groupadd docker 2>/dev/null || true
usermod -aG docker jenkins
```

然后重启 Jenkins 容器：

```bash
docker-compose restart jenkins
```

## 创建 Pipeline 项目

1. 在 Jenkins 主界面点击 `New Item`（新建项目）
2. 输入项目名称，例如 `word-converter-deploy`
3. 选择 `Pipeline` 类型
4. 点击 `OK` 创建项目
5. 在 `Pipeline` 部分，配置如下：
   - Definition: `Pipeline script from SCM`
   - SCM: `Git`（如果是 Git 仓库）
   - Repository URL: 你的项目 Git 地址
   - Script Path: `Jenkinsfile`
6. 保存配置

## 手动触发构建

1. 在项目页面点击 `Build Now`（立即构建）
2. 观察构建进度和日志输出
3. 构建成功后，应用将部署在 `http://localhost:3000`

## 故障排除

### Docker 权限问题

如果在构建过程中出现 Docker 权限错误，请确认：

1. Jenkins 容器已经挂载了 Docker socket：
   ```yaml
   volumes:
     - /var/run/docker.sock:/var/run/docker.sock
   ```

2. Jenkins 用户已被添加到 docker 组

### 构建失败

如果构建失败，请检查：

1. Jenkinsfile 是否存在于项目根目录
2. Node.js 是否正确配置
3. 项目依赖是否能正常安装

## 项目访问

构建和部署成功后，可以通过以下地址访问应用：
- URL: `http://localhost:3000`

## 停止服务

要停止所有服务，运行：

```bash
docker-compose down
```

要删除所有数据（包括 Jenkins 配置），运行：

```bash
docker-compose down -v
```