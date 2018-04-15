var mainBldgID;
var currentFloorId = null;
var currentBuildingId;
var isFloorSelectorEnabled = false;
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

            $.each(buildings, function(id, bldgValue){
                var bldgListItem = document.createElement('option');
                    bldgListItem.clasName = 'bldg-list-item';
                    bldgListItem.value = bldgValue;
                    bldgListItem.textContent = bldgValue;
                var floorList = document.createElement('select');
                    floorList.className = 'poi-floor-id poi-details-input form-control';
                    floorList.setAttribute('data-bldgId', bldgValue);

                // main building-floor dropdown
                ambiarc.getAllFloors(bldgValue, function(floors){
                    floors.sort(function(a,b){
                        if(a.positionIndex < b.positionIndex) return 1;
                        if(a.positionIndex > b.positionIndex) return -1;
                        return 0;
                    });

                    $.each(floors, function(i, floorValue){
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
        console.log("REGISTERED 1000, CALLING EXTERIOR!!!")
        ambiarc.focusOnFloor(mainBldgID, null);
        currentFloorId = null;
        $('#bldg-floor-select').val('Exterior');
        isFloorSelectorEnabled = false;
    }
    else {
        var airData = getAirData();
        updateUIPanel(airData)
    }
};

var getAirData = function(){
    if(currentFloorId !== null){
        var sensorId = getFloorSensor();
        var airData = sensorsData[sensorId];
    }
    else {
        var airData = calculateAverageData(sensorsData);
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

        config.sensorsFloors.forEach((element) => {
            var fullUrl = urlBase + element;
            var fetchSensorData = new Promise(function (resolve, reject) {
                fetch(fullUrl)
                    .then(res => res.json())
                    .then((out) => {
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
            .then(res => res.json())
            .then((out) => {
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

//fetching sensor id for current floor
var getFloorSensor = function(){
    for(var key in sensors){
        if(sensors[key] == currentFloorId){
            return key;
        }
    }
};

//on ambiarc sdk loaded
var onAmbiarcLoaded = function() {
    ambiarc = $("#ambiarcIframe")[0].contentWindow.Ambiarc;
    ambiarc.poiList = {};
    fillBuildingsList()
        .then(function(){
            $('#bootstrap').removeAttr('hidden');
            $('#controls-section').fadeIn();
        });

    // loading imported labels and associating maplabel ids with directory ids
    ambiarc.loadRemoteMapLabels('Build/geodata.json')
        .then((mapLabels) => {
            mapLabels.forEach((element, i) => {
                var mapLabelInfo = element.properties;
                var sensorId = element.user_properties.sensorId;
                sensors[sensorId] = mapLabelInfo.floorId;
                ambiarc.poiList[mapLabelInfo.id] = mapLabelInfo;
            });
        });
    ambiarc.registerForEvent(ambiarc.eventLabel.CameraMotionCompleted, cameraCompletedHandler);
    ambiarc.registerForEvent(ambiarc.eventLabel.FloorSelected, onFloorSelected);
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
        });
    }, config.refreshInterval);
});