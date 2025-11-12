const MODE_ADD = 0;
const MODE_EDIT = 1;


var excelDownload = false;
var toast_wait_enabled = false;
var excel_name = "";
var selDownloadList;

var keepCheck;
var keepCheckReceived = false;
var keepStatusOk = false;
var waitCounter;
var validationCheck = -1;
var username;
var passwd;

var mapLoadingFInshed = false;
var reservoir;
var reservoirWarning = [];
var levelWarningFlag = false;
var openWarningFlag = false;
var batteryWarningFlag = false;
var actuatorWarningFlag = false;

var selectedReservoir = 0;
var editSelectedReservoir = 0;

var selectedUser = 0;
var editSelectedUser = 0;

//var waterSenseLevel;
var reservoirReceived = false;
var indexWaitCounter = 0;
var usersReceived = false;
var users;

var mapContainer;
var mapOptions;
var map;
var mapTypeControl;
var zoomControl;

//var marker;
var markers;
var mapOverlay;
var infowindows;

var bounds;
var mapInitialZoom = true;

// 마커이미지의 주소
//var imageSrc_noWarning = "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png"; 
var imageSrc_noWarning = "images/marker_gray.png";
var imageSrc_Warning = 'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_red.png';

var idTableReservoir;
var idTableReservoir2;

var idTableSense;
var idTableSense2;
var idTableUsers;

var mapOrTable = 0;     // 0(map), 1(table)
var detailOrChart = 0;  // 0(detail), 1(chart)

var idSensTableDrawn = false;
var idSens2TableDrawn = false;
var idTableUsersSelectedRow = -1;
var idTableUsersClickAdded = false;
var rsvMultiAdded = false;
var senseMemberMultiAdded = false;
var sense2MemberMultiAdded = false;

var idTableReservoir2SelectedRow = -1
var g_inputReservoirLocation;
var g_rsvtype = 0;
var wlevelInstantCheck = true;      // 즉각 check해서 보여 줌

/*
var addUserFlag = false;
var delUserFlag = false;
var editUserFlag = false; */


// Set new default font family and font color to mimic Bootstrap's default styling
Chart.defaults.global.defaultFontFamily = '-apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';
Chart.defaults.global.defaultFontColor = '#292b2c';

// Area Chart Example
//var ctx;
var myLineChart;

var pageMode = 0;       // 0(index), 1(sensing), 2(저수지 정보 편집), 3(사용자 추가), 4(설정)
var senses = new Array();
var senses2 = new Array();
//var sensesEtc = new Array();

var wlevelWarnings = new Array();
var openWarnings = new Array();
var batteryWarnings = new Array();
var actuatorWarnings = new Array();
var warningSelect = 0;

//var graphData;
//var graphData2;
//var graphLabel;
var graphMin;
var graphMax;

var reservoirDetailDrawn = false;
var openTarget = 0;
var currentOpenValue = 0;

var reservoirUpdateToServerRequested = false;

var imageResolution = 0;                // 0 저해상도, 1 고해상도
var g_comminterval = 10;
var globalCommInterval = false;
var g_options = 0;
var globalOptionEnable = false;
var globalOptionUpdateRequested = false;    // onchange가 여러번 발생하는 문제 해결

var imageCatureDoing = false;
var imageCaptureId = "";
var imageCaptureTimer = 0;


var modal = document.getElementById("myModal");
var modalImg = document.getElementById("img01");
var span = document.getElementsByClassName("myClose")[0];
var captionText = document.getElementById("caption");

var askDBLocked = false;
var act1open_changed_time = sNow();
var idpartOpenCheckFlag = false;

var motorWorkingFlag = false;

// 0913
var comMode = 0;
var comIntMonitor = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];
var comIntControl = [2, 3, 4, 5, 8, 10, 15, 20, 30, 40, 50, 60];
var reservoirString_old = "";
var reservoirString = "";
var userString = "";
var userString_old = "";
var senseString = "";
var senseString_old = "";

var captureStatus = 1;  // 0 busy, 1 ready,2 completed
var captureRequested = false;
var normalUser = true;

var addEditReservoir = MODE_ADD;   // 0 add,1 edit
var addEditUser = MODE_ADD;         // 0 add,1 edit
var idTableRsvTotal = 0;

var gMarkerImage;
var selectedMarkerIndex = -1;

var specificMacidIndex = -1;
var gSpecificDateMode = false;      // in-active, 1active
var specificDate = "";
var percent_bkup;

var oneItemRequested = false;

// map을 그린다 ...
function _drawMap() {
    if (keepStatusOk == false) window.setTimeout(_drawMap, 100);
    else {
        // reservoir 값을 모두 가져옴
        //var loginfo = {"username": "", "passwd": "","sender": subTopic};
        var loginfo = {
            "username": username, "passwd": passwd,
            "sender": subTopic
        };

        reservoir = [];
        reservoirReceived = false;
        clientPublish(pubTopic, "GET_RESERVOIR=" + JSON.stringify(loginfo) + ";");
        printDebug("checkReservoirReceived  started ...");
        indexWaitCounter = 0;
        checkReservoirReceived();
    }
}

function checkReservoirReceived() {
    if (reservoirReceived == false) {
        if (indexWaitCounter < 50) window.setTimeout(checkReservoirReceived, 100);  /* this checks the flag every 100 milliseconds*/
        else {
            printDebugYH("서버로부터 데이터를 수신하지 못함");
        }
    }
    // data 수신
    else {
        // 저수지 정보
        drawMap();
        addTableReservoir();
        // map
        if (mapOrTable == 0) {
            document.getElementById('idTable').style.display = 'none';
            document.getElementById('idMap').style.display = 'block';
        }
        // table
        else {
            document.getElementById('idMap').style.display = 'none';
            document.getElementById('idTable').style.display = 'block';
        }
        drawReservoirDetail();
        _drawChart();

        // sense data 추가 
        startTime = new Date();
        // Table 한번만 이 시점에서 그림

        if (!idSensTableDrawn) addTableSense();

        // Device값 simulation
        setTimeout(() => {
            //simulateDevice(); 
            askSenseValues();
        }, 1 * 1000);
        // Reservoir update ...
        setInterval(() => {
            if (!reservoirUpdateToServerRequested) updateResevoir();
        }, 2000);
        // 사용자 정보 추가
        setTimeout(() => {
            _drawUsers();
        }, 1500);

        // Sense update ...
        // 1분에 한번씩 가져와도 충분하다 ...
        // test : 30초에 한번씩 최신 100개를 가져온다
        setInterval(() => {
            askDBLocked = true;

            // 2022-0124
            // dashboard 모드에서만 call
            // test
            if (pageMode == 0) askSenseValues();
            askDBLocked = false;

            // 서로 다른 시간에 불러옴 ...
            setTimeout(() => {
                askDBLocked = true;
                askReservoirValues();
                askDBLocked = false;
            }, 5000);

            // 0913
            // capture 가능한지 확인
            setTimeout(() => {
                askDBLocked = true;
                // image capture 가능한 상태인지만 업데이트 해 둠 ...
                var message = { "sender": subTopic };
                clientPublish(pubTopic, "GET_CAPTURE=" + JSON.stringify(message) + ";");
                askDBLocked = false;
            }, 10000);

            //if (idTableSense) updateTableSense();
            // 621
            // test
        }, 60 * 1000);


    }
}


function loadingProgress(duration) {

    $('#lPopup').modal('show');
    document.getElementById('lPopup').style.zIndex = "9001";
    setTimeout(function () {
        $('#lPopup').modal('hide');
        document.getElementById('lPopup').style.zIndex = "-1002";
    }, duration);

}

function reservoirUpdateToServer() {
    var data = stringifyReservoirInfo(selectedReservoir);    // i : index of selected User
    var message = { "sender": subTopic, "data": data };
    clientPublish(pubTopic, "RESERVOIR_UPDATE=" + JSON.stringify(message) + ";");

    reservoirUpdateToServerRequested = false;
}

// --------------------------------------------------------------------------------------------------------------
// map
// --------------------------------------------------------------------------------------------------------------
function drawMap() {
    // reservoir가 준비됨
    // printDebug("map 위한 기본 데이터가 준비됨");
    mapContainer = document.getElementById('idMap');

    // 2023-0808 : 1초 delay
    setTimeout(() => {
        mapOptions = {
            center: new kakao.maps.LatLng(36.35111, 127.38500), // 대전
            level: 12
        };

        map = new kakao.maps.Map(mapContainer, mapOptions);
        // 0625
        bounds = new kakao.maps.LatLngBounds();

        // 일반 지도와 스카이뷰로 지도 타입을 전환할 수 있는 지도타입 컨트롤을 생성합니다
        mapTypeControl = new kakao.maps.MapTypeControl();
        // 지도에 컨트롤을 추가해야 지도위에 표시됩니다
        // kakao.maps.ControlPosition은 컨트롤이 표시될 위치를 정의하는데 TOPRIGHT는 오른쪽 위를 의미합니다
        map.addControl(mapTypeControl, kakao.maps.ControlPosition.TOPRIGHT);
        // 지도 확대 축소를 제어할 수 있는  줌 컨트롤을 생성합니다
        zoomControl = new kakao.maps.ZoomControl();
        map.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT);
        // 지도가 확대 또는 축소되면 마지막 파라미터로 넘어온 함수를 호출하도록 이벤트를 등록합니다
        kakao.maps.event.addListener(map, 'zoom_changed', function () {
            // 지도의 현재 레벨을 얻어옵니다
            var level = map.getLevel();
        });

        // 최초에는 type=0(수위레벨)
        updateMarker(warningSelect, false);
    }, 500);

}

function isEmpty(value) {
    if (value == "" || value == null || value == undefined || (value != null && typeof value == "object" && !Object.keys(value).length)) { return true }
    else { return false }
}

// 수위,open,배터리,actuator marker
// 각 경보가 발생한 경우는 해당 색깔 표시, 미발생시 기본색깔 표시
function updateMarker(type, onlyWarning) {
    // 2023-0724: 이 기능 사용하지 않음
    //onlyWarning = false;

    if (!isEmpty(reservoir)) {
        // 이전 마커가 있으면 지움
        if (!isEmpty(markers)) {
            for (var i = 0; i < markers.length; i++) {
                hideMarkers(i);
            }
        }

        // marker 모두 지움
        markers = [];
        mapOverlay = [];
        infowindows = [];

        // wlevel warning 
        if (type == 0) {
            // 007
            for (var i = 0; i < reservoir.length; i++) {
                var flag = false;
                if (!isEmpty(wlevelWarnings)) {
                    // here101
                    for (var j = 0; j < wlevelWarnings.length; j++) {
                        if (reservoir[i].name == wlevelWarnings[j].name) {
                            flag = true;
                        }
                    }
                }
                // warning이 있으면
                if (flag) addMarker(type, i, 1, reservoir[i].name);
                else {
                    if (!onlyWarning) addMarker(type, i, 0, reservoir[i].name);
                }
            }
        }
        // open
        else if (type == 1) {
            for (var i = 0; i < reservoir.length; i++) {
                var flag = false;
                if (!isEmpty(openWarnings)) {
                    for (var j = 0; j < openWarnings.length; j++) {
                        if (reservoir[i].name == openWarnings[j].name) {
                            flag = true;
                        }
                    }
                }
                // warning이 있으면
                if (flag) addMarker(type, i, 1, reservoir[i].name);
                else {
                    if (!onlyWarning) addMarker(type, i, 0, reservoir[i].name);
                }
            }
        }
        // battery
        else if (type == 2) {
            for (var i = 0; i < reservoir.length; i++) {
                var flag = false;
                if (!isEmpty(batteryWarnings)) {
                    for (var j = 0; j < batteryWarnings.length; j++) {
                        if (reservoir[i].name == batteryWarnings[j].name) {
                            flag = true;
                        }
                    }
                }
                // warning이 있으면
                if (flag) addMarker(type, i, 1, reservoir[i].name);
                else {
                    if (!onlyWarning) addMarker(type, i, 0, reservoir[i].name);
                }
            }

        }
        // actuator
        else if (type == 3) {
            for (var i = 0; i < reservoir.length; i++) {
                var flag = false;
                if (!isEmpty(actuatorWarnings)) {
                    for (var j = 0; j < actuatorWarnings.length; j++) {
                        if (reservoir[i].name == actuatorWarnings[j].name) {
                            flag = true;
                        }
                    }
                }
                // warning이 있으면
                if (flag) addMarker(type, i, 1, reservoir[i].name);
                else {
                    if (!onlyWarning) addMarker(type, i, 0, reservoir[i].name);
                }
            }
        }


        // 0625
        if (mapInitialZoom) {
            setTimeout(() => {
                // 0625
                // 마커가 1개이면, 마커를 중심으로 확대레벨 2
                if (reservoir.length == 1) {
                    map.setLevel(2);
                    console.log(sNow() + " => " + "004   map.setLevel(2)");

                    // 이동할 위도 경도 위치를 생성합니다 
                    var moveLatLon = new kakao.maps.LatLng(reservoir[0].y, reservoir[0].x);
                    // 지도 중심을 이동 시킵니다
                    map.setCenter(moveLatLon);
                    console.log(sNow() + " => " + "005  map.setCenter(moveLatLon);");
                }
                // 여러개인 경우
                else if (reservoir.length > 1) {
                    // center
                    var y, x, sumy = 0.0, sumx = 0.0;
                    for (var i = 0; i < reservoir.length; i++) {
                        sumy += reservoir[i].y;
                        sumx += reservoir[i].x;
                    }
                    y = sumy / reservoir.length;
                    x = sumx / reservoir.length;
                    var moveLatLon = new kakao.maps.LatLng(y, x);
                    // 지도 중심을 이동 시킵니다
                    map.setCenter(moveLatLon);
                    //console.log(sNow() + " => " +"006  map.setCenter(moveLatLon); ");


                    var points = [];
                    for (var i = 0; i < reservoir.length; i++) {
                        points.push(new kakao.maps.LatLng(reservoir[i].y, reservoir[i].x));
                        bounds.extend(points[i]);
                    }
                    map.setBounds(bounds);
                    //console.log(sNow() + " => " +  "001 map.setBounds(bounds);");
                }
            }, 1000);
        }
        mapInitialZoom = false;

        // here001
        // 2023-0724
        // 홍수경보시, 현재 선택된 항목이 홍수 항목에 없을 경우, 센터를 어떻게 잡을 것인가?
        // selectedReservoir가 warning 항목에 있을 경우만 처리한다
        // 2022-0124
        // center 다시 설정
        if ((selectedReservoir >= 0) && (selectedReservoir < reservoir.length)) {
            var moveLatLon = new kakao.maps.LatLng(reservoir[selectedReservoir].y, reservoir[selectedReservoir].x);
            // 지도 중심을 이동 시킵니다
            map.setCenter(moveLatLon);

            // 선택도 다시 highlight
            var el = document.getElementById('idInfo_' + selectedReservoir);
            // 없는 경우도 있다
            // 2023-0724 : 홍수가 났을 경우, 현재 선택이 홍수 리스트에 없을 경우
            if (el) addClass(el, 'info-title-active');
            // update ...
            selectedMarkerIndex = selectedReservoir;
        }
    }  // if


    // 2023-0724
    // 0913

    /*
    var infoTitle = document.querySelectorAll('.info-title');
    infoTitle.forEach(function(e) {
            var w = e.offsetWidth + 10; // 10
            var ml = w/2;
            e.parentElement.style.top = "68px"; // 68px 82px
            e.parentElement.style.left = "50%";
            e.parentElement.style.marginLeft = -ml+"px";
            e.parentElement.style.width = w+"px";
            e.parentElement.previousSibling.style.display = "none";
            e.parentElement.parentElement.style.border = "0px";
            e.parentElement.parentElement.style.background = "unset";
    });
    */
    // 2023-0808
    var infoTitle = document.querySelectorAll('.info-title');
    var infoTitleArray = Array.from(infoTitle);

    infoTitleArray.forEach(function (e) {
        var w = e.offsetWidth + 10; // 10
        var ml = w / 2;
        e.parentElement.style.top = "68px"; // 68px 82px
        e.parentElement.style.left = "50%";
        e.parentElement.style.marginLeft = -ml + "px";
        e.parentElement.style.width = w + "px";
        e.parentElement.previousSibling.style.display = "none";
        e.parentElement.parentElement.style.border = "0px";
        e.parentElement.parentElement.style.background = "unset";
    });

}

function addMarker(type, index, flag, name) {
    var i = index;

    // 마커 이미지의 이미지 크기 입니다
    var imageSize = new kakao.maps.Size(24, 35);

    // 마커 이미지를 생성합니다    
    var file = ['images/marker_blue.png', 'images/marker_amber.png', 'images/marker_green.png', 'images/marker_red.png', 'images/marker_gray.png'];

    var imageFile;
    if (flag == 0) imageFile = file[4];
    else imageFile = file[type];

    var markerImage = new kakao.maps.MarkerImage(imageFile, imageSize);

    // 마커를 생성합니다
    var latlng = new kakao.maps.LatLng(reservoir[i].y, reservoir[i].x);
    var marker = new kakao.maps.Marker({
        map: map, // 마커를 표시할 지도
        position: latlng, // 마커를 표시할 위치
        title: reservoir[i].name, // 마커의 타이틀, 마커에 마우스를 올리면 타이틀이 표시됩니다
        clickable: true,           // true 함
        image: markerImage // 마커 이미지 
    });

    // 0913
    /*
    var content =   '<div class="customOverlay" style="pointer-events:none;">' +
                    '    <span class="title">' + name + '</span>' +
                    '</div>';

    var customOverlay = new kakao.maps.CustomOverlay({
        map: map,
        position: latlng,
        content: content,
        clickable: false,
        yAnchor: 1 
    }); 
   */

    // 1211
    //var iwContent =     '<span class="info-title" style="width:100%" id="idTitleWidth_"' + index + '>' + name + '</span>';
    var iwContent = '<div class="info-title disableSelection" id="idInfo_' + index + '">' + name + '</div>';


    // 인포윈도우를 생성합니다
    // 1222-1
    var infowdw = new kakao.maps.InfoWindow({
        //infowindows[index] = new kakao.maps.InfoWindow({    
        position: latlng,
        content: iwContent
    });
    // 마커 위에 인포윈도우를 표시합니다. 두번째 파라미터인 marker를 넣어주지 않으면 지도 위에 표시됩니다
    infowdw.open(map, marker);
    // 1211
    // 글자의 폭을 지정

    // 2023-0808-1
    // 마커에 click 이벤트를 등록합니다
    kakao.maps.event.addListener(marker, 'click', function () {
        console.log("title=" + marker.Gb);      // 1211: Fb -> Gb로 변경됨
        var inx = findMarkerIndex(marker.Gb);
        console.log("inx: " + inx);

        // 마커에 대해서 중심으로 이동
        if (inx >= 0) {
            var level = map.getLevel();
            //map.setLevel(level - 2); 
            map.setLevel(level - 1);
            console.log(sNow() + " => " + "002 map.setLevel(level - 1);");
            // 이동할 위도 경도 위치를 생성합니다 
            var moveLatLon = new kakao.maps.LatLng(reservoir[inx].y, reservoir[inx].x);

            // 지도 중심을 이동 시킵니다
            map.setCenter(moveLatLon);
            console.log(sNow() + " => " + "003  map.setCenter(moveLatLon);");

            // 저수지 상세정보 변경
            selectedReservoir = inx;


            //2023-0808 : 하나의 저수지에 대해 센서 데이터가 요청시 일부 저수지가 0으로 들어옴
            // 그런데 저수지 전체에 대해서 가져올 경우는 문제가 없음
            // 따라서, 이전에 가져온 값을 사용한다
            // 2023-0724
            oneItemRequested = true;

            // 2022-0124
            // 개별 저수지 정보를 가지고 다시 그림
            // 0626
            var idString = "";
            idString += "(macid=";
            idString += "'" + reservoir[selectedReservoir].macid + "'";
            idString += ")";
            var message = { "sender": subTopic, "data": 150, "type": 2, "idString": idString, "date": "", "endDate": "" };
            clientPublish(pubTopic, "GET_SENSES=" + JSON.stringify(message) + ";");

            // 이전에 센서값은 가져왔다고 가정하고 그리기만 함
            //drawReservoirDetail();


            gSpecificDateMode = false;
            $('#idSenseType3').prop("checked", true);
            $('#idSenseType4').prop("checked", false);
            // remark
            // drawReservoirDetail();
            //_drawChart();

            // 2022-0106-추가
            var el;
            // 이전 title 색깔 복구
            if (selectedMarkerIndex >= 0) {
                if (selectedMarkerIndex != inx) {
                    el = document.getElementById('idInfo_' + selectedMarkerIndex);
                    removeClass(el, 'info-title-active');
                    addClass(el, 'info-title');
                }
            }
            // 신규
            if (inx != selectedMarkerIndex) {
                el = document.getElementById('idInfo_' + inx);
                removeClass(el, 'info-title');
                addClass(el, 'info-title-active');

                // update ...
                selectedMarkerIndex = inx;
            }
            // 메세지 추가
            toastMessage("저수지 " + reservoir[inx].name + "이(가)  선택되었습니다");
        }

    });


    markers.push(marker);
    // 1222-1 : markers와 동일한 구조로 변경
    infowindows.push(infowdw);
}

function hasClass(el, className) {
    if (el.classList)
        return el.classList.contains(className)
    else
        return !!el.className.match(new RegExp('(\\s|^)' + className + '(\\s|$)'))
}
function addClass(el, className) {
    if (el.classList)
        el.classList.add(className)
    else if (!hasClass(el, className)) el.className += " " + className
}
function removeClass(el, className) {
    if (el.classList)
        el.classList.remove(className)
    else if (hasClass(el, className)) {
        var reg = new RegExp('(\\s|^)' + className + '(\\s|$)')
        el.className = el.className.replace(reg, ' ')
    }
}

function findMarkerIndex(title) {
    for (var i = 0; i < reservoir.length; i++) {
        if (title == reservoir[i].name) return i;
    }
    return -1;
}


// 배열에 추가된 마커들을 지도에 표시하거나 삭제하는 함수입니다
function setMarkers(map) {
    for (var i = 0; i < markers.length; i++) {
        markers[i].setMap(map);
    }
}

// "마커 보이기" 버튼을 클릭하면 호출되어 배열에 추가된 마커를 지도에 표시하는 함수입니다
function showMarkers(inx) {
    markers[inx].setMap(map);
}

// "마커 감추기" 버튼을 클릭하면 호출되어 배열에 추가된 마커를 지도에서 삭제하는 함수입니다
function hideMarkers(inx) {

    infowindows[inx].close();

    markers[inx].setMap(null);
}

function hideAllMarkers() {
    if (markers.length > 0) {
        for (var i = 0; i < markers.length; i++) {
            hideMarkers(i);
        }
    }
}


function showAllMarkers() {
    updateMarker(0, false);
}

// jjk5
// 수위경보
function clickWarning1() {
    levelWarningFlag = !levelWarningFlag;
    openWarningFlag = false;
    batteryWarningFlag = false;
    actuatorWarningFlag = false;

    warningSelect = 0;
    updateMarker(warningSelect, levelWarningFlag);
}

// 온도경보
function clickWarning2() {
    levelWarningFlag = false;
    openWarningFlag = !openWarningFlag;
    batteryWarningFlag = false;
    actuatorWarningFlag = false;
    warningSelect = 1;
    updateMarker(warningSelect, openWarningFlag);
}

// 배터리경보
function clickWarning3() {
    levelWarningFlag = false;
    openWarningFlag = false;
    batteryWarningFlag = !batteryWarningFlag;
    actuatorWarningFlag = false;
    warningSelect = 2;
    updateMarker(warningSelect, batteryWarningFlag);
}

// 액츄에이터경보
function clickWarning4() {
    levelWarningFlag = false;
    openWarningFlag = false;
    batteryWarningFlag = false;
    actuatorWarningFlag = !actuatorWarningFlag;
    warningSelect = 3;
    updateMarker(warningSelect, actuatorWarningFlag);

    // 0706
    // test
    //$("#idDashboard").css({ opacity: 0.5 });
}
// --------------------------------------------------------------------------------------------------------------
// map
// --------------------------------------------------------------------------------------------------------------






