import subprocess
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg2
import psycopg2.extras
import time
from web3.auto import w3
from eth_account.messages import encode_defunct
import re
import os
import json
import aioredis
import asyncio
from contextlib import asynccontextmanager
from decimal import Decimal
import datetime

# Функция для преобразования несериализуемых типов
def convert_to_serializable(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, datetime.datetime):
        return obj.isoformat()  # Преобразуем datetime в строку формата ISO 8601
    if isinstance(obj, datetime.date):
        return obj.isoformat()  # Преобразуем date в строку формата ISO 8601
    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")

@asynccontextmanager
async def lifespan(app: FastAPI):
    global redis
    try:
        redis = await aioredis.from_url(REDIS_URL, decode_responses=True)
        print("Connected to Redis successfully.")
    except Exception as e:
        print(f"Error connecting to Redis: {e}")
        raise
    
    # Запуск main.py и ожидание завершения
    print("Running main.py at startup...")
    await run_main_script()
    print("main.py finished. Starting other tasks.")

    # Запуск задачи обновления кэша
    asyncio.create_task(refresh_cache())

    # Запуск main.py каждые 10 минут
    asyncio.create_task(schedule_main_script())

    yield

    # Закрытие соединения с Redis при завершении работы приложения
    if redis:
        await redis.close()

app = FastAPI(lifespan=lifespan)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust origins as needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Redis connection
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")
redis = None

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://sophon:sophon@postgres:5432/sophon")

def get_db_connection():
    return psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.DictCursor)

async def run_main_script():
    """
    Function to execute main.py.
    """
    try:
        print("Starting main.py execution...")
        result = subprocess.run(["python", "main.py"], capture_output=True, text=True)
        if result.returncode == 0:
            print("main.py executed successfully.")
            print(result.stdout)
        else:
            print("Error executing main.py:")
            print(result.stderr)
    except Exception as e:
        print(f"Failed to run main.py: {e}")

async def schedule_main_script():
    """
    Schedule `main.py` to run every 10 minutes.
    """
    while True:
        try:
            print("Scheduled execution of main.py...")
            await run_main_script()
        except Exception as e:
            print(f"Error in scheduled main.py execution: {e}")
        await asyncio.sleep(900)  # Wait for 15 minutes


# Database helper function
def execute_query(query: str, params=(), fetchall=True):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(query, params)
    conn.commit()
    result = cursor.fetchall() if fetchall else None
    conn.close()
    return result


# Models
class PostNodeRequest(BaseModel):
    nodeText: str
    accountAddress: str
    signature: str

# Background task for refreshing cache
async def refresh_cache():
    try:
        while True:
            query = """SELECT 
                n.operator,
                n.status,
                n.rewards,
                n.fee::double precision AS fee, -- Преобразование fee к double precision
                ROUND(n.uptime::numeric, 1) AS uptime,
                MIN(CASE WHEN l.event_type = 'DELEGATE' THEN l.timestamp ELSE NULL END) AS created_at, 
                COALESCE(SUM(CASE WHEN l.event_type = 'DELEGATE' THEN l.amount ELSE 0 END), 0) - 
                COALESCE(SUM(CASE WHEN l.event_type = 'UNDELEGATE' THEN l.amount ELSE 0 END), 0) AS actual_delegations,
                COALESCE(SUM(CASE WHEN l.event_type = 'DELEGATE' THEN l.amount ELSE 0 END), 0) AS total_delegate_amount,
                COALESCE(SUM(CASE WHEN l.event_type = 'UNDELEGATE' THEN l.amount ELSE 0 END), 0) AS total_undelegate_amount,
                COUNT(CASE WHEN l.event_type = 'DELEGATE' THEN 1 ELSE NULL END) AS total_delegate_operations,
                COUNT(CASE WHEN l.event_type = 'UNDELEGATE' THEN 1 ELSE NULL END) AS total_undelegate_operations,
                COALESCE(
                    (SELECT STRING_AGG(DISTINCT guardian, ',') 
                    FROM logs l2 
                    WHERE upper(l2.operator) = upper(n.operator) 
                    AND l2.event_type = 'DELEGATE' 
                    AND NOT EXISTS (
                        SELECT 1 
                        FROM logs l3 
                        WHERE l3.guardian = l2.guardian 
                            AND l3.operator = l2.operator 
                            AND l3.event_type = 'UNDELEGATE' 
                            AND l3.timestamp > l2.timestamp
                    )
                    ), '') AS current_delegators
            FROM 
                nodes n 
            LEFT JOIN 
                logs l ON upper(l.operator) = upper(n.operator)
            GROUP BY 
                n.operator, n.status, n.rewards, n.fee, n.uptime;"""
            
            data = execute_query(query)

            # Преобразуем данные в JSON-совместимый формат
            serializable_data = [
                dict(row) for row in data  # Преобразуем строки курсора в словари
            ]
            
            # Сохраняем в Redis как JSON-строку
            await redis.set("table_data", json.dumps(serializable_data, default=convert_to_serializable), ex=1100)


            await asyncio.sleep(1000)  # Wait for 16 minutes
    except Exception as e:
        print(f"Error in refresh_cache: {e}")


