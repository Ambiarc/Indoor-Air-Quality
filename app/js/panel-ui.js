var mainBldgID;
var currentFloorId = null;
var currentBuildingId;
var isFloorSelectorEnabled = false;
var allFloors;
var sensors = {};
var sensorsData = {};

//global ambiarc object
var ambiarc;

var iframeLoaded = function() {
    $("#ambiarcIframe")[0].contentWindow.document.addEventListener('AmbiarcAppInitialized', function() {
        onAmbiarcLoaded();
    });
};

var fillBuildingsList = function(){
    return new Promise(function(resolve, reject){
        var bldgListItem = document.createElement('option');
            bldgListItem.clasName = 'bldg-list-item';
            bldgListItem.value = 'Exterior';
            bldgListItem.textContent = 'Exterior';
        $('#bldg-floor-select').append(bldgListItem);

        ambiarc.getAllBuildings(function(buildings){
            mainBldgID = buildings[0];
            currentBuildingId = buildings[0];
            currentFloorId = null;

            buildings.forEach(function(bldgValue, i){
                var bldgListItem = document.createElement('option');
                    bldgListItem.clasName = 'bldg-list-item';
                    bldgListItem.value = bldgValue;
                    bldgListItem.textContent = bldgValue;
                var floorList = document.createElement('select');
                    floorList.className = 'poi-floor-id poi-details-input form-control';
                    floorList.setAttribute('data-bldgId', bldgValue);

                // main building-floor dropdown
                ambiarc.getAllFloors(bldgValue, function(floors){
                    allFloors = floors;
                    floors.sort(function(a,b){
                        if(a.positionIndex < b.positionIndex) return 1;
                        if(a.positionIndex > b.positionIndex) return -1;
                        return 0;
                    });

                    floors.forEach(function(floorValue, i){
                        var listItem = document.createElement('option');
                            listItem.clasName = 'bldg-floor-item';
                            listItem.value = bldgValue+'::'+floorValue.id;
                            listItem.textContent = config.floorNames[floorValue.id];
                        $('#bldg-floor-select').append(listItem);
                    });
                    resolve();
                });
            });
            var exteriorListItem = document.createElement('option');
                exteriorListItem.clasName = 'bldg-list-item';
                exteriorListItem.value = 'Exterior';
                exteriorListItem.textContent = 'Exterior';
            $('#poi-bulding-id').prepend(exteriorListItem);
        });
    })
};

// closes the floor menu when a floor was selected
var onFloorSelected = function(event) {
    var floorInfo = event.detail;
    currentFloorId = floorInfo.floorId;
    previousFloor = floorInfo.floorId;
    if(currentFloorId == null){
        $('#select2-bldg-floor-select-container').html('Exterior');
    }
    else {
        $('#select2-bldg-floor-select-container').html(config.floorNames[currentFloorId]);
        $('#bldg-floor-select').select2('close')
    }
    if(currentFloorId !== null){
        $('#bldg-floor-select').val(currentBuildingId+'::'+currentFloorId);
    }
    else $('#bldg-floor-select').val('Exterior');
    if (isFloorSelectorEnabled) {
        $("#levels-dropdown").removeClass('open');
        $("#levels-dropdown-button").attr('aria-expanded', false);
        isFloorSelectorEnabled = false;
    }
};

var cameraCompletedHandler = function(event){
    if(currentFloorId == null){
        $('#bldg-floor-select').val('Exterior');
    }
    else {
        $('#bldg-floor-select').val(currentBuildingId+'::'+currentFloorId);
    }

    // 1000 is id for exterior
    if(event.detail == 1000){
        ambiarc.focusOnFloor(mainBldgID, null);
        currentFloorId = null;
        $('#bldg-floor-select').val('Exterior');
        isFloorSelectorEnabled = false;
    }
    else {
        var airData = getAirData();
        updateUIPanel(airData);
    }
};

var getAirData = function(){
    if(currentFloorId !== null){


        var sensorsIds = getFloorSensors();
        var sensorsArray = [];

        sensorsIds.forEach(function(el, i){
            var sensorsObject = sensorsData[el];
            sensorsArray.push(sensorsObject);
        });

        var airData = calculateAverageData(sensorsArray);
        $('#current-air-data').html(config.floorNames[currentFloorId]);
    }
    else {

        var sensorsArray = [];

        for(var key in sensorsData){
            var sensorsObject = sensorsData[key];
            sensorsArray.push(sensorsObject);
        }

        var airData = calculateAverageData(sensorsArray);
        $('#current-air-data').html('Pavilion');
    }
    for(var key in  airData){
        if(!isNaN(airData[key]) && typeof airData[key] !== 'boolean'){
            airData[key] = parseFloat(airData[key].toFixed(3));
        }
    }
    return airData;
};

var refreshData = function(){
    return new Promise(function(resolve, reject){
        fetchAirData()
            .then(function(airData){
                sensorsData = airData;
                resolve();
            });
    });
};