// jjk5
// reservoir에 대한 table을 추가
function addTableReservoir() {
    if (idTableReservoir) idTableReservoir.destroy();
    idTableReservoir = $('#idTableReservoir').DataTable({
        "scrollX": true,     // test
        "scrollCollapse": true,
        "autoWidth": false,
        "paging": true,
        "ordering": true,
        "info": true,
        "filter": true,
        "lengthChange": true,
        "order": [[0, "asc"]],
        "stateSave": true,
        "pagingType": "full_numbers",
        "columnDefs": [
            { "className": "dt-center", "defaultContent": "-", "orderable": true, "targets": "_all" },
            {
                "targets": 0,
                "render": function (data, type, row, meta) {
                    var res = row[0];
                    return res;
                }
            }
        ]
    });
    idTableReservoir.clear().draw();


    // 008
    //setTimeout(() => {
    if (!isEmpty(reservoir)) {
        // 0
        if (warningSelect == 0) {
            if (!levelWarningFlag) {
                // 모든 list
                idTableRsvTotal = reservoir.length;
                for (var i = 0; i < reservoir.length; i++) {
                    var radio = '<input id="idTableRsv' + i + '" class="form-check-input" style="margin-left:0px;" type="radio">';
                    idTableReservoir.row.add([
                        radio,
                        // 0913
                        i + 1,
                        //reservoir[i].id + 1,
                        reservoir[i].name,
                        reservoir[i].manageid,
                        reservoir[i].address
                    ]).draw();
                }
            }
            else {
                if (!isEmpty(wlevelWarnings)) {
                    idTableRsvTotal = wlevelWarnings.length;
                    for (var i = 0; i < wlevelWarnings.length; i++) {
                        var radio = '<input id="idTableRsv' + i + '" class="form-check-input" style="margin-left:0px;" type="radio">';
                        idTableReservoir.row.add([
                            radio,
                            // 0913
                            i + 1,
                            //wlevelWarnings[i].id + 1,
                            wlevelWarnings[i].name,
                            wlevelWarnings[i].manageid,
                            wlevelWarnings[i].address
                        ]).draw();
                    }
                }
            }
        }
        // 1
        else if (warningSelect == 1) {
            if (!openWarningFlag) {
                idTableRsvTotal = reservoir.length;
                // 모든 list
                for (var i = 0; i < reservoir.length; i++) {
                    var radio = '<input id="idTableRsv' + i + '" class="form-check-input" style="margin-left:0px;" type="radio">';
                    idTableReservoir.row.add([
                        radio,
                        // 0913
                        i + 1,
                        //reservoir[i].id + 1,
                        reservoir[i].name,
                        reservoir[i].manageid,
                        reservoir[i].address
                    ]).draw();
                }
            }
            else {
                if (!isEmpty(openWarnings)) {
                    idTableRsvTotal = openWarnings.length;
                    for (var i = 0; i < openWarnings.length; i++) {
                        var radio = '<input id="idTableRsv' + i + '" class="form-check-input" style="margin-left:0px;" type="radio">';
                        idTableReservoir.row.add([
                            radio,
                            // 0913
                            i + 1,
                            //openWarnings[i].id + 1,
                            openWarnings[i].name,
                            openWarnings[i].manageid,
                            openWarnings[i].address
                        ]).draw();
                    }
                }
            }
        }
        // 2
        else if (warningSelect == 2) {
            if (!batteryWarningFlag) {
                idTableRsvTotal = reservoir.length;
                // 모든 list
                for (var i = 0; i < reservoir.length; i++) {
                    var radio = '<input id="idTableRsv' + i + '" class="form-check-input" style="margin-left:0px;" type="radio">';
                    idTableReservoir.row.add([
                        radio,
                        // 0913
                        i + 1,
                        //reservoir[i].id + 1,
                        reservoir[i].name,
                        reservoir[i].manageid,
                        reservoir[i].address
                    ]).draw();
                }
            }
            else {
                if (!isEmpty(batteryWarnings)) {
                    idTableRsvTotal = batteryWarnings.length;
                    for (var i = 0; i < batteryWarnings.length; i++) {
                        var radio = '<input id="idTableRsv' + i + '" class="form-check-input" style="margin-left:0px;" type="radio">';
                        idTableReservoir.row.add([
                            radio,
                            // 0913
                            i + 1,
                            //batteryWarnings[i].id + 1,
                            batteryWarnings[i].name,
                            batteryWarnings[i].manageid,
                            batteryWarnings[i].address
                        ]).draw();
                    }
                }
            }
        }
        // 3
        else if (warningSelect == 3) {
            if (!actuatorWarningFlag) {
                idTableRsvTotal = reservoir.length;
                // 모든 list
                for (var i = 0; i < reservoir.length; i++) {
                    var radio = '<input id="idTableRsv' + i + '" class="form-check-input" style="margin-left:0px;" type="radio">';
                    idTableReservoir.row.add([
                        radio,
                        // 0913
                        i + 1,
                        //reservoir[i].id + 1,
                        reservoir[i].name,
                        reservoir[i].manageid,
                        reservoir[i].address
                    ]).draw();
                }
            }
            else {
                if (!isEmpty(actuatorWarnings)) {
                    idTableRsvTotal = actuatorWarnings.length;
                    for (var i = 0; i < actuatorWarnings.length; i++) {
                        var radio = '<input id="idTableRsv' + i + '" class="form-check-input" style="margin-left:0px;" type="radio">';
                        idTableReservoir.row.add([
                            radio,
                            // 0913
                            i + 1,
                            //actuatorWarnings[i].id + 1,
                            actuatorWarnings[i].name,
                            actuatorWarnings[i].manageid,
                            actuatorWarnings[i].address
                        ]).draw();
                    }
                }
            }
        }
    }


    setTimeout(() => {
        idTableReservoir.order([0, 'desc']).draw();
    }, 200);

    // 여러번 click되는 문제 수정
    $('#idTableReservoir').unbind('click');
    $('#idTableReservoir').on('click', 'td', function () {
        var tempRow = idTableReservoir.cell(this).index().row;

        // 1219
        for (var i = 0; i < idTableReservoir.rows().count(); i++) {
            if (i == tempRow) $("#idTableRsv" + i).prop("checked", true);
            else $("#idTableRsv" + i).prop("checked", false);
        }

        var index = findReservoirIndex(tempRow);

        // jjk5
        selectedReservoir = index;
        // 0913 : jjk001
        toastMessage("저수지 " + reservoir[index].name + "이(가)  선택되었습니다");


        // 2022-0124
        // 개별 저수지 정보를 가지고 다시 그림
        // 0626

        // 2023-0724
        oneItemRequested = true;
        var idString = "";
        idString += "(macid=";
        idString += "'" + reservoir[selectedReservoir].macid + "'";
        idString += ")";

        var message = { "sender": subTopic, "data": 150, "type": 2, "idString": idString, "date": "", "endDate": "" };
        clientPublish(pubTopic, "GET_SENSES=" + JSON.stringify(message) + ";");

        gSpecificDateMode = false;
        $('#idSenseType3').prop("checked", true);
        $('#idSenseType4').prop("checked", false);

        //drawReservoirDetail();
        //_drawChart();


    });

}


// jjk1
// Sense 대한 table을 추가
function addTableSense() {
    idSensTableDrawn = true;
    if (idTableSense) idTableSense.destroy();
    //if (!idTableSense) {
    idTableSense = $('#idTableSense').DataTable({
        "scrollX": true,     // test
        "scrollCollapse": true,
        "autoWidth": false,
        "paging": true,
        "ordering": true,
        "info": true,
        "filter": true,
        "lengthChange": true,
        "order": [[0, "asc"]],
        "stateSave": true,
        "pagingType": "full_numbers"
    });
    idTableSense.clear().draw();


    // 초기값
    $('#idSenseType1').prop("checked", true);
    //$('#idSenseType1').prop("checked", false);


    // radio 버튼에 대한 처리
    $('#idSenseType1').on('change', function (e) {
        if (this.checked) {
            $("#idSenseMember").multiselect('disable');
        }
        else {
            $("#idSenseMember").multiselect('enable');
            makeIdSenseMember();
        }
    });

    $('#idSenseType2').on('change', function (e) {
        if (this.checked) {
            $("#idSenseMember").multiselect('enable');
            makeIdSenseMember();
        }
        else {
            $("#idSenseMember").multiselect('disable');
        }
    });
    // 2023-0703 : 기존 거 
    /*
    $('#idSenseMember').on('change', function(e){
        specificMacidIndex = document.getElementById('idSenseMember').selectedIndex;
    }); 
    */
    // 2023-0703
    // 한번 실행

    makeIdSenseMember();

}

//sense2
function addTableSense2() {
    idSens2TableDrawn = true;
    if (idTableSense2) idTableSense2.destroy();
    //if (!idTableSense) {
    idTableSense2 = $('#idTableSense2').DataTable({
        "scrollX": true,     // test
        "scrollCollapse": true,
        "autoWidth": false,
        "paging": true,
        "ordering": true,
        "info": true,
        "filter": true,
        "lengthChange": true,
        "order": [[0, "asc"]],
        "stateSave": true,
        "pagingType": "full_numbers"
    });
    idTableSense2.clear().draw();


    // 초기값
    $('#idSense2Type1').prop("checked", true);
    //$('#idSenseType1').prop("checked", false);


    // radio 버튼에 대한 처리
    $('#idSense2Type1').on('change', function (e) {
        if (this.checked) {
            $("#idSense2Member").multiselect('disable');
        }
        else {
            $("#idSense2Member").multiselect('enable');
            makeIdSense2Member();
        }
    });

    $('#idSense2Type2').on('change', function (e) {
        if (this.checked) {
            $("#idSense2Member").multiselect('enable');
            makeIdSense2Member();
        }
        else {
            $("#idSense2Member").multiselect('disable');
        }
    });
    makeIdSense2Member();
}

// 2023-0703
// idSenseMember의 항목들을 구성
function makeIdSenseMember() {
    // idSenseMember
    var txt = "";
    if (reservoir.length > 0) {
        // 힝목 추가

        if (!senseMemberMultiAdded) {
            senseMemberMultiAdded = true;
            for (var i = 0; i < reservoir.length; i++) {
                var option = document.createElement("option");
                option.text = reservoir[i].manageid + " " + reservoir[i].name;
                option.value = i.toString();

                var select = document.getElementById("idSenseMember");
                select.appendChild(option);

                var option2 = document.createElement("option");
                option2.text = reservoir[i].manageid + " " + reservoir[i].name;
                option2.value = i.toString();

                var select2 = document.getElementById("idSenseMember2");
                select2.appendChild(option2);
            }
        }

        $('#idSenseMember').multiselect({
            includeSelectAllOption: true,
            enableFiltering: true,
            enableCaseInsensitiveFiltering: true,
            buttonWidth: '100%',
            filterPlaceholder: 'Search Here..',
            onDropdownShow: function (event) {
                $(this).closest('select').css('width', '300px')
            }
        });

        $('#idSenseMember2').multiselect({
            includeSelectAllOption: true,
            enableFiltering: true,
            enableCaseInsensitiveFiltering: true,
            buttonWidth: '100%',
            filterPlaceholder: 'Search Here..',
            onDropdownShow: function (event) {
                $(this).closest('select').css('width', '300px')
            }
        });

        // 반드시 있어야 함
        $('#idSenseMember').multiselect('refresh');

        $('#idSenseMember2').multiselect('refresh');

    }
}

//sense2
function makeIdSense2Member() {
    // idSenseMember
    var txt = "";
    if (reservoir.length > 0) {
        // 힝목 추가

        if (!sense2MemberMultiAdded) {
            sense2MemberMultiAdded = true;
            for (var i = 0; i < reservoir.length; i++) {
                var option = document.createElement("option");
                option.text = reservoir[i].manageid + " " + reservoir[i].name;
                option.value = i.toString();

                var select = document.getElementById("idSense2Member");
                select.appendChild(option);

                var option2 = document.createElement("option");
                option2.text = reservoir[i].manageid + " " + reservoir[i].name;
                option2.value = i.toString();

                var select2 = document.getElementById("idSense2Member2");
                select2.appendChild(option2);
            }
        }

        $('#idSense2Member').multiselect({
            includeSelectAllOption: true,
            enableFiltering: true,
            enableCaseInsensitiveFiltering: true,
            buttonWidth: '100%',
            filterPlaceholder: 'Search Here..',
            onDropdownShow: function (event) {
                $(this).closest('select').css('width', '300px')
            }
        });

        $('#idSense2Member2').multiselect({
            includeSelectAllOption: true,
            enableFiltering: true,
            enableCaseInsensitiveFiltering: true,
            buttonWidth: '100%',
            filterPlaceholder: 'Search Here..',
            onDropdownShow: function (event) {
                $(this).closest('select').css('width', '300px')
            }
        });

        // 반드시 있어야 함
        $('#idSense2Member').multiselect('refresh');

        $('#idSense2Member2').multiselect('refresh');

    }
}

// get specific sense data
function specificSenseUpdate() {
    console.log("specificSenseUpdate");
    // check
    var check = $('#idSenseType1').is(":checked");
    // 전체 데이터를 가져오기
    if (check) {
        askSenseValues();
    }
    // 특정 데이터 가져오기
    else {
        /*
        if (specificMacidIndex>=0) {
            // 0626
            var idString = "";
            idString += "(macid=";
            idString += "'" + reservoir[specificMacidIndex].macid + "'";
            idString += ")";
            
            // 2023-0523 : 종료일 추가
            var message = {"sender": subTopic, "data": 1500, "type": 2, "idString": idString, "date":"", "endDate":""};
            clientPublish(pubTopic,"GET_SENSES=" +  JSON.stringify(message) + ";");

            // 메세지 추가
            toastMessage("신규 데이터가 업데이트 될때까지 기다려주세요!");
        }
        */
        // 2003-0703 : multi select 된 정보를 가지고 온다
        var selected = [];
        var num = 150;
        for (var option of document.getElementById('idSenseMember').options) {
            if (option.selected) {
                selected.push(option.value);
            }
        }
        if (selected.length > 0) {
            var idString = "(";
            for (var i = 0; i < selected.length; i++) {
                idString += "macid='" + reservoir[selected[i]].macid + "'";
                if (i != (selected.length - 1)) idString += " OR ";
            }
            idString += ")";

            if (selected.length > 15) num = 1500;
            else num = 150 * selected.length;

            var message = { "sender": subTopic, "data": 150, "type": 2, "idString": idString, "date": "", "endDate": "" };
            // 2023-0703
            //console.log("GET_SENSES ==>" + JSON.stringify(message));
            clientPublish(pubTopic, "GET_SENSES=" + JSON.stringify(message) + ";");

            // 메세지 추가
            toastMessage("신규 데이터가 업데이트 될때까지 기다려주세요!");
        }
    }
}


// 2023-0523
function downloadSenseUpdate() {
    var type = validationCheck;     // 1,2,3
    var idString = "";

    // 시작일 확인
    var startDate = null;
    var endDate = null;
    startDate = document.getElementById('idSenseDateStart').value;
    endDate = document.getElementById('idSenseDateEnd').value;

    if ((startDate == null) || (startDate == undefined) || (startDate == "")) {
        // 메세지 추가
        toastMessage("시작일을 선택하세요!");
        return;
    }
    if ((endDate == null) || (endDate == undefined) || (endDate == "")) {
        // 메세지 추가
        toastMessage("종료일을 선택하세요!");
        return;
    }

    // endDate가 startDate보다 작으면
    const date1 = new Date(startDate);
    const date2 = new Date(endDate);
    if (endDate < startDate) {
        // 메세지 추가
        toastMessage("종료일이 시작일보다 빠릅니다. 다시 입력해 주세요!");
        return;
    }

    {
        {
            // 2023-0703
            // 2003-0703 : multi select 된 정보를 가지고 온다
            var selected = [];
            for (var option of document.getElementById('idSenseMember2').options) {
                if (option.selected) {
                    selected.push(option.value);
                }
            }
            if (selected.length > 0) {
                selDownloadList = selected;
                toastMessage("다운로드가 완료되기까지 기다려주세요!");

                var idString = "(";
                for (var i = 0; i < selected.length; i++) {
                    idString += "macid='" + reservoir[selected[i]].macid + "'";
                    if (i != (selected.length - 1)) idString += " OR ";
                }
                idString += ")";

                var currentDate = new Date(startDate);
                var endDate1 = new Date(endDate);
                idString += " AND (";
                var firstIteration = true;

                while (currentDate <= endDate1) {
                    //var startTime = moment.tz(currentDate, 'Asia/Seoul').set({ hour: 7, minute: 30, second: 0 }); // 07:30:00
                    //var endTime = moment.tz(currentDate, 'Asia/Seoul').set({ hour: 8, minute: 31, second: 0 }); // 08:31:00
                    var startTime = new Date(currentDate);
                    startTime.setHours(16, 30, 0); // 07:30:00
                    var endTime = new Date(currentDate);
                    endTime.setHours(17, 30, 0); // 07:30:00

                    startTime = startTime.toISOString().replace(/T/, ' ').replace(/\..+/, '');
                    endTime = endTime.toISOString().replace(/T/, ' ').replace(/\..+/, '');

                    if (firstIteration) {
                        idString += "(sensetime BETWEEN '" + startTime + "' AND '" + endTime + "')";
                        firstIteration = false;
                    } else {
                        idString += " OR (sensetime BETWEEN '" + startTime + "' AND '" + endTime + "')";
                    }

                    currentDate.setDate(currentDate.getDate() + 1); // 다음 날짜로 이동
                }
                idString += ") ";

                // 2023-0523 : 종료일 추가
                // type을 강제로 2로 고정
                // 가져오는 데이터는 10,000개까지, 표시하는 것은 1500개가 최고
                // 특정 데이터 검색시에만 종료일 추가
                // 날짜를 프로그램에서 뒤집어서 줌
                var message = { "sender": subTopic, "data": 36000, "type": 2, "idString": idString, "date": endDate, "endDate": startDate };
                clientPublish(pubTopic, "GET_DOWNLOAD=" + JSON.stringify(message) + ";");
                excelDownload = true;
                excel_name = startDate + "_" + endDate + ".xls";
            }
            else {
                toastMessage("전체 데이터를 선택하거나 \r\n개별데이터 중에 하나 이상을 선택하세요!!");
            }
        }
    }
}


// 2023-0523
function doExcelDownload() {
    let excelTable = "";

    // reset flag
    excelDownload = false;

    var tsenses = JSON.parse(rxdtMqttString);

    // 선택된 reservoir에 대해
    for (var i = 0; i < selDownloadList.length; i++) {
        var selected = selDownloadList[i];
        var macid = reservoir[selected].macid;
        var sensetime = "";
        var eqList = new Array();

        // 현재 저수지에 해당하는 항목만 구함
        for (var j = 0; j < tsenses.length; j++) {
            // macid가 같고
            if (macid == tsenses[j].macid) {
                // 날짜가 new이면 추가
                if (sensetime != tsenses[j].sensetime) {
                    eqList.push({
                        index: j
                    });
                    sensetime = tsenses[j].sensetime;
                }
            }
        }

        // 현재 저수지의 항목에 대해서만 출력

        var manageid;
        var name;
        var inx;
        var watersense;
        var waterlevel;
        var height;
        var effHeight;
        var percent;
        var quantity;
        var list = new Array();

        //excelTable += "<p>" + reservoir[selected].name + "</p>"

        excelTable += "<table border='1'>";
        excelTable += reservoir[selected].name;
        excelTable += "		<thead>";
        excelTable += "			<tr>";
        excelTable += "				<td>번호</td>";
        excelTable += "				<td>날짜</td>";
        excelTable += "				<td>관리번호</td>";
        excelTable += "				<td>지점이름</td>";
        excelTable += "				<td>센서값</td>";
        excelTable += "				<td>수위</td>";
        excelTable += "				<td>현재수량</td>";
        excelTable += "				<td>저수율</td>";
        excelTable += "				<td>제방높이</td>";
        excelTable += "			</tr>";
        excelTable += "		</thead>";
        excelTable += "		<tbody>";

        if (eqList.length > 0) {
            for (var k = 0; k < eqList.length; k++) {
                var ii = eqList[k].index;
                manageid = findManageidFromReservoir(tsenses[ii].macid);
                name = findNameFromReservoir(tsenses[ii].macid);
                inx = findIndexFromReservoir(tsenses[ii].macid);
                // selected = inx임

                // 수위를 계산
                if ((manageid != "") && (name != "") && (selected >= 0)) {
                    if (tsenses[ii].watersense > (1.2 * reservoir[selected].prange)) tsenses[ii].watersense = 0;

                    watersense = tsenses[ii].watersense + reservoir[selected].senseadd;
                    // 사수위를 더해서 수위를 표시
                    waterlevel = ((tsenses[ii].watersense + reservoir[selected].senseadd) * 9.80665 + reservoir[selected].leveladd + reservoir[selected].levelmin).toFixed(2);
                    if (waterlevel > reservoir[selected].levelover) waterlevel = reservoir[selected].levelover;
                    waterlevel = parseFloat(waterlevel).toFixed(2);
                    tsenses[ii].waterlevel = waterlevel;
                    watersense = watersense.toFixed(2);
                    tsenses[ii].waterlevel = waterlevel;

                    // 현저수량,저수율,제방높이
                    if (reservoir[selected].height > 0) {
                        // 20m 이상인 경우
                        if (reservoir[selected].height > 20.0) {
                            effHeight = 0.935 * reservoir[selected].height - 6.457;
                        }
                        // 20m 보다 작거나 같은 경우
                        else {
                            effHeight = 0.625 * reservoir[selected].height;
                        }
                    }
                    // height 정보가 아예 없는 경우, dB에서 null인 경우 0으로 초기화
                    else {
                        // 데이터가 없는 경우는 만수위
                        effHeight = (reservoir[selected].levelfull - reservoir[selected].levelmin);
                    }

                    // 저수율 = 측정수심 / 유효수심 * 100
                    // 수위가 존재하는 경우, 저수율과 저수량을 구할수 있다
                    // 수위가 존재하지 않으면 N/A로 표시
                    if (waterlevel >= 0) {
                        percent = 100.0 * (waterlevel - reservoir[selected].levelmin) / effHeight;
                        if (percent > 100.0) percent = 100.0;
                        percent = parseFloat(percent).toFixed(1);
                        percent_bkup = percent;

                        // 데이터가 존재하는 경우
                        if (reservoir[selected].effquan > 0) {
                            quantity = percent * reservoir[selected].effquan;
                            quantity = parseFloat(quantity).toFixed(1);
                        }
                        else {
                            quantity = 0.0;
                        }
                    }
                    else {
                        percent = 0.0;
                        quantity = 0.0;
                    }
                }
                else {
                    // 고정값
                    watersense = 0.0;
                    waterlevel = reservoir[selected].levelmin;
                    percent = 0.0;
                    quantity = 0.0;
                }

                list.push({
                    no: (k + 1),
                    month: tsenses[ii].sensetime.substring(0, 7),
                    sensetime: tsenses[ii].sensetime,
                    manageid: manageid,
                    name: name,
                    watersense: watersense,
                    waterlevel: waterlevel,
                    quantity: quantity,
                    percent: percent,
                    height: reservoir[selected].height
                });


                excelTable += "<tr>";
                excelTable += "		<td>" + list[k].no + "</td>";
                excelTable += "		<td>" + list[k].sensetime + "</td>";
                excelTable += "		<td>" + list[k].manageid + "</td>";
                excelTable += "		<td>" + list[k].name + "</td>";
                excelTable += "		<td>" + list[k].watersense + "</td>";
                excelTable += "		<td>" + list[k].waterlevel + "</td>";
                excelTable += "		<td>" + list[k].quantity + "</td>";
                excelTable += "		<td>" + list[k].percent + "</td>";
                excelTable += "		<td>" + list[k].height + "</td>";
                excelTable += "</tr>";
            }  // for    

            // 월별 평균값 표시
            var mlist = {};

            for (var m = 0; m < list.length; m++) {
                var month = list[m].month;

                if (mlist[month]) {
                    // list[m].watersensesms string이므로, mlist[month].watersense는 숫자여야 함
                    // 이미 해당 날짜에 대한 합계와 개수가 계산된 경우
                    mlist[month].watersense += parseFloat(list[m].watersense);
                    mlist[month].waterlevel += parseFloat(list[m].waterlevel);
                    mlist[month].quantity += parseFloat(list[m].quantity);
                    mlist[month].percent += parseFloat(list[m].percent);
                    mlist[month].count++;
                } else {
                    // 해당 날짜에 대한 합계와 개수를 초기화
                    mlist[month] = {
                        count: 1,
                        month: list[m].month,
                        manageid: list[m].manageid,
                        name: list[m].name,
                        watersense: parseFloat(list[m].watersense),
                        waterlevel: parseFloat(list[m].waterlevel),
                        quantity: parseFloat(list[m].quantity),
                        percent: parseFloat(list[m].percent),
                        height: list[m].height
                    };
                }
            }

            // 생성된 월 데이터의 평균을 구함
            for (var month in mlist) {
                var count = mlist[month].count;
                mlist[month].watersense = (mlist[month].watersense / count).toFixed(2);;
                mlist[month].waterlevel = (mlist[month].waterlevel / count).toFixed(2);;
                mlist[month].quantity = (mlist[month].quantity / count).toFixed(1);;
                mlist[month].percent = (mlist[month].percent / count).toFixed(1);;

                excelTable += "<tr>";
                excelTable += "		<td>평균</td>";
                excelTable += "		<td>" + mlist[month].month + "</td>";
                excelTable += "		<td>" + mlist[month].manageid + "</td>";
                excelTable += "		<td>" + mlist[month].name + "</td>";
                excelTable += "		<td>" + mlist[month].watersense + "</td>";
                excelTable += "		<td>" + mlist[month].waterlevel + "</td>";
                excelTable += "		<td>" + mlist[month].quantity + "</td>";
                excelTable += "		<td>" + mlist[month].percent + "</td>";
                excelTable += "		<td>" + mlist[month].height + "</td>";
                excelTable += "</tr>";
            }

        }  // if

        excelTable += "		</tbody>";
        excelTable += "	</table>";
        excelTable += "<br>";

    }

    let filename = excel_name;
    console.log(filename);
    //console.log(excelTable); 
    excelDown(filename, "sheet1", excelTable);
}

