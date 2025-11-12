// common resource
//var dateFormat = require('dateformat');

// jim New ES Module Syntax
import dateFormat from 'dateformat';
//import * as dateFormat from 'dateformat';


//var net = require('net'); 
//const delay = require('delay');
//var fs = require('fs');
//var iconv = require('iconv-lite');

import net from 'net';
import delay from 'delay';
import fs from 'fs';
import iconv from 'iconv-lite';

// ------------------------------------------------------------------------------
// logger https://mungmungdog.tistory.com/34
// ------------------------------------------------------------------------------

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import 'date-utils'; // If this is just for side effects and doesn't export anything

//const winston = require('winston');
//require('winston-daily-rotate-file');
//require('date-utils');

// log enable for debugging ...
var logEnable = true;

const logger = winston.createLogger({
  level: 'debug', // 최소 레벨
  // 파일저장
  transports: [
    new winston.transports.DailyRotateFile({
      filename: 'log/system.log', // log 폴더에 system.log 이름으로 저장
      zippedArchive: true, // 압축여부
      format: winston.format.printf(
        info => `${new Date().toFormat('YYYY-MM-DD HH24:MI:SS')} [${info.level.toUpperCase()}] - ${info.message}`)
    }),
    // 콘솔 출력
    new winston.transports.Console({
      format: winston.format.printf(
        info => `${new Date().toFormat('YYYY-MM-DD HH24:MI:SS')} [${info.level.toUpperCase()}] - ${info.message}`)
    })
  ]
});

// ------------------------------------------------------------------------------
//logger.info("1111");
//logger.debug("2222");
//logger.warn("3333");
//logger.error("4444");


// tcp socket
var tcpPort = 23579;   // 3000 => 23579

// db access
// const mysql      = require('mysql'); // jim change
import mysql from 'mysql';
import mqtt from 'mqtt';


const pool = mysql.createPool({
  connectionLimit: 10,
  host: 'DB_HOST_PLACEHOLDER',
  user: 'DB_USER_PLACEHOLDER',
  password: 'DB_PASSWORD_PLACEHOLDER',
  database: 'saemtleDb'
});

// Test query using the pool
pool.query('SELECT 1 + 1 AS solution', (error, results, fields) => {
  if (error) {
    console.error('Database query error: ', error);
    return;
  }
  console.log('The solution is: ', results[0].solution);
});

var serverIp = "SERVER_IP_PLACEHOLDER";
var client = '';
// main routines ...
var options = { retain: false, qos: 2 };
var subTopic = "MQTT_TOPIC_PLACEHOLDER";
var pubTopic = "";
var askerId = "";
var mqttConnected = false;
var readString;
var rxdtString;
var rxdtInt;

var rxdtTcpString;
var rxdtTcpInt;

// test
//var tcpComMode = 0;
var imgPacketCounter = 0;
var imgBuffer = "";
var jpgSize = 0;
var jpgFile = "";

// user info ...
var users = new Array();
// reservoir info ...
var reservoir = new Array();

// snese info ...
var senses = new Array();
var senses2 = new Array();
var sense = new Array();
var maxSenseId = 0;
var minSenseId = 0;

//sense2
var maxSenseId2 = 0;
var minSenseId2 = 0;
var sensesLoadCompleted = false;
var waitCounter = 0;

var captureIdList = [];

var gCaptureId = "";
var gCaptureIndex = -1;

var imageUploadStarted = false;
var imageUploadCompleted = false;
var tcpComMode = {};

var resetComHistory = false;

var now = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
outputLog("------------------------------------------");
outputLog("mqdb.js started at " + now + "!");
outputLog("To exit, press ctrl-c");
outputLog("------------------------------------------");

// 통신 데이터 reset
setInterval(() => {
  if (!resetComHistory) resetComHistoryAt(2, 18, 52);
}, 30 * 1000);


// load all db data to memory ...
outputLog("");
outputLog("load all tables");
//dbConnect.connect();
loadDbToMemory(2, 18, 49);


