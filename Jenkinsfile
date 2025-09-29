pipeline {
    agent any
    
    environment {
        NODE_VERSION = "16"
        PROJECT_NAME = "word-to-assessment-web"
    }
    
    stages {
        stage('Checkout') {
            steps {
                echo "Checking out source code..."
                checkout scm
            }
        }
        
        stage('Setup Node.js') {
            steps {
                echo "Setting up Node.js environment..."
                bat 'node --version'
                bat 'npm --version'
            }
        }
        
        stage('Install Dependencies') {
            steps {
                echo "Installing project dependencies..."
                bat 'npm install -g pnpm'
                bat 'pnpm install'
            }
        }
        
        stage('Build Docker Image') {
            steps {
                echo "Building Docker image..."
                script {
                    try {
                        bat 'docker build -t %PROJECT_NAME%:latest .'
                        echo "Docker image built successfully"
                    } catch (e) {
                        echo "Error building Docker image: ${e}"
                        throw e
                    }
                }
            }
        }
        
        stage('Run Tests') {
            steps {
                echo "Running tests..."
                // 由于项目中未包含测试，这里暂时留空
                bat 'echo "No tests to run"'
            }
        }
        
        stage('Deploy Locally') {
            steps {
                echo "Deploying application locally..."
                script {
                    try {
                        // 停止可能正在运行的同名容器
                        bat 'docker stop %PROJECT_NAME% || exit 0'
                        bat 'docker rm %PROJECT_NAME% || exit 0'
                        
                        // 运行新的容器
                        bat '''
                            docker run -d ^
                                --name %PROJECT_NAME% ^
                                -p 3000:3000 ^
                                %PROJECT_NAME%:latest
                        '''
                        
                        echo "Application deployed successfully. Access it at http://localhost:3000"
                    } catch (e) {
                        echo "Error deploying application: ${e}"
                        throw e
                    }
                }
            }
        }
    }
    
    post {
        success {
            echo "Pipeline completed successfully!"
            echo "You can now access the application at http://localhost:3000"
        }
        
        failure {
            echo "Pipeline failed. Check the logs for more information."
        }
        
        cleanup {
            echo "Cleaning up..."
            // 清理工作区或其他临时文件
        }
    }
}