function excelDown(fileName, sheetName, sheetHtml) {

    let html = "";

    html += "<html xmlns:x='urn:schemas-microsoft-com:office:excel' >";
    html += "   <haed>";
    html += "       <meta http-equiv='content-type' content='application/vnd.ms-excel; charset=UTF-8'>";
    html += "       <xml>";
    html += "           <x:ExcelWorkbook>";
    html += "               <x:ExcelWorksheets>";
    html += "                   <x:ExcelWorksheets>";
    html += "                       <x:Name>" + sheetName + "</x:Name>";
    html += "                       <x:WorksheetOptions><x:Panes></x:Panes></x:WorksheetOptions>";
    html += "                   </x:ExcelWorksheets>";
    html += "               </x:ExcelWorksheets>";
    html += "           </x:ExcelWorkbook>";
    html += "       </xml>";
    html += "   </haed>";

    html += "   <body>";
    html += sheetHtml;
    html += "   </body>";
    html += "</html>";

    let data_type = "data:application/vnd.ms-excel";
    let ua = window.navigator.userAgent;
    let blob = new Blob([html], { type: "application/csv; charset=utf-8" });

    let anchor = window.document.createElement('a');

    anchor.href = window.URL.createObjectURL(blob);
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();

    //다운로드 후 제거
    document.body.removeChild(anchor);
}

/*
function doExcelDownload()
{

    // reset flag
    excelDownload = false;

    // sense에 새로 수신한 데이터가 있음
    var createXLSLFormatObj = [];

    // 번호,시간,관리번호,수위,현저수량,저수율,제방높이,센서값
    var xlsHeader = ["번호","시간","관리번호","지점이름","센서값","수위","현저수량","저수율","제방높이"];

    var xlsRows = new Array();
    
    var manageid;
    var name;
    var inx;
    var watersense;
    var waterlevel;
    var height;
    var effHeight;
    var percent;
    var quantity;

    for (var i=0;i<senses.length;i++)
    {
        manageid = findManageidFromReservoir(senses[i].macid);
        name = findNameFromReservoir(senses[i].macid);
        inx = findIndexFromReservoir(senses[i].macid);

        // 수위를 계산
        if ((manageid!="")&&(name!="")&&(inx>=0)) {
            if (senses[i].watersense>(1.2*reservoir[inx].prange)) senses[i].watersense = 0;

            watersense = senses[i].watersense + reservoir[inx].senseadd;
            // 사수위를 더해서 수위를 표시
            waterlevel = ((senses[i].watersense + reservoir[inx].senseadd)*9.80665 + reservoir[inx].leveladd + reservoir[inx].levelmin).toFixed(2);
            if (waterlevel>reservoir[inx].levelover) waterlevel = reservoir[inx].levelover;
            waterlevel = parseFloat(waterlevel).toFixed(2);
            senses[i].waterlevel = waterlevel;
            watersense = watersense.toFixed(2);
            senses[i].waterlevel = waterlevel;

            // 현저수량,저수율,제방높이
            if (reservoir[inx].height>0)
            {
                // 20m 이상인 경우
                if (reservoir[inx].height>20.0)
                {
                    effHeight = 0.935*reservoir[inx].height - 6.457;
                }
                // 20m 보다 작거나 같은 경우
                else 
                {
                    effHeight = 0.625*reservoir[inx].height;
                }
            }
            // height 정보가 아예 없는 경우, dB에서 null인 경우 0으로 초기화
            else
            {
                // 데이터가 없는 경우는 만수위
                effHeight = (reservoir[inx].levelfull - reservoir[inx].levelmin);
            }

            // 저수율 = 측정수심 / 유효수심 * 100
            // 수위가 존재하는 경우, 저수율과 저수량을 구할수 있다
            // 수위가 존재하지 않으면 N/A로 표시
            if (waterlevel>=0) 
            {
                percent = 100.0*(waterlevel-reservoir[inx].levelmin)/effHeight;
                if (percent>100.0) percent = 100.0;
                percent = parseFloat(percent).toFixed(1);

                // 데이터가 존재하는 경우
                if (reservoir[selectedReservoir].effquan>0)
                {
                    quantity = percent*reservoir[inx].effquan;
                    quantity = parseFloat(quantity).toFixed(1);
                }
            }
            else 
            {
                percent = 0.0;
                quantity = 0.0;
            }
        }
        else 
        {
            // 고정값
            watersense = 0.0;
            waterlevel =  reservoir[inx].levelmin;
            percent = 0.0;
            quantity = 0.0;
        }

        xlsRows.push({
            no:(i+1),
            sensetime:senses[i].sensetime,
            manageid:manageid,
            name:name,
            watersense:watersense,
            waterlevel:waterlevel,
            quantity:quantity,
            percent:percent,
            height:reservoir[inx].height
        });  
    }

    createXLSLFormatObj.push(xlsHeader);
    $.each(xlsRows, function(index, value) {
        var innerRowData = [];
        $("tbody").append('<tr>' +  '<td>' + value.no + '</td>' +
                                    '<td>' + value.sensetime + '</td>' +
                                    '<td>' + value.manageid + '</td>' +
                                    '<td>' + value.name + '</td>' +
                                    '<td>' + value.watersense + '</td>' +
                                    '<td>' + value.waterlevel + '</td>' +
                                    '<td>' + value.quantity + '</td>' +
                                    '<td>' + value.percent + '</td>' +
                                    '<td>' + value.height + '</td></tr>');
        $.each(value, function(ind, val) {
            innerRowData.push(val);
        });
        createXLSLFormatObj.push(innerRowData);
    });


    var filename = "data.xlsx";

    var ws_name = "data";

    if (typeof console !== 'undefined') console.log(new Date());
    var wb = XLSX.utils.book_new(),
    ws = XLSX.utils.aoa_to_sheet(createXLSLFormatObj);

    XLSX.utils.book_append_sheet(wb, ws, ws_name);

    if (typeof console !== 'undefined') console.log(new Date());
    XLSX.writeFile(wb, filename);
    if (typeof console !== 'undefined') console.log(new Date());

}
*/


// Sense 대한 table을 추가
// {"id":2,"macid":"8CAAB5CAE2B0","sensetime":"0000-00-00 00:00:00","waterlevel":0,"watersense":12.9,"temperature":33.1,"voltage":11.6,"comtime":0,"act1open":30,"act1open_current":20}
function updateTableSense() {
    //if (!idSensTableDrawn) addTableSense();
    // sense table이 생성된 경우에만 업데이트 함
    if (idSensTableDrawn) {
        idTableSense.clear().draw();

        var start = idTableSense.rows().count();
        var end = senses.length;

        // 2023-0523
        // 보여주는 크기를 600으로 제한
        if (end > 600) {
            // 마지막 1500개를 보여줌
            start = end - 600;
        }

        // id,macid,sensetime,waterlevel,watersense,temperature,voltage,comtime,act1open,act1open_current
        // add data...
        var manageid;
        var name;
        var inx;
        var effHeight;
        var percent;
        var quantity;

        if (end > start) {
            for (var i = start; i < end; i++) {
                //console.log("센서값 추가");
                // 번호, 센싱시간, 관리번호, 지점이름, sense값, 센싱 수위, 온도, 전압, act1open, open시간, 통신데이터양
                manageid = findManageidFromReservoir(senses[i].macid);
                name = findNameFromReservoir(senses[i].macid);
                inx = findIndexFromReservoir(senses[i].macid);

                // 0621
                // 실제 저수지 정보가 현재에도 존재하는 경우에만 표시
                if ((manageid != "") && (name != "") && (inx >= 0)) {
                    // 2kg이 20m가 되도록 환산 (kg단위로 올라옴)
                    // sense값이 1.2배 over되면 센서값이 잘못 된 것이므로 0로 초기화
                    // 2023-0808 : 임시로 제거
                    //if (senses[i].watersense>(1.2*reservoir[inx].prange)) senses[i].watersense = 0;

                    var watersense = senses[i].watersense + reservoir[inx].senseadd;
                    // 사수위를 더해서 수위를 표시
                    var waterlevel = ((senses[i].watersense + reservoir[inx].senseadd) * 9.80665 + reservoir[inx].leveladd + reservoir[inx].levelmin).toFixed(2);
                    if (waterlevel > reservoir[inx].levelover) waterlevel = reservoir[inx].levelover;
                    waterlevel = parseFloat(waterlevel).toFixed(2);
                    senses[i].waterlevel = waterlevel;

                    // 1222-1
                    // watersense 자리수 교정
                    watersense = watersense.toFixed(2);
                    //waterlevel = parseFloat(waterlevel).toFixed(2);
                    senses[i].waterlevel = waterlevel;

                    // 2023-0724
                    // 현저수량,저수율,제방높이
                    if (reservoir[inx].height > 0) {
                        // 20m 이상인 경우
                        if (reservoir[inx].height > 20.0) {
                            effHeight = 0.935 * reservoir[inx].height - 6.457;
                        }
                        // 20m 보다 작거나 같은 경우
                        else {
                            effHeight = 0.625 * reservoir[inx].height;
                        }
                    }
                    // height 정보가 아예 없는 경우, dB에서 null인 경우 0으로 초기화
                    else {
                        // 데이터가 없는 경우는 만수위
                        effHeight = (reservoir[inx].levelfull - reservoir[inx].levelmin);
                    }

                    // 저수율 = 측정수심 / 유효수심 * 100
                    // 수위가 존재하는 경우, 저수율과 저수량을 구할수 있다
                    // 수위가 존재하지 않으면 N/A로 표시
                    if (waterlevel >= 0) {
                        percent = 100.0 * (waterlevel - reservoir[inx].levelmin) / effHeight;
                        if (percent > 100.0) percent = 100.0;
                        percent = parseFloat(percent).toFixed(1);
                        percent_bkup = percent;

                        // 데이터가 존재하는 경우
                        if (reservoir[inx].effquan > 0) {
                            quantity = percent * reservoir[inx].effquan;
                            quantity = parseFloat(quantity).toFixed(1);
                        }
                        else {
                            quantity = 0.0;
                        }
                    }
                    else {
                        percent = 0.0;
                        quantity = 0.0;
                    }


                    var voltage = senses[i].voltage;
                    voltage = voltage.toFixed(1);
                    var temperature = senses[i].temperature;
                    temperature = temperature.toFixed(1);

                    // 2023-0724
                    idTableSense.row.add([
                        //sensedt.id[i] + 1,// 2023-0523
                        i + 1 - start,                // 0625 : index 1부터 시작
                        senses[i].sensetime,
                        manageid,
                        name,
                        watersense,
                        waterlevel,
                        quantity,
                        percent,
                        reservoir[inx].height,
                        temperature,
                        voltage,
                        senses[i].act1open,
                        senses[i].act1open_current,
                        senses[i].comtime
                    ]).draw();
                }
            }
        }

        setTimeout(() => {
            idTableSense.order([0, 'desc']).draw();
        }, 300);

    }

    // 경보 확인
    checkWarnings();

    levelWarningFlag = false;
    openWarningFlag = false;
    batteryWarningFlag = false;
    actuatorWarningFlag = false;

    // 경보에 따른 marker 업데이트, 미경보까지 모두 표시
    updateMarker(warningSelect, false);
}

//sense2
function updateTableSense2() {
    //if (!idSensTableDrawn) addTableSense();
    // sense table이 생성된 경우에만 업데이트 함
    if (idSens2TableDrawn) {
        idTableSense2.clear().draw();

        var start = idTableSense2.rows().count();
        var end = senses2.length;

        // 보여주는 크기를 600으로 제한
        if (end > 600) {
            // recent 600 datas in table
            start = end - 600;
        }

        if (end > start) {
            for (var i = start; i < end; i++) {
                idTableSense2.row.add([
                    //sensedt.id[i] + 1,// 2023-0523
                    i + 1 - start,                // 0625 : index 1부터 시작
                    senses2[i].id,
                    senses2[i].R_manageid,
                    senses2[i].R_sensetime,
                    senses2[i].levelStr300,
                    senses2[i].airHeightStr300,
                    senses2[i].temperature,
                    senses2[i].voltage,
                    senses2[i].velocityStr600,
                    senses2[i].levelStr600,
                    senses2[i].instaneousFlowStr600,
                    senses2[i].cumulativeFlowStr600,
                    senses2[i].fault
                ]).draw();
            }
        }
        setTimeout(() => {
            idTableSense2.order([0, 'desc']).draw();
        }, 300);

    }
    updateMarker(warningSelect, false);
}

// Sense 대한 수위 정보만 업데이트
function updateSenseInfo() {

    // id,macid,sensetime,waterlevel,watersense,temperature,voltage,comtime,act1open,act1open_current
    // add data...
    var manageid;
    var name;
    var inx;
    var effHeight;
    var percent;
    var quantity;

    // 최근 150개만 조사
    var start = senses.length - 150;
    if (start < 0) start = 0;
    var end = senses.length;

    for (var i = start; i < end; i++) {
        //console.log("센서값 추가");
        // 번호, 센싱시간, 관리번호, 지점이름, sense값, 센싱 수위, 온도, 전압, act1open, open시간, 통신데이터양
        manageid = findManageidFromReservoir(senses[i].macid);
        name = findNameFromReservoir(senses[i].macid);
        inx = findIndexFromReservoir(senses[i].macid);

        // 0621
        // 실제 저수지 정보가 현재에도 존재하는 경우에만 표시
        if ((manageid != "") && (name != "") && (inx >= 0)) {
            // 2kg이 20m가 되도록 환산 (kg단위로 올라옴)
            // sense값이 1.2배 over되면 센서값이 잘못 된 것이므로 0로 초기화
            // 2023-0808 : 임시로 제거
            //if (senses[i].watersense>(1.2*reservoir[inx].prange)) senses[i].watersense = 0;

            var watersense = senses[i].watersense + reservoir[inx].senseadd;
            // 사수위를 더해서 수위를 표시
            var waterlevel = ((senses[i].watersense + reservoir[inx].senseadd) * 9.80665 + reservoir[inx].leveladd + reservoir[inx].levelmin).toFixed(2);
            if (waterlevel > reservoir[inx].levelover) waterlevel = reservoir[inx].levelover;
            waterlevel = parseFloat(waterlevel).toFixed(2);
            senses[i].waterlevel = waterlevel;

            // 1222-1
            // watersense 자리수 교정
            watersense = watersense.toFixed(2);
            //waterlevel = parseFloat(waterlevel).toFixed(2);
            senses[i].waterlevel = waterlevel;
        }
    }

    // 경보 확인
    checkWarnings();

    levelWarningFlag = false;
    openWarningFlag = false;
    batteryWarningFlag = false;
    actuatorWarningFlag = false;

    // 경보에 따른 marker 업데이트, 미경보까지 모두 표시
    updateMarker(warningSelect, false);
}


// jjk005
// sense 값을 요청함
function askSenseValues() {
    // 0626
    var type = validationCheck;     // 1,2,3
    var idString = "";
    if ((type == 1) || (type == 2) || (type == 3)) {
        //if ((type==1)||(type==2)) {
        idString += "(macid=";
        for (var i = 0; i < reservoir.length; i++) {
            idString += "'" + reservoir[i].macid + "'";
            if (i != (reservoir.length - 1)) idString += " OR ";
        }
        idString += ")";
    }

    if (type > 0) {
        //console.log("--------------------------------");
        //console.log("GET_SENSES")
        //console.log("--------------------------------");

        // 1221-1
        var message = { "sender": subTopic, "data": 150, "type": type, "idString": idString, "date": "", "endDate": "" };
        // 2023-0703
        //console.log("GET_SENSES ==>" + JSON.stringify(message));
        clientPublish(pubTopic, "GET_SENSES=" + JSON.stringify(message) + ";");
    }
}

//sense2
function askSense2Values() {
    // 0626
    var type = validationCheck;     // 1,2,3
    var idString = "";
    if ((type == 1) || (type == 2) || (type == 3)) {
        //if ((type==1)||(type==2)) {
        idString += "(macid=";
        for (var i = 0; i < reservoir.length; i++) {
            idString += "'" + reservoir[i].macid + "'";
            if (i != (reservoir.length - 1)) idString += " OR ";
        }
        idString += ")";
    }

    if (type > 0) {
        //console.log("--------------------------------");
        //console.log("GET_SENSES")
        //console.log("--------------------------------");

        // 1221-1
        var message = { "sender": subTopic, "data": 150, "type": type, "idString": idString, "date": "", "endDate": "" };
        // 2023-0703
        //console.log("GET_SENSES ==>" + JSON.stringify(message));
        clientPublish(pubTopic, "GET_SENSES2=" + JSON.stringify(message) + ";");
    }
}

// Reservoir를 다시 요청함
function askReservoirValues() {
    // 1219
    var now = new Date();
    //console.log("------------------------------------------------------------------------");
    //console.log(now + " : askReservoirValues");
    //console.log("------------------------------------------------------------------------");

    // reservoir 값을 모두 가져옴
    var loginfo = {
        "username": username, "passwd": passwd,
        "sender": subTopic
    };
    clientPublish(pubTopic, "GET_RESERVOIR=" + JSON.stringify(loginfo) + ";");
}

function mapTableToggle() {
    if (mapOrTable == 0) {
        mapOrTable = 1;
    }
    else {
        mapOrTable = 0;
    }
    // map
    if (mapOrTable == 0) {
        document.getElementById('idTable').style.display = 'none';
        document.getElementById('idMap').style.display = 'block';
        document.getElementById('mapTableToggle').innerHTML = '<i class="fas fa-water mr-1"></i>저수지 선택 (지도)<i class="fas fa-exchange-alt" style="float:right;"></i>';
    }
    // table
    else {
        document.getElementById('idMap').style.display = 'none';
        document.getElementById('idTable').style.display = 'block';
        document.getElementById('mapTableToggle').innerHTML = '<i class="fas fa-list mr-1"></i>저수지 선택 (목록)<i class="fas fa-exchange-alt" style="float:right;"></i>';
        addTableReservoir();
    }
}

function mapTableRedraw() {
    // map
    if (mapOrTable == 0) {
        document.getElementById('idTable').style.display = 'none';
        document.getElementById('idMap').style.display = 'block';
        document.getElementById('mapTableToggle').innerHTML = '<i class="fas fa-water mr-1"></i>저수지 선택 (지도)<i class="fas fa-exchange-alt" style="float:right;"></i>';
    }
    // table
    else {
        document.getElementById('idMap').style.display = 'none';
        document.getElementById('idTable').style.display = 'block';
        document.getElementById('mapTableToggle').innerHTML = '<i class="fas fa-list mr-1"></i>저수지 선택 (목록)<i class="fas fa-exchange-alt" style="float:right;"></i>';
        addTableReservoir();
    }
}

function detailChartToggle() {
    if (detailOrChart == 0) {
        detailOrChart = 1;
    }
    else {
        detailOrChart = 0;
    }
    // detail
    if (detailOrChart == 0) {
        document.getElementById('idChart').style.display = 'none';
        document.getElementById('idDetail').style.display = 'block';
        document.getElementById('detailChartToggle').innerHTML = '<i class="fas fa-info-circle mr-1"></i>저수지 상세정보<i class="fas fa-exchange-alt" style="float:right;"></i>';
    }
    // chart
    else {
        document.getElementById('idDetail').style.display = 'none';
        document.getElementById('idChart').style.display = 'block';
        document.getElementById('detailChartToggle').innerHTML = '<i class="fas fa-chart-area mr-1"></i>저수지 그래프<i class="fas fa-exchange-alt" style="float:right;"></i>';
        _drawChart();
    }
}

