import requests
import json
import psycopg2
import psycopg2.extras
import datetime
import os
import time
# Определение параметров подключения к PostgreSQL
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://sophon:sophon@postgres:5432/sophon")


# Подключение к базе данных
def get_db_connection():
    return psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.DictCursor)

def wait_for_db():
    while True:
        try:
            conn = get_db_connection()
            conn.close()
            print("Database is ready.")
            break
        except psycopg2.OperationalError:
            print("Database is not ready yet. Retrying in 5 seconds...")
            time.sleep(5)


def execute_query(query, params=(), fetchall=True):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(query, params)
        if fetchall:
            result = cursor.fetchall()
        else:
            result = None
        conn.commit()
        return result
    except psycopg2.Error as e:
        print(f"Database error: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

def getDelegates(f, t):
    # "0xd9a687098552b070e1e304af176b8a589970267356590b7c7386c2f4fb7d0cc8"
    url = "https://rpc.sophon.xyz"
    payload = json.dumps({
        "jsonrpc": "2.0",
        "method": "eth_getLogs",
        "params": [
            {
                "address": "0xd8E3A935706c08B5e6f8e05D63D3E67ce2ae330C",
                "fromBlock": str(hex(f)),
                "toBlock": str(hex(t)),
                "topics": []
            }
        ],
        "id": 1
    })
    headers = {"Content-Type": "application/json"}
    response = requests.post(url, headers=headers, data=payload)
    return response.json()
    

def getLastBlock():
    url = "https://rpc.sophon.xyz"

    payload = json.dumps({
        "jsonrpc": "2.0",
        "method": "eth_blockNumber",
        "params": [],
        "id": 1
    })
    headers = {
        'Content-Type': 'application/json'
    }
    
    response = requests.request("POST", url, headers=headers, data=payload)
    num = int(response.json().get('result'),16)
    return num
    

def get_block_ranges(total_blocks, step=10000, start_block=1):
    ranges = []
    for start in range(start_block, total_blocks + 1, step):
        end = min(start + step - 1, total_blocks)
        ranges.append((start, end))
    return ranges

def create_system_table():
    query_system = """
        CREATE TABLE IF NOT EXISTS system (
            id SERIAL PRIMARY KEY,
            last_run_timestamp TIMESTAMP,
            last_processed_block INTEGER
        );
    """
    
    query_visits = """
        CREATE TABLE IF NOT EXISTS visits (
            id SERIAL PRIMARY KEY,
            ip TEXT NOT NULL,
            path TEXT NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """

    execute_query(query_system, fetchall=False)
    execute_query(query_visits, fetchall=False)

    # Ensure initial record exists
    query_insert = """
        INSERT INTO system (id, last_run_timestamp, last_processed_block)
        VALUES (1, %s, 0)
        ON CONFLICT (id) DO NOTHING;
    """
    execute_query(query_insert, (datetime.datetime.now(),), fetchall=False)

def update_system_table(last_block):
    query = """
        UPDATE system
        SET last_run_timestamp = %s, last_processed_block = %s
        WHERE id = 1;
    """
    execute_query(query, (datetime.datetime.now(), last_block), fetchall=False)

def create_database():
    query_logs = """
        CREATE TABLE IF NOT EXISTS logs (
            id SERIAL PRIMARY KEY,
            block_number INTEGER,
            block_hash TEXT,
            transaction_hash TEXT,
            log_index TEXT,
            event_type TEXT,
            guardian TEXT,
            operator TEXT,
            amount BIGINT,
            timestamp TIMESTAMP,
            UNIQUE(transaction_hash, log_index)
        );
    """

    query_nodes = """
        CREATE TABLE IF NOT EXISTS nodes (
            operator TEXT PRIMARY KEY,
            status BOOLEAN,
            rewards TEXT,
            fee REAL,
            uptime REAL,
            node_text TEXT,
            is_ad BOOLEAN DEFAULT FALSE,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """

    execute_query(query_logs, fetchall=False)
    execute_query(query_nodes, fetchall=False)

def insert_log(block_number, block_hash, transaction_hash, log_index, event_type, guardian, operator, amount, timestamp):
    query = """
        INSERT INTO logs (block_number, block_hash, transaction_hash, log_index, event_type, guardian, operator, amount, timestamp)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (transaction_hash, log_index) DO NOTHING;
    """
    execute_query(query, (block_number, block_hash, transaction_hash, log_index, event_type, guardian, operator, amount, timestamp), fetchall=False)


def get_last_processed_block():
    query = "SELECT last_processed_block FROM system WHERE id = 1;"
    result = execute_query(query)
    return result[0][0] if result else 0


def explorer_parse():
    last_processed_block = get_last_processed_block()
    total_blocks = getLastBlock()
    step = 10000

    for start in range(last_processed_block + 1, total_blocks + 1, step):
        end = min(start + step - 1, total_blocks)
        print(f"Processing blocks {start}-{end}")
        data = getDelegates(start, end)

        for r in data.get('result', []):
            if len(r.get('topics', [])) > 0:
                timestamp = int(r['blockTimestamp'], 16)
                readable_date = datetime.datetime.utcfromtimestamp(timestamp).strftime('%Y-%m-%d %H:%M:%S')
                block_number = int(r['blockNumber'], 16)
                block_hash = r['blockHash']
                transaction_hash = r['transactionHash']
                log_index = r['logIndex']

                if r['topics'][0] == '0xd9a687098552b070e1e304af176b8a589970267356590b7c7386c2f4fb7d0cc8':
                    guardian = "0x" + r['topics'][1][26:]
                    operator = "0x" + r['topics'][2][26:]
                    amount = int(r['data'], 16)
                    event_type = "DELEGATE"
                elif r['topics'][0] == '0x94784069b8ffa11f7392979bd35691ef746b2c02f3709f7112aae7e2b2f41f23':
                    guardian = "0x" + r['topics'][1][26:]
                    operator = "0x" + r['topics'][2][26:]
                    amount = int(r['data'], 16)
                    event_type = "UNDELEGATE"
                elif r['topics'][0] == '0x5e0927d844acaf1b5b3d6fc60c141645a4021a24d501dba971836d488277e084':
                    guardian = "0x" + r['topics'][1][26:]
                    amount = int(r['data'], 16)
                    event_type = "MINT"
                    operator = None
                else:
                    continue

                insert_log(block_number, block_hash, transaction_hash, log_index, event_type, guardian, operator, amount, readable_date)

        update_system_table(end)

def sophon_node_test_update():
    response = requests.get(f"https://monitor.sophon.xyz/nodes?page=99999999&per_page=100")
    if response.status_code != 200:
        print(f"Failed to fetch test nodes count: {response.status_code}")

    nodes = response.json().get("nodes", [])
    if len(nodes) == 0:
        print(f"No test nodes found len(nodes) == 0, {len(nodes)}")
        return True
    else:
        print(f"Test nodes found len(nodes) != 0, {len(nodes)}")
        return False


def sophon_nodes_update():
    page = 1
    while True:
        print(f"Fetching nodes for page {page}")
        response = requests.get(f"https://monitor.sophon.xyz/nodes?page={page}&per_page=100")
        if response.status_code != 200:
            print(f"Failed to fetch nodes for page {page}: {response.status_code}")
            break

        nodes = response.json().get("nodes", [])
        if not nodes:
            break

        for node in nodes:
            operator = node["operator"]
            status = node["status"]
            rewards = node["rewards"]
            fee = node["fee"]
            uptime = node["uptime"]

            query = """
                INSERT INTO nodes (operator, status, rewards, fee, uptime)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (operator) DO UPDATE SET
                    status = EXCLUDED.status,
                    rewards = EXCLUDED.rewards,
                    fee = EXCLUDED.fee,
                    uptime = EXCLUDED.uptime,
                    updated_at = now();
            """
            execute_query(query, (operator, status, rewards, fee, uptime), fetchall=False)

        page += 1


# Перед запуском основной логики
wait_for_db()

print("Starting database creation...")
create_database()
print("Database created.")

print("Starting system table creation...")
create_system_table()
print("System table created.")

print("Starting node update...")
if sophon_node_test_update():
    sophon_nodes_update()
print("Node update completed.")

print("Starting block processing...")
explorer_parse()
print("Block processing completed.")