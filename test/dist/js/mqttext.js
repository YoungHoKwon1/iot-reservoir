var mqttInitStarted = false;
var mqttConnected = false;
var serverIp = "";

var serverPort = "";
var subTopic = localStorage.getItem("subTopic");
var pubTopic = "";
var client;
var numMqttError = 0;
var rxMqttBuffer;
var rxdtMqttString;
var rxdtMqttInt;
var mqttLogDisplay = true;


function initMqtt() {
    var _subTopic = localStorage.getItem("subTopic");
    if (_subTopic != subTopic) {
        localStorage.setItem("subTopic", subTopic);
    }
    // all pass : null,undefined,NaN,empty string (""),0,false
    if (serverIp && serverPort && subTopic) {
        mqttInitStarted = true;
        printDebugYH(serverIp);
        printDebugYH(serverPort);
        printDebugYH(subTopic);

        client = new Paho.MQTT.Client(serverIp, serverPort, subTopic);

        // set callback handlers
        client.onConnectionLost = onConnectionLost;
        client.onMessageArrived = onMessageArrived;
        // added
        //client.qos = 2;

        // connect the client
        //client.connect({onSuccess:onConnect,onFailure:onFail,keepAliveInterval:5});
        //client.connect({onSuccess:onConnect,onFailure:onFail, cleanSession:false});
        client.connect({ onSuccess: onConnect, onFailure: onFail });

        return true;
    }
    else {
        if (mqttLogDisplay) printDebug("Check serverIp or serverPort or subTopic ...");
        return false;
    }
}

function retryMqtt() {
    if (mqttLogDisplay) printDebug("mqtt retry ...");
    numMqttError++;
    if (numMqttError > 5) {
        //confirm("통신에 문제가 있으니, 통신 상태를 확인하고 앱을 다시 실행시켜 주세요!"); 
        toastMessage("통신에 문제가 있으니 확인 후 로그인하세요!");
        window.location.href = "index.html";
    }
    else {
        // re-init mqtt communication ...
        setTimeout(() => {
            client = null;
            mqttInitStarted = false;
            initMqtt();
        }, 1000);
    }
}

// called when the client connects
function onConnect() {
    // Once a connection has been made, make a subscription and send a message.
    if (mqttLogDisplay) printDebug("mqtt Connected");


    mqttConnected = true;
    numMqttError = 0;
    // subscription ...
    if (mqttLogDisplay) printDebug("Subscription ID:" + subTopic);
    client.subscribe(subTopic, { qos: 2 });


}

// called when the client connects
function onFail() {
    mqttConnected = false;
    // Once a connection has been made, make a subscription and send a message.
    if (mqttLogDisplay) printDebugYH("mqtt onFail");
    retryMqtt();
}

// focely disconnect mqtt ...
function unsubscribe() {
    client.unsubscribe(subTopic);
}

function subscribe() {
    client.subscribe(subTopic);
}


// called when the client loses its connection
function onConnectionLost(responseObject) {
    printDebugYH("connection lost ...=" + responseObject.errorCode);
    if (responseObject.errorCode !== 0) {
        //printDebug("onConnectionLost:"+responseObject.errorMessage);
        retryMqtt();
    }
}

// called when a message arrives
function onMessageArrived(message) {
    rxMqttBuffer = message.payloadString;
    printDebugYH("---------------onMessageArrived message---------------");
    //if (mqttLogDisplay) printDebug("onMessageArrived:"+message.payloadString);
    parseMqttReadBuffer();
}

function getMqttStatus() {
    return mqttConnected;
}


function clientPublish(topic, message) {
    var data;

    if (mqttConnected == true) {
        data = new Paho.MQTT.Message(message);
        data.destinationName = topic;
        client.send(data);
        var sentData = " to " + topic + ":" + message;
        if (mqttLogDisplay) printDebug("message sent" + sentData);
    }
    //else //myConsoleLog("mqtt not ready ...");
}
function parseMqttReadBuffer() {
    ////myConsoleLog(rxBuffer);

    // Find the first delimiter in the buffer
    var inx = rxMqttBuffer.search(';');

    // If there is none, exit
    if (inx == -1) return;

    // Get the complete message, minus the delimiter
    var s = rxMqttBuffer.substring(0, inx);

    // Remove the message from the buffer
    rxMqttBuffer = rxMqttBuffer.substring(inx + 1);

    // Process the message
    processMqttMessage(s);

    // Look for more complete messages
    parseMqttReadBuffer();
}



function compareMqttString(source, target) {
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
        rxdtMqttString = source.substring(inx2 + 1, slength);
        rxdtMqttInt = parseInt(rxdtMqttString);
        printDebugYH(target);
        return true;
    }
}





