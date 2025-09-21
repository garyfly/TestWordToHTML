const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const { Transform, Readable, Writable } = require('stream');

class WordProcessor {
  /**
   * 使用流式处理方式从Word文档中提取测试题并直接生成HTML
   * @param {string} inputPath - Word文档路径
   * @param {string} outputPath - 输出HTML文件路径
   * @param {string} title - 页面标题
   * @returns {Promise<void>}
   */
  static streamProcess(inputPath, outputPath, title = '在线测评系统') {
    return new Promise(async (resolve, reject) => {
      try {
        // 1. 读取Word文档内容（使用流）
        const readStream = fs.createReadStream(inputPath);
        let data = '';

        for await (const chunk of readStream) {
          data += chunk.toString('binary');
        }

        // 2. 解析Word文档
        const zip = new PizZip(data);
        const doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
        });

        // 3. 获取文档文本内容
        // 替换 getFullText 方法为直接解析 XML
        const textContent = doc.getZip()
          .file('word/document.xml')
          .asText();

        // 使用正则表达式或其他解析工具处理 XML 并保留格式
        const text = this.parseDocumentXML(textContent);
        console.log('Formatted Text:', text);

        // 4. 解析测试题
        const questions = this.parseQuestions(text);

        // 5. 流式生成HTML文件
        await this.streamGenerateHTML(questions, outputPath, title);

        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
  * 解析Word文档的XML内容，提取段落并转换为纯文本。
  * 
  * @param {string} xmlContent - Word文档的XML字符串，包含段落标签（<w:p>）。
  *                              该参数应为完整的XML内容片段。
  * @returns {string} 返回一个字符串，其中每个段落按行分割，并保留空行。
  */
  static parseDocumentXML(xmlContent) {
    // 匹配段落标签 <w:p>...</w:p>
    const paragraphRegex = /<w:p[^>]*>(.*?)<\/w:p>/gs;
    const paragraphs = [];
    let match;

    while ((match = paragraphRegex.exec(xmlContent)) !== null) {
      // 提取段落内容并去除多余的标签
      const paragraph = match[1].replace(/<[^>]+>/g, '').trim();
      paragraphs.push(paragraph);
    }

    // 保留空行（段落为空的情况）
    return paragraphs.join('\n');
  }

  /**
   * 流式生成HTML文件
   * @param {Array} questions - 测试题数组
   * @param {string} outputPath - 输出文件路径
   * @param {string} title - 页面标题
   * @returns {Promise<void>}
   */
  static streamGenerateHTML(questions, outputPath, title = '在线测评系统') {
    return new Promise((resolve, reject) => {
      try {
        // 读取模板文件
        const templatePath = path.join(__dirname, 'templates', 'evaluation.html');
        const templateContent = fs.readFileSync(templatePath, 'utf-8');

        // 替换头部标题
        let headHtml = templateContent.substring(0, templateContent.indexOf('</head>') + 7);
        headHtml = headHtml.replace('{{title}}', title);

        // 替换标题部分
        const bodyStart = templateContent.indexOf('<body>');
        const formStart = templateContent.indexOf('<form id="assessmentForm">');
        let headerHtml = templateContent.substring(bodyStart, formStart);
        headerHtml = headerHtml.replace('<h1>{{title}}</h1>', `<h1>${title}</h1>`);

        // 表单开始标签到题目插入点
        const formStartTag = '<form id="assessmentForm">';
        const questionsPlaceholder = '{{questionsHtml}}';
        const formStartHtml = formStartTag;

        // 表单结束部分
        const formEndIndex = templateContent.indexOf('</form>') + '</form>'.length;
        const formEndHtml = templateContent.substring(formEndIndex);

        // 创建可写流
        const writeStream = fs.createWriteStream(outputPath);

        // 写入HTML头部
        writeStream.write(headHtml);

        // 写入body开始和头部内容
        writeStream.write(headerHtml);

        // 写入表单开始部分
        writeStream.write(formStartHtml);

        // 边生成边写入题目部分
        for (const question of questions) {
          const questionHtml = this.generateQuestionHTML(question);
          writeStream.write(questionHtml);
        }

        // 写入表单结束部分和HTML结尾
        const footerContent = templateContent.substring(
          templateContent.indexOf('{{questionsHtml}}') + '{{questionsHtml}}'.length,
          templateContent.indexOf('</form>') + '</form>'.length
        ).replace('{{questionsHtml}}', '');

        writeStream.write(footerContent);
        writeStream.write(formEndHtml);

        // 关闭流
        writeStream.end();

        // 监听完成事件
        writeStream.on('finish', () => {
          resolve();
        });

        // 监听错误事件
        writeStream.on('error', (error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 生成单个题目的HTML
   * @param {Object} question - 题目对象
   * @returns {string} 题目的HTML字符串
   */
  static generateQuestionHTML(question) {
    return `
        <div class="question" data-id="${question.id}">
            <div class="question-stem">${question.id}. ${question.stem}</div>
            ${question.type === 'choice' ? `
            <div class="options">
                ${question.options.map(option => `
                <div class="option">
                    <input type="radio" name="question-${question.id}" id="q${question.id}-${option.letter}" value="${option.letter}">
                    <label for="q${question.id}-${option.letter}">${option.letter}. ${option.text}</label>
                </div>`).join('')}
            </div>` : `
            <div>
                <textarea name="question-${question.id}" rows="4" cols="60" placeholder="请输入您的答案"></textarea>
            </div>`}
        </div>`;
  }

  /**
   * 从Word文档中提取测试题并转换为网页可用的数据结构（使用流式处理）
   * @param {string} filePath - Word文档路径
   * @returns {Promise<Array>} 测试题数组
   */
  static async extractQuestionsWithStream(filePath) {
    return new Promise((resolve, reject) => {
      try {
        // 创建可读流
        const readStream = fs.createReadStream(filePath);
        let data = '';

        // 监听数据流
        readStream.on('data', chunk => {
          data += chunk.toString('binary');
        });

        // 监听结束事件
        readStream.on('end', () => {
          try {
            // 解析Word文档
            const zip = new PizZip(data);
            const doc = new Docxtemplater(zip, {
              paragraphLoop: true,
              linebreaks: true,
            });

            // 获取文档文本内容
            const text = doc.getFullText();

            // 解析测试题（根据常见格式）
            const questions = this.parseQuestions(text);
            resolve(questions);
          } catch (error) {
            reject(new Error(`解析Word文档时出错: ${error.message}`));
          }
        });

        // 监听错误事件
        readStream.on('error', (error) => {
          reject(new Error(`读取文件时出错: ${error.message}`));
        });
      } catch (error) {
        reject(new Error(`处理Word文档时出错: ${error.message}`));
      }
    });
  }

  /**
   * 从Word文档中提取测试题并转换为网页可用的数据结构
   * @param {string} filePath - Word文档路径
   * @returns {Array} 测试题数组
   */
  static extractQuestions(filePath) {
    try {
      // 读取并解析Word文档
      const content = fs.readFileSync(filePath, 'binary');
      const zip = new PizZip(content);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      // 获取文档文本内容
      const text = doc.getFullText();

      // 解析测试题（根据常见格式）
      return this.parseQuestions(text);
    } catch (error) {
      console.error('处理Word文档时出错:', error);
      throw error;
    }
  }

  /**
   * 解析文本中的测试题
   * @param {string} text - 文档文本内容
   * @returns {Array} 测试题数组
   */
  static parseQuestions(text) {
    const questions = [];

    // 输出调试信息
    console.log('原始文本内容:', JSON.stringify(text));

    // 预处理文本，尝试识别题目和选项的边界
    // 在题号和选项前添加分隔符
    let processedText = text;

    // 在题号前添加分隔标记
    processedText = processedText.replace(/(\d+[\.\、]\s*[^A-Z\d])/g, '\n##QUESTION:$1');

    // 在选项前添加分隔标记
    processedText = processedText.replace(/([A-Z][\.\、]\s*[^A-Z])/g, '\n##OPTION:$1');

    // 分割处理后的文本
    const parts = processedText.split('\n').filter(part => part.trim() !== '');

    console.log('预处理后的部分:', parts);

    let currentQuestion = null;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      console.log(`处理部分 ${i}:`, JSON.stringify(part));

      // 检查是否是题目开始
      if (part.startsWith('##QUESTION:')) {
        const questionContent = part.substring(11); // 移除##QUESTION:前缀

        // 如果已经有题目在处理，保存它
        if (currentQuestion) {
          questions.push(currentQuestion);
        }

        // 提取题号和题干
        const questionMatch = questionContent.match(/^(\d+)[\.\、]\s*(.*)/);
        if (questionMatch) {
          // 创建新题目
          currentQuestion = {
            id: parseInt(questionMatch[1]),
            stem: questionMatch[2].trim(),
            options: [],
            type: 'choice' // 默认为选择题
          };

          console.log(`开始新题目:`, currentQuestion);
        }
        continue;
      }

      // 检查是否是选项
      if (part.startsWith('##OPTION:')) {
        const optionContent = part.substring(9); // 移除##OPTION:前缀

        if (currentQuestion) {
          const optionMatch = optionContent.match(/^([A-Z])[\.\、]\s*(.*)/);
          if (optionMatch) {
            currentQuestion.options.push({
              letter: optionMatch[1],
              text: optionMatch[2].trim()
            });
            console.log(`添加选项:`, currentQuestion.options[currentQuestion.options.length - 1]);
          }
        }
        continue;
      }
    }

    // 保存最后一个题目
    if (currentQuestion) {
      questions.push(currentQuestion);
    }

    // 如果上面的方法没有成功解析题目，尝试另一种方法
    if (questions.length === 0) {
      console.log('使用备用解析方法');
      return this.parseQuestionsFallback(text);
    }

    // 对于没有选项的题目，标记为文本题
    questions.forEach(q => {
      if (q.options.length === 0) {
        q.type = 'text';
      }
    });

    console.log('最终解析结果:', questions);
    return questions;
  }

  /**
   * 备用解析方法
   * @param {string} text - 文档文本内容
   * @returns {Array} 测试题数组
   */
  static parseQuestionsFallback(text) {
    const questions = [];

    // 尝试直接使用正则表达式匹配整个题目块
    // 匹配题目（包括题干和选项）
    const questionBlockRegex = /(\d+[\.\、]\s*.*?)(?=\d+[\.\、]|\s*$)/gs;
    const questionBlocks = text.match(questionBlockRegex) || [];

    console.log('题目块:', questionBlocks);

    questionBlocks.forEach((block, index) => {
      console.log(`处理题目块 ${index}:`, JSON.stringify(block));

      // 提取题号和题干
      const questionMatch = block.match(/^(\d+)[\.\、]\s*(.*?)(?=[A-Z][\.\、]|\s*$)/s);
      if (questionMatch) {
        const id = parseInt(questionMatch[1]);
        const stem = questionMatch[2].trim();

        // 提取选项
        const options = [];
        const optionRegex = /([A-Z])[\.\、]\s*([^A-Z]*?)(?=[A-Z][\.\、]|\s*$)/g;
        let optionMatch;

        while ((optionMatch = optionRegex.exec(block)) !== null) {
          options.push({
            letter: optionMatch[1],
            text: optionMatch[2].trim()
          });
        }

        questions.push({
          id: id,
          stem: stem,
          options: options,
          type: options.length > 0 ? 'choice' : 'text'
        });

        console.log(`添加题目:`, questions[questions.length - 1]);
      }
    });

    return questions;
  }

  /**
   * 将测试题数据转换为HTML页面并使用流式写入文件
   * @param {Array} questions - 测试题数组
   * @param {string} outputPath - 输出文件路径
   * @param {string} title - 页面标题
   * @returns {Promise<void>}
   */
  static generateHTMLWithStream(questions, outputPath, title = '在线测评系统') {
    return new Promise((resolve, reject) => {
      try {
        // 读取模板文件
        const templatePath = path.join(__dirname, 'templates', 'evaluation.html');
        const templateContent = fs.readFileSync(templatePath, 'utf-8');

        // 生成题目HTML
        const questionsHtml = questions.map(question => `
        <div class="question" data-id="${question.id}">
            <div class="question-stem">${question.id}. ${question.stem}</div>
            ${question.type === 'choice' ? `
            <div class="options">
                ${question.options.map(option => `
                <div class="option">
                    <input type="radio" name="question-${question.id}" id="q${question.id}-${option.letter}" value="${option.letter}">
                    <label for="q${question.id}-${option.letter}">${option.letter}. ${option.text}</label>
                </div>`).join('')}
            </div>` : `
            <div>
                <textarea name="question-${question.id}" rows="4" cols="60" placeholder="请输入您的答案"></textarea>
            </div>`}
        </div>`).join('');

        // 替换模板中的占位符
        let html = templateContent.replace('{{title}}', title);
        html = html.replace('{{questionsHtml}}', questionsHtml);
        html = html.replace('<h1>{{title}}</h1>', `<h1>${title}</h1>`);

        // 创建可写流
        const writeStream = fs.createWriteStream(outputPath);

        // 监听写入完成事件
        writeStream.on('finish', () => {
          resolve();
        });

        // 监听写入错误事件
        writeStream.on('error', (error) => {
          reject(new Error(`写入文件时出错: ${error.message}`));
        });

        // 将HTML内容写入流
        const readable = new Readable();
        readable.push(html);
        readable.push(null); // 标记结束

        // 使用管道连接流
        readable.pipe(writeStream);
      } catch (error) {
        reject(new Error(`生成HTML时出错: ${error.message}`));
      }
    });
  }

  /**
   * 将测试题数据转换为HTML页面
   * @param {Array} questions - 测试题数组
   * @param {string} title - 页面标题
   * @returns {string} HTML页面字符串
   */
  static generateHTML(questions, title = '在线测评系统') {
    // 输出调试信息
    console.log('生成HTML的题目数据:', questions);

    // 读取模板文件（使用正确的文件名）
    const templatePath = path.join(__dirname, 'templates', 'evaluation.html');
    let html = fs.readFileSync(templatePath, 'utf-8');

    // 生成题目HTML
    const questionsHtml = questions.map(question => `
        <div class="question" data-id="${question.id}">
            <div class="question-stem">${question.id}. ${question.stem}</div>
            ${question.type === 'choice' ? `
            <div class="options">
                ${question.options.map(option => `
                <div class="option">
                    <input type="radio" name="question-${question.id}" id="q${question.id}-${option.letter}" value="${option.letter}">
                    <label for="q${question.id}-${option.letter}">${option.letter}. ${option.text}</label>
                </div>`).join('')}
            </div>` : `
            <div>
                <textarea name="question-${question.id}" rows="4" cols="60" placeholder="请输入您的答案"></textarea>
            </div>`}
        </div>`).join('');

    console.log('生成的题目HTML:', questionsHtml);

    // 替换模板中的占位符
    html = html.replace('{{title}}', title);
    // 修复替换问题 - 确保正确替换questionsHtml占位符
    html = html.replace('{{questionsHtml}}', questionsHtml);

    // 如果title占位符仍然存在（可能在<h1>标签中），再次替换
    html = html.replace('<h1>{{title}}</h1>', `<h1>${title}</h1>`);

    return html;
  }
}

module.exports = WordProcessor;