import mysql from 'mysql2/promise';
// import mysql from 'mysql';

const pool = mysql.createPool({
    connectionLimit: 10,
    host: 'DB_HOST_PLACEHOLDER',
    user: 'DB_USER_PLACEHOLDER',
    password: 'DB_PASSWORD_PLACEHOLDER',
    database: 'saemtleDb'
});

export default pool;
