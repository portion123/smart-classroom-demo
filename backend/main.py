from __future__ import annotations

import os
import random
from collections import deque
from datetime import datetime, timedelta
from typing import Deque, Literal, Optional

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


CLASSROOM_ID = "A-301"
SIM_INTERVAL_SECONDS = 3
HISTORY_LIMIT = 80
ALARM_LIMIT = 60

app = FastAPI(
    title="智慧教室环境监测与节能调控平台 API",
    description="比赛 Demo 后端：使用内存模拟教室环境传感器、报警、设备控制和 AI 分析。",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class DeviceControlRequest(BaseModel):
    classroom_id: str = Field(default=CLASSROOM_ID)
    device: Literal["light", "ac", "ventilation"]
    action: Literal["on", "off"]


class AiAnalyzeRequest(BaseModel):
    classroom_id: str = Field(default=CLASSROOM_ID)


devices = {
    "light": True,
    "ac": False,
    "ventilation": False,
}

latest_state = {
    "classroom_id": CLASSROOM_ID,
    "temperature": 28.4,
    "humidity": 64.0,
    "co2": 1320,
    "pm25": 46,
    "noise": 61,
    "people_count": 48,
    "light_status": "on",
    "ac_status": "off",
    "ventilation_status": "off",
    "status": "warning",
    "update_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
}

history_data: Deque[dict] = deque(maxlen=HISTORY_LIMIT)
alarm_records: Deque[dict] = deque(maxlen=ALARM_LIMIT)
last_tick = datetime.now()


def api_response(data=None, message: str = "success", code: int = 200) -> dict:
    return {
        "code": code,
        "message": message,
        "data": data,
    }


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def round1(value: float) -> float:
    return round(value, 1)


def device_status(device: str) -> str:
    return "on" if devices[device] else "off"


def calculate_status(state: dict) -> str:
    danger_rules = [
        state["co2"] > 1500,
        state["temperature"] > 30,
        state["humidity"] > 75,
        state["pm25"] > 75,
        state["noise"] > 70,
        state["people_count"] > 55,
    ]
    warning_rules = [
        state["co2"] > 1200,
        state["temperature"] > 28,
        state["humidity"] > 68,
        state["pm25"] > 55,
        state["noise"] > 62,
        state["people_count"] > 48,
    ]
    if any(danger_rules):
        return "danger"
    if any(warning_rules):
        return "warning"
    return "normal"


def history_item(state: dict) -> dict:
    return {
        "time": datetime.now().strftime("%H:%M:%S"),
        "temperature": state["temperature"],
        "humidity": state["humidity"],
        "co2": state["co2"],
        "pm25": state["pm25"],
        "noise": state["noise"],
        "people_count": state["people_count"],
    }


def alarm_rules(state: dict) -> list[dict]:
    now = state["update_time"]
    classroom_id = state["classroom_id"]
    rules = [
        (
            state["co2"] > 1500,
            "CO2",
            "danger",
            f"CO₂ 严重偏高，当前 {state['co2']} ppm，建议立即开启新风。",
        ),
        (
            state["temperature"] > 30,
            "温度",
            "warning",
            f"温度偏高，当前 {state['temperature']} ℃，建议开启空调或加强通风。",
        ),
        (
            state["humidity"] > 75,
            "湿度",
            "warning",
            f"湿度偏高，当前 {state['humidity']}%，建议检查除湿或新风策略。",
        ),
        (
            state["pm25"] > 75,
            "PM2.5",
            "danger",
            f"空气质量异常，PM2.5 当前 {state['pm25']} μg/m³，建议开启新风并检查过滤设备。",
        ),
        (
            state["noise"] > 70,
            "噪声",
            "warning",
            f"噪声偏高，当前 {state['noise']} dB，建议提醒课堂保持安静。",
        ),
        (
            state["people_count"] > 55,
            "人数",
            "warning",
            f"人数过多，当前 {state['people_count']} 人，建议关注空间容量和通风负荷。",
        ),
    ]
    return [
        {
            "time": now,
            "classroom_id": classroom_id,
            "type": alarm_type,
            "level": level,
            "content": content,
        }
        for matched, alarm_type, level, content in rules
        if matched
    ]


def append_alarms(state: dict) -> None:
    for alarm in alarm_rules(state):
        alarm_records.appendleft(alarm)


def sync_device_status() -> None:
    latest_state["light_status"] = device_status("light")
    latest_state["ac_status"] = device_status("ac")
    latest_state["ventilation_status"] = device_status("ventilation")


def append_history(state: dict, tick_time: Optional[datetime] = None) -> None:
    item = history_item(state)
    if tick_time is not None:
        item["time"] = tick_time.strftime("%H:%M:%S")
    history_data.append(item)


def simulate_step(tick_time: Optional[datetime] = None) -> None:
    people_delta = random.choice([-2, -1, 0, 0, 1, 1, 2])
    latest_state["people_count"] = int(clamp(latest_state["people_count"] + people_delta, 26, 64))

    if devices["ac"]:
        temperature_delta = random.uniform(-0.55, -0.25)
    else:
        temperature_delta = random.uniform(-0.08, 0.24)
        if latest_state["people_count"] > 50:
            temperature_delta += random.uniform(0.05, 0.14)
    latest_state["temperature"] = round1(clamp(latest_state["temperature"] + temperature_delta, 22.0, 33.5))

    if devices["ventilation"]:
        co2_delta = random.uniform(-160, -80)
        pm25_delta = random.uniform(-6, -2)
        humidity_delta = random.uniform(-1.0, 0.2)
    else:
        co2_delta = random.uniform(18, 58) + max(latest_state["people_count"] - 42, 0) * 1.7
        pm25_delta = random.uniform(-1, 3.5)
        humidity_delta = random.uniform(-0.4, 0.9)

    latest_state["co2"] = int(clamp(latest_state["co2"] + co2_delta, 520, 1880))
    latest_state["pm25"] = int(clamp(latest_state["pm25"] + pm25_delta, 18, 96))
    latest_state["humidity"] = round1(clamp(latest_state["humidity"] + humidity_delta, 42, 82))

    noise_base = 44 + latest_state["people_count"] * 0.38
    latest_state["noise"] = int(clamp(noise_base + random.uniform(-4, 6), 42, 78))

    sync_device_status()
    latest_state["status"] = calculate_status(latest_state)
    latest_state["update_time"] = (tick_time or datetime.now()).strftime("%Y-%m-%d %H:%M:%S")

    append_history(latest_state, tick_time)
    append_alarms(latest_state)


def advance_simulation() -> None:
    global last_tick
    now = datetime.now()
    while (now - last_tick).total_seconds() >= SIM_INTERVAL_SECONDS:
        last_tick = last_tick + timedelta(seconds=SIM_INTERVAL_SECONDS)
        simulate_step(last_tick)


def seed_data() -> None:
    global last_tick
    now = datetime.now()
    start = now - timedelta(seconds=SIM_INTERVAL_SECONDS * 35)
    temp = 26.8
    humidity = 58.0
    co2 = 880
    pm25 = 38
    noise = 54
    people_count = 38

    for index in range(36):
        tick_time = start + timedelta(seconds=SIM_INTERVAL_SECONDS * index)
        people_count = int(clamp(people_count + random.choice([-1, 0, 1, 2]), 34, 54))
        temp = round1(clamp(temp + random.uniform(-0.08, 0.14), 25.2, 29.2))
        humidity = round1(clamp(humidity + random.uniform(-0.3, 0.6), 54, 67))
        co2 = int(clamp(co2 + random.uniform(18, 48), 760, 1450))
        pm25 = int(clamp(pm25 + random.uniform(-1.5, 2.2), 28, 58))
        noise = int(clamp(46 + people_count * 0.35 + random.uniform(-2, 4), 50, 66))
        history_data.append(
            {
                "time": tick_time.strftime("%H:%M:%S"),
                "temperature": temp,
                "humidity": humidity,
                "co2": co2,
                "pm25": pm25,
                "noise": noise,
                "people_count": people_count,
            }
        )

    latest_state.update(
        {
            "temperature": temp,
            "humidity": humidity,
            "co2": co2,
            "pm25": pm25,
            "noise": noise,
            "people_count": people_count,
            "update_time": now.strftime("%Y-%m-%d %H:%M:%S"),
        }
    )
    sync_device_status()
    latest_state["status"] = calculate_status(latest_state)
    last_tick = now

    seeded_alarms = [
        {
            "time": (now - timedelta(minutes=1, seconds=20)).strftime("%Y-%m-%d %H:%M:%S"),
            "classroom_id": CLASSROOM_ID,
            "type": "CO2",
            "level": "danger",
            "content": "CO₂ 严重偏高，历史峰值达到 1586 ppm，已建议开启新风。",
        },
        {
            "time": (now - timedelta(minutes=3, seconds=5)).strftime("%Y-%m-%d %H:%M:%S"),
            "classroom_id": CLASSROOM_ID,
            "type": "人数",
            "level": "warning",
            "content": "人数过多，历史人数达到 58 人，通风负荷上升。",
        },
        {
            "time": (now - timedelta(minutes=5, seconds=40)).strftime("%Y-%m-%d %H:%M:%S"),
            "classroom_id": CLASSROOM_ID,
            "type": "噪声",
            "level": "warning",
            "content": "噪声偏高，历史噪声达到 72 dB，建议课堂秩序提醒。",
        },
    ]
    for alarm in reversed(seeded_alarms):
        alarm_records.appendleft(alarm)


def build_mock_ai_analysis(state: dict) -> str:
    status_text = {
        "normal": "整体处于正常区间",
        "warning": "整体处于预警状态",
        "danger": "整体存在明显异常",
    }[state["status"]]

    problems = []
    if state["co2"] > 1500:
        problems.append("CO₂ 浓度严重偏高，学生注意力和舒适度可能下降")
    elif state["co2"] > 1200:
        problems.append("CO₂ 浓度接近高位，需要关注通风效率")
    if state["temperature"] > 30:
        problems.append("温度偏高，教室体感闷热")
    elif state["temperature"] > 28:
        problems.append("温度略高，可适度降温")
    if state["pm25"] > 75:
        problems.append("PM2.5 超标，空气质量异常")
    if state["noise"] > 70:
        problems.append("噪声偏高，影响课堂专注")
    if state["people_count"] > 55:
        problems.append("人数较多，环境负荷增大")

    problem_text = "；".join(problems) if problems else "未发现明显异常指标"
    ventilation_advice = "保持新风开启 10-15 分钟，待 CO₂ 降至 1000 ppm 以下再切换为间歇通风。"
    if state["ventilation_status"] == "on":
        ventilation_advice = "新风已开启，建议继续观察 CO₂ 下降趋势，避免长时间满功率运行。"

    ac_advice = "空调保持关闭或设为节能模式。"
    if state["temperature"] > 28 and state["ac_status"] == "off":
        ac_advice = "建议开启空调并将目标温度设置为 26-27 ℃。"
    elif state["ac_status"] == "on":
        ac_advice = "空调已开启，建议温度稳定后调高设定值，减少持续高负载。"

    return (
        f"当前环境判断：{CLASSROOM_ID} {status_text}。温度 {state['temperature']} ℃，湿度 "
        f"{state['humidity']}%，CO₂ {state['co2']} ppm，PM2.5 {state['pm25']} μg/m³，"
        f"噪声 {state['noise']} dB，人数 {state['people_count']} 人。\n\n"
        f"存在问题：{problem_text}。\n\n"
        f"调控建议：{ventilation_advice}{ac_advice} 灯光可根据上课状态维持当前策略。\n\n"
        "节能建议：优先采用“有人开、无人关、达标降档”的联动策略；当人数下降或 CO₂、温度恢复正常后，"
        "新风和空调从连续运行切换为低频巡航，降低无效能耗。"
    )


async def call_deepseek_analysis(state: dict) -> Optional[str]:
    api_key = os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        return None

    prompt = (
        "你是智慧校园节能运维助手。请基于以下教室环境数据，输出中文分析，包含："
        "当前环境判断、存在问题、调控建议、节能建议。要求适合比赛演示，简洁有条理。\n"
        f"数据：{state}"
    )

    # 真实 DeepSeek 接入预留位置：
    # 1. 在系统环境变量中设置 DEEPSEEK_API_KEY。
    # 2. 如需强制使用 mock，可设置 DEEPSEEK_MOCK=true。
    # 3. DeepSeek 提供 OpenAI 兼容的 chat completions 接口。
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                "https://api.deepseek.com/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
                    "messages": [
                        {"role": "system", "content": "你是专业的智慧教室环境监测与节能分析助手。"},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.4,
                },
            )
            response.raise_for_status()
            payload = response.json()
            return payload["choices"][0]["message"]["content"]
    except Exception:
        return None