// async : delay를 사용하기 위해 전체 루틴으 async로 감싼다 ...
(async () => {
  // -----------------------------------------------------------------------------------------------------
  // init mqtt communication ...
  // -----------------------------------------------------------------------------------------------------
  initMqtt();
  setTimeout(() => {
    if (!mqttConnected) {
      client = '';
      initMqtt();
    }
  }, 3000);

  setTimeout(() => {
    waitCounter++;
  }, 50);


  //getAddress('장팔리 1023');
  // -----------------------------------------------------------------------------------------------------
  // TCP socket ...
  // -----------------------------------------------------------------------------------------------------

  var tcpServer = net.createServer();
  // listen
  tcpServer.listen(tcpPort, () => {
    outputLog(`TCP server listening on ${serverIp}:${tcpPort}`);
  });

  var sockets = {}, nextSocketId = 0;

  tcpServer.on('connection', (socket) => {
    var socketId = nextSocketId++;
    sockets[socketId] = socket;
    tcpComMode[socketId] = 0;
    outputLog('socket', socketId, 'opened');

    var clientAddress = `${socket.remoteAddress}:${socket.remotePort}`;
    outputLog(`new client connected: ${clientAddress}`);
    socket.write("hi;");

    socket.on('data', (data) => {
      //outputLog(`Client ${clientAddress}` + " " + data); 
      outputLog(`Client ${clientAddress}`);

      socket.setNoDelay(true);
      var rcvData = data.toString();    // buffer => string 

      if (tcpComMode[socketId] == 0) {
        // data 수신 error check
        if (rcvData.indexOf(';') >= 0) {
          /*
          // test
          if (compareTcpString(rcvData,"hihihihihi=")) {
            // esp에게 회신
            socket.write("hihihihihi=OK;");
          } */

          // sense data의 업데이트
          if (compareTcpString(rcvData, "SENSE=")) {
            // SENSE data의 db 반영
            addSenseData(rxdtTcpString);
            // esp에게 회신
            socket.write("SENSE=OK;");
            //
          }  // if
          else if (compareTcpString(rcvData, "PUT_ACT1OPEN=")) {
            // macid,value
            var temp1, temp2;
            //temp1 = rxdtTcpString;
            //outputLog("******************* PUT_ACT1OPEN=" + rxdtTcpString);
            var pos = rxdtTcpString.indexOf(',');
            temp1 = rxdtTcpString.substring(0, pos);
            temp2 = rxdtTcpString.substring(pos + 1);
            //outputLog(temp1);
            //outputLog(temp2);

            var inx = findReservoir(temp1);
            if (inx >= 0) {
              reservoir[inx].act1open = parseInt(temp2);
              updateReservoirWithoutReloading(reservoir[inx]);
              // 005
            }
          }
          else if (compareTcpString(rcvData, "RSV_ACT1OPEN=")) {
            var inx = findReservoir(rxdtTcpString);
            if (inx >= 0) {
              //outputLog("002");
              var temp = reservoir[inx].act1open + ";";
              // 003
              socket.write(temp);
            }
          }
          // RSV_NAME,RSV_MANAGEID,RSV_ADDRESS,RSV_X,RSV_Y,RSV_LEVEL_MIN,RSV_LEVELFULL,RSV_LEVELOVER,RSV_INCHARGE,RSV_MACID,RSV_PHONE
          else if (compareTcpString(rcvData, "RSV_NAME=")) {
            //outputLog("001");
            var inx = findReservoir(rxdtTcpString);
            if (inx >= 0) {
              //outputLog("002");
              var temp = reservoir[inx].name + ";";
              socket.write(temp);
            }
          }
          // RSV_NAME,RSV_MANAGEID,RSV_ADDRESS,RSV_X,RSV_Y,RSV_LEVEL_MIN,RSV_LEVELFULL,RSV_LEVELOVER,RSV_INCHARGE,RSV_MACID,RSV_PHONE
          else if (compareTcpString(rcvData, "RSV_KRNAME=")) {
            var inx = findReservoir(rxdtTcpString);
            if (inx >= 0) {
              //outputLog("002");
              var temps = iconv.encode(reservoir[inx].name, 'euc-kr');
              var temp = temps.toString('hex') + ";";
              //outputLog("------------" + temp);

              for (var i = 0; i < temp.length; i += 2) {
                //outputLog("\\x" + temp.slice(i,i+2).toString('hex'));
              }
              socket.write(temp);
            }
          }
          else if (compareTcpString(rcvData, "RSV_MANAGEID=")) {
            var inx = findReservoir(rxdtTcpString);
            if (inx >= 0) {
              var temp = reservoir[inx].manageid.toString() + ";";
              socket.write(temp);
            }
          }
          else if (compareTcpString(rcvData, "RSV_ADDRESS=")) {
            var inx = findReservoir(rxdtTcpString);
            if (inx >= 0) {
              var temp = reservoir[inx].address + ";";
              socket.write(temp);
            }
          }
          else if (compareTcpString(rcvData, "RSV_X=")) {
            var inx = findReservoir(rxdtTcpString);
            if (inx >= 0) {
              var temp = reservoir[inx].x.toString() + ";";
              socket.write(temp);
            }
          }
          else if (compareTcpString(rcvData, "RSV_Y=")) {
            var inx = findReservoir(rxdtTcpString);
            if (inx >= 0) {
              var temp = reservoir[inx].y.toString() + ";";
              socket.write(temp);
            }
          }
          else if (compareTcpString(rcvData, "RSV_LEVEL_MIN=")) {
            var inx = findReservoir(rxdtTcpString);
            if (inx >= 0) {
              var temp = reservoir[inx].levelmin.toString() + ";";
              socket.write(temp);
            }
          }
          else if (compareTcpString(rcvData, "RSV_LEVELFULL=")) {
            var inx = findReservoir(rxdtTcpString);
            if (inx >= 0) {
              var temp = reservoir[inx].levelfull.toString() + ";";
              socket.write(temp);
            }
          }
          else if (compareTcpString(rcvData, "RSV_LEVELOVER=")) {
            var inx = findReservoir(rxdtTcpString);
            if (inx >= 0) {
              var temp = reservoir[inx].levelover.toString() + ";";
              socket.write(temp);
            }
          }
          else if (compareTcpString(rcvData, "RSV_INCHARGE=")) {
            var inx = findReservoir(rxdtTcpString);
            if (inx >= 0) {
              var temp = reservoir[inx].incharge + ";";
              socket.write(temp);
            }
          }
          else if (compareTcpString(rcvData, "RSV_PHONE=")) {
            var inx = findReservoir(rxdtTcpString);
            if (inx >= 0) {
              var temp = reservoir[inx].phone + ";";
              socket.write(temp);
            }
          }
          else if (compareTcpString(rcvData, "RSV_COMMINTERVAL=")) {
            var inx = findReservoir(rxdtTcpString);
            if (inx >= 0) {
              var temp = reservoir[inx].comminterval + ";";
              socket.write(temp);
            }
          }
          else if (compareTcpString(rcvData, "RSV_WAITTIME=")) {
            var inx = findReservoir(rxdtTcpString);
            if (inx >= 0) {
              var temp = reservoir[inx].waittime + ";";
              socket.write(temp);
            }
          }
          else if (compareTcpString(rcvData, "RSV_SENSEADD=")) {
            var inx = findReservoir(rxdtTcpString);
            if (inx >= 0) {
              var temp = reservoir[inx].senseadd + ";";
              socket.write(temp);
            }
          }
          else if (compareTcpString(rcvData, "RSV_LEVELADD=")) {
            var inx = findReservoir(rxdtTcpString);
            if (inx >= 0) {
              var temp = reservoir[inx].leveladd + ";";
              socket.write(temp);
            }
          }
          else if (compareTcpString(rcvData, "RSV_RSVTYPE=")) {
            var inx = findReservoir(rxdtTcpString);
            if (inx >= 0) {
              var temp = reservoir[inx].rsvtype + ";";
              socket.write(temp);
            }
          }
          else if (compareTcpString(rcvData, "RSV_KEEPTIME=")) {
            var inx = findReservoir(rxdtTcpString);
            if (inx >= 0) {
              var temp = reservoir[inx].keeptime + ";";
              socket.write(temp);
            }
          }
          else if (compareTcpString(rcvData, "RSV_PRANGE=")) {
            var inx = findReservoir(rxdtTcpString);
            if (inx >= 0) {
              var temp = reservoir[inx].prange + ";";
              socket.write(temp);
            }
          }
          // 900
          // capture 요청을 확인 ...
          else if (compareTcpString(rcvData, "CAPTURE_STATUS=")) {
            outputLog("check capture status of macid " + rxdtTcpString);
            var idlist = JSON.stringify(captureIdList);
            //outputLog("----------------- check list:  " + idlist);
            // 웹페이지의 capture 요청 list 안에 macid가 존재하는 경우 ...
            if (idlist.indexOf(rxdtTcpString) >= 0) {
              outputLog("capture 요청이 있음 from: " + rxdtTcpString);
              // 0913
              gCaptureId = rxdtTcpString;
              var match = -1;
              for (var i = 0; i < captureIdList.length; i++) {
                if (rxdtTcpString == captureIdList[i]) {
                  match = i;
                  // 0913
                  gCaptureIndex = findReservoir(captureIdList[i]);
                }
              }
              if (match >= 0) {
                captureIdList.splice(match, 1);
                //outputLog("--------------- 요청목록을 지움");
              }
              // 
              var temp = "1;";
              socket.write(temp);
            }
            // 존재하지 않는 경우 ...
            else {
              //outputLog("capture 요청이 없음");
              var temp = "0;";
              socket.write(temp);
            }
          }
          else if (compareTcpString(rcvData, "JPEG_SIZE=")) {
            // esp에게 회신
            socket.write("ok;");
            jpgSize = rxdtTcpInt;
            outputLog("JPEG_SIZE:" + jpgSize);

          }
          else if (compareTcpString(rcvData, "JPEG_IMG=")) {
            socket.write("ok;");
            //jpgFile = "./image/" + rxdtTcpString + ".jpg";
            jpgFile = "/var/www/html/dist/capture/" + rxdtTcpString + ".jpg";
            outputLog("file: " + jpgFile);
            tcpComMode[socketId] = 1;
            imageUploadStarted = true;
            imageUploadCompleted = false;
            imgBuffer = "";
          }
          else if (compareTcpString(rcvData, "SOCKET_END=")) {
            if (rxdtTcpString == "1") {
              outputLog("Socket close dynamically...");
              socket.setTimeout(100);
            }
          }
        }  // if
        else {
          //outputLog('Tcp received data error: ' + rcvData);
        }  // else 
      } // if (tcpComMode==0)
      // tcpComMode==1
      // 이미지 전송모드
      else {
        imgBuffer += rcvData;
        // make image ...
        outputLog("imgBuffer Size:" + imgBuffer.length);
        // test
        if (imgBuffer.length >= jpgSize) {
          const buffer = Buffer.from(imgBuffer, "base64");
          outputLog('Received: ' + buffer.length + ' bytes\n');
          fs.writeFileSync(jpgFile, buffer);
          imgBuffer = "";

          outputLog("Socket close dynamically...");
          socket.setTimeout(100);

          // int flag
          imageUploadStarted = false;
          imageUploadCompleted = true;

          // jpgSize의 갯수를 추가
          if (gCaptureIndex >= 0) {
            var temp = parseInt(reservoir[gCaptureIndex].telecom) + jpgSize;
            outputLog("------------------------------------ image data added, total:" + temp);
            reservoir[gCaptureIndex].telecom = temp.toString();
            updateReservoir(reservoir[gCaptureIndex]);
          }
        }
      }
    });

    // Add a 'close' event handler to this instance of socket 
    socket.on('close', (data) => {
      outputLog(`connection closed: ${clientAddress}`);
      outputLog('socket', socketId, 'closed');

      tcpComMode[socketId] = 0;

      delete sockets[socketId];
      delete tcpComMode[socketId];


    });


    // Add a 'error' event handler to this instance of socket 
    socket.on('timeout', (err) => {
      socket.end();
    });
  });


  // ----------------------------------------------------------------------------------------------------
  // TCP socket ...
  // ----------------------------------------------------------------------------------------------------
})();


