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
  shapes: null,

  setCurrentTool: function(toolName) {
    this.currentTool = this.tools[toolName];
  },

  setCurrentShape: function(shape) {
    this.currentShape = shape;
  },

  removeShape: function(shape) {
    var index = this.shapes.indexOf(shape);
    if (index !== -1) {
      this.shapes.splice(index, 1);
      this.setCurrentShape(null);
    }
  },

  addShape: function(shape) {
    this.shapes.push(shape);
    this.setCurrentShape(shape);
  }
};

//------------------------------------------------------------------------------

function Shape(map) {
  this.markers = [];

  // When called with no arguments, I'm assuming it's to create a prototype
  if (! arguments.length) {
    return;
  }
  this.map = map;
  map.addShape(this);
}

Shape.prototype = {
  map: null,
  markers: null,

  delete: function() {
    // var index = indexOf()
    // shapes.splice()
    throw new Error("Not implemented");
    this.markers.forEach(function(it) {

    });
  },

  create: function() {
    throw new Error("Not implemented");
  },

  move: function(vertex, latLng) {
    throw new Error("Not implemented");
  }
};


//------------------------------------------------------------------------------

function Fence(map, latLng) {
  this.path = new google.maps.MVCArray();
}
Fence.prototype = new Shape();

Fence.prototype.addVertex = function(latLng) {
  this.path.insertAt(this.path.length, latLng);
};

//------------------------------------------------------------------------------

function Square(map, latLng) {
  Shape.apply(this, arguments);
  var marker = new google.maps.Marker({
    position: latLng,
    map: map,
    draggable: true
  });
  this.markers.push(marker);
}

Square.prototype = new Shape();


//------------------------------------------------------------------------------

function Tool(map) {

}

Tool.prototype = {
  enable: function() {

  },

  disable: function() {

  },

  markerDragEnd: function(event) {

  },

  mapClick: function(event) {

  },

  markerClick: function(event) {

  }
};

//------------------------------------------------------------------------------

function CreateSquareTool(map) {
  Tool.apply(this, arguments);
}

CreateSquareTool.prototype = {
  mapClick: function(event) {
    var square = new Square(this.map, event.latLng);
    // this.map.addShape(square);
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

  }
};

//------------------------------------------------------------------------------

var map = new MapModel(
  document.getElementById('theMap'), {
    'delete': null,
    'fence': null,
    'square': null,
    'move': null
  }
);
