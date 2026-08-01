#!/usr/bin/env python3
import json
import os
import subprocess
import sys
import uuid
from pathlib import Path

ROOT = Path(os.environ.get("WORKBENCH_ROOT", Path(__file__).resolve().parents[1])).resolve()
RACHEL_SKILL = ROOT / "rachel-skill" / "SKILL.md"
RUNTIME = ROOT / "agent-runtime"
STATE_PATH = RUNTIME / "job-state.json"
CONFIG_PATH = RUNTIME / "config.json"
INBOX_PATH = RUNTIME / "inbox.json"
PREFLIGHT = ROOT / "rachel-skill" / "scripts" / "preflight_assets.py"

TOOLS = [
    {
        "name": "digital_human_get_status",
        "description": "读取数字人工作流当前状态、Skill 注册状态和安全配置摘要。",
        "inputSchema": {"type": "object", "properties": {}},
    },
    {
        "name": "digital_human_preflight_assets",
        "description": "运行 Rachel Skill 的素材预检，检查脚本、肖像和声音样本后再进入付费阶段。",
        "inputSchema": {
            "type": "object",
            "properties": {
                "script": {"type": "string", "description": "相对工作台根目录的脚本路径"},
                "portrait": {"type": "string", "description": "相对工作台根目录的肖像路径"},
                "voice": {"type": "string", "description": "相对工作台根目录的声音路径"},
            },
        },
    },
    {
        "name": "digital_human_configure_models",
        "description": "配置 MiniMax 和 HeyGen 的模型路由与环境变量名；不接收或保存 API Key。",
        "inputSchema": {
            "type": "object",
            "properties": {
                "minimax_model": {"type": "string"},
                "heygen_model": {"type": "string"},
                "minimax_key_env": {"type": "string"},
                "heygen_key_env": {"type": "string"},
                "minimax_configured": {"type": "boolean"},
                "heygen_configured": {"type": "boolean"},
            },
        },
    },
    {
        "name": "digital_human_prepare_stage",
        "description": "按 Skill 门禁准备下一阶段；只生成 dry-run 计划，不调用外部付费 API。",
        "inputSchema": {
            "type": "object",
            "properties": {
                "stage": {"type": "string", "enum": ["narration", "preview", "final"]},
                "confirmed": {"type": "boolean", "description": "用户是否明确确认本次阶段"},
            },
            "required": ["stage"],
        },
    },
    {
      "name": "digital_human_approve_preview",
        "description": "记录用户对 15 秒预览的审批；只有审批通过后才能准备最终视频。",
        "inputSchema": {
            "type": "object",
            "properties": {
                "approved": {"type": "boolean"},
                "note": {"type": "string"},
            },
            "required": ["approved"],
      },
    },
    {
        "name": "digital_human_get_inbox",
        "description": "读取工作台投递给 Agent 的最新任务。",
        "inputSchema": {"type": "object", "properties": {}},
    },
    {
        "name": "digital_human_handoff",
        "description": "把一条显式任务写入工作台 Agent inbox，等待 Agent 读取。",
        "inputSchema": {
            "type": "object",
            "properties": {
                "prompt": {"type": "string"},
                "source": {"type": "string"},
            },
            "required": ["prompt"],
        },
    },
    {
        "name": "digital_human_sync_workflow",
        "description": "把工作台已完成的阶段同步到 Agent 状态文件；不调用外部付费 API。",
        "inputSchema": {
            "type": "object",
            "properties": {
                "stage": {"type": "string", "enum": ["assets", "narration", "preview", "approval", "final"]},
                "status": {"type": "string", "enum": ["passed", "completed", "submitted", "approved", "rejected", "not_started"]},
                "source": {"type": "string"},
            },
            "required": ["stage", "status"],
        },
    },
]


def default_state():
    return {
        "project": "数字人视频项目",
        "skill": "rachel-digital-human-production",
        "workflow": {
            "assets": "passed",
            "narration": "completed",
            "preview": "completed",
            "approved": False,
            "final": "not_started",
        },
        "last_action": None,
    }


