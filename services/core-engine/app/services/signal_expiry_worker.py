"""
Signal Expiry Background Worker.
Runs in a loop, checking for expired signals every 15 minutes.
Start with: python3 signal_expiry_worker.py &
Stops on SIGINT/SIGTERM.
"""
import signal, sys, time, os
sys.path.insert(0, os.path.dirname(__file__))

from signal_expiry_service import expire_signals

INTERVAL_SECONDS = 900  # 15 minutes

def main():
    print(f"[expiry-worker] Starting — will check every {INTERVAL_SECONDS}s")
    while True:
        try:
            count = expire_signals()
            print(f"[expiry-worker] Cycle done. Expired: {count}")
        except Exception as e:
            print(f"[expiry-worker] Error: {e}")
        time.sleep(INTERVAL_SECONDS)

if __name__ == "__main__":
    main()