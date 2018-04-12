var mainBldgID;
var poiMenuSelector;
var isFloorSelectorEnabled = false;
var poisInScene = [];
var currentFloorId;

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

var createTextLabel = function() {
    var ambiarc = $("#ambiarcIframe")[0].contentWindow.Ambiarc;
    ambiarc.getMapPositionAtCursor(ambiarc.coordType.gps, (latlon) => {
        var mapLabelInfo = {
            buildingId: mainBldgID,
            floorId: currentFloorId,
            latitude: latlon.lat,
            longitude:latlon.lon,
            label: 'Ambiarc Text Label: ' + poisInScene.length,
            fontSize: 24,
            category: 'Label',
            showOnCreation: true
        };
    ambiarc.createMapLabel(ambiarc.mapLabel.Text, mapLabelInfo, (labelId) => {
        mapLabelCreatedCallback(labelId, mapLabelInfo.label);
});
});
}

var createIconLabel = function() {
    var ambiarc = $("#ambiarcIframe")[0].contentWindow.Ambiarc;
    ambiarc.getMapPositionAtCursor(ambiarc.coordType.gps, (latlon) => {
        var mapLabelInfo = {
            buildingId: mainBldgID,
            floorId: currentFloorId,
            latitude: latlon.lat,
            longitude:latlon.lon,
            category: 'Label',
            location: 'Default',
            partialPath: 'Information',
            showOnCreation: true
        };
    ambiarc.createMapLabel(ambiarc.mapLabel.Icon, mapLabelInfo, (labelId) => {
        var mapLabelName = 'Ambiarc Icon Label: ' + poisInScene.length;
    mapLabelCreatedCallback(labelId, mapLabelName);
});
});
}

var mapLabelCreatedCallback = function(labelId, labelName) {
    poisInScene.push(labelId);
    addElementToPoiList(labelId, labelName);
    console.log("Added: " + labelId);
}

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
}

var onAmbiarcLoaded = function() {
    var ambiarc = $("#ambiarcIframe")[0].contentWindow.Ambiarc;
    ambiarc.registerForEvent(ambiarc.eventLabel.RightMouseDown, onRightMouseDown);
    ambiarc.registerForEvent(ambiarc.eventLabel.FloorSelected, onFloorSelected);
    ambiarc.registerForEvent(ambiarc.eventLabel.FloorSelectorEnabled, onEnteredFloorSelector);
    ambiarc.registerForEvent(ambiarc.eventLabel.FloorSelectorDisabled, onExitedFloorSelector);
    ambiarc.registerForEvent(ambiarc.eventLabel.FloorSelectorFloorFocusChanged, onFloorSelectorFocusChanged);

    ambiarc.getAllBuildings((bldgs) => {
        mainBldgID = bldgs[0];
    ambiarc.getAllFloors(mainBldgID, (floors) => {
        addFloorToFloor(null, mainBldgID, "Exterior");
    for (f in floors) {
        addFloorToFloor(floors[f].id, mainBldgID, floors[f].positionName);
    }
    $('#bootstrap').removeAttr('hidden');
});
});
}

var onRightMouseDown = function(event) {
    $(poiMenuSelector).css('top', $(window).height() - event.detail.pixelY + "px");
    $(poiMenuSelector).css('left', event.detail.pixelX + "px");
    if(!isFloorSelectorEnabled)
    {
        $('#bootstrap').trigger('contextmenu');
    }
    console.log("Ambiarc received a RightMouseDown event");
}

var onFloorSelected = function(event) {
    var floorInfo = event.detail;
    currentFloorId = floorInfo.floorId;
    if (isFloorSelectorEnabled) {
        $("#levels-dropdown").removeClass('open');
        $("#levels-dropdown-button").attr('aria-expanded', false);
        isFloorSelectorEnabled = false;
    }
    console.log("Ambiarc received a FloorSelected event with a buildingId of " + floorInfo.buildingId + " and a floorId of " + floorInfo.floorId);
}

var onEnteredFloorSelector = function(event) {
    var buildingId = event.detail;
    currentFloorId = undefined;
    if (!isFloorSelectorEnabled) {
        isFloorSelectorEnabled = true;
        $("#levels-dropdown").addClass('open');
        $("#levels-dropdown-button").attr('aria-expanded', true);
    }
    console.log("Ambiarc received a FloorSelectorEnabled event with a building of " + buildingId);
}

var onExitedFloorSelector = function(event) {
    var buildingId = event.detail;
    currentFloorId = undefined;
    if (isFloorSelectorEnabled) {
        $("#levels-dropdown").removeClass('open');
        $("#levels-dropdown-button").attr('aria-expanded', false);
        isFloorSelectorEnabled = false;
    }
    console.log("Ambiarc received a FloorSelectorEnabled event with a building of " + buildingId);
}

var onFloorSelectorFocusChanged = function(event) {
    console.log("Ambiarc received a FloorSelectorFocusChanged event with a building id of: " + event.detail.buildingId +
        " and a new floorId of " + event.detail.newFloorId + " coming from a floor with the id of " + event.detail.oldFloorId);
}

var firstFloorSelected = function(pId) {
    var ambiarc = $("#ambiarcIframe")[0].contentWindow.Ambiarc;
    ambiarc.focusOnFloor(mainBldgID, 'L002');
};

var secondFloorSelected = function(pId) {
    var ambiarc = $("#ambiarcIframe")[0].contentWindow.Ambiarc;
    ambiarc.focusOnFloor(mainBldgID, 'L003');
};

var listPoiClosed = function(mapLabelId) {
    var ambiarc = $("#ambiarcIframe")[0].contentWindow.Ambiarc;
    ambiarc.destroyMapLabel(mapLabelId);
    var index = poisInScene.indexOf(mapLabelId);
    poisInScene.splice(index, 1);
    $("#" + mapLabelId).fadeOut(300, function() {
        $("#" + mapLabelId).remove();
    });
};

var addElementToPoiList = function(mapLabelId, mapLabelName) {
    var item = $("#listPoiTemplate").clone().removeClass("invisible").attr('id', mapLabelId).appendTo($("#listPoiContainer"));
    item.children("span.poiName").text("" + mapLabelName).on("click", function() {
        var ambiarc = $("#ambiarcIframe")[0].contentWindow.Ambiarc;
        ambiarc.focusOnMapLabel(mapLabelId, mapLabelId);
    });
    item.children("span.poiExit").on("click", function() {
        listPoiClosed(mapLabelId)
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