function drawReservoirDetail() {
    // reservoir가 존재시
    if (!isEmpty(reservoir)) {
        reservoirDetailDrawn = true;

        // 009
        var inx = findIndexFromSenses(reservoir[selectedReservoir].macid);
        var waterlevel, watersense, voltage, temperature, comtime;

        if (inx >= 0) {
            waterlevel = senses[inx].waterlevel;

            // waterlevel 이상보정
            // 1221-1
            if (waterlevel == 0) {
                var level = ((senses[inx].watersense + reservoir[selectedReservoir].senseadd) * 9.80665 + reservoir[selectedReservoir].leveladd + reservoir[selectedReservoir].levelmin).toFixed(2);
                if (level > reservoir[selectedReservoir].levelover) level = reservoir[selectedReservoir].levelover;
                var temp1 = parseFloat(level).toFixed(2);
                senses[inx].waterlevel = temp1;
                waterlevel = temp1;
                //console.log("pos1 :" + level);
                //console.log("pos1 :" + sNow() + " ==>" + waterlevel);
            }

            watersense = senses[inx].watersense;
            voltage = senses[inx].voltage;
            temperature = senses[inx].temperature.toFixed(1);
            comtime = senses[inx].comtime;
            /*
             senses[i].temperature,
                senses[i].voltage,
                senses[i].act1open,
                senses[i].act1open_current,
                senses[i].comtime 
            */
        }
        else {
            waterlevel = -1;
            watersense = -1;
            voltage = -1;
            temperature = -1;
            comtime = -1;
        }

        document.getElementById('reservoirDetailTable').innerHTML = '<tr>'
            + '<th scope="row">지점이름</th>'
            + '<td style="font-weight:bold;font-size:1.5rem;">' + reservoir[selectedReservoir].name + '</td>'
            + '</tr>'
            + '<tr>'
            + '<th scope="row">관리번호</th>'
            + '<td>' + reservoir[selectedReservoir].manageid + '</td>'
            + '</tr>'
            + '<tr>'
            + '<th scope="row">홍수/만수/사수위</th>'
            + '<td>' + reservoir[selectedReservoir].levelover
            + '/' + reservoir[selectedReservoir].levelfull
            + '/' + reservoir[selectedReservoir].levelmin + 'm</td>'
            + '</tr>'
            + '<tr>'
            + '<th scope="row">소재지</th>'
            + '<td>' + reservoir[selectedReservoir].address + '</td>'
            + '</tr>'
            + '<tr>'
            + '<th scope="row">관할지사</th>'
            + '<td>' + reservoir[selectedReservoir].incharge + '</td>'
            + '</tr>'
            + '<tr>'
            + '<th scope="row">통신상태</th>'
            + '<td id="idCommStatus"></td>'
            + '</tr>'
            + '<tr>'
            + '<th scope="row">모니터링 주기</th>'
            + '<td>'
            + '<div style="width:100%;">'
            + '<input id="idMonitoringslider" type="range" min="0" max="11" value="0" class="slider" style="width:80%;float:left;">'
            + '<p id="idMonitoringtext" style="margin-left:85%;"></p>'
            + '</div>'
            + '</td>'
            + '</tr>'
            + '<tr>'
            + '<th scope="row">계측 수위 (EL.m)</th>'
            + '<td id="idLevel"></td>'
            + '</tr>'
            + '<tr>'
            + '<th scope="row">계측값(Kgf/㎠)</th>'
            + '<td id="idMeasure"></td>'
            + '</tr>'
            + '<tr>'
            + '<th scope="row">저수율</th>'
            + '<td id="idPercent"></td>'
            + '</tr>'
            + '<tr>'
            + '<th scope="row">저수량(㎥)</th>'
            + '<td id="idQuantity"></td>'
            + '</tr>'
            + '<tr>'
            + '<th scope="row">온도</th>'
            + '<td id="idTemp"></td>'
            + '</tr>'
            + '<tr>'
            + '<th scope="row">시스템 전압</th>'
            + '<td id="idVoltage"></td>'
            + '</tr>'
            + '<tr>'
            + '<th scope="row">사용데이타</th>'
            + '<td id="idComm"></td>'
            + '</tr>'
            + '<tr>'
            + '<th scope="row">수문개방(목표값)</th>'
            + '<td>'
            + '<div class="row" style="width:100%;">'
            + '<div class="col-sm"><button id="idFullClose" type="button" class="btn btn-primary"  onclick="fullClose();">완전닫힘</button></div>'
            + '<div class="col-sm"><button id="idWorkingStop" type="button" class="btn btn-success"  onclick="workingStop();">동&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;작</button></div>'
            + '<div class="col-sm"><button id="idFullOpen" type="button" class="btn btn-danger"  onclick="fullOpen();">완전열림</button></div>'
            + '</div>'
            + '</td>'
            + '</tr>'
            + '<tr>'
            + '<th scope="row">부분개폐'
            + '</th>'
            + '<td>'
            + '<div id="idpartOpen">'
            + '사용 &nbsp;&nbsp;&nbsp;<input id="idpartOpenCheck" type="checkbox" onchange="idpartOpenCheckChanged()"/>'
            + '</div>'
            + '<div style="width:100%;">'
            + '<input id="idDoorRangeslider" type="range" min="0" max="100" step="10" style="width:75%;float:left;" onchange="openSliderChanged()">'
            + '<p id="idDoortext" style="float:right;"></p>'
            + '</div>'
            + '</td>'
            + '</tr>'
            + '<tr>'
            + '<th scope="row" id="idOpenText">수문열림</th>'
            + '<td>'
            + '<div style="width:100%;">'
            + '<div id="idLeftBar" style="float:left;background-color:red;height:24px;"></div>'
            + '<div id="idRightBar" style="float:left;background-color:blue;height:24px;"></div>'
            + '</div>'
            + '</td>'
            + '</tr>'
            + '<tr>'
            + '<th scope="row">카메라</th>'
            + '<td ><button id="idImageCapture" type="button" class="btn btn-primary" onclick="imageCapture();">&nbsp;캡쳐 가능&nbsp;</button><button id="idImageCaptureDone" type="button" class="btn btn-primary" style="float:right;" onclick="imageShow();">&nbsp;&nbsp;보기&nbsp;&nbsp;</button></td>'
            + '</tr>';


        // 0913
        var check = localStorage.getItem("validationCheck");
        // 일반 사용자의 경우  idMonitoringslider disabled ...
        if (check == 1) {
            $('#idMonitoringslider').attr('disabled', true);
            normalUser = true;
        }
        else {
            $('#idMonitoringslider').attr('disabled', false);
            normalUser = false;
        }

        if (normalUser) {
            $('#idImageCapture').attr('disabled', true);
            document.getElementById('idImageCapture').innerHTML = "&nbsp;캡쳐 가능&nbsp;";
            $('#idImageCaptureDone').attr('disabled', true);
        }
        else {
            // ing ...
            if (captureStatus == 0) {
                $('#idImageCapture').attr('disabled', true);
                document.getElementById('idImageCapture').innerHTML = "&nbsp;캡쳐 진행&nbsp;";
            }
            // ready
            else if (captureStatus == 1) {
                if (captureRequested) {
                    $('#idImageCapture').attr('disabled', true);
                    document.getElementById('idImageCapture').innerHTML = "&nbsp;캡쳐 대기&nbsp;";
                }
                else {
                    $('#idImageCapture').attr('disabled', false);
                    document.getElementById('idImageCapture').innerHTML = "&nbsp;캡쳐 가능&nbsp;";
                }
            }
            // completed
            else if (captureStatus == 2) {
                captureRequested = false;
                $('#idImageCapture').attr('disabled', false);
                document.getElementById('idImageCapture').innerHTML = "&nbsp;캡쳐 가능&nbsp;";
                toastMessage("캡처가 완료되었습니다!");
            }
        }

        // 수위모니터링 : 수문제어 기능 disabled시킴
        if (reservoir[selectedReservoir].rsvtype == 1) {
            g_rsvtype = 1;
            // 011
            if (inx >= 0) {
                // slide갑이 세팅되는 조건 ...
                // checkbox 확인
                // 201
                if (idpartOpenCheckFlag) {
                    document.getElementById('idpartOpenCheck').checked = true;
                    document.getElementById('idDoorRangeslider').disabled = false;
                    document.getElementById('idDoorRangeslider').hidden = false;
                    document.getElementById('idDoortext').disabled = false;
                    document.getElementById('idDoortext').hidden = false;
                }
                else {
                    document.getElementById('idpartOpenCheck').checked = false;
                    document.getElementById('idDoorRangeslider').disabled = true;
                    document.getElementById('idDoorRangeslider').hidden = true;
                    document.getElementById('idDoortext').disabled = true;
                    document.getElementById('idDoortext').hidden = true;
                }

                document.getElementById('idpartOpen').disabled = false;
                document.getElementById('idpartOpen').hidden = false;

                document.getElementById('idWorkingStop').disabled = false;
                document.getElementById('idWorkingStop').hidden = false;

                document.getElementById('idFullClose').disabled = false;
                document.getElementById('idFullClose').hidden = false;
                document.getElementById('idFullOpen').disabled = false;
                document.getElementById('idFullOpen').hidden = false;

                document.getElementById('idLeftBar').disabled = false;
                document.getElementById('idLeftBar').hidden = false;
                document.getElementById('idRightBar').disabled = false;
                document.getElementById('idRightBar').hidden = false;

                // 0629 : act1open에 대한 생각 정리
                // 웹은 reservoir의 act1open만 받아들인다
                /*
                // 0627
                // 방금 전에 변경이 된 경우 우선 ...
                var date1 = new Date(act1open_changed_time);
                var date2 = new Date(senses[inx].sensetime);
                // 새로 올라온 데이터라면 업데이트 ...
                if (date2>date1) {
                    openTarget =  senses[inx].act1open%1000;
                    if (senses[inx].act1open>=1000) {
                        motorWorkingFlag = true;
                        document.getElementById("idWorkingStop").innerHTML = "정&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;지";
                    }
                    else {
                        motorWorkingFlag = false;
                        document.getElementById("idWorkingStop").innerHTML = "동&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;작";
                    }
                    currentOpenValue =  senses[inx].act1open_current;
                }
                document.getElementById("idDoorRangeslider").value = openTarget;
                */

                openSliderUpdate();
                openSliderChanged2();

                // 0628
                // 기본값 표시
                if (!motorWorkingFlag) {
                    document.getElementById("idWorkingStop").innerHTML = "동&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;작";
                }
                else {
                    document.getElementById("idWorkingStop").innerHTML = "정&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;지";
                }
            }
            else {

                document.getElementById('idpartOpen').disabled = true;
                document.getElementById('idpartOpen').hidden = true;

                document.getElementById('idDoorRangeslider').disabled = true;
                document.getElementById('idDoorRangeslider').hidden = true;
                document.getElementById('idDoortext').disabled = true;
                document.getElementById('idDoortext').hidden = true;

                document.getElementById('idWorkingStop').disabled = true;
                document.getElementById('idWorkingStop').hidden = true;

                document.getElementById('idFullClose').disabled = true;
                document.getElementById('idFullClose').hidden = true;
                document.getElementById('idFullOpen').disabled = true;
                document.getElementById('idFullOpen').hidden = true;

                document.getElementById('idLeftBar').disabled = true;
                document.getElementById('idLeftBar').hidden = true;
                document.getElementById('idRightBar').disabled = true;
                document.getElementById('idRightBar').hidden = true;
            }
        }
        else {
            g_rsvtype = 0;
            document.getElementById('idpartOpen').disabled = true;
            document.getElementById('idpartOpen').hidden = true;


            document.getElementById('idDoorRangeslider').disabled = true;
            document.getElementById('idDoorRangeslider').hidden = true;
            document.getElementById('idDoortext').disabled = true;
            document.getElementById('idDoortext').hidden = true;

            document.getElementById('idWorkingStop').disabled = true;
            document.getElementById('idWorkingStop').hidden = true;

            document.getElementById('idFullClose').disabled = true;
            document.getElementById('idFullClose').hidden = true;
            document.getElementById('idFullOpen').disabled = true;
            document.getElementById('idFullOpen').hidden = true;

            document.getElementById('idLeftBar').disabled = true;
            document.getElementById('idLeftBar').hidden = true;
            document.getElementById('idRightBar').disabled = true;
            document.getElementById('idRightBar').hidden = true;
        }

        /*
        // capture button ...
        // 현재 capture 중
        if (imageCatureDoing) {
            // macid 일치시 
            if (imageCaptureId==reservoir[selectedReservoir].macid) {
                //document.getElementById('imageCaptureDone').disabled = true;
            }
            else document.getElementById('idImageCaptureDone').disabled = false;
        }
        else {
            document.getElementById('idImageCaptureDone').disabled = false;
        }
        */

        // 052
        // 통신상태 다시 판단
        /*
        if (compareTime(reservoir[selectedReservoir].commlast)) {
            console.log("--------------- 온라인");
        }
        else {
            console.log("--------------- 오프라인");
        }
        */

        //if (reservoir[selectedReservoir].commstatus!=0) {
        if (compareTime(reservoir[selectedReservoir].commlast)) {
            //document.getElementById('idCommStatus').innerHTML = "온라인";
            document.getElementById('idCommStatus').innerHTML = reservoir[selectedReservoir].commlast;
            $("#idCommStatus").css("font-weight", 'normal');
            $("#idCommStatus").css("color", "#000000");
        }
        else {
            //document.getElementById('idCommStatus').innerHTML = "오프라인";
            document.getElementById('idCommStatus').innerHTML = reservoir[selectedReservoir].commlast;
            $("#idCommStatus").css("font-weight", 'bold');
            $("#idCommStatus").css("color", "#ff0000");
        }

        // 0913
        var sValue = findComIntervalSlider(reservoir[selectedReservoir].rsvtype, reservoir[selectedReservoir].comminterval);
        //document.getElementById('idMonitoringslider').value = reservoir[selectedReservoir].comminterval;
        document.getElementById('idMonitoringslider').value = sValue;
        var temp = reservoir[selectedReservoir].comminterval + "분";
        document.getElementById('idMonitoringtext').innerHTML = temp;


        // report, monitoring 주기
        $('#idMonitoringslider').change(function () {
            // 0913
            var temp1;
            if (reservoir[selectedReservoir].rsvtype == 0) temp1 = comIntMonitor[this.value];
            else temp1 = comIntControl[this.value];

            document.getElementById('idMonitoringtext').innerHTML = temp1 + "분";
            reservoir[selectedReservoir].comminterval = temp1;
            reservoirUpdateToServerRequested = true;
            reservoirUpdateToServer();
        });
        // 0622
        /*
        $("#wtank").waterTank({
            width:100,
            height:450,
            color:'#8bd0ec',
            level: 50
        }); */



        // 2023-0523
        // 저수율과 저수량을 표시
        // 저수율을 먼저 계산
        // 사용하는 경우는 0보다 커야 함
        var effHeight;
        if (reservoir[selectedReservoir].height > 0) {
            // 20m 이상인 경우
            if (reservoir[selectedReservoir].height > 20.0) {
                effHeight = 0.935 * reservoir[selectedReservoir].height - 6.457;
            }
            // 20m 보다 작거나 같은 경우
            else {
                effHeight = 0.625 * reservoir[selectedReservoir].height;
            }
        }
        // height 정보가 아예 없는 경우, dB에서 null인 경우 0으로 초기화
        else {
            // 데이터가 없는 경우는 만수위
            effHeight = (reservoir[selectedReservoir].levelfull - reservoir[selectedReservoir].levelmin);
        }
        // 저수율 = 측정수심 / 유효수심 * 100
        // 
        var percent;
        var quantity;
        // 수위가 존재하는 경우, 저수율과 저수량을 구할수 있다
        // 수위가 존재하지 않으면 N/A로 표시
        if (waterlevel >= 0) {
            percent = 100.0 * (waterlevel - reservoir[selectedReservoir].levelmin) / effHeight;
            if (percent > 100.0) percent = 100.0;
            percent_bkup = percent;

            var tTemp2 = parseFloat(percent).toFixed(1);
            document.getElementById('idPercent').innerHTML = tTemp2.toString() + "(%)";
            //document.getElementById('idPercent').style.fontWeight = "700";
            $("#idPercent").css("font-weight", 'bold');
            if (percent >= 100) $("#idPercent").css("color", "#ff0000");
            else $("#idPercent").css("color", "#000000");

            // 데이터가 존재하는 경우
            if (reservoir[selectedReservoir].effquan > 0) {
                quantity = percent * reservoir[selectedReservoir].effquan;
                tTemp2 = parseFloat(quantity).toFixed(1);
                document.getElementById('idQuantity').innerHTML = tTemp2.toString();
            }
            else {
                document.getElementById('idQuantity').innerHTML = "N/A";
            }
        }
        else {
            document.getElementById('idPercent').innerHTML = "N/A";
            //document.getElementById('idPercent').style.fontWeight = "700";
            $("#idPercent").css("font-weight", 'bold');
            if (percent >= 100) $("#idPercent").css("color", "#ff0000");
            else $("#idPercent").css("color", "#000000");
            document.getElementById('idQuantity').innerHTML = "N/A";
        }




        //$("#wtank").waterTank(50);
        var max = 160;
        var min = 605;
        //waterSenseLevel = reservoir[selectedReservoir].levelmin;
        var current;
        // 0622 수정
        if (inx >= 0) current = (waterlevel - reservoir[selectedReservoir].levelmin) / (reservoir[selectedReservoir].levelfull - reservoir[selectedReservoir].levelmin) * 0.9 + 0.02;
        else current = 0.5;

        var height_sasuwi = parseInt(min + 0.02 * (max - min) + 24).toString() + "px";
        var height_mansuwi = parseInt(min + 0.9 * (max - min)).toString() + "px";
        var height_hyunsuwi = parseInt(min + current * (max - min)).toString() + "px";
        $("#vpos1").css("margin-top", height_sasuwi);
        document.getElementById('vpos1').innerHTML = "사수위 " + reservoir[selectedReservoir].levelmin.toString() + "m";

        $("#vpos2").css("margin-top", height_hyunsuwi);
        var tTemp11 = parseFloat(percent_bkup).toFixed(1);
        if (inx >= 0) document.getElementById('vpos2').innerHTML = '현재 ' + waterlevel.toString() + 'm<br>' + tTemp11 + '%';
        else document.getElementById('vpos2').innerHTML = '현재 ' + '? m';

        // 2023-0523
        // 현재 수위가 만수위+0.5보다 낮은 경우에만 아래 현재값을 표시
        if (current < 1.1) {
            // m0218-1
            // 현재 수위가 50%가 넘는 경우는, 글자를 아래 쪽에 표시
            if (current > 0.5) {
                var temp_height_hyunsuwi = parseInt(min + current * (max - min) + 32).toString() + "px";
                $("#vpos4").css("margin-top", temp_height_hyunsuwi);
                if (inx >= 0) document.getElementById('vpos4').innerHTML = '현재 ' + waterlevel.toString() + 'm<br>' + tTemp11 + '%';
                else document.getElementById('vpos4').innerHTML = '현재 ' + '? m';

                document.getElementById('vpos2').hidden = true;
                document.getElementById('vpos4').hidden = false;

            }
            else {
                document.getElementById('vpos2').hidden = false;
                document.getElementById('vpos4').hidden = true;


            }
        }
        // 110% 이상인 경우
        else {
            // 2023-0724 : 
            //document.getElementById('vpos2').hidden = true;
            //document.getElementById('vpos4').hidden = true;
            var falseCurrent = 1.1;
            var temp_height_hyunsuwi = parseInt(min + falseCurrent * (max - min) + 32).toString() + "px";
            $("#vpos4").css("margin-top", temp_height_hyunsuwi);
            if (inx >= 0) document.getElementById('vpos4').innerHTML = '현재 ' + waterlevel.toString() + 'm<br>' + tTemp11 + '%';
            else document.getElementById('vpos4').innerHTML = '현재 ' + '? m';

            document.getElementById('vpos2').hidden = true;
            document.getElementById('vpos4').hidden = false;
        }

        if (waterlevel >= 0) {
            // 012
            document.getElementById('idLevel').innerHTML = waterlevel.toString() + "m";
            if (senses[inx].waterlevel > reservoir[selectedReservoir].levelfull) {
                $("#idLevel").css("font-weight", 'bold');
                $("#idLevel").css("color", "#ff0000");
            }
            else {
                $("#idLevel").css("font-weight", 'normal');
                $("#idLevel").css("color", "#000000");
            }
        }
        else document.getElementById('idLevel').innerHTML = "N/A";
        if (watersense >= 0) document.getElementById('idMeasure').innerHTML = (watersense.toFixed(2)).toString();
        else document.getElementById('idMeasure').innerHTML = "N/A";



        // 2022-0102
        var tTemp1 = parseFloat(temperature).toFixed(1);
        if (voltage >= 0) document.getElementById('idTemp').innerHTML = tTemp1.toString() + "&#8451;";
        else document.getElementById('idTemp').innerHTML = "N/A";
        if (temperature >= 0) document.getElementById('idVoltage').innerHTML = voltage.toString() + "V";
        else document.getElementById('idVoltage').innerHTML = "N/A";

        var tempf1 = reservoir[selectedReservoir].telecom / 1000000;
        if (comtime >= 0) document.getElementById('idComm').innerHTML = tempf1.toFixed(4) + " MB";

        else document.getElementById('idComm').innerHTML = "N/A";

        $("#vpos3").css("margin-top", height_mansuwi);
        document.getElementById('vpos3').innerHTML = "만수위 " + reservoir[selectedReservoir].levelfull.toString() + "m";

        // 2023-0523
        if (current > 1.0) current = 1.0;
        var temp2 = parseInt(current * 100);
        // 0622
        $("#wtank").waterTank({
            width: 80,              // 100
            height: 450,
            color: '#8bd0ec',
            level: temp2
        });
        //$("#wtank").waterTank(temp2);


        // https://www.jqueryscript.net/demo/Highly-Customizable-Range-Slider-Plugin-For-Bootstrap-Bootstrap-Slider/
        //$("#ex5c").slider({ id: "slider5c", min: 0, max: 10, value: 5 });

        /*
        $("#ex5a").slider({ id: "slider5a", min: 0, max: 10, range: true, value: [3, 3] });
        $("#ex5b").slider({ id: "slider5b", min: 0, max: 10, range: true, value: [6, 6] }); */
        //document.getElementById('idChart-message').innerHTML = "";
        //_drawChart();
    }
    else {
        document.getElementById('reservoirDetailTable').innerHTML = "<br><br><br><br><br><br><br><br><br><br><br><br><br><br>저수지 목록을 추가하세요!";
        //document.getElementById('idChart-message').innerHTML = "<br><br><br><br><br><br><br><br><br><br><br><br><br><br>저수지 목록을 추가하세요!";
    }
}

function findComIntervalSlider(type, value) {
    // 모니터링
    if (type == 0) {
        for (var i = 0; i < (comIntMonitor.length - 1); i++) {
            if ((value >= comIntMonitor[i]) && (value < comIntMonitor[i + 1])) {
                return i;
            }
        }
        return 11;
    }
    // control
    else {
        for (var i = 0; i < (comIntControl.length - 1); i++) {
            if ((value >= comIntControl[i]) && (value < comIntControl[i + 1])) {
                return i;
            }
        }
        return 11;
    }
}

function idpartOpenCheckChanged() {
    if (document.getElementById('idpartOpenCheck').checked) {
        idpartOpenCheckFlag = true;
        document.getElementById('idDoorRangeslider').disabled = false;
        document.getElementById('idDoorRangeslider').hidden = false;
        document.getElementById('idDoortext').disabled = false;
        document.getElementById('idDoortext').hidden = false;
    }
    else {
        idpartOpenCheckFlag = false;
        document.getElementById('idDoorRangeslider').disabled = true;
        document.getElementById('idDoorRangeslider').hidden = true;
        document.getElementById('idDoortext').disabled = true;
        document.getElementById('idDoortext').hidden = true;
    }
}

function imageCapture() {

    // 0913
    $.confirm({
        title: '확인!',
        content: "카메라를 이용하여 사진을 찍어시겠습니까? 캡처 완료 후 알려드립니다!",
        type: 'red',
        typeAnimated: true,
        boxWidth: '25%',
        useBootstrap: true,
        buttons: {
            formSubmit: {
                text: '확인',
                btnClass: 'btn-blue',
                action: function () {
                    /*
                    //document.getElementById("imageCaptureDone").disabled = true;
                    imageCatureDoing = true;
                    imageCaptureId = reservoir[selectedReservoir].macid;
                    imageCaptureTimer = 300;

                    // flag reset ...
                    setTimeout(() => {
                        imageCatureDoing = false;
                        document.getElementById('imageCaptureDone').disabled = false;
                    }, 300*1000);
                    // 900
                    */


                    // 0502 : mqdb에 capture명령 전달
                    var message = { "sender": subTopic, "data": reservoir[selectedReservoir].macid };
                    clientPublish(pubTopic, "PUT_CAPTURE=" + JSON.stringify(message) + ";");
                    printDebug("Start Image Capture ... ...");
                    captureRequested = true;

                    $('#idImageCapture').attr('disabled', false);
                    document.getElementById('idImageCapture').innerHTML = "&nbsp;캡쳐 대기&nbsp;";
                    $('#idImageCapture').attr('disabled', true);
                }
            },
            cancel: {
                text: '취소',
                action: function () {

                }
            }
        },
        onContentReady: function () {
            // bind to events
            var jc = this;
            this.$content.find('form').on('submit', function (e) {
                // if the user submits the form by pressing enter in the field.
                e.preventDefault();
                jc.$$formSubmit.trigger('click'); // reference the button and click it
            });
        }
    });
}

function imageShow() {
    modal.style.display = "block";
    modalImg.src = "./capture/" + reservoir[selectedReservoir].macid + ".jpg";
    captionText.innerHTML = this.alt;
    // When the user clicks on <span> (x), close the modal
    span.onclick = function () {
        modal.style.display = "none";
    }
}

// open slider : 사용자가 mouse로 변경시 발생 ...
function openSliderChanged() {
    if (g_rsvtype == 1) {
        act1open_changed_time = sNow();
        var value = parseInt(document.getElementById("idDoorRangeslider").value);
        if (value == 0) $('#idDoortext').html("완전 닫힘");
        else $('#idDoortext').html("열림 " + value.toString() + "%");
        openTarget = value;
        if (value == 100) {
            console.log('');
        }

        if (motorWorkingFlag) value += 1000;
        reservoir[selectedReservoir].act1open = value;
        reservoirUpdateToServerRequested = true;
        reservoirUpdateToServer();
        // 030
    }
}

