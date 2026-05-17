# 后端启动说明

## 环境

- Python 3.10+
- FastAPI
- Uvicorn

## 安装依赖

```bash
cd backend
python -m pip install -r requirements.txt
```

## 启动服务

```bash
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

启动后可访问：

- API 文档：http://127.0.0.1:8000/docs
- 健康检查：http://127.0.0.1:8000/health

## DeepSeek 接入

默认使用 mock AI 分析。接入真实 DeepSeek 时：

```bash
$env:DEEPSEEK_API_KEY="你的Key"
$env:DEEPSEEK_MOCK="false"
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

真实调用代码已预留在 `main.py` 的 `call_deepseek_analysis` 函数中。