/*
function getAddress(address) {
  var client_id = 'bip07bvrqh';
  var client_secret = 'LIs7Fo0gQHbgGaYCpn2uWyKkbdGSAurjaMqvmVJq';
     var api_url = 'https://openapi.naver.com/v1/map/geocode?query=' + encodeURI(address); // json
     //var api_url = 'https://openapi.naver.com/v1/map/geocode.xml?query=' + encodeURI(req.query.query); // xml
     var request = require('request');
     var options = {
         url: api_url,
         headers: {'X-Naver-Client-Id':client_id, 'X-Naver-Client-Secret': client_secret}
      };
     request.get(options, function (error, response, body) {
       if (!error && response.statusCode === 200) {
         res.json(body);
         console.log('************************* address success ');
       } else {
         res.status(response.statusCode).end();
         console.log('************************* error = ' + response.statusCode);
       }
     });
   }

*/

// ----------------------------------------------------------------------------------------------------
// db access ...
// ----------------------------------------------------------------------------------------------------
// https://github.com/egoing/server_side_javascript_tutorials/commit/19b90519710628b18c85d89ff0a22cb09d0861ab

// load all data to memory ...
function loadDbToMemory() {
  loadUsers();
  loadReservoir();
  findSenseLimitId();  // sense 데이터의 개수를 구해둔다 ...
}


function loadUsers() {
  // reset ...
  users = [];
  // loading users 
  var sql = 'SELECT * FROM users';
  pool.query(sql, function (err, rows, fields) {
    if (err) {
      outputLog(err);
    }
    else {
      outputLog("----------USERS DATA FROM DB----------");
      for (var i = 0; i < rows.length; i++) {
        users.push({
          id: rows[i].id,
          krname: rows[i].krname,
          name: rows[i].name,
          passwd: rows[i].passwd,
          type: rows[i].type,
          company: rows[i].company,
          phone: rows[i].phone,
          address: rows[i].address,
          rsvSelected: rows[i].rsvSelected,
          regdate: rows[i].regdate,
          subTopic: "",
          login: 0,
          logtime: 0
        });
      }
      if (users.length > 0) {
        outputLog("# of users: " + users.length);
      }
      else {
        outputLog("# of users: 0");
      }
    }
  });
}

function loadReservoir() {
  reservoir = [];
  // loading reservoir 
  var sql = 'SELECT * FROM reservoir';
  pool.query(sql, function (err, rows, fields) {
    if (err) {
      outputLog(err);
    }
    else {
      outputLog("----------RESERVOIR DATA FROM DB----------");
      for (var i = 0; i < rows.length; i++) {
        // test
        //outputLog("row=" + i + " telecom=" + rows[i].telecom);
        //outputLog("row=" + i + " ==>" + JSON.stringify(rows[i]));
        reservoir.push({
          id: rows[i].id,
          name: rows[i].name,
          manageid: rows[i].manageid,
          address: rows[i].address,
          x: rows[i].x,
          y: rows[i].y,
          levelmin: rows[i].levelmin,
          levelfull: rows[i].levelfull,
          levelover: rows[i].levelover,
          incharge: rows[i].incharge,
          macid: rows[i].macid,
          phone: rows[i].phone,
          telecom: rows[i].telecom,
          swversion: rows[i].swversion,
          regdate: rows[i].regdate,
          commstatus: rows[i].commstatus,
          comminterval: rows[i].comminterval,
          commlast: rows[i].commlast,
          waittime: rows[i].waittime,
          senseadd: rows[i].senseadd,
          leveladd: rows[i].leveladd,
          rsvtype: rows[i].rsvtype,
          prange: rows[i].prange,
          act1open: rows[i].act1open,
          keeptime: rows[i].keeptime,
          height: rows[i].height,
          effquan: rows[i].effquan
        });
      }
      if (reservoir.length > 0) {
        outputLog("# of reservoir = " + reservoir.length);
      }
      else {
        outputLog("# of reservoir = 0");
      }
    }
  });
}


// 일단 전체 data를 가져오는 것으로 함
// 나중에는 latest 몇개만 가져오는 것으로 한다 ...

//sense2
function findSenseLimitId() {
  outputLog("----------SENSE DATA FROM DB----------");
  maxSenseId = 0;
  var sql_last = 'SELECT id FROM sensedt ORDER BY id DESC LIMIT 1';
  var sql_last2 = 'SELECT id FROM sensordt ORDER BY id DESC LIMIT 1';
  pool.query(sql_last, function (err, rows, fields) {
    if (err) {
      outputLog(err);
    }
    else {
      if (rows.length > 0) {
        maxSenseId = rows[0].id;               // 처음 항목의 최고 id
        outputLog('Max ID of Sense Data: ' + maxSenseId);
      }
    }
  });

  pool.query(sql_last2, function (err, rows, fields) {
    if (err) {
      outputLog(err);
    }
    else {
      if (rows.length > 0) {
        maxSenseId2 = rows[0].id;               // 처음 항목의 최고 id
        outputLog('Max ID of Sense2 Data: ' + maxSenseId2);
      }
    }
  });

  minSenseId = 0;
  minSenseId2 = 0;
  var sql_first = 'SELECT id FROM sensedt ORDER BY id ASC LIMIT 1';
  var sql_first2 = 'SELECT id FROM sensordt ORDER BY id ASC LIMIT 1';
  pool.query(sql_first, function (err, rows, fields) {
    if (err) {
      outputLog(err);
    }
    else {
      if (rows.length > 0) {
        minSenseId = rows[0].id;               // 처음 항목의 최고 id
        outputLog('Min ID of Sense Data: ' + minSenseId);
      }
    }
  });
  pool.query(sql_first2, function (err, rows, fields) {
    if (err) {
      outputLog(err);
    }
    else {
      if (rows.length > 0) {
        minSenseId2 = rows[0].id;               // 처음 항목의 최고 id
        outputLog('Min ID of Sense2 Data: ' + minSenseId2);
      }
    }
  });
}

