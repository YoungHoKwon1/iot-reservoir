import socketserver
from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import mysql.connector
from mysql.connector import Error
from datetime import datetime
import threading
import pytz
import signal
from mysql.connector.pooling import MySQLConnectionPool

class ThreadedHTTPServer(socketserver.ThreadingMixIn, HTTPServer):
    """Handle requests in a separate thread."""
    daemon_threads = True  # Terminate threads when main thread exits
    
class RequestHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        # Read the length of the data from the client
        content_length = int(self.headers['Content-Length'])
        # Read the data
        post_data = self.rfile.read(content_length)

        # Attempt to parse the data as JSON and insert into the database
        try:
            data = json.loads(post_data.decode())
            print("Received data:", data)  # Print the data

           # Process data in a separate thread to avoid blocking the server
            threading.Thread(target=self.insert_into_db, args=(data,)).start()
            
  
            # Respond to the client that the data was received successfully
            self.send_response(200)
            self.send_header('Content-type', 'text/plain')
            self.end_headers()
            self.wfile.write(b"Data received successfully\n")

        except json.JSONDecodeError as e:
            print("Data is not valid JSON:", post_data.decode())
            self.send_response(400)
            self.send_header('Content-type', 'text/plain')
            self.end_headers()
            self.wfile.write(b"Bad JSON\n")
        except Error as e:
            print("Error while inserting data into MariaDB", e)
            self.send_response(500)
            self.send_header('Content-type', 'text/plain')
            self.end_headers()
            self.wfile.write(b"Internal Server Error\n")

    def insert_into_db(self, data):
        connection = pool.get_connection()
        try:
            cursor = connection.cursor()
            insert_query = """
            INSERT INTO sensordt (
                R_manageid, R_sensetime, levelStr300, airHeightStr300, temperature,
                voltage, velocityStr600, levelStr600, airHeightStr600,
                instaneousFlowStr600, cumulativeFlowStr600, fault
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            kst = pytz.timezone('Asia/Seoul')
            R_sensetime = datetime.now(pytz.utc).astimezone(kst).strftime('%Y-%m-%d %H:%M:%S')

            record = (
                data['R_manageid'], R_sensetime, data['levelStr300'], data['airHeightStr300'], 
                data['temperature'], data['voltage'], data['velocityStr600'], data['levelStr600'], 
                data['airHeightStr600'], data['instaneousFlowStr600'], 
                data['cumulativeFlowStr600'], data['fault']
            )
            cursor.execute(insert_query, record)
            connection.commit()
            print("Record inserted successfully into sensordt table")
        except Error as e:
            print("Error while inserting data into MariaDB", e)
        finally:
            cursor.close()
            connection.close()
            
def signal_handler(signum, frame):
    print('Shutting down server...')
    httpd.server_close()

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

db_config = {
    'host': 'localhost',
    'user': 'root',
    'passwd': 'DB_PASSWORD_PLACEHOLDER',
    'database': 'saemtleDb',
    'charset': 'utf8'
}
pool = MySQLConnectionPool(pool_name='mypool', pool_size=5, **db_config)
            
            
            

def run(server_class=ThreadedHTTPServer, handler_class=RequestHandler, port=5005):
    global httpd
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    print(f'Server running on port {port}...')
    httpd.serve_forever()

if __name__ == "__main__":
    run()