function fullClose() {
    if (g_rsvtype == 1) {
        act1open_changed_time = sNow();
        var value = 0;
        document.getElementById("idDoorRangeslider").value = value;
        if (value == 0) $('#idDoortext').html("완전 닫힘");
        else $('#idDoortext').html("열림 " + value.toString() + "%");
        openTarget = value;

        if (motorWorkingFlag) value += 1000;
        reservoir[selectedReservoir].act1open = value;
        reservoirUpdateToServerRequested = true;
        reservoirUpdateToServer();
        // 030
    }
}
function fullOpen() {
    if (g_rsvtype == 1) {
        act1open_changed_time = sNow();
        var value = 100;
        document.getElementById("idDoorRangeslider").value = value;
        if (value == 0) $('#idDoortext').html("완전 닫힘");
        else $('#idDoortext').html("열림 " + value.toString() + "%");
        openTarget = value;

        if (motorWorkingFlag) value += 1000;
        reservoir[selectedReservoir].act1open = value;
        reservoirUpdateToServerRequested = true;
        reservoirUpdateToServer();
        // 030
    }
}

// 0627
// motor working or stop
function workingStop() {
    if (motorWorkingFlag) {
        motorWorkingFlag = false;
        document.getElementById("idWorkingStop").innerHTML = "동&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;작";
    }
    else {
        motorWorkingFlag = true;
        document.getElementById("idWorkingStop").innerHTML = "정&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;지";
    }
    // 0629
    var value = parseInt(document.getElementById("idDoorRangeslider").value);
    if (motorWorkingFlag) value += 1000;
    reservoir[selectedReservoir].act1open = value;
    reservoirUpdateToServerRequested = true;
    reservoirUpdateToServer();

    // 
}

// open slider
function openSliderChanged2() {
    if (g_rsvtype == 1) {
        var value = parseInt(document.getElementById("idDoorRangeslider").value);
        if (value == 0) $('#idDoortext').html("완전 닫힘");
        else $('#idDoortext').html("열림 " + value.toString() + "%");
        openTarget = value;
    }
}


// jjk11
function openSliderUpdate() {
    if (g_rsvtype == 1) {
        if (reservoirDetailDrawn) {
            //console.log("------------------------------------------------------------------------");
            //console.log(openTarget);
            //console.log("------------------------------------------------------------------------");
            document.getElementById("idDoorRangeslider").value = openTarget;

            if (openTarget >= (currentOpenValue + 1)) {
                if (motorWorkingFlag) document.getElementById("idOpenText").innerHTML = "수문여는 중(" + currentOpenValue.toString() + "%)";
                else document.getElementById("idOpenText").innerHTML = "수문 정지(" + currentOpenValue.toString() + "%)";
            }
            else if (openTarget <= (currentOpenValue - 1)) {
                if (motorWorkingFlag) document.getElementById("idOpenText").innerHTML = "수문닫는 중(" + currentOpenValue.toString() + "%)";
                else document.getElementById("idOpenText").innerHTML = "수문 정지(" + currentOpenValue.toString() + "%)";
            }
            else {
                document.getElementById("idOpenText").innerHTML = "수문 정지(" + currentOpenValue.toString() + "%)";
                setTimeout(() => {
                    if (motorWorkingFlag) {
                        motorWorkingFlag = false;
                        document.getElementById("idWorkingStop").innerHTML = "동&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;작";
                    }
                }, 1000);
            }
            var value1 = currentOpenValue.toString() + "%";
            var value2 = (100 - currentOpenValue).toString() + "%";

            $('#idLeftBar').width(value1);
            $('#idRightBar').width(value2);
        }
    }
}


function updateResevoir() {
    if (!isEmpty(reservoir)) {
        // 010
        if (!reservoirDetailDrawn) drawReservoirDetail();
        // 009
        var inx = findIndexFromSenses(reservoir[selectedReservoir].macid);
        var waterlevel, watersense, voltage, temperature, comtime;

        if (inx >= 0) {
            watersense = senses[inx].watersense;
            // // 2022-0102-7
            waterlevel = ((senses[inx].watersense + reservoir[selectedReservoir].senseadd) * 9.80665 + reservoir[selectedReservoir].leveladd + reservoir[selectedReservoir].levelmin).toFixed(2);
            if (waterlevel > reservoir[selectedReservoir].levelover) waterlevel = reservoir[selectedReservoir].levelover;
            waterlevel = parseFloat(waterlevel).toFixed(2);

            voltage = senses[inx].voltage;
            temperature = senses[inx].temperature.toFixed(1);
            comtime = senses[inx].comtime;
        }
        else {
            waterlevel = -1;
            watersense = -1;
            voltage = -1;
            temperature = -1;
            comtime = -1;
        }

        //$("#wtank").waterTank(50);
        var max = 160;
        var min = 605;

        var current;
        // 0622 수정
        if (inx >= 0) current = (waterlevel - reservoir[selectedReservoir].levelmin) / (reservoir[selectedReservoir].levelfull - reservoir[selectedReservoir].levelmin) * 0.9 + 0.02;
        else current = 0.5;

        //var current = 0;
        var height_sasuwi = parseInt(min + 0.02 * (max - min) + 24).toString() + "px";
        var height_mansuwi = parseInt(min + 0.9 * (max - min)).toString() + "px";
        var height_hyunsuwi = parseInt(min + current * (max - min)).toString() + "px";

        $("#vpos1").css("margin-top", height_sasuwi);
        document.getElementById('vpos1').innerHTML = "사수위 " + reservoir[selectedReservoir].levelmin.toString() + "m";

        $("#vpos2").css("margin-top", height_hyunsuwi);
        var tTemp12 = parseFloat(percent_bkup).toFixed(1);
        if (inx >= 0) document.getElementById('vpos2').innerHTML = '현재 ' + waterlevel.toString() + 'm<br>' + tTemp12 + '%';
        else document.getElementById('vpos2').innerHTML = '현재 ' + '? m';

        // 2023-0523
        // 현재 수위가 만수위+0.5보다 낮은 경우에만 아래 현재값을 표시
        if (current < 1.1) {
            // m0218-1
            // 현재 수위가 50%가 넘는 경우는, 글자를 아래 쪽에 표시
            if (current > 0.5) {
                var temp_height_hyunsuwi = parseInt(min + current * (max - min) + 32).toString() + "px";
                $("#vpos4").css("margin-top", temp_height_hyunsuwi);
                if (inx >= 0) document.getElementById('vpos4').innerHTML = '현재 ' + waterlevel.toString() + 'm<br>' + tTemp12 + '%';
                else document.getElementById('vpos4').innerHTML = '현재 ' + '? m';

                document.getElementById('vpos2').hidden = true;
                document.getElementById('vpos4').hidden = false;
            }
            else {
                document.getElementById('vpos2').hidden = false;
                document.getElementById('vpos4').hidden = true;
            }
        }
        else {
            // 2023-0724 : 
            //document.getElementById('vpos2').hidden = true;
            //document.getElementById('vpos4').hidden = true;
            var falseCurrent = 1.1;
            var temp_height_hyunsuwi = parseInt(min + falseCurrent * (max - min) + 32).toString() + "px";
            $("#vpos4").css("margin-top", temp_height_hyunsuwi);
            if (inx >= 0) document.getElementById('vpos4').innerHTML = '현재 ' + waterlevel.toString() + 'm<br>' + tTemp12 + '%';
            else document.getElementById('vpos4').innerHTML = '현재 ' + '? m';

            document.getElementById('vpos2').hidden = true;
            document.getElementById('vpos4').hidden = false;
        }

        if (inx >= 0) {
            if (waterlevel >= 0) {
                // 2022-0102-7
                /*
                console.log("pos2 :" + sNow() + " ==>" + waterlevel);
                // debug ...
                if (waterlevel<1.0) {
                    console.log("water sense level: " + senses[inx].waterlevel);
                    console.log("water sense : " + senses[inx].watersense);
                    console.log("water level min: " + reservoir[selectedReservoir].levelmin);
                    console.log("water level max: " + reservoir[selectedReservoir].levelmax);
                }
                */

                // 012
                document.getElementById('idLevel').innerHTML = waterlevel.toString() + "m";
                if (senses[inx].waterlevel > reservoir[selectedReservoir].levelfull) {
                    $("#idLevel").css("font-weight", 'bold');
                    $("#idLevel").css("color", "#ff0000");
                }
                else {
                    $("#idLevel").css("font-weight", 'normal');
                    $("#idLevel").css("color", "#000000");
                }
            }
            document.getElementById('idMeasure').innerHTML = (watersense.toFixed(2)).toString();
            document.getElementById('idTemp').innerHTML = temperature.toString() + "&#8451;";
            document.getElementById('idVoltage').innerHTML = voltage.toString() + "V";
            var tempf1 = reservoir[selectedReservoir].telecom / 1000000;
            document.getElementById('idComm').innerHTML = tempf1.toFixed(4) + " MB";

            // 항상 reservoir의 값을 반영한다
            // 0629
            if (reservoir[selectedReservoir].act1open >= 1000) motorWorkingFlag = true;
            else motorWorkingFlag = false;
            openTarget = reservoir[selectedReservoir].act1open % 1000;

            currentOpenValue = senses[inx].act1open_current;
            //console.log("------------------------------------------------------------------------");
            //console.log(openTarget);
            //console.log("------------------------------------------------------------------------");
            document.getElementById("idDoorRangeslider").value = openTarget;
            openSliderUpdate();
            openSliderChanged2();
        }
        else {
            document.getElementById('idLevel').innerHTML = "N/A";
            document.getElementById('idMeasure').innerHTML = "N/A";
            document.getElementById('idTemp').innerHTML = "N/A";
            document.getElementById('idVoltage').innerHTML = "N/A";
            document.getElementById('idComm').innerHTML = "N/A";
        }

        $("#vpos3").css("margin-top", height_mansuwi);
        document.getElementById('vpos3').innerHTML = "만수위 " + reservoir[selectedReservoir].levelfull.toString() + "m";

        // 2023-0523
        if (current > 1.0) current = 1.0;
        var temp2 = parseInt(current * 100);
        $("#wtank").waterTank(temp2);

        //$("#ex5c").slider({ id: "slider5c", min: 0, max: 10, value: 5 });
        $("#ex5a").slider({ id: "slider5a", min: 0, max: 10, range: true, value: [3, 3] });
        $("#ex5b").slider({ id: "slider5b", min: 0, max: 10, range: true, value: [6, 6] });
    }
}


// 
function _drawChart() {
    // 070
    var date;
    if (!gSpecificDateMode) date = new Date();
    else date = new Date(specificDate);

    var hour = (date.getHours());
    var minute = (date.getMinutes());
    var now = hour * 6 + (minute / 10);

    var graphLabel = new Array(144);;
    for (var i = 0; i < 24 * 6; i++) {
        //graphLabel.push(i.toString());
        var temp1 = parseInt((144 + now) / 6);
        var temp2 = (temp1 % 24).toString();
        graphLabel[i] = temp2 + "시";

        now--;
    }
    var res = findGraphData(date, reservoir[selectedReservoir].macid);
    var graphData = res[0];
    var graphData2 = res[1];

    // 2023-0523
    // min, max를 추가
    var gMin = reservoir[selectedReservoir].levelmin;
    var gMax = reservoir[selectedReservoir].levelover;

    // 강제로 취소 ...
    if (myLineChart !== undefined) {
        myLineChart.destroy();
    }
    var ctx = document.getElementById("idChart-sub");
    myLineChart = new Chart(ctx, {
        type: 'line',
        data: {
            //labels: ["Mar 1", "Mar 2", "Mar 3", "Mar 4", "Mar 5", "Mar 6", "Mar 7", "Mar 8", "Mar 9", "Mar 10", "Mar 11", "Mar 12", "Mar 13"],
            labels: graphLabel,
            datasets: [{
                label: "측정값",
                backgroundColor: "rgba(0,0,255,1)",
                borderColor: "rgba(0,0,255,1)",
                data: graphData,
                fill: false,
            }, {
                label: "추정값",
                fill: false,
                backgroundColor: "rgba(128,128,128,0.2)",
                borderColor: "rgba(128,128,128,0.5)",
                data: graphData2,
            }]
        },
        options: {
            responsive: true,
            animation: {
                duration: 0
            },
            title: {
                display: true,
                text: reservoir[selectedReservoir].name
            },
            tooltips: {
                mode: 'index',
                intersect: false,
            },
            hover: {
                mode: 'nearest',
                intersect: true
            },
            scales: {
                xAxes: [{
                    display: true,
                    scaleLabel: {
                        display: true,
                        labelString: "시간"
                    }
                }],
                yAxes: [{
                    ticks: {
                        min: gMin,
                        max: gMax
                    },
                    display: true,
                    scaleLabel: {
                        display: true,
                        labelString: '수위'
                    }
                }]
            }
        }
    });



    // detail
    if (detailOrChart == 0) {
        document.getElementById('idChart').style.display = 'none';
        document.getElementById('idDetail').style.display = 'block';
        document.getElementById('detailChartToggle').innerHTML = '<i class="fas fa-info-circle mr-1"></i>저수지 상세정보<i class="fas fa-exchange-alt" style="float:right;"></i>';
    }
    // chart
    else {
        document.getElementById('idDetail').style.display = 'none';
        document.getElementById('idChart').style.display = 'block';
        document.getElementById('detailChartToggle').innerHTML = '<i class="fas fa-chart-area mr-1"></i>저수지 그래프<i class="fas fa-exchange-alt" style="float:right;"></i>';
    }

    // radio 버튼에 대한 처리
    $('#idSenseType3').on('change', function (e) {
        if (this.checked) {
            document.getElementById('idSenseDate').disabled = true;
        }
        else {
            document.getElementById('idSenseDate').disabled = false;
        }
        gSpecificDateMode = $('#idSenseType4').is(":checked");
    });
    $('#idSenseType4').on('change', function (e) {
        if (this.checked) {
            document.getElementById('idSenseDate').disabled = false;
        }
        else {
            document.getElementById('idSenseDate').disabled = true;
        }
        setTimeout(() => {
            gSpecificDateMode = $('#idSenseType4').is(":checked");
        }, 100);
    });
}

function findGraphData(date, macid) {
    var inx;
    var tt = selectedReservoir;

    graphData = new Array(144);
    graphData2 = new Array(144);
    graphMin = 100;
    graphMax = 0;

    // 071
    // 초기화
    //for (var i=0;i<24*6;i++) graphData.push(null);
    for (var i = 0; i < senses.length; i++) {
        // 같은 것일 경우
        if (senses[i].macid == macid) {
            inx = findIndexFromDate(senses[i].sensetime, date);
            if ((inx >= 0) && (inx < 144)) {
                // 수위 환산을 모든 데이터에 대해 적용 ...
                var watersense = senses[i].watersense + reservoir[tt].senseadd;
                // 사수위를 더해서 수위를 표시
                var waterlevel = ((senses[i].watersense + reservoir[tt].senseadd) * 9.80665 + reservoir[tt].leveladd + reservoir[tt].levelmin).toFixed(2);
                if (waterlevel > reservoir[tt].levelover) waterlevel = reservoir[tt].levelover;
                waterlevel = parseFloat(waterlevel).toFixed(2);
                senses[i].waterlevel = waterlevel;

                graphData[inx] = senses[i].waterlevel;
                // 2023-0523
                //console.log(inx,waterlevel);
                if (graphData[inx] > graphMax) graphMax = graphData[inx];
                if (graphData[inx] < graphMin) graphMin = graphData[inx];
            }
        }
    }

    /*
    // 2023-0523
    // graphData2
    var start = 0;
    for (var i=0;i<144;i++) {
        graphData2[i] = graphData[i];
        // 오른쪽에서 가장 가까운 0이 아닌 것을 찾는다
        if (graphData[i]==0)
        {
            for (var j=i;j<144;j++)
            {
                if (graphData[j]>0) 
                {
                    graphData2[i] = graphData[j];
                    break;
                }
            }
        }
    }
    */


    // graphData2
    var start = 0;
    for (var i = 0; i < 144; i++) {
        // null이 아니고 undefined도 아니라면
        if (graphData[i] >= 0) {
            for (var j = start; j <= i; j++) graphData2[j] = graphData[i];
            start = i + 1;
        }
    }



    return [graphData, graphData2];
}



function findIndexFromDate(a, b) {
    var yearA, monthA, dayA, hourA, minuteA;
    var inx;

    inx = a.indexOf("-");
    yearA = a.substring(0, inx);
    a = a.substring(inx + 1);

    inx = a.indexOf("-");
    monthA = a.substring(0, inx);
    a = a.substring(inx + 1);

    inx = a.indexOf(" ");
    dayA = a.substring(0, inx);
    a = a.substring(inx + 1);

    inx = a.indexOf(":");
    hourA = a.substring(0, inx);
    a = a.substring(inx + 1);

    inx = a.indexOf(":");
    minuteA = a.substring(0, inx);
    a = a.substring(inx + 1);



    // a : 기준시간, b : 비교시간
    dateA = new Date(yearA + "/" + monthA + "/" + dayA + "/" + hourA + ":" + minuteA + ":00");
    var diff = parseInt((b - dateA) / 600 / 1000);
    //console.log(diff);

    return diff;

}

function updateGraph() {
    //_drawChart();

    var message;
    var mode = $('#idSenseType4').is(":checked");
    gSpecificDateMode = mode;

    var idString = "";
    idString += "(macid=";
    idString += "'" + reservoir[selectedReservoir].macid + "'";
    idString += ")";

    message = { "sender": subTopic, "data": 150, "type": 2, "idString": idString, "date": "", "endDate": "" };
    // 2023-0523
    //clientPublish(pubTopic,"GET_SENSES=" +  JSON.stringify(message) + ";");

    // 2023-0523
    // 실시간
    if (mode) {
        specificDate = document.getElementById('idSenseDate').value;
        console.log(document.getElementById('idSenseDate').value);
        message = { "sender": subTopic, "data": 150, "type": 2, "idString": idString, "date": specificDate, "endDate": "" };
    }
    // 과거 특정일 
    else {
        message = { "sender": subTopic, "data": 150, "type": 2, "idString": idString, "date": "", "endDate": "" };
    }
    clientPublish(pubTopic, "GET_SENSES=" + JSON.stringify(message) + ";");
}

function movePage() {
    // 0(index), 1(sensing), 2(저수지 정보 편집), 3(사용자 추가), 4(설정)
    switch (pageMode) {
        case 0: document.getElementById('idDashboard').style.display = 'block';
            document.getElementById('idSense').style.display = 'none';
            document.getElementById('idSense2').style.display = 'none';
            document.getElementById('idReservoir').style.display = 'none';
            document.getElementById('idUser').style.display = 'none';
            document.getElementById('idSetting').style.display = 'none';
            //if (globalOptionUpdateRequested) updateGlobalOption();
            globalOptionEnable = false;

            // 1211 : 지도에서 marker의 title이 꺠지는 문제(다른 메뉴에 갔다오는 경우)
            //drawMap();
            mapTableRedraw();

            // Map 이상 방지
            showAllMarkers();

            // 2023-0724
            oneItemRequested = false;
            break;
        // sensing
        case 1: document.getElementById('idDashboard').style.display = 'none';
            document.getElementById('idSense').style.display = 'block';
            document.getElementById('idSense2').style.display = 'none';
            document.getElementById('idReservoir').style.display = 'none';
            document.getElementById('idUser').style.display = 'none';
            document.getElementById('idSetting').style.display = 'none';

            // 2022-0124 가끔씩 화면이상 떄문에 삭제
            // 1219
            //loadingProgress(2500);    // error 떄문에 삭제 ???
            // 메세지 추가
            //toastMessage("데이터를 로딩합니다!");

            addTableSense();

            // 강제 update ...
            senseString = "";
            askSenseValues();
            //updateTableSense();
            //if (globalOptionUpdateRequested) updateGlobalOption();
            globalOptionEnable = false;

            // map 이상 방지
            hideAllMarkers();

            // multiselect disable 기본
            $("#idSenseMember").multiselect('disable');
            break;
        // 저수지
        case 2: if (validationCheck > 1) {
            document.getElementById('idDashboard').style.display = 'none';
            document.getElementById('idSense').style.display = 'none';
            document.getElementById('idSense2').style.display = 'none';
            document.getElementById('idReservoir').style.display = 'block';
            document.getElementById('idUser').style.display = 'none';
            document.getElementById('idSetting').style.display = 'none';
            drawReservoirTable();
        }
        else {
            toastMessage("사용 권한이 없습니다");
        }
            //if (globalOptionUpdateRequested) updateGlobalOption();
            globalOptionEnable = false;

            // map 이상 방지
            hideAllMarkers();
            break;
        // 사용자
        case 3: if (validationCheck > 1) {
            document.getElementById('idDashboard').style.display = 'none';
            document.getElementById('idSense').style.display = 'none';
            document.getElementById('idSense2').style.display = 'none';
            document.getElementById('idReservoir').style.display = 'none';
            document.getElementById('idUser').style.display = 'block';
            document.getElementById('idSetting').style.display = 'none';
            drawUsersTable();
        } else {
            toastMessage("사용 권한이 없습니다");
        }
            //if (globalOptionUpdateRequested) updateGlobalOption();
            globalOptionEnable = false;

            // map 이상 방지
            hideAllMarkers();
            break;
        // 설정
        case 4: if (validationCheck > 1) {
            document.getElementById('idDashboard').style.display = 'none';
            document.getElementById('idSense').style.display = 'none';
            document.getElementById('idSense2').style.display = 'none';
            document.getElementById('idReservoir').style.display = 'none';
            document.getElementById('idUser').style.display = 'none';
            document.getElementById('idSetting').style.display = 'block';

            globalOptionEnable = true;
            setOptions();

        } else {
            toastMessage("사용 권한이 없습니다");
            globalOptionEnable = false;
        }
            // map 이상 방지`
            hideAllMarkers();
            break;
        // sensing2
        case 5: document.getElementById('idDashboard').style.display = 'none';
            document.getElementById('idSense').style.display = 'none';
            document.getElementById('idSense2').style.display = 'block';
            document.getElementById('idReservoir').style.display = 'none';
            document.getElementById('idUser').style.display = 'none';
            document.getElementById('idSetting').style.display = 'none';

            // 2022-0124 가끔씩 화면이상 떄문에 삭제
            // 1219
            //loadingProgress(2500);    // error 떄문에 삭제 ???
            // 메세지 추가
            //toastMessage("데이터를 로딩합니다!");

            addTableSense2();

            // 강제 update ...
            senseString = "";
            askSense2Values();
            //updateTableSense();
            //if (globalOptionUpdateRequested) updateGlobalOption();
            globalOptionEnable = false;

            // map 이상 방지
            hideAllMarkers();

            // multiselect disable 기본
            $("#idSense2Member").multiselect('disable');
            break;
    }
}


// 사용자 정보를 받아서 그림
function _drawUsers() {
    // users 값을 모두 가져옴
    //var loginfo = {"username": "", "passwd": "","sender": subTopic};
    var loginfo = { "username": username, "passwd": "", "epasswd": simpleEncryption(passwd), "sender": subTopic };
    clientPublish(pubTopic, "GET_USERS=" + JSON.stringify(loginfo) + ";");
    indexWaitCounter = 0;
    checkUsersReceived();
}

function checkUsersReceived() {
    if (usersReceived == false) {
        if (indexWaitCounter < 50) window.setTimeout(checkUsersReceived, 100);  /* this checks the flag every 100 milliseconds*/
        else {
            printDebug("서버로부터 데이터를 수신하지 못함");
        }
    }
    // data 수신
    //else drawUsersTable();
}