//fetching data for all receivers ids - once all data are fetched, we're updating UI data
var fetchAirData = function () {
    return new Promise(function (resolve, reject) {
        var urlBase = 'https://api.qlear.io/v1/monitors/latest?token='+config.gigaToken+'&identifier=';
        var promisesArray = [];
        var airDataArray = {};

        config.sensorsFloors.forEach(function(element){
            var fullUrl = urlBase + element;
            var fetchSensorData = new Promise(function (resolve, reject) {
                fetch(fullUrl)
                    .then(function(res){return res.json()})
                    .then(function(out){
                        out.id = element;
                        var obj = {[element]: out};
                        airDataArray[element] = out;
                        resolve();
                    });
            });
            promisesArray.push(fetchSensorData);
        });

        Promise.all(promisesArray)
            .then(function () {
                resolve(airDataArray);
            });
    });
};

//fetching data for selected sensor
var getSensorData = function(sensorId){
    return new Promise(function (resolve, reject) {
        var fullUrl = 'https://api.qlear.io/v1/monitors/latest?token='+config.gigaToken+'&identifier='+sensorId;
        fetch(fullUrl)
            .then(function(res){return res.json()})
            .then(function(out){
                for(var key in out){
                    //checking if object key is number so we can round it to 3 decimal spaces
                    if(!isNaN(out[key]) && typeof out[key] !== 'boolean'){
                        out[key] = parseFloat(out[key].toFixed(3));
                    }
                };
                resolve(out);
            });
    });
};

var updateMarkersData = function(){
    var counter = 0;
    for(var poiKey in ambiarc.poiList){
        for(var mapLabelsId in sensors){
            if(mapLabelsId == poiKey){
                var currentMapLabel = ambiarc.poiList[poiKey];
                var tooltipTitle = '<size=100%><line-height=150%>IAQ Sensor</line-height></size>\n<size=100%> </size>';
                var tooltipBody = '';
                var sensorId = sensors[mapLabelsId].sensorId;
                var tooltipBody = '<line-height=150%>Temperature: '+parseFloat(sensorsData[sensorId].temperature.toFixed(3))+' °C'+
                    '\n' +
                    '<line-height=150%>Humidity: '+parseFloat(sensorsData[sensorId].humidity.toFixed(3))+' %'+
                    '\n' +
                    '<line-height=150%>HCHO: '+parseFloat(sensorsData[sensorId].hcho.toFixed(3))+
                    '\n' +
                    '<line-height=150%>CO: '+parseFloat(sensorsData[sensorId].co.toFixed(3))+ ' ppm' +
                    '\n' +
                    '<line-height=150%>CO<sub><size=150%>2</size></sub>: '+parseFloat(sensorsData[sensorId].co2.toFixed(3))+ ' ppm' +
                    '\n' +
                    '<line-height=150%>TVOC: '+parseFloat(sensorsData[sensorId].tvoc.toFixed(3))+ ' mg/m<sup><size=150%>3</size></sup>' +
                    '\n' +
                    '<line-height=150%>PM2.5: '+parseFloat(sensorsData[sensorId].pm2p5.toFixed(3)) + ' µg/m<sup><size=150%>3</size></sup>' +
                    '\n' +
                    '<line-height=150%>PM10: '+parseFloat(sensorsData[sensorId].pm10.toFixed(3)) + ' µg/m<sup><size=150%>3</size></sup>';

                currentMapLabel.tooltipTitle = tooltipTitle;
                currentMapLabel.tooltipBody = tooltipBody;
                currentMapLabel.showTooltip = true;
                ambiarc.updateMapLabel(mapLabelsId, currentMapLabel.type, currentMapLabel);
            }
        }
    }
};

//updating data in UI panel
var updateUIPanel = function(data){
    for(var key in data){
        $('.air-data-value').find('[data-unit="'+key+'"]').html(data[key]);
    }
};

//calculating average data if floor not selected
var calculateAverageData = function(dataArray) {

    var totalsArray = [];
    var elementsNum = Object.keys(dataArray).length;

    for (var sensorId in dataArray){
        for (var key in dataArray[sensorId]) {
            if (!totalsArray[key]) {
                if (!isNaN(dataArray[sensorId][key]) && typeof dataArray[sensorId][key] !== 'boolean') {
                    totalsArray[key] = parseFloat(dataArray[sensorId][key]);
                }
            }
            else {
                if (!isNaN(dataArray[sensorId][key]) && typeof dataArray[sensorId][key] !== 'boolean') {
                    totalsArray[key] += parseFloat(dataArray[sensorId][key]);
                }
            }
        }
    }

    for(var key in totalsArray){
        totalsArray[key] /= elementsNum;
        totalsArray[key] = parseFloat(totalsArray[key].toFixed(3));
    };
    return totalsArray;
};


