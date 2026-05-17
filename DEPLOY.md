# GitHub + Zeabur 部署说明

本项目需要在 Zeabur 上部署两个服务：

- `backend`：Node.js + Express 大模型 API 中转后端
- `frontend`：Vue/Vite 前端网站

不要把本地 `.env` 或真实 API Key 提交到 GitHub。

## 1. 推送到 GitHub

仓库地址：

```bash
https://github.com/portion123/smart-classroom-demo
```

常规推送流程：

```bash
git add .
git commit -m "Configure Zeabur deployment"
git push
```

提交前确认：

- `.env` 已被 `.gitignore` 忽略
- `node_modules` 已被忽略
- `dist` 已被忽略
- 真实 `LLM_API_KEY` 只配置在本地或 Zeabur 环境变量中

## 2. Zeabur 后端服务

在 Zeabur 从 GitHub 仓库创建后端服务：

- Service name: `smart-classroom-backend`
- Root Directory: `backend`
- Install Command: `npm install`
- Start Command: `npm run start`

后端环境变量：

```env
LLM_API_KEY=你的真实API密钥
LLM_BASE_URL=你的API平台BaseURL
LLM_MODEL=你的API平台支持的模型名
```

说明：

- Zeabur 会自动注入 `PORT`
- 后端代码使用 `process.env.PORT || 8014`
- 不要在代码或前端环境变量里填写 API Key
- 如果需要指定允许跨域的前端域名，可以额外配置：

```env
CORS_ORIGIN=https://你的前端Zeabur域名
```

## 3. Zeabur 前端服务

在同一个 GitHub 仓库中再创建一个前端服务：

- Service name: `smart-classroom-frontend`
- Root Directory: `frontend`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `dist`

前端环境变量：

```env
VITE_API_BASE_URL=https://后端Zeabur域名
```

示例：

```env
VITE_API_BASE_URL=https://smart-classroom-backend.zeabur.app
```

前端只需要后端 API 地址，不需要也不允许配置大模型 API Key。

## 4. 测试后端健康检查

访问：

```bash
curl https://后端Zeabur域名/api/ai/health
```

应看到类似结果：

```json
{
  "code": 200,
  "data": {
    "port": "Zeabur注入的端口",
    "hasApiKey": true,
    "baseURL": true,
    "model": "你的模型名",
    "status": "ok"
  }
}
```

## 5. 测试 AI 分析接口

```bash
curl -X POST https://后端Zeabur域名/api/ai/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "classroomData": {
      "room": "A205",
      "temperature": 28.6,
      "humidity": 68,
      "co2": 1450,
      "pm25": 42,
      "noise": 56,
      "people_count": 48,
      "light_status": "on",
      "ac_status": "on",
      "ventilation_status": "off",
      "curtain_status": "on",
      "multimedia_status": "on"
    }
  }'
```

## 6. 判断是否真正接入大模型

- `data.mode = "llm"`：真实大模型返回
- `data.mode = "mock"`：后端兜底模拟结果

如果返回 `mock`，查看 `data.error`，通常是环境变量缺失、Base URL 不可访问、模型名不匹配或上游 API 报错。