// jjk5
// --------------------------------------------------------------------------------------------------------------
// reservoir
// --------------------------------------------------------------------------------------------------------------
function drawReservoirTable() {
    // 이 문장이 있어야 초기화 경고가 나오지 않음
    if (idTableReservoir2) idTableReservoir2.destroy();
    idTableReservoir2 = $('#idTableReservoir2').DataTable({
        "scrollX": true,     // test : 과도하게 확대하면 scroll 화면이 나타나기는 하나 사용성이 좋지않음 ...
        "scrollCollapse": true,
        "autoWidth": false,
        "paging": true,
        "ordering": true,
        "info": true,
        "filter": true,
        "lengthChange": true,
        "order": [[1, "asc"]],
        "stateSave": true,
        "pagingType": "full_numbers",
        "columnDefs": [
            { "className": "dt-center", "defaultContent": "-", "orderable": true, "targets": "_all" },
            {
                "targets": 0,
                "render": function (data, type, row, meta) {
                    var res = row[0];
                    return res;
                }
            }
        ]
    });
    idTableReservoir2.clear().draw();

    //setTimeout(() => {
    if (!isEmpty(reservoir)) {
        for (var i = 0; i < reservoir.length; i++) {
            idTableReservoir2.row.add([
                // 1218-1
                '<input class="form-check-input" style="margin-left:0px;" type="radio" id="idRsv2Radio' + i + '">',
                i + 1,
                reservoir[i].name,
                reservoir[i].manageid,
                reservoir[i].address,
                reservoir[i].rsvtype,
                //reservoir[i].x + " / " + reservoir[i].y,
                reservoir[i].levelmin,
                reservoir[i].levelfull,
                reservoir[i].levelover,

                // 2023-0523
                reservoir[i].height,
                reservoir[i].effquan,

                reservoir[i].prange,
                reservoir[i].senseadd,
                reservoir[i].leveladd,

                reservoir[i].incharge,
                reservoir[i].macid,
                reservoir[i].phone,
                //reservoir[i].telecom,
                //reservoir[i].swversion,
                reservoir[i].comminterval,
                reservoir[i].commlast,
                reservoir[i].waittime,
                reservoir[i].regdate,
            ]).draw();
        }
    }


    setTimeout(() => {
        idTableReservoir2.order([1, 'desc']).draw();
    }, 200);

    //}, 500);

    $('#idTableReservoir2').on('click', 'td', function () {
        idTableReservoir2SelectedRow = idTableReservoir2.cell(this).index().row;
        // 1218-1 : radio check는 자동으로 됨 ... 다른 선택은 모두 off시킴
        //for (var i=0;i<reservoir.length;i++) {
        for (var i = 0; i < idTableReservoir2.rows().count(); i++) {
            if (i == idTableReservoir2SelectedRow) $("#idRsv2Radio" + i).prop("checked", true);
            else $("#idRsv2Radio" + i).prop("checked", false);
        }

        console.log("row=" + idTableReservoir2SelectedRow);
        var index = findReservoir2Index(idTableReservoir2SelectedRow);
        // 1218-1
        editSelectedReservoir = index;
        var num = idTableReservoir2.cell({ row: idTableReservoir2SelectedRow, column: 1 }).data();
        // 0913 : jjk001
        toastMessage(num + "번 " + reservoir[index].name + "이(가)  선택되었습니다");

        // 1218-1 : 편집이 눌러지면 위로 복사
        /* 
        // fill 
        document.getElementById('inputReservoirName').value = reservoir[index].name;
        document.getElementById('inputReservoirManageid').value = reservoir[index].manageid;
        document.getElementById('inputReservoirAddress').value = reservoir[index].address;
        document.getElementById('inputReservoirRsvtype').value = reservoir[index].rsvtype;

        //document.getElementById('inputReservoirLocation').value = reservoir[index].x + " / " + reservoir[index].y;
        g_inputReservoirLocation = reservoir[index].x + " / " + reservoir[index].y;

        document.getElementById('inputReservoirLevelmin').value = reservoir[index].levelmin;
        document.getElementById('inputReservoirLevelfull').value = reservoir[index].levelfull;
        document.getElementById('inputReservoirLevelover').value = reservoir[index].levelover;

        document.getElementById('inputReservoirPrange').value = reservoir[index].prange;
        document.getElementById('inputReservoirSenseadd').value = reservoir[index].senseadd;
        document.getElementById('inputReservoirLeveladd').value = reservoir[index].leveladd;

        document.getElementById('inputReservoirIncharge').value = reservoir[index].incharge;

        document.getElementById('inputDeviceMacid').value = reservoir[index].macid;
        document.getElementById('inputDevicePhone').value = reservoir[index].phone;
        //document.getElementById('inputDeviceTelecom').value = reservoir[index].telecom;
        //document.getElementById('inputDeviceSwver').value = reservoir[index].swversion;

        document.getElementById('inputDeviceComminterval').value = reservoir[index].comminterval;
        //document.getElementById('inputDeviceCommlast').value = reservoir[index].commlast;
        document.getElementById('inputDeviceWaittime').value = reservoir[index].waittime;
        document.getElementById('inputDeviceKeeptime').value = reservoir[index].keeptime;
        */
    });


}

function refreshResevoirTable() {
    // 테이블을 다시 그림
    drawReservoirTable();
}

function pasteTodivs(type, index) {
    // reservoir의 테이블 내용을 위로 복사, 편집목적
    if (type == "reservoir") {
        document.getElementById('inputReservoirName').value = reservoir[index].name;
        document.getElementById('inputReservoirManageid').value = reservoir[index].manageid;
        document.getElementById('inputReservoirAddress').value = reservoir[index].address;
        document.getElementById('inputReservoirRsvtype').value = reservoir[index].rsvtype;

        //document.getElementById('inputReservoirLocation').value = reservoir[index].x + " / " + reservoir[index].y;
        g_inputReservoirLocation = reservoir[index].x + " / " + reservoir[index].y;

        document.getElementById('inputReservoirLevelmin').value = reservoir[index].levelmin;
        document.getElementById('inputReservoirLevelfull').value = reservoir[index].levelfull;
        document.getElementById('inputReservoirLevelover').value = reservoir[index].levelover;

        document.getElementById('inputReservoirHeight').value = reservoir[index].height;
        document.getElementById('inputReservoirEffquan').value = reservoir[index].effquan;

        document.getElementById('inputReservoirPrange').value = reservoir[index].prange;
        document.getElementById('inputReservoirSenseadd').value = reservoir[index].senseadd;
        document.getElementById('inputReservoirLeveladd').value = reservoir[index].leveladd;

        document.getElementById('inputReservoirIncharge').value = reservoir[index].incharge;

        document.getElementById('inputDeviceMacid').value = reservoir[index].macid;
        document.getElementById('inputDevicePhone').value = reservoir[index].phone;
        //document.getElementById('inputDeviceTelecom').value = reservoir[index].telecom;
        //document.getElementById('inputDeviceSwver').value = reservoir[index].swversion;

        document.getElementById('inputDeviceComminterval').value = reservoir[index].comminterval;
        //document.getElementById('inputDeviceCommlast').value = reservoir[index].commlast;
        document.getElementById('inputDeviceWaittime').value = reservoir[index].waittime;
        document.getElementById('inputDeviceKeeptime').value = reservoir[index].keeptime;
    }
    else if (type == "user") {
        document.getElementById('inputKrname').value = users[index].krname;
        document.getElementById('inputCompany').value = users[index].company;
        document.getElementById('inputPhone').value = users[index].phone;
        document.getElementById('inputAddress').value = users[index].address;

        document.getElementById('inputEmail2').value = users[index].name;
        document.getElementById('inputPasswd2').value = users[index].passwd;
        var temp = users[index].type;
        if (temp == 3) temp = 2;
        document.getElementById('userSelect').value = temp - 1;

        // 괸리번호를 가져옴
        var selected = findItemsFromList(users[index].rsvSelected);     // 5000,5001
        // 관리번호를 가지고, 이름까지 추가한 비교리스트를 준비함
        var compareNames = [];                                          // 5000 abcd, 5001 def
        var indexSelected = [];                                         // 0,1,2,3
        for (var i = 0; i < selected.length; i++) {
            for (var j = 0; j < reservoir.length; j++) {
                // 0625 : 버그 수정
                if (selected[i] == reservoir[j].manageid) compareNames.push(reservoir[j].manageid + " " + reservoir[j].name);
            }
        }
        // option과 비교하여 선택부분을 표시
        for (var option of document.getElementById('rsvMulti').options) {
            option.selected = false;
            for (var i = 0; i < compareNames.length; i++) {
                if (option.text == compareNames[i]) {
                    option.selected = true;
                }
            }
        }
        // 반드시 있어야 함
        $('#rsvMulti').multiselect('refresh');
    }
}

// 0913
// 특정 row가 선택이 됨
function rsv2Radio(index) {

}

function searchMap() {

    var address = document.getElementById('inputReservoirAddress').value;
    //sample5_execDaumPostcode(address);

    findNaverAddress(address);

}

function findNaverAddress(address) {
    naver.maps.Service.geocode({
        address: address
    }, function (status, response) {
        if (status !== naver.maps.Service.Status.OK) {
            toastMessage("주소가 검색되지 않습니다. 확인하세요!");
        }
        else {
            var result = response.result; // 검색 결과의 컨테이너
            var items = result.items; // 검색 결과의 배열

            // 에러 여부 판단
            try {
                // 주소 정보를 해당 필드에 넣는다.
                document.getElementById("inputReservoirAddress").value = items[0].address;
                toastMessage("주소가 성공적으로 입력되었습니다!");

                // 해당 주소에 대한 좌표를 받아서
                var xx = parseFloat(items[0].point.x);
                var yy = parseFloat(items[0].point.y);
                g_inputReservoirLocation = xx.toFixed(6).toString() + " / " + yy.toFixed(6).toString();
            }
            catch (e) {
                console.log("주소 에러");
                toastMessage("주소오류! 정확한 네이버 주소를 입력하세요");
            }
        }  // else
    });
}


function sample5_execDaumPostcode(address) {
    var geocoder = new daum.maps.services.Geocoder();

    /*
    naver.maps.Service.geocode({
        address: '장팔리 1023'
    }, function(status, response) {
        if (status !== naver.maps.Service.Status.OK) {
            console.log('Something wrong!');
        }
        else {
            var result = response.result; // 검색 결과의 컨테이너
            var items = result.items; // 검색 결과의 배열
        }
    });
    */


    new daum.Postcode({
        oncomplete: function (data) {
            var addr = data.address;         // 최종 주소 변수

            // 주소 정보를 해당 필드에 넣는다.
            document.getElementById("inputReservoirAddress").value = addr;
            // 주소로 상세 정보를 검색
            geocoder.addressSearch(data.address, function (results, status) {
                // 정상적으로 검색이 완료됐으면
                if (status === daum.maps.services.Status.OK) {

                    var result = results[0]; //첫번째 결과의 값을 활용

                    // 해당 주소에 대한 좌표를 받아서
                    var coords = new daum.maps.LatLng(result.y, result.x);
                    var xx = parseFloat(result.x);
                    var yy = parseFloat(result.y);
                    g_inputReservoirLocation = xx.toFixed(6).toString() + " / " + yy.toFixed(6).toString();
                    //document.getElementById('inputReservoirLocation').value = xx.toFixed(6).toString() + " / " + yy.toFixed(6).toString();
                }
            });
        },
        onclose: function (state) {
            //state는 우편번호 찾기 화면이 어떻게 닫혔는지에 대한 상태 변수 이며, 
            //상세 설명은 아래 목록에서 확인
            if (state === 'FORCE_CLOSE') {
                //사용자가 브라우저 닫기 버튼을 통해 팝업창을 닫았을 경우, 
                //실행될 코드를 작성하는 부분

                // 마지막 edit한 주소를 알 수가 없음

            } else if (state === 'COMPLETE_CLOSE') {
                //사용자가 검색결과를 선택하여 팝업창이 닫혔을 경우, 
                //실행될 코드를 작성하는 부분
                //oncomplete 콜백 함수가 실행 완료된 후에 실행
            }
        }
    }).open(
        {
            q: address
        }
    );
}

// element 선택
function selectElement(id, valueToSelect) {
    let element = document.getElementById(id);
    element.value = valueToSelect;
}

// blank 행을 추가
function addBlankReservoir() {
    addEditReservoir = MODE_ADD;       // MODE_ADD   

    selectElement("inputReservoirName", "");
    selectElement("inputReservoirManageid", "");
    selectElement("inputReservoirAddress", "");
    selectElement("inputReservoirRsvtype", "0");

    selectElement("inputReservoirLevelmin", "");
    selectElement("inputReservoirLevelfull", "");
    selectElement("inputReservoirLevelover", "");
    selectElement("inputReservoirHeight", "");
    selectElement("inputReservoirEffquan", "");

    selectElement("inputReservoirIncharge", "");

    selectElement("inputDeviceMacid", "");
    selectElement("inputDevicePhone", "");
    selectElement("inputDeviceComminterval", "");
    selectElement("inputDeviceWaittime", "");
    selectElement("inputDeviceKeeptime", "");
    selectElement("inputReservoirPrange", "");
    selectElement("inputReservoirSenseadd", "");
    selectElement("inputReservoirLeveladd", "");

    var i = idTableReservoir2.rows().count();
    idTableReservoir2.row.add([
        '<input class="form-check-input" style="margin-left:0px;" type="radio" id="idRsv2Radio' + i + '">',
        (i + 1),
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        ""
    ]).draw();

    setTimeout(() => {
        // 마지막 거 자동 선택
        idTableReservoir2SelectedRow = idTableReservoir2.rows().count() - 1;
        for (var i = 0; i < idTableReservoir2.rows().count(); i++) {
            if (i == idTableReservoir2SelectedRow) $("#idRsv2Radio" + i).prop("checked", true);
            else $("#idRsv2Radio" + i).prop("checked", false);
        }
        var msg = "저수지 " + (idTableReservoir2SelectedRow + 1).toString() + "번을 추가하여 편집합니다!";
        toastMessage(msg);
    }, 200);


    return true;
}

function makeBlankReservoir() {
    selectElement("inputReservoirName", "");
    selectElement("inputReservoirManageid", "");
    selectElement("inputReservoirAddress", "");
    selectElement("inputReservoirRsvtype", "0");

    selectElement("inputReservoirLevelmin", "");
    selectElement("inputReservoirLevelfull", "");
    selectElement("inputReservoirLevelover", "");
    selectElement("inputReservoirHeight", "");
    selectElement("inputReservoirEffquan", "");

    selectElement("inputReservoirIncharge", "");

    selectElement("inputDeviceMacid", "");
    selectElement("inputDevicePhone", "");
    selectElement("inputDeviceComminterval", "");
    selectElement("inputDeviceWaittime", "");
    selectElement("inputDeviceKeeptime", "");
    selectElement("inputReservoirPrange", "");
    selectElement("inputReservoirSenseadd", "");
    selectElement("inputReservoirLeveladd", "");
}


// 테이블에는 업데이트하고, db에는 추가한다...
function addReservoir() {

    var inputReservoirName = document.getElementById('inputReservoirName').value;
    var inputReservoirManageid = document.getElementById('inputReservoirManageid').value;
    var inputReservoirAddress = document.getElementById('inputReservoirAddress').value;
    var inputReservoirRsvtype = document.getElementById('inputReservoirRsvtype').value;

    var inputReservoirLocation = g_inputReservoirLocation;
    //document.getElementById('inputReservoirLocation').value;
    var inputReservoirLevelmin = document.getElementById('inputReservoirLevelmin').value;
    var inputReservoirLevelfull = document.getElementById('inputReservoirLevelfull').value;
    var inputReservoirLevelover = document.getElementById('inputReservoirLevelover').value;

    var inputReservoirHeight = document.getElementById('inputReservoirHeight').value;
    var inputReservoirEffquan = document.getElementById('inputReservoirEffquan').value;

    var inputReservoirIncharge = document.getElementById('inputReservoirIncharge').value;

    var inputDeviceMacid = document.getElementById('inputDeviceMacid').value;
    var inputDevicePhone = document.getElementById('inputDevicePhone').value;
    // 0621 : 수정 ... 반드시 초기값 "0"이어애 함
    var inputDeviceTelecom = "0";
    //document.getElementById('inputDeviceTelecom').value;
    var inputDeviceSwver = "";
    //document.getElementById('inputDeviceSwver').value;

    var inputDeviceComminterval = document.getElementById('inputDeviceComminterval').value;
    var inputDeviceCommlast = "";
    var inputDeviceWaittime = document.getElementById('inputDeviceWaittime').value;
    var inputDeviceKeeptime = document.getElementById('inputDeviceKeeptime').value;

    var inputReservoirPrange = document.getElementById('inputReservoirPrange').value;
    var inputReservoirSenseadd = document.getElementById('inputReservoirSenseadd').value;
    var inputReservoirLeveladd = document.getElementById('inputReservoirLeveladd').value;

    if ((inputReservoirName == "") || (inputReservoirManageid == "") || (inputReservoirAddress == "") || (inputReservoirRsvtype == "") || (inputReservoirLocation == "") ||
        (inputReservoirLevelmin == "") || (inputReservoirLevelfull == "") || (inputReservoirLevelover == "") || (inputReservoirHeight == "") || (inputReservoirEffquan == "") ||
        (inputReservoirIncharge == "") || (inputDeviceMacid == "") || (inputDevicePhone == "") || (inputDeviceTelecom == "") || (inputDeviceComminterval == "") ||
        (inputDeviceWaittime == "") || (inputDeviceKeeptime == "") || (inputReservoirPrange == "") || (inputReservoirSenseadd == "") || (inputReservoirLeveladd == "")) {
        toastMessage("빈칸이 있습니다. 모두 채우시기 바랍니다!");
        return false;
    }

    if (!isEmpty(reservoir)) {
        // 지점, 관리번호가 같은 것이 있는지 확인
        for (var i = 0; i < reservoir.length; i++) {
            if (inputReservoirName == reservoir[i].name) {
                toastMessage("지점이름이 동일합니다. 확인하세요!");
                return false;
            }
        }
        for (var i = 0; i < reservoir.length; i++) {
            if (inputReservoirManageid == reservoir[i].manageid) {
                toastMessage("관리번호가 동일합니다. 확인하세요!");
                return false;
            }
        }
        // findXy(inputReservoirLocation);
        var temp = findXy(inputReservoirLocation);
        if ((temp[0] == 0) || (temp[1] == 0)) {
            toastMessage("주소를 입력 후 반드시 엔터를 누르세요!");
            return false;
        }
        // 0913
        toastMessage(inputReservoirName + "이(가) 추가됩니다!");
    }

    var temp;
    if (!isEmpty(reservoir)) temp = reservoir[reservoir.length - 1].id + 1;   // 제일 큰 id보다 1크게 ...
    else temp = 0;
    var latlng = findXy(inputReservoirLocation);
    reservoir.push({
        id: temp,
        name: inputReservoirName,
        manageid: inputReservoirManageid,
        address: inputReservoirAddress,
        rsvtype: inputReservoirRsvtype,
        x: latlng[0],
        y: latlng[1],
        levelmin: inputReservoirLevelmin,
        levelfull: inputReservoirLevelfull,
        levelover: inputReservoirLevelover,
        height: inputReservoirHeight,
        effquan: inputReservoirEffquan,
        incharge: inputReservoirIncharge,
        macid: inputDeviceMacid,
        phone: inputDevicePhone,
        telecom: inputDeviceTelecom,
        swversion: inputDeviceSwver,
        comminterval: inputDeviceComminterval,
        commlast: inputDeviceCommlast,
        waittime: inputDeviceWaittime,
        keeptime: inputDeviceKeeptime,
        senseadd: inputReservoirSenseadd,
        leveladd: inputReservoirLeveladd,
        prange: inputReservoirPrange,
        act1open: 0,         // 0618 act1open이 null이 되어 reseroir가 추가되지 않는 문제 해결
        regdate: sNow3()
    });

    // reservoir index와 reservoir table index 숫자가 다르다
    // 추가시에는 manageid가 아직 table에 반영이 안되었으므로, option을 통해서 direct loading ...
    var i = findReservoir2Index(idTableReservoir2SelectedRow, 1);

    var newData = [
        '<input class="form-check-input" style="margin-left:0px;" type="radio" id="idRsv2Radio' + idTableReservoir2SelectedRow + '">',
        idTableReservoir2SelectedRow + 1,
        reservoir[i].name,
        reservoir[i].manageid,
        reservoir[i].address,
        reservoir[i].rsvtype,
        //reservoir[i].x + " / " + reservoir[i].y,
        reservoir[i].levelmin,
        reservoir[i].levelfull,
        reservoir[i].levelover,
        // 2023-0523
        reservoir[i].height,
        reservoir[i].effquan,
        reservoir[i].prange,
        reservoir[i].senseadd,
        reservoir[i].leveladd,
        reservoir[i].incharge,
        reservoir[i].macid,
        reservoir[i].phone,
        reservoir[i].comminterval,
        reservoir[i].commlast,
        reservoir[i].waittime,
        reservoir[i].regdate
    ];
    idTableReservoir2.row(idTableReservoir2SelectedRow).data(newData).draw();

    // db에 반영
    //idTableReservoir2SelectedRow ++;
    // 수정: 맨 마지막 row가 선택되도록
    var inx = findReservoir2Index(idTableReservoir2SelectedRow);
    if (inx >= 0) {
        var data = stringifyReservoirInfo(inx);    // i : index of selected User
        var message = { "sender": subTopic, "data": data };
        clientPublish(pubTopic, "RESERVOIR_ADD=" + JSON.stringify(message) + ";");

        toastMessage("저수지가 추가 되었습니다!");

        // 1218-1
        // 추가가 되고 난 이후에는 자동으로 unselect
        idTableReservoir2SelectedRow = -1;
        makeBlankReservoir();
    }

    return true;
}




function delReservoir() {
    var index = findReservoir2Index(idTableReservoir2SelectedRow);
    if (index >= 0) {
        var name = reservoir[index].name;
        var tempString1 = name + "의 지점정보를 삭제하시겠습니까?";

        $.confirm({
            title: '확인!',
            content: tempString1,
            type: 'red',
            typeAnimated: true,
            boxWidth: '25%',
            useBootstrap: true,
            buttons: {
                formSubmit: {
                    text: '확인',
                    btnClass: 'btn-blue',
                    action: function () {

                        var data = stringifyReservoirInfo(index);    // i : index of selected User
                        var message = { "sender": subTopic, "data": data };
                        clientPublish(pubTopic, "RESERVOIR_DEL=" + JSON.stringify(message) + ";");


                        // users 정보를 삭제
                        // jjk2
                        reservoir.splice(index, 1);
                        drawReservoirTable();
                        // db에서 삭제
                        // jjk3

                        toastMessage("지점정보가 삭제 되었습니다!");
                    }
                },
                cancel: {
                    text: '취소',
                    action: function () {
                        toastMessage("취소가 선택");

                    }
                }
            },
            onContentReady: function () {
                // bind to events
                var jc = this;
                this.$content.find('form').on('submit', function (e) {
                    // if the user submits the form by pressing enter in the field.
                    e.preventDefault();
                    jc.$$formSubmit.trigger('click'); // reference the button and click it
                });
            }
        });

    }
}


// edit
function editReservoir() {
    addEditReservoir = MODE_EDIT;

    // 편집을 위해 위로 복사 ...
    pasteTodivs("reservoir", editSelectedReservoir);
}

function saveReservoir() {
    // 편집인 경우 ...
    if (addEditReservoir == MODE_EDIT) {
        var inx = findReservoir2Index(idTableReservoir2SelectedRow);
        if (inx >= 0) {
            var inputReservoirName = document.getElementById('inputReservoirName').value;
            var inputReservoirManageid = document.getElementById('inputReservoirManageid').value;
            var inputReservoirLocation = g_inputReservoirLocation;
            //document.getElementById('inputReservoirLocation').value;


            var latlng = findXy(inputReservoirLocation);

            reservoir[inx].name = document.getElementById('inputReservoirName').value;
            reservoir[inx].manageid = document.getElementById('inputReservoirManageid').value;
            reservoir[inx].address = document.getElementById('inputReservoirAddress').value;
            reservoir[inx].rsvtype = document.getElementById('inputReservoirRsvtype').value;

            reservoir[inx].x = latlng[0];
            reservoir[inx].y = latlng[1];

            reservoir[inx].levelmin = document.getElementById('inputReservoirLevelmin').value;
            reservoir[inx].levelfull = document.getElementById('inputReservoirLevelfull').value;
            reservoir[inx].levelover = document.getElementById('inputReservoirLevelover').value;

            reservoir[inx].height = document.getElementById('inputReservoirHeight').value;
            reservoir[inx].effquan = document.getElementById('inputReservoirEffquan').value;

            reservoir[inx].prange = document.getElementById('inputReservoirPrange').value;
            reservoir[inx].senseadd = document.getElementById('inputReservoirSenseadd').value;
            reservoir[inx].leveladd = document.getElementById('inputReservoirLeveladd').value;

            reservoir[inx].incharge = document.getElementById('inputReservoirIncharge').value;
            reservoir[inx].macid = document.getElementById('inputDeviceMacid').value;
            reservoir[inx].phone = document.getElementById('inputDevicePhone').value;
            //reservoir[inx].telecom = document.getElementById('inputDeviceTelecom').value;
            //[inx].swversion = document.getElementById('inputDeviceSwver').value;

            reservoir[inx].comminterval = document.getElementById('inputDeviceComminterval').value;
            //reservoir[inx].commlast = document.getElementById('inputDeviceCommlast').value;
            reservoir[inx].waittime = document.getElementById('inputDeviceWaittime').value;
            reservoir[inx].keeptime = document.getElementById('inputDeviceKeeptime').value;


            reservoir[inx].regdate = sNow3();

            drawReservoirTable();

            // db를 update
            // jjk3
            var data = stringifyReservoirInfo(inx);    // i : index of selected User
            var message = { "sender": subTopic, "data": data };
            clientPublish(pubTopic, "RESERVOIR_UPDATE=" + JSON.stringify(message) + ";");
            toastMessage("정보가 저장 완료되었습니다!");

            // 1218-1
            // 추가가 되고 난 이후에는 자동으로 unselect
            idTableReservoir2SelectedRow = -1;
            makeBlankReservoir();

        }
    }
    // 새로이 추가 ...
    else if (addEditReservoir == MODE_ADD) {
        addReservoir();
    }
}