// jjk001
// start부터 num개수의 sense data를 구한다
function loadSenses(start, end, sender) {
  // reset ...
  senses = [];

  // loading senses 
  var sql = 'SELECT * FROM sensedt where id > ' + (start - 1) + ' and id < ' + (end + 1);
  //outputLog('sql=' + sql);
  pool.query(sql, function (err, rows, fields) {
    if (err) {
      outputLog(err);
      sensesLoadCompleted = true;
    }
    else {
      outputLog("----------SENSORS DATA FROM DB----------");
      for (var i = 0; i < rows.length; i++) {
        senses.push({
          id: rows[i].id,
          macid: rows[i].macid,
          //sensetime:rows[i].sensetime,
          sensetime: dateFormat(rows[i].sensetime, "yyyy-mm-dd HH:MM:ss"),
          waterlevel: rows[i].waterlevel,
          watersense: rows[i].watersense,
          temperature: rows[i].temperature,
          voltage: rows[i].voltage,
          comtime: rows[i].comtime,
          act1open: rows[i].act1open,
          act1open_current: rows[i].act1open_current,
          act1opentime: rows[i].act1opentime,
          fault: rows[i].fault
        });
      }
      if (senses.length > 0) {
        outputLog("# of senses = " + senses.length);
        var rValue = JSON.stringify(senses);
        publish(sender, "GET_SENSES_DONE=" + rValue + ";");  // senses 정보 송출
      }
      else {
        outputLog("# of senses = 0");
      }
      sensesLoadCompleted = true;
    }
  });
}

//sense2
function loadSenses2(start, end, sender) {
  // reset ...
  senses = [];

  // loading senses 
  var sql = 'SELECT * FROM sensordt where id > ' + (start - 1) + ' and id < ' + (end + 1);
  //outputLog('sql=' + sql);
  pool.query(sql, function (err, rows, fields) {
    if (err) {
      outputLog(err);
      sensesLoadCompleted = true;
    }
    else {
      outputLog("----------SENSORS2 DATA FROM DB----------");
      for (var i = 0; i < rows.length; i++) {
        senses2.push({
          id: rows[i].id,
          R_manageid: rows[i].R_manageid,
          //sensetime:rows[i].sensetime,
          R_sensetime: dateFormat(rows[i].R_sensetime, "yyyy-mm-dd HH:MM:ss"),
          levelStr300: rows[i].levelStr300,
          airHeightStr300: rows[i].airHeightStr300,
          temperature: rows[i].temperature,
          voltage: rows[i].voltage,
          velocityStr600: rows[i].velocityStr600,
          levelStr600: rows[i].levelStr600,
          instaneousFlowStr600: rows[i].instaneousFlowStr600,
          cumulativeFlowStr600: rows[i].cumulativeFlowStr600,
          fault: rows[i].fault
        });
      }
      if (senses2.length > 0) {
        outputLog("# of senses2 = " + senses2.length);
        var rValue = JSON.stringify(senses2);
        publish(sender, "GET_SENSES2_DONE=" + rValue + ";");  // senses 정보 송출
      }
      else {
        outputLog("# of senses = 0");
      }
      sensesLoadCompleted = true;
    }
  });
}


function getSenses(ids, num, sender, sdate, edate) {
  var rdt = [];
  var today1;
  var yesterday1;
  var d;
  var endDate;

  // 2024-0124
  // 오늘 기준 실시간
  if ((sdate == "") || (sdate == undefined) || (sdate == null)) {
    d = new Date();             // Today!
  }
  // 특정일
  else {
    d = new Date(sdate);
  }
  today1 = dateFormat(d, "yyyy-mm-dd HH:MM:ss");

  // 2023-0523
  //console.log("**************** endDate:" + edate)
  if ((edate == "") || (edate == undefined) || (edate == null)) {
    // 1500개 요구시에는 specific date임을 이미 알고 있으므로 검색하는 날짜를 늘림
    if (num == 1500) d.setDate(d.getDate() - 10);
    // 150개인 경우는 디바이스가 많으므로, 날짜를 줄임
    else d.setDate(d.getDate() - 1);
    yesterday1 = dateFormat(d, "yyyy-mm-dd HH:MM:ss");
  }
  // endDate가 있는 경우
  else {
    endDate = new Date(edate);
    yesterday1 = dateFormat(endDate, "yyyy-mm-dd HH:MM:ss");
  }

  // debug message
  console.log("************************************************************************************************************************* ");
  console.log("ids:" + ids);
  console.log("start:" + yesterday1);
  console.log("end:" + today1);
  console.log("************************************************************************************************************************* ");


  var sql = "SELECT * FROM sensedt where " + ids + " AND (sensetime BETWEEN '" + yesterday1 + "' AND '" + today1 + "')" + " order by id DESC";
  //var sql = "SELECT * FROM sensedt where " + ids + " AND (sensetime BETWEEN '" + yesterday1 +  "' AND '" + today1 + "')";
  //outputLog("*************************************************************************");
  //outputLog(sql);
  pool.query(sql, function (err, rows, fields) {
    if (err) {
      outputLog(err);
    }
    else {
      if (rows.length < num) num = rows.length;
      for (var j = 0; j < num; j++) {
        i = num - j - 1;
        rdt.push({
          id: rows[i].id,
          macid: rows[i].macid,
          //sensetime:rows[i].sensetime,
          sensetime: dateFormat(rows[i].sensetime, "yyyy-mm-dd HH:MM:ss"),
          waterlevel: rows[i].waterlevel,
          watersense: rows[i].watersense,
          temperature: rows[i].temperature,
          voltage: rows[i].voltage,
          comtime: rows[i].comtime,
          act1open: rows[i].act1open,
          act1open_current: rows[i].act1open_current,
          act1opentime: rows[i].act1opentime,
          fault: rows[i].fault
        });
      }
      if (rdt.length > 0) {
        outputLog("Number of senses = " + rdt.length);
        var rValue = JSON.stringify(rdt);
        //outputLog(rValue);
        publish(sender, "GET_SENSES_DONE=" + rValue + ";");  // senses 정보 송출
      }
      else {
        outputLog("Number of senses = 0");
      }
    }
  });
}