def default_config():
    return {
        "runtime_mode": "local-dry-run",
        "skill_registered": True,
        "mcp_registered": True,
        "minimax": {
            "model": "speech-2.8-hd",
            "key_env": "MINIMAX_API_KEY",
            "configured": False,
        },
        "heygen": {
            "model": "avatar_iv",
            "key_env": "HEYGEN_API_KEY",
            "configured": False,
        },
    }


def read_json(path, fallback):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return fallback


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def safe_path(value, default):
    candidate = (ROOT / (value or default)).resolve()
    if candidate != ROOT and ROOT not in candidate.parents:
        raise ValueError("path must stay inside the workbench root")
    return candidate


def current_state():
    state = read_json(STATE_PATH, default_state())
    config = read_json(CONFIG_PATH, default_config())
    state["skill_registered"] = RACHEL_SKILL.exists()
    state["mcp_server"] = "digital-human-workbench"
    state["runtime_mode"] = config.get("runtime_mode", "local-dry-run")
    return state


def call_tool(name, arguments):
    arguments = arguments or {}
    if name == "digital_human_get_status":
        return current_state()
    if name == "digital_human_get_inbox":
        return read_json(INBOX_PATH, {"status": "empty"})
    if name == "digital_human_handoff":
        prompt = arguments.get("prompt")
        if not prompt:
            raise ValueError("prompt is required")
        payload = {
            "id": str(uuid.uuid4()),
            "status": "pending",
            "prompt": prompt,
            "source": arguments.get("source", "mcp"),
        }
        write_json(INBOX_PATH, payload)
        return {"accepted": True, "inbox": "agent-runtime/inbox.json", "id": payload["id"]}
    if name == "digital_human_sync_workflow":
        stage = arguments.get("stage")
        status = arguments.get("status")
        if stage not in {"assets", "narration", "preview", "approval", "final"}:
            raise ValueError("unknown workflow stage")
        if status not in {"passed", "completed", "submitted", "approved", "rejected", "not_started"}:
            raise ValueError("unknown workflow status")
        state = current_state()
        workflow = state["workflow"]
        if stage == "narration" and status == "completed" and workflow["assets"] != "passed":
            raise ValueError("asset preflight must pass before narration")
        if stage == "preview" and status == "completed" and workflow["narration"] != "completed":
            raise ValueError("narration must complete before preview")
        if stage == "approval" and status == "approved" and workflow["preview"] != "completed":
            raise ValueError("preview must complete before approval")
        if stage == "final" and status == "completed" and not workflow["approved"]:
            raise ValueError("preview approval is required before final video")
        if stage == "assets": workflow["assets"] = status
        if stage == "narration": workflow["narration"] = status
        if stage == "preview": workflow["preview"] = status
        if stage == "approval": workflow["approved"] = status == "approved"
        if stage == "final": workflow["final"] = status
        state["last_action"] = {"tool": name, "stage": stage, "status": status, "source": arguments.get("source", "mcp")}
        write_json(STATE_PATH, state)
        return {"synced": True, "workflow": workflow}
    if name == "digital_human_preflight_assets":
        command = [
            sys.executable,
            str(PREFLIGHT),
            "--script",
            str(safe_path(arguments.get("script"), "inputs/script.md")),
            "--portrait",
            str(safe_path(arguments.get("portrait"), "inputs/portrait.jpg")),
            "--voice",
            str(safe_path(arguments.get("voice"), "inputs/voice-source.mp3")),
        ]
        result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, check=False)
        try:
            report = json.loads(result.stdout)
        except json.JSONDecodeError:
            report = {"ok": False, "issues": [result.stderr.strip() or "preflight did not return JSON"]}
        state = current_state()
        state["workflow"]["assets"] = "passed" if report.get("ok") else "blocked"
        state["last_action"] = {"tool": name, "result": report}
        write_json(STATE_PATH, state)
        return report
    if name == "digital_human_configure_models":
        config = read_json(CONFIG_PATH, default_config())
        config["minimax"].update({
            "model": arguments.get("minimax_model", config["minimax"]["model"]),
            "key_env": arguments.get("minimax_key_env", config["minimax"]["key_env"]),
            "configured": bool(arguments.get("minimax_configured", config["minimax"]["configured"])),
        })
        config["heygen"].update({
            "model": arguments.get("heygen_model", config["heygen"]["model"]),
            "key_env": arguments.get("heygen_key_env", config["heygen"]["key_env"]),
            "configured": bool(arguments.get("heygen_configured", config["heygen"]["configured"])),
        })
        write_json(CONFIG_PATH, config)
        return {"saved": True, "config": config, "api_keys_saved": False}
    if name == "digital_human_prepare_stage":
        stage = arguments.get("stage")
        state = current_state()
        workflow = state["workflow"]
        if stage == "narration" and workflow["assets"] != "passed":
            raise ValueError("asset preflight must pass before narration")
        if stage == "preview" and workflow["narration"] != "completed":
            raise ValueError("narration must complete before preview")
        if stage == "final" and not workflow["approved"]:
            raise ValueError("preview approval is required before final video")
        if not arguments.get("confirmed", False):
            return {"ready": False, "requires_confirmation": True, "stage": stage, "mode": "local-dry-run"}
        state["last_action"] = {"tool": name, "stage": stage, "mode": "local-dry-run"}
        write_json(STATE_PATH, state)
        return {
            "ready": True,
            "stage": stage,
            "mode": "local-dry-run",
            "provider_action": "not_called",
            "next": "Connect a backend adapter before making paid MiniMax or HeyGen requests.",
        }
    if name == "digital_human_approve_preview":
        state = current_state()
        if arguments.get("approved") and state["workflow"]["preview"] != "completed":
            raise ValueError("preview must be completed before approval")
        state["workflow"]["approved"] = bool(arguments.get("approved"))
        state["last_action"] = {"tool": name, "note": arguments.get("note", "")}
        write_json(STATE_PATH, state)
        return {"approved": state["workflow"]["approved"], "final_unlocked": state["workflow"]["approved"]}
    raise ValueError(f"unknown tool: {name}")


