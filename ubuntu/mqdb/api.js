import pool from './dbControl.js';
import express from "express";
const app = express();
// const uuidAPIKey = require('uuid-apikey');

// console.log(uuidAPIKey.create());
app.get('/api/users/:type', async (req, res) => {
    // res.send('connect.');
    // : 뒤에 아무 값이나 들어올 수 있음
    // 단, :type일때 이를 받아주는 변수는 type과 같아야함
    let { type } = req.params;

    console.log(type);
    console.log(req.params);
    res.send(type);
});


//uuid-apikey 모듈 : key 발급해주고 / valid key일시에만 api 제공 해주는 모듈

//temperature, voltage
app.get('/api/sensordata', async (req, res) => {
    try {
        // const [results] = await pool.query('SELECT temperature, voltage FROM sensordt');
        const [results] = await pool.query('SELECT id, R_manageid, R_sensetime, temperature, voltage FROM sensordt ORDER BY id DESC LIMIT 10');

        // res.json(results);
        console.log(results);
        res.send(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = Number(process.env.API_PORT || 0);

app.listen(PORT, () => {
    console.log('Start Server : localhost');
});