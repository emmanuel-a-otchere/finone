"""
Signal Expiry Cron Job
Marks signals as EXPIRED when expires_at has passed.
Run via cron: 0,15,30,45 * * * * python3 /path/to/expiry.py
"""
import psycopg2
from datetime import datetime, timezone

def expire_signals():
    conn = psycopg2.connect(
        host="localhost",
        database="systemone",
        user="sysops",
        password="sysone123"
    )
    cur = conn.cursor()

    # Select signals that are still ACTIVE but past expires_at
    cur.execute("""
        UPDATE signals
        SET status = 'EXPIRED'
        WHERE status = 'ACTIVE'
          AND expires_at IS NOT NULL
          AND expires_at < NOW()
        RETURNING id, symbol, expires_at, status;
    """)
    expired = cur.fetchall()
    conn.commit()

    if expired:
        print(f"[{datetime.now(timezone.utc).isoformat()}] Expired {len(expired)} signals:")
        for row in expired:
            print(f"  {row[0]} {row[1]} (expired {row[2]})")
    else:
        print(f"[{datetime.now(timezone.utc).isoformat()}] No signals to expire")

    conn.close()
    return len(expired)

if __name__ == "__main__":
    expire_signals()