@app.get("/")
def root() -> dict:
    return api_response(
        {
            "name": "smart-classroom-demo",
            "docs": "/docs",
            "health": "/health",
        }
    )


@app.get("/health")
def health() -> dict:
    return api_response({"status": "ok"})


@app.get("/api/classroom/latest")
def get_latest_classroom() -> dict:
    advance_simulation()
    return api_response(latest_state)


@app.get("/api/classroom/history")
def get_classroom_history() -> dict:
    advance_simulation()
    return api_response(list(history_data))


@app.get("/api/alarm/list")
def get_alarm_list() -> dict:
    advance_simulation()
    return api_response(list(alarm_records))


@app.post("/api/device/control")
def control_device(payload: DeviceControlRequest) -> dict:
    advance_simulation()
    devices[payload.device] = payload.action == "on"
    sync_device_status()

    if payload.device == "ventilation" and payload.action == "on":
        latest_state["co2"] = int(clamp(latest_state["co2"] - random.uniform(80, 140), 520, 1880))
        latest_state["pm25"] = int(clamp(latest_state["pm25"] - random.uniform(2, 5), 18, 96))
    if payload.device == "ac" and payload.action == "on":
        latest_state["temperature"] = round1(clamp(latest_state["temperature"] - random.uniform(0.3, 0.7), 22.0, 33.5))

    latest_state["status"] = calculate_status(latest_state)
    latest_state["update_time"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    append_history(latest_state)
    append_alarms(latest_state)

    return api_response(
        {
            "classroom_id": payload.classroom_id,
            "device": payload.device,
            "action": payload.action,
            "light_status": latest_state["light_status"],
            "ac_status": latest_state["ac_status"],
            "ventilation_status": latest_state["ventilation_status"],
            "latest": latest_state,
        }
    )


@app.post("/api/ai/analyze")
async def ai_analyze(payload: Optional[AiAnalyzeRequest] = None) -> dict:
    advance_simulation()
    use_mock = os.getenv("DEEPSEEK_MOCK", "true").lower() in {"1", "true", "yes", "on"}
    analysis = None if use_mock else await call_deepseek_analysis(latest_state)
    mode = "deepseek" if analysis else "mock"

    return api_response(
        {
            "classroom_id": payload.classroom_id if payload else CLASSROOM_ID,
            "mode": mode,
            "analysis": analysis or build_mock_ai_analysis(latest_state),
            "update_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }
    )


seed_data()
