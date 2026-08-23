import json
import os
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WDK_RUNNER = ROOT / "src" / "pay" / "wdk_runner.js"


def test_wdk_runner_requires_seed_phrase(tmp_path):
    env = os.environ.copy()
    env.pop("WDK_SEED_PHRASE", None)

    result = subprocess.run(
        ["node", str(WDK_RUNNER)],
        input=json.dumps(
            {
                "action": "preview",
                "network": "ethereum",
                "tokenAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
                "recipient": "0x1111111111111111111111111111111111111111",
                "amount": "10500000",
            }
        ),
        text=True,
        capture_output=True,
        check=False,
        cwd=tmp_path,
        env=env,
        timeout=30,
    )

    assert result.returncode == 0
    data = json.loads(result.stdout)
    assert data["ok"] is False
    assert data["payment_status"] == "WDK_RUNNER_ERROR"
    assert "WDK_SEED_PHRASE" in data["reason"]
