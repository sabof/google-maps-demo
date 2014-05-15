/*global google*/

var MapModel = function(domElement, tools, shapeClasses) {
  var self = this;
  this.googleMap = new google.maps.Map(
    domElement, {
      zoom: 13,
      center: new google.maps.LatLng(
        51.477124419087346,
          -0.18946672821035904
      ),
      mapTypeId: google.maps.MapTypeId.SATELLITE
    });

  this.googleMap.mapModel = this;

  google.maps.event.addListener(this.googleMap, 'click', function(event) {
    self.currentTool.mapClick(self, event);
  });

  this.tools = tools;
  this.shapeClasses = shapeClasses;
  this.shapes = [];
};

MapModel.prototype = {
  currentShape: null,
  currentTool: null,
  shapes: null,

  serialize: function() {
    return this.shapes.map(function(shape) {
      return shape.serialize();
    });
  },

  deSerialize: function(shapeSpecs) {
    var self = this;

    return shapeSpecs.map(function(shapeSpec) {
      var result = null;

      self.shapeClasses.some(function(klass) {
        return (
          result = klass.prototype.deSerialize(self, shapeSpec)
        );
      });
      return result;
    });
  },

  save: function() {

  },

  load: function() {

  },

  setCurrentTool: function(toolName) {
    if (this.currentTool) {
      this.currentTool.disable(this);
    }

    this.currentTool = this.tools[toolName];
    this.currentTool.enable(this);
  },

  setCurrentShape: function(shape) {
    this.currentShape = shape;
  },

  removeShape: function(shape) {
    var index = this.shapes.indexOf(shape);

    if (index !== -1) {
      this.shapes.splice(index, 1);
      if (shape === this.currentShape) {
        this.setCurrentShape(null);
      }
    }
  },

  addShape: function(shape) {
    this.shapes.push(shape);
    this.setCurrentShape(shape);
  }
};

//------------------------------------------------------------------------------
//------------------------------------------------------------------------------

function Shape(map, latLng) {
  this.markers = [];

  if (! arguments.length) {
    return;
  }
  this.map = map;
  map.addShape(this);
}

Shape.prototype = {
  map: null,
  markers: null,

  redrawBoundary: function() {},

  // FIXME: Add correct signatures
  serialize: function() {},
  deSerialize: function() {},

  createMarker: function(latLng) {
    var map = this.map;

    var marker = new google.maps.Marker({
      position: latLng,
      map: map.googleMap,
      draggable: true
    });

    var self = this;
    google.maps.event.addListener(marker, 'click', function(event) {
      self.map.currentTool.markerClick.call(
        self.map.currentTool,
        map, this, self, event
      );
    });

    google.maps.event.addListener(marker, 'dragend', function(event) {
      self.map.currentTool.markerDragEnd.call(
        self.map.currentTool,
        map, this, self, event
      );
    });

    this.markers.push(marker);
    return marker;
  },

  delete: function() {
    this.markers.forEach(function(marker) {
      marker.setMap(null);
    });
    this.map.removeShape(this);
  },

  removeMarker: function(marker) {
    marker.setMap(null);

    var index = this.markers.indexOf(marker);
    if (index !== -1) {
      this.markers.splice(index, 1);
    }
    if (! this.markers.length) {
      this.delete();
    }
  },

  moveMarker: function(marker, latLng) {
    this.redrawBoundary();
  },
};

Shape.prototype._serializeMarkers = function() {
  return this.markers.map(function(marker) {
    var position = marker.getPosition();
    return [
      position.lat(),
      position.lng()
    ];
  });
};

//------------------------------------------------------------------------------

function Square(map, latLng) {
  Shape.apply(this, arguments);
  this.createMarker(latLng);

  this.rectange = new google.maps.Rectangle({
    strokeWeight: 3,
    fillColor: '#5555FF',
    map: map.googleMap,
    clickable: false
  });

  this.redrawBoundary();
}

Square.prototype = new Shape();

Square.prototype.delete = function(latLng) {
  Shape.prototype.delete.apply(this, arguments);
  this.rectange.setMap(null);
};

Square.prototype.setSideLength = function(length) {
  this.sideLength = length;
  this.redrawBoundary();
};

Square.prototype.redrawBoundary = function() {
  var radius = this.sideLength / 2;
  var origin = this.markers[0].getPosition();

  var boundaries = [0, 90, 180, 270].map(function(degrees) {
    return google.maps.geometry.spherical.computeOffset(
      origin, radius, degrees
    );
  });

  this.rectange.setBounds(
    new google.maps.LatLngBounds(
      /* SW: */ new google.maps.LatLng(
        boundaries[2].lat(),
        boundaries[3].lng()
      ),
      /* NE: */ new google.maps.LatLng(
        boundaries[0].lat(),
        boundaries[1].lng()
      )
    )
  );
};

Square.prototype.serialize = function() {
  return {
    shape: 'square',
    markers: this._serializeMarkers(),
    sideLength: this.sideLength
  };
};

Square.prototype.deSerialize = function(map, shapeSpec) {
  if (shapeSpec.shape !== 'square') {
    return;
  }
  var square = new Square(
    map,
    new google.maps.LatLng(
      shapeSpec.markers[0][0],
      shapeSpec.markers[0][1]
    )
  );
  square.setSideLength(shapeSpec.sideLength);
  map.setCurrentShape(square);
};

//------------------------------------------------------------------------------

function Circle(map, latLng) {
  Shape.apply(this, arguments);
  this.createMarker(latLng);

  this.circle = new google.maps.Circle({
    center: latLng,
    strokeWeight: 3,
    fillColor: '#5555FF',
    map: map.googleMap,
    clickable: false
  });
}

