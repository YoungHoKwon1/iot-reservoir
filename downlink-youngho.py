import socket
import mysql.connector
import json
from mysql.connector import Error
import logging
import threading
import signal
from concurrent.futures import ThreadPoolExecutor
from mysql.connector.pooling import MySQLConnectionPool
import time



# Basic logging setup
logging.basicConfig(filename='server.log', level=logging.INFO)

# Signal handler for graceful shutdown
shutdown_event = threading.Event()

def signal_handler(signum, frame):
    logging.info("Signal received, shutting down server.")
    shutdown_event.set()

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

# Database connection pool setup
db_config = {
    'host': 'localhost',
    'user': 'root',
    'passwd': 'DB_PASSWORD_PLACEHOLDER',
    'database': 'saemtleDb',
    'charset': 'utf8'
    
    #"host": 'localhost',
    #"user": 'root',
    #"passwd": 'DB_PASSWORD_PLACEHOLDER',
    #"database": 'saemtleDb',
    #"charset": 'utf8'
        
}
connection_pool = MySQLConnectionPool(pool_name="mypool", pool_size=10, **db_config)




# 특정 manage id에 대한 데이터 조회
def query_data(manageid):
    connection = connection_pool.get_connection()
    try:
        cursor = connection.cursor()
        query = """SELECT name, manageid, address, x, y, levelmin, levelfull, levelover, incharge, phone FROM reservoir WHERE manageid = %s"""
        cursor.execute(query, (manageid,))
        result = cursor.fetchone()
        return result
    except Error as e:
        logging.error(f"Database query error: {e}")
    finally:
        cursor.close()
        connection.close()

def handle_client_connection(client_socket, address):
    try:
        received_data = client_socket.recv(1024).decode()
        headers, body = received_data.split("\r\n\r\n", 1)
        data_json = json.loads(body)
        manageid = data_json['manageId']

        data = query_data(manageid)
        response = json.dumps({"data": data}, ensure_ascii=False).encode('utf8') if data else b"No data found"
        client_socket.sendall(response)
    except Exception as e:
        logging.error(f"Error with {address}: {e}")
    finally:
        client_socket.close()


def start_server(host='0.0.0.0', port=5001):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server_socket:
        try:
            server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            server_socket.bind((host, port))
        except OSError as e:
            logging.error(f"Bind failed: {e}. Retrying...")
            time.sleep(5)
            server_socket.bind((host, port))
        
        
        server_socket.listen()

        logging.info(f"Server running on port {port}...")

        with ThreadPoolExecutor(max_workers=20) as executor:
            while not shutdown_event.is_set():
                try:
                    client_socket, address = server_socket.accept()
                    logging.info(f"Connection from {address} established.")
                    executor.submit(handle_client_connection, client_socket, address)
                except Exception as e:
                    logging.error(f"Error accepting connection: {e}")

        logging.info("Server has been shut down.")

if __name__ == "__main__":
    start_server()




#Thread pooling for managing client connections.
#Database connection pooling to efficiently handle database connections.
#Signal handling to gracefully shut down the server.
#Enhanced error handling and logging.
#Remember, depending on the specific use case, further modifications might be required, especially concerning security and scalability. 
#If SSL/TLS is needed, additional setup will be required to wrap the socket with SSL context.