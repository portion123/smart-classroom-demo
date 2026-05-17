# 智慧教室环境监测与节能调控平台 Demo

这是一个用于比赛展示的前后端分离 Demo。系统模拟智慧教室中的温度、湿度、CO₂、PM2.5、噪声、人数等环境数据，并展示实时数据卡片、历史曲线、异常报警、设备控制模拟和 AI 智能分析入口。当前没有真实硬件和数据库，后端使用内存数据模拟，后续可替换为 ESP32/STM32 上传的真实数据。

## 技术栈

- 前端：Vue 3、Vite、Element Plus、ECharts、Axios
- 后端：Python、FastAPI、Uvicorn
- 数据：内存模拟数据
- AI：后端封装 DeepSeek 入口，默认 mock 模式

## 项目结构

```text
smart-classroom-demo/
  backend/
    main.py
    requirements.txt
    README.md
  frontend/
    package.json
    index.html
    vite.config.js
    src/
      main.js
      App.vue
      api/
        request.js
      components/
        DataCards.vue
        HistoryChart.vue
        AlarmTable.vue
        AiAnalysis.vue
        DeviceControl.vue
  README.md
```

## 后端启动方法

```bash
cd smart-classroom-demo/backend
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

后端地址：

- API：http://127.0.0.1:8000
- 文档：http://127.0.0.1:8000/docs

## 前端启动方法

```bash
cd smart-classroom-demo/frontend
npm install
npm run dev
```

默认访问：

```text
http://127.0.0.1:5173
```

前端已配置 Vite 代理，`/api` 会转发到 `http://127.0.0.1:8000`。如需改后端地址，可设置：

```bash
$env:VITE_API_BASE_URL="http://127.0.0.1:8000/api"
npm run dev
```

## 接口说明

统一返回格式：

```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

### GET /api/classroom/latest

返回最新教室环境数据：

- classroom_id
- temperature
- humidity
- co2
- pm25
- noise
- people_count
- light_status
- ac_status
- ventilation_status
- status
- update_time

### GET /api/classroom/history

返回最近一段时间的历史数据，用于前端折线图：

- time
- temperature
- humidity
- co2
- pm25
- noise
- people_count

### GET /api/alarm/list

返回异常报警记录。报警规则：

- CO₂ > 1500：CO₂ 严重偏高
- temperature > 30：温度偏高
- humidity > 75：湿度偏高
- pm25 > 75：空气质量异常
- noise > 70：噪声偏高
- people_count > 55：人数过多

### POST /api/device/control

模拟设备控制。

请求示例：

```json
{
  "classroom_id": "A-301",
  "device": "ventilation",
  "action": "on"
}
```

`device` 可选：`light`、`ac`、`ventilation`。  
`action` 可选：`on`、`off`。

开启新风后，模拟数据中的 CO₂ 和 PM2.5 会逐步下降；开启空调后，温度会逐步下降。

### POST /api/ai/analyze

返回 AI 智能分析结果。默认 mock 模式，会根据当前模拟环境生成中文分析，包括：

- 当前环境判断
- 存在问题
- 调控建议
- 节能建议

## 比赛展示话术

本系统面向智慧校园教室场景，通过多源传感器采集温度、湿度、CO₂、PM2.5、噪声和人数等关键指标，形成实时环境监测大屏。当 CO₂、温度、空气质量或人数超过阈值时，平台自动生成异常报警，并联动新风、空调和灯光等设备进行节能调控。

当前 Demo 使用后端模拟传感器数据，可以直观看到开启新风后 CO₂ 下降、开启空调后温度下降的效果。AI 智能分析模块由后端统一封装，前端不暴露 API Key，便于后续安全接入 DeepSeek，对当前环境状态、调控策略和节能建议进行自动生成。

后续接入真实硬件后，ESP32/STM32 可通过 Wi-Fi、MQTT 或 HTTP 上传传感器数据，平台即可从 Demo 升级为真实智慧教室监测与节能控制系统。

## 后续接入真实硬件

建议改造 `backend/main.py`：

1. 新增硬件数据上报接口，例如 `POST /api/sensor/upload`。
2. ESP32/STM32 上传字段保持与 `latest_state` 一致：温度、湿度、CO₂、PM2.5、噪声、人数等。
3. 将当前 `simulate_step` 的随机模拟逻辑替换为真实上报数据写入。
4. 后续如需持久化，可把 `history_data` 和 `alarm_records` 替换为 MySQL、PostgreSQL、SQLite 或时序数据库。
5. 若要下发真实设备控制命令，可在 `POST /api/device/control` 中对接 MQTT、串口网关或硬件厂商 API。

## 后续接入 DeepSeek API

后端已经在 `backend/main.py` 的 `call_deepseek_analysis` 函数中预留真实调用位置。前端只调用 `/api/ai/analyze`，不会接触 API Key。

Windows PowerShell 示例：

```bash
cd smart-classroom-demo/backend
$env:DEEPSEEK_API_KEY="你的DeepSeekKey"
$env:DEEPSEEK_MOCK="false"
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

如果没有 Key，保持默认即可使用 mock 分析。