function getDownload(ids, num, sender) {
  var rdt = [];
  var today1;
  var yesterday1;
  var d;
  var endDate;

  //var sql = "SELECT * FROM sensedt where " + ids + " AND (sensetime BETWEEN '" + yesterday1 +  "' AND '" + today1 + "')" + " order by id DESC";
  var sql = "SELECT * FROM sensedt where " + ids + " order by id DESC";
  console.log("File download sql: " + sql);

  pool.query(sql, function (err, rows, fields) {
    if (err) {
      outputLog(err);
    }
    else {
      outputLog("get some sense data from DB ...");
      if (rows.length < num) num = rows.length;
      for (var j = 0; j < num; j++) {
        var i = num - j - 1;
        rdt.push({
          id: rows[i].id,
          macid: rows[i].macid,
          //sensetime:rows[i].sensetime,
          sensetime: dateFormat(rows[i].sensetime, "yyyy-mm-dd"),   // 시간 정보를 없앰
          waterlevel: rows[i].waterlevel,
          watersense: rows[i].watersense,
          temperature: rows[i].temperature,
          voltage: rows[i].voltage,
          comtime: rows[i].comtime,
          act1open: rows[i].act1open,
          act1open_current: rows[i].act1open_current,
          act1opentime: rows[i].act1opentime,
          fault: rows[i].fault
        });
      }
      if (rdt.length > 0) {
        outputLog("Number of senses = " + rdt.length);
        var rValue = JSON.stringify(rdt);
        //outputLog(rValue);
        publish(sender, "GET_DOWNLOAD_DONE=" + rValue + ";");  // senses 정보 송출
      }
      else {
        outputLog("Number of senses = 0");
      }
    }
  });
}

function addUser(data) {
  var user = JSON.parse(data);
  var maxid = users[users.length - 1].id + 1;

  var sql = 'INSERT INTO users (id,krname,name,passwd,type,company,phone,address,rsvSelected,regdate) VALUES(?,?,?,?,?,?,?,?,?,?)';
  var params = [maxid, user.krname, user.name, user.passwd, user.type, user.company, user.phone, user.address, user.rsvSelected, user.regdate];
  pool.query(sql, params, function (err, rows, fields) {
    if (err) {
      outputLog(err);
    } else {
      outputLog("users data loading again ...");
      loadUsers();
    }
  });
}

function updateUser(data) {
  var user = JSON.parse(data);

  var sql = 'UPDATE users SET krname=?,type=?,company=?,phone=?,address=?,rsvSelected=?,passwd=? WHERE name=?';
  var params = [user.krname, user.type, user.company, user.phone, user.address, user.rsvSelected, user.passwd, user.name];

  pool.query(sql, params, function (err, rows, fields) {
    //outputLog("0004");
    if (err) {
      outputLog(err);
    } else {
      outputLog("User info updated");
      loadUsers();
    }
  });
}


function delUser(data) {
  var user = JSON.parse(data);

  var sql = 'DELETE FROM users WHERE name=? and passwd=?';
  var params = [user.name, user.passwd];

  pool.query(sql, params, function (err, rows, fields) {
    //outputLog("0004");
    if (err) {
      outputLog(err);
    } else {
      outputLog("User info deleted");
      loadUsers();
    }
  });
}


function addReservoir(data, commstatus) {
  var r = JSON.parse(data);
  var maxid;
  if (!isEmpty(reservoir)) maxid = reservoir[reservoir.length - 1].id + 1;
  else maxid = 0;
  //outputLog("new primary key=" + maxid);

  // 2023-0523
  var sql = 'INSERT INTO reservoir (id,name,manageid,address,x,y,levelmin,levelfull,levelover,incharge,macid,phone,telecom,swversion,regdate,commstatus,comminterval,commlast,waittime,senseadd,leveladd,rsvtype,prange,act1open,keeptime,height,effquan) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
  var params = [r.id, r.name, r.manageid, r.address, r.x, r.y, r.levelmin, r.levelfull, r.levelover, r.incharge, r.macid, r.phone, r.telecom, r.swversion, r.regdate, commstatus, r.comminterval, r.commlast, r.waittime, r.senseadd, r.leveladd, r.rsvtype, r.prange, r.act1open, r.keeptime, r.height, r.effquan];
  pool.query(sql, params, function (err, rows, fields) {
    if (err) {
      outputLog(err);
    } else {
      outputLog("reservoir data loading again ...");
      loadReservoir();
    }
  });
}


function updateReservoir(r) {
  //var r = JSON.parse(data);
  outputLog("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~r:" + r);
  // 2023-0523
  // var sql = 'UPDATE reservoir SET name=?,address=?,x=?,y=?,levelmin=?,levelfull=?,levelover=?,incharge=?,manageid=?,macid=?,phone=?,telecom=?,swversion=?,regdate=?,commstatus=?,comminterval=?,commlast=?,waittime=?,senseadd=?,leveladd=?,rsvtype=?,prange=?,act1open=?,keeptime=?,height=?,effquan=? WHERE id=?';
  var sql = 'UPDATE reservoir SET name=?,address=?,x=?,y=?,levelmin=?,levelfull=?,levelover=?,incharge=?,manageid=?,macid=?,phone=?,telecom=?,swversion=?,regdate=?,comminterval=?,commlast=?,waittime=?,senseadd=?,leveladd=?,rsvtype=?,prange=?,act1open=?,keeptime=?,height=?,effquan=? WHERE id=?';
  // var params = [r.name, r.address, r.x, r.y, r.levelmin, r.levelfull, r.levelover, r.incharge, r.manageid, r.macid, r.phone, r.telecom, r.swversion, r.regdate, r.commstatus, r.comminterval, r.commlast, r.waittime, r.senseadd, r.leveladd, r.rsvtype, r.prange, r.act1open, r.keeptime, r.height, r.effquan, r.id];
  var params = [r.name, r.address, r.x, r.y, r.levelmin, r.levelfull, r.levelover, r.incharge, r.manageid, r.macid, r.phone, r.telecom, r.swversion, r.regdate, r.comminterval, r.commlast, r.waittime, r.senseadd, r.leveladd, r.rsvtype, r.prange, r.act1open, r.keeptime, r.height, r.effquan, r.id];

  pool.query(sql, params, function (err, rows, fields) {
    //outputLog("0004");
    if (err) {
      outputLog("rsv update error: " + err);
    } else {
      outputLog("reservoir info updated");
      loadReservoir();
    }
  });
}

function updateReservoirWithoutReloading(r) {
  //var r = JSON.parse(data);

  // 2023-0523
  var sql = 'UPDATE reservoir SET name=?,address=?,x=?,y=?,levelmin=?,levelfull=?,levelover=?,incharge=?,manageid=?,macid=?,phone=?,telecom=?,swversion=?,regdate=?,commstatus=?,comminterval=?,commlast=?,waittime=?,senseadd=?,leveladd=?,rsvtype=?,prange=?,act1open=?,keeptime=?,height=?,effquan=? WHERE id=?';
  var params = [r.name, r.address, r.x, r.y, r.levelmin, r.levelfull, r.levelover, r.incharge, r.manageid, r.macid, r.phone, r.telecom, r.swversion, r.regdate, r.commstatus, r.comminterval, r.commlast, r.waittime, r.senseadd, r.leveladd, r.rsvtype, r.prange, r.act1open, r.keeptime, r.height, r.effquan, r.id];

  pool.query(sql, params, function (err, rows, fields) {
    //outputLog("0004");
    if (err) {
      outputLog(err);
    } else {
      outputLog("reservoir info updated");
      //loadReservoir();
    }
  });
}

function delReservoir(data) {
  var r = JSON.parse(data);

  var sql = 'DELETE FROM reservoir WHERE id=? and manageid=?';
  var params = [r.id, r.manageid];

  pool.query(sql, params, function (err, rows, fields) {
    if (err) {
      outputLog(err);
    } else {
      outputLog("reservoir info deleted");
      loadReservoir();
    }
  });
}


