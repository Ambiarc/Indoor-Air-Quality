var mainBldgID;
var currentFloorId;
var currentBuildingId;

var poiMenuSelector;
var isFloorSelectorEnabled = false;
var poisInScene = [];


//global ambiarc object
var ambiarc

$(document).ready(function() {

    var $body = $(document.body);

    var menu = new BootstrapMenu('#bootstrap', {
        actions: [{
            name: 'Label',
            onClick: function() {
                createTextLabel();
                menu.close();
            }
        }, {
            name: 'Icon',
            onClick: function() {
                createIconLabel();
                menu.close();
            }
        }, {
            name: 'Cancel',
            onClick: function() {
                menu.close();
            }
        }],
        menuEvent: 'right-click'
    });
    poiMenuSelector = menu.$menu[0];
});


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
            });
        });
        var exteriorListItem = document.createElement('option');
        exteriorListItem.clasName = 'bldg-list-item';
        exteriorListItem.value = 'Exterior';
        exteriorListItem.textContent = 'Exterior';
        $('#poi-bulding-id').prepend(exteriorListItem);
    });
};

var onAmbiarcLoaded = function() {
    ambiarc = $("#ambiarcIframe")[0].contentWindow.Ambiarc;
    fillBuildingsList();

    // loading imported labels and associating maplabel ids with directory ids
    ambiarc.loadRemoteMapLabels('Build/geodata.json')
        .then((mapLabels) => {
        mapLabels.forEach((element, i) => {
            var mapLabelInfo = element.properties;
            var directoryId = element.user_properties.directoryId;
            ambiarc.poiList[mapLabelInfo.id] = mapLabelInfo;
        });
    });
};

var addFloorToFloor = function(fID, bID, name) {
    var item = $("#floorListTemplate").clone().removeClass("invisible").appendTo($("#floorContainer"));
    item.children("a.floorName").text("" + name).on("click", function() {
        var ambiarc = $("#ambiarcIframe")[0].contentWindow.Ambiarc;
        console.log( $("#currentFloor"));
        if (fID != undefined) {
            ambiarc.focusOnFloor(bID, fID);
            $("#currentFloor").text(name);
        } else {
            ambiarc.viewFloorSelector(bID);
            $("#currentFloor").text(name);
        }
    });
};