@app.get("/api/table-data")
async def table_data():
    if redis is None:
        raise HTTPException(status_code=500, detail="Redis is not initialized.")
    
    cached_data = await redis.get("table_data")
    if cached_data:
        try:
            # Преобразуем данные в массивы
            formatted_data = [
                [
                    row["operator"],
                    1 if row["status"] else 0,
                    row["rewards"],
                    row["fee"],
                    row["uptime"],
                    row["created_at"].replace("T", " ") if row["created_at"] else None,
                    row["actual_delegations"],
                    row["total_delegate_amount"],
                    row["total_undelegate_amount"],
                    row["total_delegate_operations"],
                    row["total_undelegate_operations"],
                    row["current_delegators"]
                ]
                for row in json.loads(cached_data)
            ]

            return formatted_data
        except json.JSONDecodeError as e:
            print(f"Error decoding JSON from Redis: {e}")
            raise HTTPException(status_code=500, detail="Failed to decode cached data.")
    
    # Запрос к базе данных
    query = """SELECT 
        n.operator, 
        n.status, 
        n.rewards, 
        n.fee::double precision AS fee, 
        ROUND(n.uptime::numeric, 1) AS uptime, 
        MIN(CASE WHEN l.event_type = 'DELEGATE' THEN l.timestamp ELSE NULL END) AS created_at, 
        COALESCE(SUM(CASE WHEN l.event_type = 'DELEGATE' THEN l.amount ELSE 0 END), 0) - 
        COALESCE(SUM(CASE WHEN l.event_type = 'UNDELEGATE' THEN l.amount ELSE 0 END), 0) AS actual_delegations, 
        COALESCE(SUM(CASE WHEN l.event_type = 'DELEGATE' THEN l.amount ELSE 0 END), 0) AS total_delegate_amount, 
        COALESCE(SUM(CASE WHEN l.event_type = 'UNDELEGATE' THEN l.amount ELSE 0 END), 0) AS total_undelegate_amount, 
        COUNT(CASE WHEN l.event_type = 'DELEGATE' THEN 1 ELSE NULL END) AS total_delegate_operations, 
        COUNT(CASE WHEN l.event_type = 'UNDELEGATE' THEN 1 ELSE NULL END) AS total_undelegate_operations, 
        COALESCE(
            (SELECT STRING_AGG(DISTINCT guardian, ',') 
             FROM logs l2 
             WHERE upper(l2.operator) = upper(n.operator) 
               AND l2.event_type = 'DELEGATE' 
               AND NOT EXISTS (
                   SELECT 1 
                   FROM logs l3 
                   WHERE l3.guardian = l2.guardian 
                     AND l3.operator = l2.operator 
                     AND l3.event_type = 'UNDELEGATE' 
                     AND l3.timestamp > l2.timestamp
               )
            ), '') AS current_delegators
    FROM 
        nodes n 
    LEFT JOIN 
        logs l ON upper(l.operator) = upper(n.operator)
    GROUP BY 
        n.operator, n.status, n.rewards, n.fee, n.uptime;"""
    
    try:
        # Выполняем запрос к PostgreSQL
        data = execute_query(query)
        
        # Преобразуем данные в JSON-совместимый формат
        serializable_data = [
            dict(row) for row in data  # Преобразуем строки курсора в словари
        ]
        
        # Сохраняем в Redis как JSON-строку
        await redis.set("table_data", json.dumps(serializable_data, default=convert_to_serializable), ex=900)

        # Преобразуем данные в массивы
        formatted_data = [
            [
                row["operator"],
                1 if row["status"] else 0,
                row["rewards"],
                row["fee"],
                row["uptime"],
                row["created_at"].replace("T", " ") if row["created_at"] else None,
                row["actual_delegations"],
                row["total_delegate_amount"],
                row["total_undelegate_amount"],
                row["total_delegate_operations"],
                row["total_undelegate_operations"],
                row["current_delegators"]
            ]
            for row in data
        ]

        return formatted_data
    
    except Exception as e:
        print(f"Error querying database or setting Redis: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving table data.")