function addSenseData(data) {
  var now2 = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");

  parseSenseData(data);
  // 마지막 통신시간, 통신상태, 통신 DATA수 업데이트
  var inx = findReservoir(sense[0].macid);
  if (inx >= 0) {
    reservoir[inx].commstatus = 1;
    reservoir[inx].commlast = now2;
    //var temp = parseInt(reservoir[inx].telecom) + parseInt(sense[0].comtime);
    // 0618
    var temp = parseInt(reservoir[inx].telecom);
    //outputLog("original 통신시간="+temp);
    //outputLog("추가 통신시간="+parseInt(sense[0].comtime));
    temp += parseInt(sense[0].comtime);
    //outputLog("최종 통신시간="+temp);

    reservoir[inx].telecom = temp.toString();
    // 내용 업데이트
    outputLog("Reservoir update by sense data ...");
    updateReservoir(reservoir[inx]);
  }

  // 050

  // id는 primary key로 지정해서 자동증가로 만듬 (1부터임)
  // (id),macid,sensetime,waterlevel,watersense,temperature,voltage,comtime,act1open,act1open_current
  // sensetime 수정 : ata가 mqdb에 도착한 시간
  // jjk010


  // 0702 : fault가 포함이 안된 센서 데이터인 경우
  if ((sense[0].fault === null) || (sense[0].fault === undefined)) {
    sense[0].fault = 1;
    //outputLog("************************** fault added forcely .... *****************************");
  }
  var sql = 'INSERT INTO sensedt (macid,sensetime,waterlevel,watersense,temperature,voltage,comtime,act1open,act1open_current,act1opentime,fault) VALUES(?,?,?,?,?,?,?,?,?,?,?)';
  var params = [sense[0].macid, now2, 0, sense[0].watersense, sense[0].temperature, sense[0].voltage, sense[0].comtime, sense[0].act1open, sense[0].act1open_current, sense[0].act1opentime, sense[0].fault];

  // buffer 지움
  // 009
  sense.splice(0, 1);
  //outputLog("Delete Sense Buffer ...");

  pool.query(sql, params, function (err, rows, fields) {
    if (err) {
      outputLog(err);
    } else {
      //outputLog("sense data uploading completed...");
      // upload 되었는지 확인
      findSenseLimitId();
    }
  });

}

// function updateSenseData(data) {
//   var tsense = JSON.parse(data);

//   var sql = 'UPDATE sensedt SET comtime=? WHERE id=? and macid=?';
//   var params = [tsense.comtime, tsense.id, tsense.macid];

//   pool.query(sql, params, function (err, rows, fields) {
//     //outputLog("0004");
//     if (err) {
//       outputLog(err);
//     } else {
//       outputLog("sense data updated");
//     }
//   });
// }

function parseSenseData(data) {
  var inx;
  var temp;
  var macid;
  var watersense, temperature, voltage, comtime, act1open, act1open_current, act1opentime, fault;

  // "SENSE=" + macid + "," + watersense + "," + temperature + "," + voltage + "," + comtime + "," + act1open + "," + act1open_current;
  // 8CAAB5CAE2B0,19.0,20.9,11.6,0,30,20
  // jjk05
  outputLog("Sense data ...");

  // macid
  inx = data.indexOf(',');
  temp = data.substring(0, inx);
  macid = temp;
  outputLog(temp);
  data = data.substring(inx + 1);

  // watersense
  inx = data.indexOf(',');
  temp = data.substring(0, inx);
  watersense = temp;
  outputLog(temp);
  data = data.substring(inx + 1);

  // temperature
  inx = data.indexOf(',');
  temp = data.substring(0, inx);
  temperature = temp;
  outputLog(temp);
  data = data.substring(inx + 1);

  // voltage
  inx = data.indexOf(',');
  temp = data.substring(0, inx);
  voltage = temp;
  outputLog(temp);
  data = data.substring(inx + 1);

  // comtime
  inx = data.indexOf(',');
  temp = data.substring(0, inx);
  comtime = temp;
  outputLog(temp);
  data = data.substring(inx + 1);

  // act1open
  inx = data.indexOf(',');
  temp = data.substring(0, inx);
  act1open = temp;
  outputLog(temp);
  data = data.substring(inx + 1);

  // act1open_current
  inx = data.indexOf(',');
  temp = data.substring(0, inx);
  act1open_current = temp;
  outputLog(temp);
  data = data.substring(inx + 1);


  // test
  //outputLog("------------------ test");
  outputLog(data);
  // act1opentime
  inx = data.indexOf(',');
  // 0702 : 이전 버전 보드
  if (inx < 0) {
    fault = 1;
    act1opentime = data;
  }
  else {
    temp = data.substring(0, inx);
    act1opentime = temp;
    outputLog(temp);
    data = data.substring(inx + 1);

    // fault
    fault = data;
  }
  outputLog(act1opentime);
  outputLog(fault);


  //sense = [];
  sense.push({
    macid: macid,
    watersense: watersense,
    temperature: temperature,
    voltage: voltage,
    comtime: comtime,
    act1open: act1open,
    act1open_current: act1open_current,
    act1opentime: act1opentime,
    fault: fault
  });
}


function isEmpty(value) {
  if (value == "" || value == null || value == undefined || (value != null && typeof value == "object" && !Object.keys(value).length)) { return true }
  else { return false }
}

// 
function findUserIndex(username) {
  for (var i = 0; i < users.length; i++) {
    if (username == users[i].name) {
      return i;
    }
  }
}

// ----------------------------------------------------------------------------------------------------
// db access ...
// ----------------------------------------------------------------------------------------------------

// ----------------------------------------------------------------------------------------------------
// mqtt subroutions ...
// ----------------------------------------------------------------------------------------------------
function initMqtt() {
  outputLog("--------------mqtt initializing--------------");

  // define client ...
  var clientId = "MQTT_CLIENT_ID_PLACEHOLDER";
  client = mqtt.connect("mqtt://" + serverIp, { clientId: clientId });  // clientId should be unique ...

  //handle incoming messages
  client.on('message', function (topic, message, packet) {
    readString = message.toString();
    outputLog("");
    outputLog("");
    outputLog("----------------------------------------------------------");
    outputLog("Incoming message:" + readString);
    outputLog("----------------------------------------------------------");
    parseReadMessage();
  });

  // connected ...
  client.on("connect", function () {
    outputLog("Mqtt successfully connected");
    client.subscribe(subTopic, { qos: 2 });     //single topic
    mqttConnected = true;
  })


  //handle errors
  client.on("error", function (error) {
    outputLog("Can't connect" + error);
  });
}

/*
 * publish
 */
function publish(topic, msg, options) {
  if (client.connected) {
    //outputLog("mqtt send =>" + topic + " " + msg);
    client.publish(topic, msg, options);
  }
}


function outputLog(msg) {
  if (logEnable) logger.info(msg);
}

/*
* parsing the message from strings ...
*/
function parseReadMessage() {

  // Find the first delimiter in the buffer
  var inx = readString.search(';');

  // If there is none, exit
  if (inx == -1) return;

  // Get the complete message, minus the delimiter
  var s = readString.substring(0, inx);

  // Remove the message from the buffer
  readString = readString.substring(inx + 1);

  // process message ...
  processMessage(s);

  // Look for more complete messages
  parseReadMessage();
}