var calculateAverageData = function(dataArray) {
    var totalsArray = [];
    var elementsNum = dataArray.length;

    for (var sensorObj in dataArray){
        for (var key in dataArray[sensorObj]) {
            if (!totalsArray[key]) {
                if (!isNaN(dataArray[sensorObj][key]) && typeof dataArray[sensorObj][key] !== 'boolean') {
                    totalsArray[key] = parseFloat(dataArray[sensorObj][key]);
                }
            }
            else {
                if (!isNaN(dataArray[sensorObj][key]) && typeof dataArray[sensorObj][key] !== 'boolean') {
                    totalsArray[key] += parseFloat(dataArray[sensorObj][key]);
                }
            }
        }
    }

    for(var key in totalsArray){
        totalsArray[key] /= elementsNum;
        totalsArray[key] = parseFloat(totalsArray[key].toFixed(3));
    };
    return totalsArray;
};


//fetching sensor id for current floor
var getFloorSensors = function(){
    var floorSensors = [];
    var counter = 0;
    for(var key in sensors){
        if(sensors[key].floorId == currentFloorId){
            counter++;
            floorSensors.push(sensors[key].sensorId);
        }
    }
    return floorSensors;
};

//on ambiarc sdk loaded
var onAmbiarcLoaded = function() {
    ambiarc = $("#ambiarcIframe")[0].contentWindow.Ambiarc;
    ambiarc.poiList = {};
    fillBuildingsList()
        .then(function(){
            $('#bootstrap').removeAttr('hidden');
            $('#controls-section').fadeIn();

            // loading imported sensors labels and associating maplabel ids with directory ids
            ambiarc.loadRemoteMapLabels('Build/geodata.json', allFloors)
                .then(function(mapLabels){
                    mapLabels.forEach(function(element, i){
                        var mapLabelInfo = element.properties;
                        var sensorId = element.user_properties.sensorId;
                        var sensorFloorId = element.user_properties.floorId;
                        sensors[mapLabelInfo.id] = {};
                        sensors[mapLabelInfo.id].floorId = mapLabelInfo.floorId;
                        sensors[mapLabelInfo.id].sensorId = sensorId;
                        ambiarc.poiList[mapLabelInfo.id] = mapLabelInfo;
                    });
                    updateMarkersData();
                });

            // Loading imported units points
            ambiarc.loadRemoteMapLabels('Build/output.json', allFloors);
        });
    ambiarc.registerForEvent(ambiarc.eventLabel.CameraMotionCompleted, cameraCompletedHandler);
    ambiarc.registerForEvent(ambiarc.eventLabel.FloorSelected, onFloorSelected);
    ambiarc.registerForEvent(ambiarc.eventLabel.FloorSelectorEnabled, onEnteredFloorSelector);
    ambiarc.registerForEvent(ambiarc.eventLabel.FloorSelectorDisabled, onExitedFloorSelector);
};

var onEnteredFloorSelector = function(){
    isFloorSelectorEnabled = true;
};

var onExitedFloorSelector = function(){
    isFloorSelectorEnabled = false;
};


$(document).ready(function() {
    //initializing selec2 selector
    $('#bldg-floor-select').select2();
    var $body = $(document.body);

    $('body').on('change', '#bldg-floor-select', function(){
        $('#select2-bldg-floor-select-container').html($(this).val());
        if($(this).val() == 'Exterior'){
            currentBuildingId = mainBldgID;
            currentFloorId = null;
            isFloorSelectorEnabled = false;
            ambiarc.focusOnFloor(currentBuildingId, currentFloorId);
            return;
        }
        var parsedValue = $(this).val().split('::');
        currentBuildingId = parsedValue[0];
        currentFloorId = parsedValue[1];
        ambiarc.focusOnFloor(currentBuildingId, currentFloorId);
    });

    $('.floor_select_btn').find('.select2').on('click', function(){
        if($('.select2-container--open').is(':visible') == false){
            // return to previous floor
            if(currentBuildingId != undefined){
                // focus to exterior
                if(currentFloorId == null){ ambiarc.focusOnFloor(currentBuildingId, null);}
                // focus to normal floor
                else { ambiarc.focusOnFloor(currentBuildingId, previousFloor); }
            }
            else { ambiarc.focusOnFloor(mainBldgID, null); }
            isFloorSelectorEnabled = false;
        }
        else {
            // call selector mode
            if(isFloorSelectorEnabled) { return; }
            else {
                ambiarc.viewFloorSelector(mainBldgID);
                isFloorSelectorEnabled = true;
            }
        }
    });
    refreshData()
        .then(function(){
            var avgData = getAirData();
            updateUIPanel(avgData);
        });
    //refreshing air data every 5 minutes
    window.setInterval(function(){
        refreshData()
            .then(function(){
                var airData = getAirData();
                updateUIPanel(airData);
                updateMarkersData();
        });
    }, config.refreshInterval);
});