# GitHub + Zeabur 部署说明

本项目包含两个服务：

- `frontend`：Vue/Vite 前端
- `backend`：Node.js/Express 后端，大模型 API 中转

## 1. 推送到 GitHub

```bash
git init
git add .
git commit -m "Deploy smart classroom demo"
git branch -M main
git remote add origin https://github.com/<your-name>/<your-repo>.git
git push -u origin main
```

提交前确认不要提交本地 `.env`，真实 API Key 只能配置在 Zeabur 环境变量中。

## 2. Zeabur 创建 Backend 服务

在 Zeabur 中从 GitHub 仓库创建服务：

- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm run start`

环境变量：

```env
LLM_API_KEY=你的真实 API 密钥
LLM_BASE_URL=你的 API 平台 Base URL
LLM_MODEL=你的 API 平台支持的模型名
```

Zeabur 会自动注入 `PORT`，后端代码会使用 `process.env.PORT || 8014`。

如果需要限制跨域来源，可以增加：

```env
CORS_ORIGIN=https://你的前端域名
```

多个域名用英文逗号分隔。

## 3. Zeabur 创建 Frontend 服务

在同一个 GitHub 仓库中再创建一个服务：

- Root Directory: `frontend`
- Build Command: `npm install && npm run build`
- Start Command: 按 Zeabur 静态站点/前端服务配置发布 `dist`

环境变量：

```env
VITE_API_BASE_URL=https://你的后端-zeabur-域名
```

示例：

```env
VITE_API_BASE_URL=https://smart-classroom-backend.zeabur.app
```

不要在前端配置任何 API Key。

## 4. 测试 Backend

健康检查：

```bash
curl https://你的后端域名/api/ai/health
```

返回中应包含：

- `hasApiKey`
- `baseURL`
- `model`
- `status: "ok"`

AI 分析接口：

```bash
curl -X POST https://你的后端域名/api/ai/analyze \
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

## 5. 判断是否真正接入大模型

- `data.mode = "llm"`：真实大模型结果
- `data.mode = "mock"`：兜底模拟结果

如果返回 `mock`，查看 `data.error`，通常是环境变量缺失、Base URL 不可访问、模型名不支持或上游 API 报错。