/*
* compare string and forward string and numer ...
*/
function compareString(source, target) {
  var inx1;
  var inx2;
  var slength;

  inx1 = source.indexOf(target);
  inx2 = source.indexOf("=");
  slength = source.length;

  // 없는 경우
  if (inx1 == -1) {
    return false;
  }
  // 있는 경우
  else {
    rxdtString = source.substring(inx2 + 1, slength);
    // outputLog('rxdtString= '+rxdtString); 
    rxdtInt = parseInt(rxdtString);
    // outputLog('rxdtInt= '+rxdtInt);
    return true;
  }
}

function compareTcpString(source, target) {
  var inx1;
  var inx2;
  var slength;

  inx1 = source.indexOf(target);
  inx2 = source.indexOf("=");
  slength = source.length;

  // debug
  /*
  outputLog('debug -----------------');
  outputLog(inx1);
  outputLog(inx2);
  outputLog(source);
  outputLog(target);
  */

  // 없는 경우
  if (inx1 == -1) {
    return false;
  }
  // 있는 경우
  else {
    rxdtTcpString = source.substring(inx2 + 1, slength - 1);  // ';'를 제외하기 위해 -1 
    rxdtTcpInt = parseInt(rxdtTcpString);

    return true;
  }
}

/*
* process Message
*/
function processMessage(message) {
  // login 처리

  if (compareString(message, "LOGIN_START=")) {
    var loginfo = JSON.parse(rxdtString);
    var check = -1;
    var rValue = 0;

    outputLog("");
    outputLog("*****************************LOGIN USER*****************************");
    outputLog("********************************************************************");
    outputLog("username=" + loginfo.username);
    outputLog("passwd=" + loginfo.passwd);
    outputLog("epasswd=" + loginfo.epasswd);
    outputLog("sender=" + loginfo.sender);
    outputLog("********************************************************************");
    outputLog("");
    for (i = 0; i < users.length; i++) {
      // outputLog("name=" + users[i].name);
      // outputLog("passwd=" + users[i].passwd);

      // 0625
      // 로그인한 유져를 db에서 찾아 업데이트
      if ((users[i].name == loginfo.username) && checkIfValid(users[i].passwd, loginfo.epasswd)) {
        check = i;
        rValue = users[i].type;
        users[i].subTopic = loginfo.sender;
        users[i].login = 1;
        //users[i].logtime = new Date();
        users[i].logtime = now;
      }
    }
    publish(loginfo.sender, "LOGIN_START_VALIDATION=" + rValue.toString() + ";");  // 권한정보 송출
  }
  // 이전 login 확인 
  else if (compareString(message, "LOGIN_KEEP=")) {
    var loginfo = JSON.parse(rxdtString);
    var check = -1;
    var rValue = 0;


    for (i = 0; i < users.length; i++) {
      if ((users[i].subTopic == loginfo.sender) && (users[i].login == 1)) {
        check = i;
        rValue = users[i].type;
        //users[i].logtime = new Date();  // 시간 update ...
        users[i].logtime = now;  // 시간 update ...
      }
    }
    publish(loginfo.sender, "LOGIN_KEEP_VALIDATION=" + rValue.toString() + ";");  // 권한정보 송출
  }
  // logout 처리 
  else if (compareString(message, "LOGOUT_START=")) {
    var loginfo = JSON.parse(rxdtString);
    var check = -1;
    var rValue = 0;

    // outputLog("sender=" + loginfo.sender);
    for (i = 0; i < users.length; i++) {
      if (users[i].subTopic == loginfo.sender) {
        check = i;
        users[i].login = 0;
        users[i].logtime = 0;
      }
    }
  }
  // reservoir 요청 처리 
  else if (compareString(message, "GET_RESERVOIR=")) {
    var loginfo = JSON.parse(rxdtString);

    // outputLog("username=" + loginfo.username);

    // 해당 reservoir만 간추려서 전달
    // 해당 user index를 찾음
    var inx = findUserIndex(loginfo.username);
    var tempReservoir = new Array();
    // 일반 user, 일반 관리자
    if (inx > 0) {
      // 010
      for (var i = 0; i < reservoir.length; i++) {
        if (users[inx].rsvSelected.indexOf(reservoir[i].manageid) >= 0) {
          outputLog("현재 사용자에 해당:" + reservoir[i].manageid);
          tempReservoir.push(reservoir[i]);
        }
      }  // for
      outputLog("목록 갯수:" + tempReservoir.length);
    } // if

    // super user ...
    else if (inx == 0) {
      tempReservoir = reservoir;
    }
    else {
      outputLog("해당없음");
    }
    if (tempReservoir.length > 0) {
      var rValue = JSON.stringify(tempReservoir);
      // responseLog("GET_RESERVOIR_DONE=" + rValue + ";");
      publish(loginfo.sender, "GET_RESERVOIR_DONE=" + rValue + ";");  // reservoir 정보 송출
    }
  }
  // USERS 요청 처리 
  else if (compareString(message, "GET_USERS=")) {
    var loginfo = JSON.parse(rxdtString);

    // 0625
    // 권한 Type 1인 경우, 자신의 정보만 보냄
    // 권한 Type 2인 경우, 1,2의 정보만 보냄
    // 자신의 정보부터 찾음
    var tempType = 0;
    var matched = -1;
    for (var i = 0; i < users.length; i++) {
      if ((loginfo.username == users[i].name) && checkIfValid(users[i].passwd, loginfo.epasswd)) {
        tempType = parseInt(users[i].type);
        matched = i;
      }
    }

    outputLog("User Type:" + tempType);
    var rValue;
    var tempUsers = new Array;
    // 일반 사용자인 경우 : 자신의 정보만 보냄
    if (tempType == 1) {
      var i = matched;
      tempUsers.push({
        id: users[i].id,
        krname: users[i].krname,
        name: users[i].name,
        passwd: users[i].passwd,
        type: users[i].type,
        company: users[i].company,
        phone: users[i].phone,
        address: users[i].address,
        rsvSelected: users[i].rsvSelected,
        regdate: users[i].regdate,
        subTopic: users[i].subTopic,
        login: users[i].login,
        logtime: users[i].logtime
      });
      rValue = JSON.stringify(tempUsers);
    }
    else if (tempType == 2) {
      var j = matched;
      for (var i = 0; i < users.length; i++) {
        if ((users[i].company == users[j].company) && (parseInt(users[i].type) <= 2)) {
          tempUsers.push({
            id: users[i].id,
            krname: users[i].krname,
            name: users[i].name,
            passwd: users[i].passwd,
            type: users[i].type,
            company: users[i].company,
            phone: users[i].phone,
            address: users[i].address,
            rsvSelected: users[i].rsvSelected,
            regdate: users[i].regdate,
            subTopic: users[i].subTopic,
            login: users[i].login,
            logtime: users[i].logtime
          });
        }
      }
      rValue = JSON.stringify(tempUsers);
    }
    else if (tempType == 3) {
      rValue = JSON.stringify(users);
    }
    // outputLog("GET_USERS_DONE=" + rValue);
    publish(loginfo.sender, "GET_USERS_DONE=" + rValue + ";");  // users 정보 송출

  }

  else if (compareString(message, "USER_ADD=")) {
    var message = JSON.parse(rxdtString);

    outputLog("sender=" + message.sender);
    //outputLog("data=" + message.data);
    addUser(message.data);
  }
  else if (compareString(message, "USER_DEL=")) {
    var message = JSON.parse(rxdtString);

    outputLog("sender=" + message.sender);
    //outputLog("data=" + message.data);
    delUser(message.data);
  }
  else if (compareString(message, "USER_UPDATE=")) {
    var message = JSON.parse(rxdtString);

    outputLog("sender=" + message.sender);
    //outputLog("data=" + message.data);
    updateUser(message.data);
  }
  else if (compareString(message, "RESERVOIR_ADD=")) {
    var message = JSON.parse(rxdtString);

    outputLog("sender=" + message.sender);
    //outputLog("data=" + message.data);
    addReservoir(message.data, 0);
  }
  else if (compareString(message, "RESERVOIR_DEL=")) {
    var message = JSON.parse(rxdtString);

    outputLog("sender=" + message.sender);
    //outputLog("data=" + message.data);
    delReservoir(message.data);
  }
  else if (compareString(message, "RESERVOIR_UPDATE=")) {
    var message = JSON.parse(rxdtString);

    outputLog("sender=" + message.sender);
    //outputLog("data=" + message.data);
    outputLog("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~message: " + message);
    var r = JSON.parse(message.data);
    updateReservoir(r);
  }
  // test : web으로부터 SENSE 데이터 전달 
  else if (compareString(message, "SENSE=")) {
    var message = JSON.parse(rxdtString);

    outputLog("sender=" + message.sender);
    outputLog("sender=" + message.data);
    addSenseData(message.data);
  }
  else if (compareString(message, "GET_SENSES=")) {
    var message = JSON.parse(rxdtString);
    // 2023-0523
    // su와 일반인 경우, 왜 처리를 다르게 하는지 파악?
    // su user인 경우
    if (message.type == 3) {
      var num = message.data;           //ex: MaxId=50(primary id=1부터 시작) num = 10, start = 41, end 50
      var start = maxSenseId - num + 1;
      var end = maxSenseId;
      if (start < minSenseId) start = minSenseId;
      outputLog("start:" + start);
      outputLog("end:" + end);
      sensesLoadCompleted = false;
      loadSenses(start, end, message.sender);
      //getSenses(message.idString,message.data);
    }
    // type=1 or 2인 경우
    else if ((message.type == 1) || (message.type == 2)) {
      // 24시간 내에 해당되는 id의 데이터를 최대 원하는 개수만큼 가져옴
      // 2023-0523
      getSenses(message.idString, message.data, message.sender, message.date, message.endDate);
    }
  }

  //sense2
  else if (compareString(message, "GET_SENSES2=")) {
    var message = JSON.parse(rxdtString);
    // 2023-0523
    // su와 일반인 경우, 왜 처리를 다르게 하는지 파악?
    // su user인 경우
    if (message.type == 3) {
      var num = message.data;           //ex: MaxId=50(primary id=1부터 시작) num = 10, start = 41, end 50
      var start = maxSenseId2 - num + 1;
      var end = maxSenseId2;
      if (start < minSenseId2) start = minSenseId2;
      outputLog("start:" + start);
      outputLog("end:" + end);
      sensesLoadCompleted = false;
      loadSenses2(start, end, message.sender);
      //getSenses(message.idString,message.data);
    }
    // type=1 or 2인 경우
    else if ((message.type == 1) || (message.type == 2)) {
      // 24시간 내에 해당되는 id의 데이터를 최대 원하는 개수만큼 가져옴
      // 2023-0523
      // getSenses2(message.idString, message.data, message.sender, message.date, message.endDate);
    }
  }
  // PUT_OPTION1 요청 처리 
  else if (compareString(message, "PUT_OPTION1=")) {
    outputLog("------ PUT_OPTION1");
    var message = JSON.parse(rxdtString);
    var option = message.data;

    for (var i = 0; i < reservoir.length; i++) {
      reservoir[i].swversion = option;
      // 0913
      // global option을 comminterval에 적용해야 하는 경우
      if ((option & 256) == 256) {
        reservoir[i].comminterval = (option & 0xff);
      }
      outputLog("------ update Reservoir " + i);
      updateReservoirWithoutReloading(reservoir[i]);
    }
  }
  // image capture 요청 처리 
  else if (compareString(message, "PUT_CAPTURE=")) {
    outputLog("------ Image capture requested");
    var message = JSON.parse(rxdtString);
    var id = message.data;    // macid

    // 900
    captureIdList.push(id);
  }
  // image capture ready인지 문의 
  else if (compareString(message, "GET_CAPTURE=")) {
    // outputLog("GET_CAPTURE check ?");
    var message = JSON.parse(rxdtString);
    if (imageUploadStarted) {
      publish(message.sender, "GET_CAPTURE_STATUS=0;");
    }
    else {
      if (imageUploadCompleted) publish(message.sender, "GET_CAPTURE_STATUS=2;");
      else publish(message.sender, "GET_CAPTURE_STATUS=1;");
    }
  }

  else if (compareString(message, "GET_DOWNLOAD=")) {
    var message = JSON.parse(rxdtString);

    outputLog("sender=" + message.sender);
    outputLog("number=" + message.data);
    outputLog("type=" + message.type);
    outputLog("ids=" + message.idString);

    // type=1 or 2인 경우
    if ((message.type == 1) || (message.type == 2)) {
      getDownload(message.idString, message.data, message.sender);
    }
  }
}



