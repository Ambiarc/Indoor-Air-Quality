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
}

var onAmbiarcLoaded = function() {
    ambiarc = $("#ambiarcIframe")[0].contentWindow.Ambiarc;

    console.log("ambiarc loaded:");
    console.log(ambiarc);

    ambiarc.getAllBuildings((bldgs) => {
        console.log("all building:");
        console.log(bldgs);
        mainBldgID = bldgs[0];

        ambiarc.getAllFloors(mainBldgID, (floors) => {
            console.log("all floors:");
            console.log(floors);
        });
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
}


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
