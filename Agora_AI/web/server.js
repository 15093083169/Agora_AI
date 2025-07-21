const express = require('express');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 添加JSON解析中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 添加JSON解析中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 读取HTML文件并注入环境变量
function injectEnvVariables(htmlContent) {
    const envConfig = {
        AGORA_APP_ID: process.env.AGORA_APP_ID || '',
        AGORA_CLIENT_ID: process.env.AGORA_CLIENT_ID || '',
        AGORA_CLIENT_SECRET: process.env.AGORA_CLIENT_SECRET || ''
    };
    
    // 将环境变量注入到HTML中
    const envScript = `
        <script>
            window.ENV_CONFIG = ${JSON.stringify(envConfig)};
        </script>
    `;
    
    // 在</head>标签前插入环境变量脚本
    return htmlContent.replace('</head>', `${envScript}\n</head>`);
}

// 主页路由 - 必须在静态文件服务之前
app.get('/', (req, res) => {
    try {
        const htmlPath = path.join(__dirname, 'index.html');
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        // 注入环境变量
        htmlContent = injectEnvVariables(htmlContent);
        
        res.setHeader('Content-Type', 'text/html');
        res.send(htmlContent);
    } catch (error) {
        console.error('Error reading HTML file:', error);
        res.status(500).send('Internal Server Error');
    }
});

// 代理声网API请求
app.post('/api/agora/*', async (req, res) => {
    try {
        // 获取原始URL路径
        const originalPath = req.path.replace('/api/agora', '');
        const targetUrl = `https://api.agora.io/cn${originalPath}`;
        
        // console.log(`🔄 代理请求: ${req.method} ${targetUrl}`);
        // console.log(`📋 请求头:`, {
        //     'Authorization': req.headers.authorization ? '已设置' : '未设置',
        //     'Content-Type': req.headers['content-type'] || 'application/json'
        // });
        // console.log(`📦 请求体:`, JSON.stringify(req.body, null, 2));
        
        // 转发请求到声网API
        const response = await axios({
            method: req.method,
            url: targetUrl,
            headers: {
                'Authorization': req.headers.authorization,
                'Content-Type': req.headers['content-type'] || 'application/json'
            },
            data: req.body,
            timeout: 30000
        });
        
        // console.log(`✅ 代理成功: ${response.status}`);
        res.status(response.status).json(response.data);
        
    } catch (error) {
        console.error(`❌ 代理失败: ${error.message}`);
        if (error.response) {
            console.error(`📋 错误响应:`, JSON.stringify(error.response.data, null, 2));
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ error: '代理请求失败' });
        }
    }
});

// 静态文件服务 - 必须在主页路由之后
app.use(express.static(path.join(__dirname)));
app.listen(PORT, () => {
    console.log(`🚀 服务器启动成功！`);
    console.log(`📱 访问地址: http://localhost:${PORT}`);
    
    // // 显示环境变量状态
    // console.log(`\n📋 环境变量状态:`);
    // console.log(`   AGORA_APP_ID: ${process.env.AGORA_APP_ID ? '✅ 已设置' : '❌ 未设置'}`);
    // console.log(`   AGORA_CLIENT_ID: ${process.env.AGORA_CLIENT_ID ? '✅ 已设置' : '❌ 未设置'}`);
    // console.log(`   AGORA_CLIENT_SECRET: ${process.env.AGORA_CLIENT_SECRET ? '✅ 已设置' : '❌ 未设置'}`);
    
    if (!process.env.AGORA_APP_ID || !process.env.AGORA_CLIENT_ID || !process.env.AGORA_CLIENT_SECRET) {
        console.log(`\n⚠️  警告: 请确保.env文件已正确配置！`);
    } else {
        console.log(`\n✅ 所有环境变量已正确配置！`);
    }
}); 