function checkIfValid(a, b) {
  var keys = [0x3c, 0x71, 0x88, 0x9a, 0xf4, 0x73, 0x58, 0x62, 0xc9, 0x77, 0x80, 0x96, 0xf3, 0x5b, 0xd5, 0x24];
  var outString = "0123456789abcdefghijklmnopqrstuvwxYzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*";
  var input = a;

  for (var j = 0; j < 16; j++) {
    var output = "";
    var key = keys[j];
    for (var i = 0; i < input.length; i++) {
      var temp1 = Number(input.charCodeAt(i));
      var temp2 = temp1 ^ key;
      var temp3 = temp2 % outString.length;
      output += outString.charAt(temp3);
    }
    if (output == b) return true;
  }

  return false;
}


// ----------------------------------------------------------------------------------------------------
// mqtt subroutions ...
// ----------------------------------------------------------------------------------------------------



// ----------------------------------------------------------------------------------------------------
// TCP socket subroutions ...
// ----------------------------------------------------------------------------------------------------
function findReservoir(id) {
  //outputLog(id);

  if (!isEmpty(reservoir)) {
    for (var i = 0; i < reservoir.length; i++) {
      if (id.includes(reservoir[i].macid.toUpperCase())) {
        return i;
      }
    }
  }
  return -1;
}


function resetComHistoryAt(tDay, tHour, tMin) {
  var date = new Date();
  var date2 = date.getDate();
  var hour = (date.getHours());
  var minute = (date.getMinutes());
  /*
  console.log(date2);
  console.log(hour);
  console.log(minute);
  */

  if ((date2 == tDay) && (hour == tHour) && (minute == tMin)) {
    resetComHistory = true;
    console.log("Time matched for resetting the size of communication data of each LTE Modem ...");

    for (var i = 0; i < reservoir.length; i++) {
      if (i == 0) {
        reservoir[i].telecom = "0";
        updateReservoirWithoutReloading(reservoir[i]);
      }
    }

    setTimeout(() => {
      resetComHistory = false;
    }, 60 * 1000);
  }
}