def response(request_id, result=None, error=None):
    payload = {"jsonrpc": "2.0", "id": request_id}
    if error:
        payload["error"] = {"code": -32000, "message": str(error)}
    else:
        payload["result"] = result
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    sys.stdout.buffer.write(f"Content-Length: {len(body)}\r\n\r\n".encode("ascii") + body)
    sys.stdout.buffer.flush()


def read_request():
    headers = {}
    while True:
        line = sys.stdin.buffer.readline()
        if not line:
            return None
        line = line.decode("ascii").strip()
        if not line:
            break
        key, _, value = line.partition(":")
        headers[key.lower()] = value.strip()
    length = int(headers.get("content-length", "0"))
    return json.loads(sys.stdin.buffer.read(length).decode("utf-8"))


def main():
    while True:
        request = read_request()
        if request is None:
            return
        method = request.get("method")
        request_id = request.get("id")
        if method == "initialize":
            response(request_id, {
                "protocolVersion": "2025-06-18",
                "capabilities": {"tools": {}, "resources": {}},
                "serverInfo": {"name": "digital-human-workbench", "version": "0.1.0"},
            })
        elif method == "tools/list":
            response(request_id, {"tools": TOOLS})
        elif method == "tools/call":
            try:
                result = call_tool(request["params"]["name"], request["params"].get("arguments"))
                response(request_id, {"content": [{"type": "text", "text": json.dumps(result, ensure_ascii=False, indent=2)}], "structuredContent": result})
            except Exception as exc:
                response(request_id, error=exc)
        elif method == "resources/list":
            response(request_id, {"resources": [{"uri": "skill://rachel-digital-human-production", "name": "Rachel Skill", "mimeType": "text/markdown"}, {"uri": "config://digital-human-workbench", "name": "Agent Config", "mimeType": "application/json"}]})
        elif method == "resources/read":
            uri = request["params"]["uri"]
            if uri == "skill://rachel-digital-human-production":
                text = RACHEL_SKILL.read_text(encoding="utf-8")
                response(request_id, {"contents": [{"uri": uri, "mimeType": "text/markdown", "text": text}]})
            elif uri == "config://digital-human-workbench":
                response(request_id, {"contents": [{"uri": uri, "mimeType": "application/json", "text": json.dumps(current_state(), ensure_ascii=False, indent=2)}]})
            else:
                response(request_id, error="unknown resource")
        elif request_id is not None:
            response(request_id, error=f"unknown method: {method}")


if __name__ == "__main__":
    main()
