/*global google*/

var MapModel = function(domElement, tools) {
  this.googleMap = new google.maps.Map(
    document.getElementById("map"), {
      zoom: 14,
      center: new google.maps.LatLng(-25.344, 131.036),
      mapTypeId: google.maps.MapTypeId.SATELLITE
    });
};

MapModel.prototype = {
  currentShape: null,
  currentTool: null,

  setCurrentTool: function(toolName) {

  },
  setCurrentShape: function(shapeName) {

  }
};

//------------------------------------------------------------------------------

function Shape(map, pos) {}

Shape.prototype = {
  delete: function() {
    // var index = indexOf()
    // shapes.splice()
    throw new Error("Not implemented");
  },
  create: function() {
    throw new Error("Not implemented");
  },
  move: function(lat, lng) {
    throw new Error("Not implemented");
  }
};

//------------------------------------------------------------------------------

function Fence(map, pos) {
  Shape.apply(this, arguments);
  this.path = new google.maps.MVCArray();
}

Fence.prototype = {
  addVertex: function(pos) {
    this.path
  }
};

//------------------------------------------------------------------------------

function Tool(map) {

}

Tool.prototype = {
  enable: function() {

  },
  disable: function() {

  }
};

//------------------------------------------------------------------------------

function MapView(
  domElement,
  mapModel,
  tools
) {

}

MapView.prototype = {
  setTool: function(toolName) {
    this.currentTool = this.tools[toolName];

  }
};

//------------------------------------------------------------------------------

var map = new MapView(
  document.getElementById('theMap'), {
    'delete': null,
    'fence': null,
    'square': null,
    'move': null
  }
);