function findXy(a) {
    if (a == undefined) return [0, 0];
    var inx = a.indexOf("/");

    // If there is none, exit
    if (inx < 0) return [0, 0];
    var pos1 = parseFloat(a.substring(0, inx));
    var pos2 = parseFloat(a.substring(inx + 1));

    return [pos1, pos2];
}


// Table에 있는 것 중에서 동일한 것을 찾음 => 사용안함
// manageid로 찾음
function findReservoir2Index(selectedRow, option) {
    // 1218-3
    var manageid = idTableReservoir2.cell({ row: selectedRow, column: 3 }).data();
    // manageid를 편집 div에서 강제로 로딩
    if (option == 1) {
        manageid = document.getElementById('inputReservoirManageid').value;
    }

    var matchedIndex = -1;
    for (var i = 0; i < reservoir.length; i++) {
        if (manageid == reservoir[i].manageid) matchedIndex = i;
    }

    return matchedIndex;
}


function findReservoirIndex(selectedRow) {
    // 1219
    var manageid = idTableReservoir.cell({ row: selectedRow, column: 3 }).data();

    var matchedIndex = -1;
    for (var i = 0; i < reservoir.length; i++) {
        if (manageid == reservoir[i].manageid) matchedIndex = i;
    }

    return matchedIndex;
}


function findManageidFromReservoir(macid) {
    var matchedIndex = -1;

    for (var i = 0; i < reservoir.length; i++) {
        if (macid == reservoir[i].macid) matchedIndex = i;
    }

    if (matchedIndex >= 0) return reservoir[matchedIndex].manageid;
    else return "";
}

function findNameFromReservoir(macid) {
    var matchedIndex = -1;

    for (var i = 0; i < reservoir.length; i++) {
        if (macid == reservoir[i].macid) matchedIndex = i;
    }

    if (matchedIndex >= 0) return reservoir[matchedIndex].name;
    else return "";
}

function findIndexFromReservoir(macid) {
    var matchedIndex = -1;

    for (var i = 0; i < reservoir.length; i++) {
        if (macid == reservoir[i].macid) matchedIndex = i;
    }

    if (matchedIndex >= 0) return matchedIndex;
    else return -1;
}

function stringifyReservoirInfo(index) {
    var temp = {
        "id": reservoir[index].id,
        "name": reservoir[index].name,
        "manageid": reservoir[index].manageid,
        "address": reservoir[index].address,
        "rsvtype": reservoir[index].rsvtype,
        "x": reservoir[index].x,
        "y": reservoir[index].y,
        "levelmin": reservoir[index].levelmin,
        "levelfull": reservoir[index].levelfull,
        "levelover": reservoir[index].levelover,
        // 2023-0523
        "height": reservoir[index].height,
        "effquan": reservoir[index].effquan,

        "incharge": reservoir[index].incharge,
        "macid": reservoir[index].macid,
        "phone": reservoir[index].phone,
        "telecom": reservoir[index].telecom,
        "swversion": reservoir[index].swversion,
        "comminterval": reservoir[index].comminterval,
        "commlast": reservoir[index].commlast,
        "waittime": reservoir[index].waittime,
        "senseadd": reservoir[index].senseadd,
        "leveladd": reservoir[index].leveladd,
        "prange": reservoir[index].prange,
        "act1open": reservoir[index].act1open,
        "regdate": reservoir[index].regdate,
        "keeptime": reservoir[index].keeptime
    }

    return JSON.stringify(temp);
}



// --------------------------------------------------------------------------------------------------------------
// reservoir
// --------------------------------------------------------------------------------------------------------------


function koreanNow() {
    var date = new Date();

    var year = date.getFullYear();
    var month = (1 + date.getMonth());
    var day = date.getDate();
    var hour = (date.getHours());
    var minute = (date.getMinutes());
    var second = (date.getSeconds());

    return year + "년 " + month + "월 " + day + "일   " + hour + ':' + minute + ':' + second;
}

function compareTime(myDate) {
    //  year + "-" + month + "-" + day + " " + hour + ':' + minute + ':' + second;
    var year, month, day, hour, minute, second;
    var inx;

    inx = myDate.indexOf("-");
    year = myDate.substring(0, inx);
    myDate = myDate.substring(inx + 1);

    inx = myDate.indexOf("-");
    month = myDate.substring(0, inx);
    myDate = myDate.substring(inx + 1);

    inx = myDate.indexOf(" ");
    day = myDate.substring(0, inx);
    myDate = myDate.substring(inx + 1);

    inx = myDate.indexOf(":");
    hour = myDate.substring(0, inx);
    myDate = myDate.substring(inx + 1);

    inx = myDate.indexOf(":");
    minute = myDate.substring(0, inx);
    second = myDate.substring(inx + 1);


    var time1 = parseInt(hour * 3600) + parseInt(minute) * 60 + parseInt(second) + reservoir[selectedReservoir].comminterval * 60 - 180; // 90초 동안은 현재 reservoir update를 기다림
    var date = new Date();
    var year2 = date.getFullYear();
    var month2 = ("0" + (1 + date.getMonth())).slice(-2);
    var day2 = ("0" + date.getDate()).slice(-2);

    var time2 = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
    // 300

    // 판단
    if ((day == day2) && (month == month2) && (year == year2)) {
        if (time1 > time2) return 1;
        else return 0;
    }
    else {
        return 0;
    }
}

function sNow() {
    var date = new Date();

    var year = date.getFullYear();
    var month = ("0" + (1 + date.getMonth())).slice(-2);
    var day = ("0" + date.getDate()).slice(-2);
    var hour = ("0" + date.getHours()).slice(-2);
    var minute = ("0" + date.getMinutes()).slice(-2);
    var second = ("0" + date.getSeconds()).slice(-2);

    return year + "-" + month + "-" + day + " " + hour + ':' + minute + ':' + second;

}

function sNow2(index) {
    date = new Date(2019, 0, 1);
    date.setMinutes(date.getMinutes() + index * 5); // 5분씩 증가

    var year = date.getFullYear();
    var month = ("0" + (1 + date.getMonth())).slice(-2);
    var day = ("0" + date.getDate()).slice(-2);
    var hour = ("0" + date.getHours()).slice(-2);
    var minute = ("0" + date.getMinutes()).slice(-2);
    var second = ("0" + date.getSeconds()).slice(-2);

    return year + "-" + month + "-" + day + " " + hour + ':' + minute + ':' + second;
}

function sNow3() {
    var date = new Date();

    var year = date.getFullYear();
    var month = ("0" + (1 + date.getMonth())).slice(-2);
    var day = ("0" + date.getDate()).slice(-2);
    var hour = ("0" + date.getHours()).slice(-2);
    var minute = ("0" + date.getMinutes()).slice(-2);
    var second = ("0" + date.getSeconds()).slice(-2);

    return year + "-" + month + "-" + day;

}

function timeDuration(old) {
    var date = new Date();

    var hour = date.getHours() - old.getHours();
    var minute = date.getMinutes() - old.getMinutes();
    var second = date.getSeconds() - old.getSeconds();

    return hour + '시간 ' + minute + '분 ' + second + '초';
}

function printDebug(message) {
    message += " AT " + sNow();
    // console.log(message);
}
function printDebugYH(message) {
    message += " AT " + sNow();
    console.log(message);
}


/*
// jjk7
// 각 sensor별로 data를 만듬
// 서버에 전송 : 서버는 이 데이터를 받으면, 기존의 데이터를 모두 지우고, 업데이트한다
function simulate() {
    
    
    $.confirm({
        title: '확인!',
        content: "데이터를 생성하시겠습니까?",
        type: 'red',
        typeAnimated: true,
        boxWidth: '25%',
        useBootstrap: true,
        buttons: {
            formSubmit: {
                text: '확인',
                btnClass: 'btn-blue',
                action: function () {
                    toastMessage("생성 시작!");
                    setTimeout(() => {
                        makeData();
                    }, 3000);
                }
            },
            cancel: {
                text: '취소',
                action: function () {
                    toastMessage("취소가 선택");

                }
            }
        },
        onContentReady: function () {
            // bind to events
            var jc = this;
            this.$content.find('form').on('submit', function (e) {
                // if the user submits the form by pressing enter in the field.
                e.preventDefault();
                jc.$$formSubmit.trigger('click'); // reference the button and click it
            });
        }
    });
}
*/


/*
function makeData() {
    var sense;
    var level;
    var temp;
    var voltage;
    var open;
    var opentime;
    var temptime;
    var id;
    var string1;

    // 모든 sensor ...
    for (var i=0;i<reservoir.length;i++) {
        id = reservoir[i].manageid;
        string1 = "";
        // 5분 기준(1시간12개) : 12x24x365x2=210,240(0.2MBytes)x60bytes=12Mbytes
        for (var j=0;j<210240;j++) {
            sense = 0.0;
            level = ((Math.random()*(reservoir[i].levelfull - reservoir[i].levelmin)) + reservoir[i].levelmin).toFixed(2);
            temp = randomGen(20.0, 40.0);
            voltage = randomGen(10.0, 12.0);
            open = randomGen(0.0, 100.0);
            opentime = sNow2(j);
            string1 += id.toString() + "," + sense.toString() + "," + level.toString() + ","  + temp.toString() + ","  + voltage.toString() + "," 
                        + open.toString() + ","  + opentime.toString() + "#";
        }
        console.log("size=" + string1.length);
        // data 전송 to server ...
    }
    toastMessage("데이터 생성 완료!");
}
*/


// 모든 등록된 device에 대한 simulation 값을 발생시킴
function simulateDevice() {
    if (!isEmpty(reservoir)) {
        for (var i = 0; i < reservoir.length; i++) {
            // data를 전송
            // sense값 최대가 25이지만 35까지 전송
            var senseValue = (randomGen(4.0, 25.0) / 20.0 * reservoir[i].prange).toString();
            // String temp =  "SENSE=" + macid + "," + watersense + "," + temperature + "," + voltage + "," + comtime + "," + act1open + "," + act1open_current;
            var temp = reservoir[i].macid + "," + senseValue + "," + randomGen(20.0, 40.0) + "," + randomGen(10.0, 12.0) + "," + "0" + "," + "30" + "," + "20";
            console.log(temp);
            // jjk003
            var message = { "sender": subTopic, "data": temp };
            // test
            clientPublish(pubTopic, "SENSE=" + JSON.stringify(message) + ";");
        }
    }
}

// 각종 경보를 표시 ...
function checkWarnings() {
    if (!isEmpty(reservoir)) {
        //console.log("Check warnings ...")
        // 006
        wlevelWarnings = [];
        openWarnings = [];
        batteryWarnings = [];
        actuatorWarnings = [];
        for (var i = 0; i < reservoir.length; i++) {
            var inx = findIndexFromSenses(reservoir[i].macid);
            // sense가 존재하는 경우 ...
            if (inx >= 0) {
                // 1) 만수위 check : Device에서 만수위가 2분이상 유지될 경우 발생하므로, web에서는 즉각 표시한다
                // 마지막 수위값을 읽어서 비교함
                // 0622 : 여기서 error가 나는 경우 통신에러로 이어짐?
                var wlevel = (senses[inx].waterlevel);
                // 0622
                if (wlevel > reservoir[i].levelfull) {
                    wlevelWarnings.push({
                        id: reservoir[i].id,
                        name: reservoir[i].name,
                        manageid: reservoir[i].manageid,
                        address: reservoir[i].address,
                        wlevel: wlevel,
                        levelfull: reservoir[i].levelfull,
                        sensetime: senses[inx].sensetime
                    });
                }
                // 2) 수문이 열려있는 장소 표현
                // 2022-0102-1
                var act1open_current = senses[inx].act1open_current;
                // 조금이라도 열려 있으면 ...
                //if (act1open_current>0.1) {
                if (act1open_current > 1.0) {
                    openWarnings.push({
                        id: reservoir[i].id,
                        name: reservoir[i].name,
                        manageid: reservoir[i].manageid,
                        address: reservoir[i].address,
                        act1open: reservoir[i].act1open,
                        act1open_current: senses[inx].act1open_current,
                        sensetime: senses[inx].sensetime
                    });
                }
                // 3) 전압이 8V의 110%인 8.8V보다 작은 경우
                // 0622
                var voltage = (senses[inx].voltage);
                if (voltage < 8.8) {
                    batteryWarnings.push({
                        id: reservoir[i].id,
                        name: reservoir[i].name,
                        manageid: reservoir[i].manageid,
                        address: reservoir[i].address,
                        voltage: voltage,
                        sensetime: senses[inx].sensetime
                    });
                }
                // 4) actuator warning의 조건
                // 0825 : waittime을 분으로 변경
                if (!similarCheck(senses[inx].act1open, senses[inx].act1open_current)
                    && (senses[inx].act1opentime > (reservoir[i].waittime * 60))) {
                    actuatorWarnings.push({
                        id: reservoir[i].id,
                        name: reservoir[i].name,
                        manageid: reservoir[i].manageid,
                        address: reservoir[i].address,
                        act1open: senses[inx].act1open,
                        act1open_current: senses[inx].act1open_current,
                        waittime: senses[inx].waittime,
                        sensetime: senses[inx].sensetime,
                        fault: senses[inx].fault
                    });
                }
            }
        }

        // test
        //console.log("--------------------------------------------------------------------------------------\n");
        //console.log("#of warnings : " + wlevelWarnings.length);
        // display warning 
        if (!isEmpty(wlevelWarnings)) document.getElementById('idWlevelWarning').innerHTML = wlevelWarnings.length.toString();
        else document.getElementById('idWlevelWarning').innerHTML = "0";
        if (!isEmpty(openWarnings)) document.getElementById('idOpenWarning').innerHTML = openWarnings.length.toString();
        else document.getElementById('idOpenWarning').innerHTML = "0";
        if (!isEmpty(batteryWarnings)) document.getElementById('idBatteryWarning').innerHTML = batteryWarnings.length.toString();
        else document.getElementById('idBatteryWarning').innerHTML = "0";
        if (!isEmpty(actuatorWarnings)) document.getElementById('idActuatorWarning').innerHTML = actuatorWarnings.length.toString();
        else document.getElementById('idActuatorWarning').innerHTML = "0";
    }
}


function similarCheck(a, b) {
    if ((a > (b + 0.1)) || (a < (b - 0.1))) return false;
    else return true;
}
// jjk005
function findIndexFromSenses(macid) {
    // senses.length-1 틀리면 error
    for (var i = (senses.length - 1); i >= 0; i--) {
        if (macid == senses[i].macid) {
            return i;
            break;
        }
    }
    return -1;
}
function findLatestWlevel(macid) {
    // senses.length-1 틀리면 error
    for (var i = (senses.length - 1); i >= 0; i--) {
        if (macid == senses[i].macid) {
            return senses[i].waterlevel;
            break;
        }
    }
    return -1;
}

function randomGen(min, max) {
    return ((max - min) * Math.random() + min).toFixed(1);
}


// jjk8
// --------------------------------------------------------------------------------------------------------------
// user
// --------------------------------------------------------------------------------------------------------------
// table 그리기
function drawUsersTable() {
    //idTableUsers.clear().draw();

    // 이 문장이 있어야 초기화 경고가 나오지 않음
    if (idTableUsers) idTableUsers.destroy();
    idTableUsers = $('#idTableUsers').DataTable({
        "scrollX": true,     // test
        "scrollCollapse": true,
        "autoWidth": false,
        "paging": true,
        "ordering": true,
        "info": true,
        "filter": true,
        "lengthChange": true,
        "order": [[0, "asc"]],
        "stateSave": true,
        "pagingType": "full_numbers",
        "columnDefs": [
            { "className": "dt-center", "defaultContent": "-", "orderable": true, "targets": "_all" },
            {
                "targets": 0,
                "render": function (data, type, row, meta) {
                    var res = row[0];
                    return res;
                }
            }
        ]
    });
    idTableUsers.clear().draw();

    // 권한 2인 경우, 어느 compmany에 속하는지 조사
    var temp1 = localStorage.getItem("username");
    var temp2 = localStorage.getItem("passwd");

    var tempCompany = findCompany(temp1, temp2);
    var tIndex = 0;
    //setTimeout(() => {
    for (var i = 0; i < users.length; i++) {
        var flag = false;
        if (validationCheck == 3) {
            // 관리자 자신의 정보는 편집대상이 아님
            if (users[i].type != 3) flag = true;
        }
        // 2인 경우
        else if (validationCheck == 2) {
            if (tempCompany == users[i].company) {
                // 자신의 것과 더 위의 관리자의 것은 보이지 않음
                if (users[i].type < 2) flag = true;
            }
        }
        // 1인 경우 사용자 정보 기능이 원척적으로 안보임


        if (flag) {
            idTableUsers.row.add([
                '<input class="form-check-input" style="margin-left:0px;" type="radio" id="idUserRadio' + tIndex + '">',
                tIndex + 1,
                users[i].krname,
                users[i].name,
                users[i].passwd,
                users[i].type,
                users[i].company,
                users[i].phone,
                users[i].address,
                users[i].rsvSelected,
                users[i].regdate
            ]).draw();
            tIndex++;
        }
    }
    setTimeout(() => {
        idTableUsers.order([1, 'desc']).draw();
    }, 200);

    //}, 500);

    // 저수지 선택 https://www.educba.com/bootstrap-multiselect/
    if (!rsvMultiAdded) {
        rsvMultiAdded = true;
        for (var i = 0; i < reservoir.length; i++) {
            var option = document.createElement("option");
            option.text = reservoir[i].manageid + " " + reservoir[i].name;
            option.value = i.toString();
            var select = document.getElementById("rsvMulti");
            select.appendChild(option);
        }
    }


    $('#rsvMulti').multiselect({
        includeSelectAllOption: true,
        enableFiltering: true,
        enableCaseInsensitiveFiltering: true,
        buttonWidth: '100%',
        filterPlaceholder: 'Search Here..',
        onDropdownShow: function (event) {
            $(this).closest('select').css('width', '300px')
        }
    });

    // jjk1
    $('#idTableUsers').on('click', 'td', function () {
        idTableUsersSelectedRow = idTableUsers.cell(this).index().row;

        // 1218-1 : radio check는 자동으로 됨 ... 다른 선택은 모두 off시킴
        for (var i = 0; i < idTableUsers.rows().count(); i++) {
            if (i == idTableUsersSelectedRow) $("#idUserRadio" + i).prop("checked", true);
            else $("#idUserRadio" + i).prop("checked", false);
        }

        var index = findUserIndex(idTableUsersSelectedRow);
        // 1218-1
        editSelectedUser = index;
        var num = idTableUsers.cell({ row: idTableUsersSelectedRow, column: 1 }).data();
        // 0913 : jjk001
        toastMessage(num + "번 " + users[index].krname + "이(가)  선택되었습니다");
    });

    // 권한 2인 경우, company에 대한 편집 불가, 관리자 추가 불가
    if (validationCheck == 3) {
        document.getElementById('inputCompany').disabled = false;
        document.getElementById('userSelect').innerHTML = '<option value="0">일반 사용자</option>'
            + '<option value="1">관리자</option>';
    }
    else {
        document.getElementById('inputCompany').disabled = true;
        document.getElementById('userSelect').innerHTML = '<option value="0">일반 사용자</option>';
    }
}


function findCompany(user, passwd) {
    for (var i = 0; i < users.length; i++) {
        if ((user == users[i].name) && (passwd == users[i].passwd)) return users[i].company;
    }
    return "";
}


function addBlankUser() {
    addEditUser = MODE_ADD;       // MODE_ADD

    // 1219-1 : 일반 관리자가 일반 사용자 추가시, 회사명이 같이 되도록 조처해야 함
    // 같지 않은 경우, 나중에 조회가 되지않음
    // test
    console.log(users.length);

    selectElement("inputKrname", "");
    // 1219-1
    // 현재 일반 관리자로 로그인한 경우는 상위의 일반 관리자와 동일한 회사명을 기입 ...
    if (users[0].type == "2") {
        selectElement("inputCompany", users[0].company);
    }
    else selectElement("inputCompany", "");

    selectElement("inputPhone", "");
    selectElement("inputAddress", "");
    selectElement("inputEmail2", "");
    selectElement("inputPasswd2", "");

    var i = idTableUsers.rows().count();
    idTableUsers.row.add([
        '<input class="form-check-input" style="margin-left:0px;" type="radio" id="idUserRadio' + i + '">',
        (i + 1),
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        ""
    ]).draw();

    // db에 추가
    // jjk3
    // 0629 : bug
    //idTableUsersSelectedRow ++;
    setTimeout(() => {
        idTableUsersSelectedRow = idTableUsers.rows().count() - 1;
        for (var i = 0; i < idTableUsers.rows().count(); i++) {
            if (i == idTableUsersSelectedRow) $("#idUserRadio" + i).prop("checked", true);
            else $("#idUserRadio" + i).prop("checked", false);
        }
        var msg = "사용자 " + (idTableUsersSelectedRow + 1).toString() + "번을 추가하여 편집합니다!";
        toastMessage(msg);
    }, 200);

    return true;
}

function makeblankUser() {
    selectElement("inputKrname", "");
    selectElement("inputCompany", "");
    selectElement("inputPhone", "");
    selectElement("inputAddress", "");
    selectElement("inputEmail2", "");
    selectElement("inputPasswd2", "");
}


function addUser() {

    // inputEmail2
    var krname = document.getElementById('inputKrname').value;
    var company = document.getElementById('inputCompany').value;
    var phone = document.getElementById('inputPhone').value;
    var address = document.getElementById('inputAddress').value;

    var name2 = document.getElementById('inputEmail2').value;
    var passwd2 = document.getElementById('inputPasswd2').value;

    // 회사명은 check않음(일반 관리자 모드에서는 항상 blank이므로)
    if ((krname == "") || (phone == "") || (address == "") || (name2 == "") || (passwd2 == "")) {
        toastMessage("빈칸이 있습니다. 모두 채우시기 바랍니다!");
        return false;
    }

    // username, password가 같은 것이 있는지 확인
    for (var i = 0; i < users.length; i++) {
        if (name2 == users[i].name) {
            toastMessage("사용자명(Username)이 동일합니다. 확인하세요!");
            return false;
        }
    }
    for (var i = 0; i < users.length; i++) {
        if (passwd2 == users[i].passwd) {
            toastMessage("비밀번호(Password)가 동일합니다. 확인하세요!");
            return false;
        }
    }

    // 0913
    toastMessage("사용자 " + krname + "이(가) 추가 완료되었습니다!");

    var sel2 = parseInt(document.getElementById('userSelect').value);
    var selected = [];
    for (var option of document.getElementById('rsvMulti').options) {
        if (option.selected) {
            selected.push(option.value);
        }
    }

    // list에 추가
    var temp = "";
    for (var i = 0; i < selected.length; i++) {
        temp += reservoir[selected[i]].manageid;
        if (i != (selected.length - 1)) temp += ",";
    }
    var temp2 = sNow();
    var temp3 = users[users.length - 1].id + 1;   // 제일 큰 id보다 1크게 ...
    users.push({
        id: temp3,
        krname: krname,
        name: name2,
        passwd: passwd2,
        type: sel2 + 1,            // 1,2
        company: company,
        phone: phone,
        address: address,
        rsvSelected: temp,
        regdate: temp2,
        subTopic: "",
        login: 0,
        logtime: 0
    });

    // users index와 users table index 숫자가 다르다
    // 권한에 따라서 일부 안보임
    // users의 index
    var i = findUserIndex(idTableUsersSelectedRow, 1);
    var newData = [
        '<input class="form-check-input" style="margin-left:0px;" type="radio" id="idUserRadio' + idTableUsersSelectedRow + '">',
        idTableUsersSelectedRow + 1,
        users[i].krname,
        users[i].name,
        users[i].passwd,
        users[i].type,
        users[i].company,
        users[i].phone,
        users[i].address,
        users[i].rsvSelected,
        users[i].regdate
    ];
    idTableUsers.row(idTableUsersSelectedRow).data(newData).draw();


    var inx = findUserIndex(idTableUsersSelectedRow);
    if (inx >= 0) {
        var data = stringifyUsersInfo(inx);    // i : index of selected User
        var message = { "sender": subTopic, "data": data };
        clientPublish(pubTopic, "USER_ADD=" + JSON.stringify(message) + ";");

        toastMessage("사용자가 추가 되었습니다!");

        // 1218-1
        // 추가가 되고 난 이후에는 자동으로 unselect
        idTableUsersSelectedRow = -1;
        makeblankUser();
    }

    return true;
}



