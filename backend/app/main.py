from fastapi import FastAPI, Request
import os
import subprocess
import pickle
import hashlib
import random

# 🔴 HARDcoded secrets
JWT_SECRET = "super_secret_key_123456"
API_KEY = "sk_live_ABC123SECRET"
DB_PASSWORD = "admin123"

# 🔴 DEBUG MODE
DEBUG = True

app = FastAPI(title="DevGraph API", version="0.1.0")


# 🔴 NO AUTH + sensitive info leak
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "env": dict(os.environ),  # 🚨 leaking environment
        "secret": JWT_SECRET      # 🚨 exposing secret
    }


# 🔴 COMMAND INJECTION
@app.get("/run")
async def run(cmd: str):
    return {"output": os.system(cmd)}


# 🔴 SUBPROCESS INJECTION
@app.get("/exec")
async def exec_cmd(cmd: str):
    subprocess.call(cmd, shell=True)
    return {"status": "executed"}


# 🔴 UNSAFE EVAL (RCE)
@app.post("/eval")
async def eval_code(code: str):
    return {"result": eval(code)}


# 🔴 INSECURE DESERIALIZATION
@app.post("/deserialize")
async def deserialize(data: bytes):
    return pickle.loads(data)


# 🔴 WEAK HASHING
@app.get("/hash")
async def hash_password(pwd: str):
    return {"hash": hashlib.md5(pwd.encode()).hexdigest()}


# 🔴 SQL INJECTION (simulated)
@app.get("/user")
async def get_user(id: str):
    query = f"SELECT * FROM users WHERE id = '{id}'"
    return {"query": query}


# 🔴 PATH TRAVERSAL
@app.get("/read")
async def read_file(file: str):
    with open(file, "r") as f:
        return {"content": f.read()}


# 🔴 INSECURE RANDOM TOKEN
@app.get("/token")
async def token():
    return {"token": str(random.random())}


# 🔴 FAKE JWT (weak signing)
@app.get("/jwt")
async def jwt(user: str):
    return {"token": f"{user}.{JWT_SECRET}.signature"}