@app.get("/api/promote-table")
def table_promote():
    query = """
        SELECT 
    l.operator,
    n.status,
    20 - (SUM(CASE WHEN l.event_type = 'DELEGATE' THEN l.amount ELSE 0 END) -
    SUM(CASE WHEN l.event_type = 'UNDELEGATE' THEN l.amount ELSE 0 END)) AS actual_delegations,
    n.fee,
    ROUND(n.uptime::numeric, 1) AS uptime,
    MIN(CASE WHEN l.event_type = 'DELEGATE' THEN l.timestamp ELSE NULL END) AS created_at,
    n.node_text,
    MAX(n.updated_at) AS last_updated -- Используем максимальное значение даты обновления
FROM 
    logs l
LEFT JOIN 
    nodes n 
ON 
    upper(l.operator) = upper(n.operator)
WHERE 
    n.is_ad = true
    AND n.status = true 
GROUP BY 
    l.operator,
    n.status,
    n.fee,
    n.uptime,
    n.node_text
HAVING 
    SUM(CASE WHEN l.event_type = 'DELEGATE' THEN l.amount ELSE 0 END) -
    SUM(CASE WHEN l.event_type = 'UNDELEGATE' THEN l.amount ELSE 0 END) < 20
ORDER BY 
    last_updated DESC;
    """
    data = execute_query(query)
    return data

@app.get("/api/operator-details")
async def operator_details(operator: str):
    query = """SELECT 
        block_number,
        transaction_hash,
        event_type,
        amount,
        guardian,
        timestamp -- убрали лишнюю запятую
    FROM logs 
    WHERE operator = %s
    ORDER BY timestamp DESC;"""  # исправили форматирование
    data = execute_query(query, (operator,))
    return data

@app.post("/api/post-node")
async def post_node(request: PostNodeRequest):
    message = encode_defunct(text=request.nodeText)
    signer = w3.eth.account.recover_message(message, signature=request.signature)

    if signer.lower() != request.accountAddress.lower():
        raise HTTPException(status_code=400, detail="Invalid signature")

    sanitized_text = re.sub(r"<[^>]*>", "", request.nodeText.strip()[:100])
    query = """UPDATE nodes SET node_text = %s, is_ad = true WHERE operator = %s;"""
    execute_query(query, (sanitized_text, request.accountAddress), fetchall=False)
    return {"message": "Done"}

@app.get("/api/operator-status")
async def operator_status():
    query = "SELECT status, COUNT(*) FROM nodes GROUP BY status;"
    data = execute_query(query)
    return {"statuses": [row[0] for row in data], "counts": [row[1] for row in data]}

@app.get("/api/uptime-distribution")
async def uptime_distribution():
    query = "SELECT ROUND(uptime) AS uptime, COUNT(*) FROM nodes GROUP BY ROUND(uptime) ORDER BY uptime DESC;"
    data = execute_query(query)
    return {"uptime": [row[0] for row in data], "count": [row[1] for row in data]}

@app.get("/api/delegation-distribution")
async def delegation_distribution():
    query = """
    SELECT total_delegations, COUNT(operator) AS number_of_operators
    FROM (
        SELECT operator, 
                SUM(CASE WHEN event_type = 'DELEGATE' THEN amount ELSE 0 END) - 
                SUM(CASE WHEN event_type = 'UNDELEGATE' THEN amount ELSE 0 END) AS total_delegations
        FROM logs 
        GROUP BY operator
    ) AS delegation_groups
    GROUP BY total_delegations
    ORDER BY total_delegations DESC;
    """
    data = execute_query(query)
    return ({"operators": [row[0] for row in data], "delegations": [row[1] for row in data]})

@app.get("/api/commission-distribution")
async def commission_distribution():
    query = """
    select fee, count(*) as number_of_operators from nodes group by fee order by fee desc;
    """
    data = execute_query(query)
    return ({"fee": [row[0] for row in data], "operators": [row[1] for row in data]})

@app.get("/api/system-info")
async def system_info():
    query = "SELECT * FROM system;"
    data = execute_query(query)
    return {"last_update": [row[1] for row in data], "last_block": [row[2] for row in data]}

@app.get("/api/event-dynamics")
async def event_dynamics():
    query = """SELECT DATE(timestamp) AS date, SUM(CASE WHEN event_type = 'MINT' THEN 1 ELSE 0 END) AS mint, \
            SUM(CASE WHEN event_type = 'DELEGATE' THEN 1 ELSE 0 END) AS delegations, \
            SUM(CASE WHEN event_type = 'UNDELEGATE' THEN 1 ELSE 0 END) AS undelegations, COUNT(*) AS total_events \
            FROM logs GROUP BY DATE(timestamp) ORDER BY DATE(timestamp) ASC;"""
    data = execute_query(query)
    return {
        "dates": [row[0] for row in data],
        "mint": [row[1] for row in data],
        "delegations": [row[2] for row in data],
        "undelegations": [row[3] for row in data],
        "total": [row[4] for row in data]
    }

@app.get("/api/top-delegators")
async def top_delegators():
    query = """SELECT 
                guardian,
                SUM(CASE WHEN event_type = 'DELEGATE' THEN amount 
                        WHEN event_type = 'UNDELEGATE' THEN -amount 
                        ELSE 0 END) AS total_delegated_nodes
            FROM 
                logs
            GROUP BY 
                guardian
            order by total_delegated_nodes desc limit 30;"""
    data = execute_query(query)
    return {"guardian": [row[0] for row in data], "total_delegated_nodes": [row[1] for row in data]}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
