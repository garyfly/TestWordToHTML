FROM node:16-alpine

WORKDIR /usr/src/app

# 复制 package 文件
COPY package*.json ./

# 安装依赖，跳过postinstall脚本
RUN pnpm install

# 复制所有源代码
COPY . .

# 创建上传和输出目录（如果setup.js中没有创建）
RUN mkdir -p uploads output

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["npm", "start"]