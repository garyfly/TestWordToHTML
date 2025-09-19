const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

class WordProcessor {
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