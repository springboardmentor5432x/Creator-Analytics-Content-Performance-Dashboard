import time
from fastapi import FastAPI
from fastapi.testclient import TestClient

app_mini = FastAPI()

@app_mini.get("/ping")
def ping():
    return {"message": "pong"}

print("Creating TestClient for minimal app...", flush=True)
c = TestClient(app_mini)

print("Calling /ping...", flush=True)
t0 = time.time()
res = c.get("/ping")
print("Response:", res.status_code, res.json(), f"in {time.time()-t0:.3f}s", flush=True)