Circle.prototype = new Shape();

Circle.prototype.delete = function(latLng) {
  Shape.prototype.delete.apply(this, arguments);
  this.circle.setMap(null);
};

Circle.prototype.setRadius = function(radius) {
  this.radius = radius;
  this.redrawBoundary();
};

Circle.prototype.redrawBoundary = function() {
  this.circle.setRadius(this.radius);
  this.circle.setCenter(this.markers[0].getPosition());
};

Circle.prototype.serialize = function() {
  return {
    shape: 'circle',
    markers: this._serializeMarkers(),
    radius: this.radius
  };
};

Circle.prototype.deSerialize = function(map, shapeSpec) {
  if (shapeSpec.shape !== 'circle') {
    return;
  }
  var circle = new Circle(
    map,
    new google.maps.LatLng(
      shapeSpec.markers[0][0],
      shapeSpec.markers[0][1]
    )
  );
  circle.setRadius(shapeSpec.radius);
  map.setCurrentShape(circle);
};

//------------------------------------------------------------------------------

function Fence(map, latLng)  {
  Shape.apply(this, arguments);
  this.createMarker(latLng);

  this.polyPath = new google.maps.MVCArray([latLng]);
  this.poly = new google.maps.Polygon({
    strokeWeight: 3,
    fillColor: '#5555FF',
    map: this.map.googleMap,
    paths: this.polyPath,
    clickable: false
  });
}

Fence.prototype = new Shape();
Fence.prototype.isComplete = false;

Fence.prototype.delete = function(latLng) {
  Shape.prototype.delete.apply(this, arguments);
  this.poly.setMap(null);
};

Fence.prototype.addMarker = function(latLng) {
  var marker = this.createMarker(latLng);
  this.polyPath.push(latLng);
};

Fence.prototype.moveMarker = function(marker, latLng) {
  var index = this.markers.indexOf(marker);
  if (index !== -1) {
    this.polyPath.setAt(index, marker.getPosition());
  }
};

Fence.prototype.removeMarker = function(marker) {
  var index = this.markers.indexOf(marker);
  if (index !== -1) {
    Shape.prototype.removeMarker.call(this, marker);
    this.polyPath.removeAt(index);
  }
};

Fence.prototype.reColor = function() {
  var markers = this.markers;

  var green = "8CFF9D",
      red = "FE7569",
      purple = "F2A3E6",
      blue = "8CD0FF",
      chartsURL = 'http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|';

  if (this.isComplete) {
    markers.forEach(function(marker) {
      marker.setIcon(undefined);
    });
  } else {
    markers.forEach(function(marker) {
      marker.setIcon(chartsURL + blue);
    });
    if (markers.length && ! this.isComplete) {
      markers[0].setIcon(chartsURL + green);
      markers[markers.length - 1].setIcon(chartsURL + purple);
    }
  }
};

//------------------------------------------------------------------------------
//------------------------------------------------------------------------------

function Tool() {}

Tool.prototype = {
  enable: function(map) {},

  disable: function(map) {},

  markerDragEnd: function(map, marker, shape, event) {
    shape.moveMarker(marker, event.latLng);
  },

  mapClick: function(map, event) {},

  markerClick: function(map, marker, shape, event) {
    shape.removeMarker(marker);
  }
};

//------------------------------------------------------------------------------

function CreateSquareTool() {}

CreateSquareTool.prototype = new Tool();

CreateSquareTool.prototype.mapClick = function(map, event) {
  var sideLength = Number(window.prompt(
    'Enter side length in KM:'
  )) * 1000;

  if (! sideLength) {
    return;
  }

  var square = new Square(map, event.latLng);
  square.setSideLength(sideLength);
  map.setCurrentShape(square);
};

//------------------------------------------------------------------------------

function CreateCircleTool() {}

CreateCircleTool.prototype = new Tool();

CreateCircleTool.prototype.mapClick = function(map, event) {
  var radius = Number(window.prompt(
    'Enter radius in KM:'
  )) * 1000;

  if (! radius) {
    return;
  }
  var circle = new Circle(map, event.latLng);
  circle.setRadius(radius);
  map.setCurrentShape(circle);
};

//------------------------------------------------------------------------------

function CreateFenceTool() {}

CreateFenceTool.prototype = new Tool();

CreateFenceTool.prototype.markerClick = function(map, marker, shape, event) {
  if (shape === map.currentShape &&
      shape.markers[0] === marker &&
      shape.markers.length >= 3 &&
      ! shape.isComplete)
  {
    shape.isComplete = true;
  } else {
    Tool.prototype.markerClick.apply(this, arguments);

    if (shape.isComplete && shape.markers.length < 3) {
      shape.delete();
    }
  }

  if (shape instanceof Fence) {
    shape.reColor();
  }
};

CreateFenceTool.prototype.mapClick = function(map, event) {
  if (map.currentShape instanceof Fence && ! map.currentShape.isComplete) {
    map.currentShape.addMarker(event.latLng);
  } else {
    var fence = new Fence(map, event.latLng);
    fence.isComplete = false;
    map.setCurrentShape(fence);
  }

  if (map.currentShape instanceof Fence) {
    map.currentShape.reColor();
  }
};

CreateFenceTool.prototype.disable = function(map) {
  if (map.currentShape instanceof Fence) {
    map.currentShape.isComplete = true;
    map.currentShape.reColor();
  }
};

//------------------------------------------------------------------------------

// FIXED: Add circle
// FIXED: Add instructions
// FIXED: Change location
// FIXED: Use same style for markers

// FIXME: Style current button
// FIXME: Add serialize/deSerialize
// FIXME: Differentiate colors
// FIXME: Improve CSS