// jjk2
function delUser() {
    var index = findUserIndex(idTableUsersSelectedRow);
    if (index >= 0) {
        // 1222-1
        if (users[index].type == 3) {
            //if ((users[index].type==3)||((users[index].type==2))) {
            toastMessage("최상위 관리자 계정은 삭제할 수 없습니다!");
            return 1;
        }

        var tempString1 = users[index].krname + "의 사용자 정보를 삭제하시겠습니까?";

        $.confirm({
            title: '확인!',
            content: tempString1,
            type: 'red',
            typeAnimated: true,
            boxWidth: '25%',
            useBootstrap: true,
            buttons: {
                formSubmit: {
                    text: '확인',
                    btnClass: 'btn-blue',
                    action: function () {
                        var data = stringifyUsersInfo(index);    // i : index of selected User
                        var message = { "sender": subTopic, "data": data };
                        // test
                        clientPublish(pubTopic, "USER_DEL=" + JSON.stringify(message) + ";");

                        // users 정보를 삭제
                        // jjk2
                        // test
                        users.splice(index, 1);
                        drawUsersTable();
                        // db에서 삭제
                        // jjk3

                        toastMessage("사용자가 삭제 되었습니다!");
                    }
                },
                cancel: {
                    text: '취소',
                    action: function () {
                        toastMessage("취소가 선택");

                    }
                }
            },
            onContentReady: function () {
                // bind to events
                var jc = this;
                this.$content.find('form').on('submit', function (e) {
                    // if the user submits the form by pressing enter in the field.
                    e.preventDefault();
                    jc.$$formSubmit.trigger('click'); // reference the button and click it
                });
            }
        });

    }
}

// edit
function editUser() {
    addEditUser = MODE_EDIT;

    // 편집을 위해 위로 복사 ...
    pasteTodivs("user", editSelectedUser);
}




function saveUser() {
    // 편집인 경우 ...
    if (addEditUser == MODE_EDIT) {
        var inx = findUserIndex(idTableUsersSelectedRow);
        if (inx >= 0) {
            //var inx = findUserIndex(idTableUsersSelectedRow);
            var name2 = document.getElementById('inputEmail2').value;
            var passwd2 = document.getElementById('inputPasswd2').value;
            // username, password가 같은 것이 있는지 확인
            var checkFlag = false;
            for (var i = 0; i < users.length; i++) {
                if (name2 == users[i].name) {
                    checkFlag = true;
                    if (i != inx) {
                        toastMessage("사용자명(Username)이 동일합니다. 확인하세요!");
                        return false;
                    }
                }
            }
            // 변경인데 user name이 변경된 경우
            if (!checkFlag) {
                toastMessage("사용자명을 변경하고자 하는 경우, 해당 정보를 지우고 다시 추가하세요!");
                return false;
            }
            checkFlag = false;
            for (var i = 0; i < users.length; i++) {
                if (passwd2 == users[i].passwd) {
                    checkFlag = true;
                    if (i != inx) {
                        toastMessage("비밀번호(Password)가 동일합니다. 확인하세요!");
                        return false;
                    }
                }
            }

            // inputEmail2
            users[inx].krname = document.getElementById('inputKrname').value;
            users[inx].company = document.getElementById('inputCompany').value;
            users[inx].phone = document.getElementById('inputPhone').value;
            users[inx].address = document.getElementById('inputAddress').value;

            users[inx].name = document.getElementById('inputEmail2').value;
            users[inx].passwd = document.getElementById('inputPasswd2').value;
            users[inx].type = parseInt(document.getElementById('userSelect').value) + 1;

            var sel2 = parseInt(document.getElementById('userSelect').value);
            var selected = [];
            for (var option of document.getElementById('rsvMulti').options) {
                if (option.selected) {
                    selected.push(option.value);
                }
            }
            var temp = "";
            for (var i = 0; i < selected.length; i++) {
                temp += reservoir[selected[i]].manageid;
                if (i != (selected.length - 1)) temp += ",";
            }
            users[inx].rsvSelected = temp;

            drawUsersTable();

            // db를 update
            // jjk3
            var data = stringifyUsersInfo(inx);    // i : index of selected User
            var message = { "sender": subTopic, "data": data };
            clientPublish(pubTopic, "USER_UPDATE=" + JSON.stringify(message) + ";");
            toastMessage("사용자 정보가 저장 완료되었습니다");

            // 1218-1
            // 추가가 되고 난 이후에는 자동으로 unselect
            idTableUsersSelectedRow = -1;
            makeblankUser();
        }
    }
    // 새로이 추가 ...
    else if (addEditUser == MODE_ADD) {
        addUser();
    }
}

function stringifyUsersInfo(index) {
    var user = {
        "krname": users[index].krname,
        "name": users[index].name,
        "passwd": users[index].passwd,
        "type": users[index].type,
        "company": users[index].company,
        "phone": users[index].phone,
        "address": users[index].address,
        "rsvSelected": users[index].rsvSelected,
        "regdate": users[index].regdate
    }

    return JSON.stringify(user);
}

// Table에 있는 것 중에서 동일한 것을 찾음
function findUserIndex(selectedRow, option) {
    // username
    var tempUsername = idTableUsers.cell({ row: selectedRow, column: 3 }).data();
    var tempPasswd = idTableUsers.cell({ row: selectedRow, column: 4 }).data();
    // manageid를 편집 div에서 강제로 로딩
    if (option == 1) {
        tempUsername = document.getElementById('inputEmail2').value;
        tempPasswd = document.getElementById('inputPasswd2').value;
    }

    var matchedIndex = -1;
    for (var i = 0; i < users.length; i++) {
        if ((tempUsername == users[i].name) && (tempPasswd == users[i].passwd)) return i;
    }

    return matchedIndex;
}


function imagesizeChanged() {
    console.log("image size changed ...");
    imageResolution = parseInt(document.getElementById("imageSizeSelect").value);

    updateGlobalOption();
    //if (globalOptionEnable) globalOptionUpdateRequested = true;
    // 060
}

// 1211
/*
function globalCommIntervalCheckedChanged() {
    console.log("checked changed ...");
    globalCommInterval = document.getElementById("globalCommIntervalChecked").checked;

    updateGlobalOption();
    //if (globalOptionEnable) globalOptionUpdateRequested = true;
}
*/

function globalCommIntervalCheckedChanged() {
    $.confirm({
        title: '확인',
        content: '변경 내용을 적용하시겠습니까?',
        type: 'red',
        typeAnimated: true,
        boxWidth: '25%',
        useBootstrap: true,
        buttons: {
            formSubmit: {
                text: '확인',
                btnClass: 'btn-blue',
                action: function () {

                    globalCommInterval = document.getElementById("globalCommIntervalChecked").checked;
                    updateGlobalOption();
                    toastMessage("적용 완료되었습니다!");
                }
            },
            cancel: {
                text: '취소',
                action: function () {
                    var temp = document.getElementById("globalCommIntervalChecked").checked;
                    // 원복 ...
                    if (temp) document.getElementById("globalCommIntervalChecked").checked = false;
                    else document.getElementById("globalCommIntervalChecked").checked = true;

                    toastMessage("취소 되었습니다!");

                }
            }
        },
        onContentReady: function () {
            // bind to events
            var jc = this;
            this.$content.find('form').on('submit', function (e) {
                // if the user submits the form by pressing enter in the field.
                e.preventDefault();
                jc.$$formSubmit.trigger('click'); // reference the button and click it
            });
        }
    });

}


function idGlobalCommIntervalChanged() {
    console.log("value changed ...");
    g_comminterval = parseInt(document.getElementById("idGlobalCommInterval").value);

    updateGlobalOption();
    //if (globalOptionEnable) globalOptionUpdateRequested = true;
}

function updateGlobalOption() {
    globalOptionUpdateRequested = true;

    if (globalOptionEnable) {
        var old = g_options;
        g_options = 0;
        if (globalCommInterval) g_options = 256;
        g_options += 512 * imageResolution + g_comminterval;

        if (old != g_options) {
            // 061
            var message = { "sender": subTopic, "data": g_options.toString() };
            clientPublish(pubTopic, "PUT_OPTION1=" + JSON.stringify(message) + ";");
            printDebug("Update Global options to DB ...");
        }
    }
}

function setOptions() {
    if (!globalOptionUpdateRequested) {
        var value = parseInt(reservoir[0].swversion);

        if ((value & 512) >= 512) {
            imageResolution = 1;
        }
        else imageResolution = 0;
        document.getElementById("imageSizeSelect").value = imageResolution.toString();

        if ((value & 256) >= 256) {
            globalCommInterval = true;
        }
        else globalCommInterval = false;
        document.getElementById("globalCommIntervalChecked").checked = globalCommInterval;

        g_comminterval = value & 255;
        document.getElementById("idGlobalCommInterval").value = g_comminterval.toString();
    }

}

// --------------------------------------------------------------------------------------------------------------
// user
// --------------------------------------------------------------------------------------------------------------


// --------------------------------------------------------------------------------------------------------------
// etc
// --------------------------------------------------------------------------------------------------------------
// message 표시
function toastMessage(msg) {
    // Get the snackbar DIV
    var x = document.getElementById("snackbar");

    // set content
    x.innerHTML = msg;
    // Add the "show" class to DIV
    x.className = "show";

    // After 3 seconds, remove the show class from DIV
    setTimeout(function () { x.className = x.className.replace("show", ""); }, 3000);
}

function toastMessage_wait(msg) {
    // Get the snackbar DIV
    var x = document.getElementById("snackbar");

    // set content
    x.innerHTML = msg;
    // Add the "show" class to DIV
    x.className = "show";

    // After 3 seconds, remove the show class from DIV
    //setTimeout(function(){ x.className = x.className.replace("show", ""); }, 3000);
    toast_wait_enabled = true;
}


// add toast snackbar
function add_snackbar() {
    var html = '<div id="snackbar"></div>';

    $('body').append($(html));

    // 1219 : toast가 table의 page 1 밑으로 보이는 현싱 제거 => 해결이 안됨
    //document.getElementById("snackbar").zindex = "50000";
}


function findItemsFromList(list) {
    var flag = true;
    var items = [];
    do {
        var inx = list.search(',');

        // If there is none, exit
        if (inx == -1) {
            flag = false;
            if (list) items.push(list);
        }
        else {
            // Get the complete message, minus the delimiter
            var s = list.substring(0, inx);
            items.push(s);
            list = list.substring(inx + 1);
        }
    } while (flag);

    return items;
}

function isSidebarOpen() {
    const div = document.querySelector('body');
    if (div.classList.contains('sb-sidenav-toggled')) {
        console.log('menu exist!')
    } else {
        console.log('No menu');

    }

    // redraw ...
    movePage();

}
// --------------------------------------------------------------------------------------------------------------
// etc
// --------------------------------------------------------------------------------------------------------------



// --------------------------------------------------------------------------------------------------------------
// login / logout
// --------------------------------------------------------------------------------------------------------------
function _processLogin() {

    printDebug("processing login...");
    username = document.getElementById('inputEmailAddress').value;
    passwd = document.getElementById('inputPassword').value;

    // 공백이 아닌 경우에만 ...
    if (username && passwd) {
        //if (mqttConnected) unsubscribe();
        subTopic = username + randomString(8, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');

        initMqtt();
        //else subscribe();
        waitCounter = 0;
        loginStart1();
    }
    else {
        //alert("사용자명과 비밀번호를 입력해주세요!");
        toastMessage("사용자명과 비밀번호를 입력해주세요!");
    }
}


function loginStart1() {
    if (mqttConnected == false) {
        waitCounter++;
        if (waitCounter < 50) window.setTimeout(loginStart1, 100);
        else {
            printDebug("서버로부터 데이터를 수신하지 못함");
        }
    }
    else {
        // 0625
        //var loginfo = {"username": username, "passwd": passwd, "sender": subTopic};
        var loginfo = { "username": username, "passwd": "", "epasswd": simpleEncryption(passwd), "sender": subTopic };
        clientPublish(pubTopic, "LOGIN_START=" + JSON.stringify(loginfo) + ";");
        validationCheck = -1;
        waitCounter = 0;
        loginStart2();
    }
}


function loginStart2() {
    if (validationCheck == -1) {
        waitCounter++;
        if (waitCounter < 50) window.setTimeout(loginStart2, 100);
        else {
            //alert("서버로부터 데이터를 수신하지 못함");
            toastMessage("서버로부터 데이터를 수신하지 못함");
            printDebug("서버로부터 데이터를 수신하지 못함");
            window.location.href = "index.html";
        }
    }
    else {
        if (validationCheck > 0) {
            // 1(user),2(admin),3(super user)
            localStorage.setItem("validationCheck", validationCheck.toString());
            if (validationCheck == 1) normalUser = true;
            else normalUser = false;
            // 로그인정보 저장
            //if (document.getElementById('rememberPasswordCheck').checked) {
            //무조건 저장
            localStorage.setItem("username", document.getElementById('inputEmailAddress').value);
            localStorage.setItem("passwd", document.getElementById('inputPassword').value);
            //}   
            // page이동
            //window.location.href = "index.html";
            afterLogin();

        }
        else if (validationCheck == 0) {
            printDebug("로그인에 실패하였습니다!");
            //alert("사용자명과 비밀번호가 틀리거나 등록되지 않은 사용자입니다!");
            toastMessage("사용자명과 비밀번호가 틀리거나 등록되지 않은 사용자입니다!");
            window.location.href = "index.html";
        }
    }
}



function setConfig() {
    localStorage.setItem("serverIp", "");
    localStorage.setItem("serverPort", "");
    localStorage.setItem("config", "done");
}


function randomString(length, chars) {
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
}

function checkAccessValidation() {
    keepCheck = -1;

    mapInitialZoom = true;

    // subTopic으로 로그인 여부 확인
    if (!mqttConnected) initMqtt();
    waitCounter = 0;
    checkLoginKeep1();
}
function checkLoginKeep1() {
    if (mqttConnected == false) {
        waitCounter++;
        if (waitCounter < 50) window.setTimeout(checkLoginKeep1, 100);
        else {
            printDebug("서버로부터 데이터를 수신하지 못함");
        }
    }
    // data 수신
    else {
        var loginfo = {
            "username": username, "passwd": passwd,
            "sender": subTopic
        };

        clientPublish(pubTopic, "LOGIN_KEEP=" + JSON.stringify(loginfo) + ";");

        keepCheckReceived = false;
        waitCounter = 0;
        checkLoginKeep2();
    }
}
function checkLoginKeep2() {
    if (keepCheckReceived == false) {
        waitCounter++;
        if (waitCounter < 50) window.setTimeout(checkLoginKeep2, 100);
        // 데이터가 수신이 안됨
        else {
            printDebug("서버로부터 데이터를 수신하지 못함");
        }
    }
    // data 수신
    else {
        if (keepCheck == -1) {
            window.location.href = "index.html";
            keepStatusOk = false;
        }
        else if (keepCheck == 0) {
            //alert('서버와의 연결이 종료되었습니다.')
            window.location.href = "index.html";
            keepStatusOk = false;
        }
        // 권한이 확인이 된 경우
        else keepStatusOk = true;
    }
}

function _processLogout() {

    // subTopic으로 로그인 여부 확인
    if (!mqttConnected) initMqtt();
    waitCounter = 0;
    checkLogoutStart1();
}
function checkLogoutStart1() {
    if (mqttConnected == false) {
        waitCounter++;
        if (waitCounter < 50) window.setTimeout(checkLogoutStart1, 100);
        else {
            printDebug("서버로부터 데이터를 수신하지 못함");
        }
    }
    // data 수신
    else {
        if (mqttConnected) {
            //var loginfo = {"username": "", "passwd": "","sender": subTopic};
            var loginfo = {
                "username": username, "passwd": passwd,
                "sender": subTopic
            };
            clientPublish(pubTopic, "LOGOUT_START=" + JSON.stringify(loginfo) + ";");
        }
        window.location.href = "index.html";
    }
}


function simpleEncryption(a) {
    var keys = [0x3c, 0x71, 0x88, 0x9a, 0xf4, 0x73, 0x58, 0x62, 0xc9, 0x77, 0x80, 0x96, 0xf3, 0x5b, 0xd5, 0x24];
    var keyIndex = Math.floor(Math.random() * 16);  // 0-15
    var outString = "0123456789abcdefghijklmnopqrstuvwxYzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*";
    var input = a;

    var output = "";
    if ((keyIndex < 0) || (keyIndex > 15)) keyIndex = 0;
    var key = keys[keyIndex];
    for (var i = 0; i < input.length; i++) {
        var temp1 = Number(input.charCodeAt(i));
        var temp2 = temp1 ^ key;
        var temp3 = temp2 % outString.length;
        output += outString.charAt(temp3);
    }

    return output;
}

// --------------------------------------------------------------------------------------------------------------
// login / logout
// --------------------------------------------------------------------------------------------------------------



// --------------------------------------------------------------------------------------------------------------
// processMqttMessage
// --------------------------------------------------------------------------------------------------------------
function processMqttMessage(message) {
    if (compareMqttString(message, "LOGIN_START_VALIDATION=")) {
        // if (mqttLogDisplay) printDebugYH("LOGIN_START_VALIDATION");
        validationCheck = rxdtMqttInt;
    }
    else if (compareMqttString(message, "LOGIN_KEEP_VALIDATION=")) {
        // if (mqttLogDisplay) printDebugYH("LOGIN_KEEP_VALIDATION");
        keepCheck = rxdtMqttInt;
        keepCheckReceived = true;
    }
    // 2023-0523
    else if (compareMqttString(message, "GET_RESERVOIR_DONE=")) {
        // 1219

        // if (mqttLogDisplay) printDebugYH("GET_RESERVOIR_DONE");
        // 0913
        reservoirString_old = reservoirString;
        reservoirString = rxdtMqttString;

        if (reservoirString_old != reservoirString) {
            // 2023-0523 : effquan, height 내용이 web에 포함되어 있음을 확인
            reservoir = JSON.parse(rxdtMqttString);
            reservoirReceived = true;

            // 2202-0121
            // 강제 업데이트 금지
            // 맨 처음 한번은 실행하지 않음 ???
            //if (idTableReservoir) drawReservoirTable();

            globalOptionUpdateRequested = false;

            // 경보에 따른 marker 업데이트, 미경보까지 모두 표시

            if (mapInitialZoom) updateMarker(warningSelect, false);
            //console.log("----------------------------- GET_RESERVOIR_DONE -----------------------------------");
        }
    }
    else if (compareMqttString(message, "GET_USERS_DONE=")) {
        // if (mqttLogDisplay) printDebugYH("GET_USERS_DONE");

        // 0913
        userString_old = userString;
        userString = rxdtMqttString;

        users = JSON.parse(rxdtMqttString);
        usersReceived = true;
    }
    else if (compareMqttString(message, "GET_SENSES_DONE=")) {
        // if (mqttLogDisplay) printDebugYH("GET_SENSES_DONE");
        // 0913
        // 1222-1
        //console.log("*******************************");
        //console.log("GET_SENSES_DONE");
        //console.log("*******************************");

        senseString_old = senseString;
        senseString = rxdtMqttString;
        //console.log("--------------------------------------");
        //console.log(rxdtMqttString);
        senses = JSON.parse(rxdtMqttString);
        console.log(rxdtMqttString);



        if (senseString != senseString_old) {
            // 2023-0523
            // 센서 데이터의 정정
            var avgSense;
            for (var i = 0; i < senses.length; i++) {
                // 2023-0808 
                // 2023-0523
                //console.log(i,senses[i].watersense);
                // 저수지 한개일 경우는 데이터를 찾아서 ... 채운다
                // 아닌 경우는, 다른 저수지의 데이터이므로 아래를 실행하지 않는다
                if (oneItemRequested) {
                    if (senses[i].watersense == 0) {
                        for (j = 0; j < (senses.length - i); j++) {
                            if (senses[i + j].watersense != 0) {
                                senses[i].watersense = senses[i + j].watersense;
                                break;
                            }
                        }
                    }
                }

                // 2023-0808
                // 센서 데이터의 추가정정

                var inx = findIndexFromReservoir(senses[i].macid);
                var before = senses[i].watersense;
                senses[i].watersense = before * reservoir[inx].prange / 2.0;
                /*
                if (reservoir[inx].name=="신기") 
                {
                    console.log("before:" + before + "  after:" + senses[i].watersense);
                }
                */
            }



            if (pageMode == 1) {
                //toastMessage("데이터를 로딩합니다!");

                // 2023-0523
                /*
                if (excelDownload)
                {
                    doExcelDownload();
                }
                */

                try {
                    updateTableSense();
                }
                catch (e) {
                    console.log("error:" + e);
                }

            }
            // detail도 다시 그림
            if (pageMode == 0) {
                toastMessage("데이터를 로딩합니다!");
                drawReservoirDetail();
                _drawChart();

                // 2023-0724
                if (!oneItemRequested) updateSenseInfo();
            }
        }
        else {
            if (pageMode == 1) toastMessage("신규 데이터가 없습니다!");
            if (pageMode == 0) toastMessage("다시 로딩되었습니다!");

        }

        // 2023-0724
        oneItemRequested = false;
    }

    //sense2
    else if (compareMqttString(message, "GET_SENSES2_DONE=")) {
        // no understand why this exists
        // senseString_old = senseString;
        // senseString = rxdtMqttString;
        senses2 = JSON.parse(rxdtMqttString);
        updateTableSense2();
    }
    else if (compareMqttString(message, "GET_DOWNLOAD_DONE=")) {
        if (excelDownload) {
            doExcelDownload();
        }
    }
    // 900
    else if (compareMqttString(message, "GET_CAPTURE_DONE=")) {
        // capture finished ...
        console.log(" ------------------- Image capture done .... need to update image");
    }
    // 0913
    else if (compareMqttString(message, "GET_CAPTURE_STATUS=")) {
        captureStatus = rxdtMqttInt;

        // 0913
        if (normalUser) {
            $('#idImageCapture').attr('disabled', true);
            document.getElementById('idImageCapture').innerHTML = "&nbsp;캡쳐 가능&nbsp;";
            $('#idImageCaptureDone').attr('disabled', true);
        }
        else {
            // ing ...
            if (captureStatus == 0) {
                $('#idImageCapture').attr('disabled', true);
                document.getElementById('idImageCapture').innerHTML = "&nbsp;캡쳐 진행&nbsp;";
            }
            // ready
            else if (captureStatus == 1) {
                if (captureRequested) {
                    $('#idImageCapture').attr('disabled', true);
                    document.getElementById('idImageCapture').innerHTML = "&nbsp;캡쳐 대기&nbsp;";
                }
                else {
                    $('#idImageCapture').attr('disabled', false);
                    document.getElementById('idImageCapture').innerHTML = "&nbsp;캡쳐 가능&nbsp;";
                }
            }
            // completed
            else if (captureStatus == 2) {
                captureRequested = false;
                $('#idImageCapture').attr('disabled', false);
                document.getElementById('idImageCapture').innerHTML = "&nbsp;캡쳐 가능&nbsp;";
                toastMessage("캡처가 완료되었습니다!");
            }
        }
    }
}
// --------------------------------------------------------------------------------------------------------------
// processMqttMessage
// --------------------------------------------------------------------------------------------------------------