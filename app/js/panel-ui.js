var mainBldgID;
var currentFloorId;
var currentBuildingId;
var poiMenuSelector;
var isFloorSelectorEnabled = false;
var poisInScene = [];

//global ambiarc object
var ambiarc

var dropdownClicked = function() {
    if (!isFloorSelectorEnabled) {
        $("#levels-dropdown").addClass('open');
        $("#levels-dropdown-button").attr('aria-expanded', true);
        isFloorSelectorEnabled = true;
    } else {
        $("#levels-dropdown").removeClass('open');
        $("#levels-dropdown-button").attr('aria-expanded', false);
        isFloorSelectorEnabled = false;
        $("#currentFloor").text("Exterior");
    }
    var ambiarc = $("#ambiarcIframe")[0].contentWindow.Ambiarc;
    ambiarc.viewFloorSelector(mainBldgID);
};

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

var onAmbiarcLoaded = function() {
    ambiarc = $("#ambiarcIframe")[0].contentWindow.Ambiarc;
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
            var directoryId = element.user_properties.directoryId;
            ambiarc.poiList[mapLabelInfo.id] = mapLabelInfo;
        });
    });
    ambiarc.registerForEvent(ambiarc.eventLabel.CameraMotionCompleted, cameraCompletedHandler);
    ambiarc.registerForEvent(ambiarc.eventLabel.FloorSelected, onFloorSelected);

    collectAirData()
        .then(function(airData){
            updateAirData(airData);
        });

    //refreshin air data every 5 minutes
    window.setInterval(function(airData){
        collectAirData(airData)
            .then(function(airData){
                updateAirData(airData);
            });
    }, config.refreshInterval);
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
        console.log("setting to exterior!!");
        console.log($('#bldg-floor-select').val());
        isFloorSelectorEnabled = false;
    }
}

//fetching data for all receivers ids - once all data are fetched, we're updating UI data
var collectAirData = function () {
    return new Promise(function (resolve, reject) {
        var urlBase = 'https://api.qlear.io/v1/monitors/latest?token='+config.gigaToken+'&identifier=';
        var promisesArray = [];
        var airDataArray = [];

        config.sensorsData.forEach((element) => {
            var fullUrl = urlBase + element;
            var test = new Promise(function (resolve, reject) {
                fetch(fullUrl)
                    .then(res => res.json())
                    .then((out) => {
                        airDataArray.push(out);
                        resolve();
                    });
            });
            promisesArray.push(test);
        });

        Promise.all(promisesArray)
            .then(function () {
                resolve(airDataArray);
            });
    });
};

// updating UI data after air data are fetched with API call
var updateAirData = function(airData){
    var averageData = calculateAverageData(airData);
    updateUIPanel(averageData)
};

var updateUIPanel = function(averageData){
    for(var key in averageData){
        $('.air-data-value').find('[data-unit="'+key+'"]').html(averageData[key]);
    }
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
    console.log("Ambiarc received a FloorSelected event with a buildingId of " + floorInfo.buildingId + " and a floorId of " + floorInfo.floorId);
};


var calculateAverageData = function(dataArray){
    var totalsArray = [];
    var elementsNum = dataArray.length;

    dataArray.forEach((elementsArray, i) => {
        for (var key in elementsArray) {
            if(!totalsArray[key]){
                if(!isNaN(elementsArray[key]) && typeof elementsArray[key] !== 'boolean'){
                    totalsArray[key] = parseFloat(elementsArray[key]);
                }
            }
            else {
                if(!isNaN(elementsArray[key]) && typeof elementsArray[key] !== 'boolean'){
                    totalsArray[key] += parseFloat(elementsArray[key]);
                }
            }
        }
    });
    for(var key in totalsArray){
        totalsArray[key] /= elementsNum;
        totalsArray[key] = parseFloat(totalsArray[key].toFixed(3));
    };

    return totalsArray;
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
            $('#bldg-floor-select').val('Exterior');
            ambiarc.focusOnFloor(currentBuildingId, currentFloorId);
            return;
        }
        var parsedValue = $(this).val().split('::');
        var currentBuildingId = parsedValue[0];
        var currentFloorId = parsedValue[1];
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
            console.log("floor selector:");
            console.log(isFloorSelectorEnabled);
            if(isFloorSelectorEnabled) { return; }
            else {
                ambiarc.viewFloorSelector(mainBldgID);
                isFloorSelectorEnabled = true;
            }
        }
    });
});