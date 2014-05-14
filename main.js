/*global google*/

var MapModel = function(domElement, tools) {
  var self = this;
  this.googleMap = new google.maps.Map(
    domElement, {
      zoom: 14,
      center: new google.maps.LatLng(-25.344, 131.036),
      mapTypeId: google.maps.MapTypeId.SATELLITE
    });

  this.googleMap.mapModel = this;

  google.maps.event.addListener(this.googleMap, 'click', function(event) {
    // debugger;
    self.currentTool.mapClick(self, event);
  });

  this.tools = tools;
  this.shapes = [];
};

MapModel.prototype = {
  currentShape: null,
  currentTool: null,
  shapes: null,

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

  // FIXME: Move to it's own class

  _addMarker: function(latLng) {
    var map = this.map;

    var marker = new google.maps.Marker({
      position: latLng,
      map: map.googleMap,
      draggable: true
    });

    marker._parentShape = this;
    marker._delete = function() {
    };

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

  create: function() {
    throw new Error("Not implemented");
  },

  moveMarker: function(marker, latLng) {},

  markerClickHandler: function(map, event) {
    // this.map.currentTool(event);
    // console.log(arguments);
  }
};

//------------------------------------------------------------------------------

function Fence(map, latLng)  {
  Shape.apply(this, arguments);
  // FIXME: Prompt user

  this._addMarker(latLng);

  this.polyPath = new google.maps.MVCArray([latLng]);
  // FIXME: pass clicks through
  this.poly = new google.maps.Polygon({
    strokeWeight: 3,
    fillColor: '#5555FF',
    map: this.map.googleMap,
    paths: this.polyPath,
    clickable: false
  });

  // this.rectange = new google.maps.Rectangle({
  //   strokeWeight: 3,
  //   fillColor: '#5555FF',
  //   map: map.googleMap
  // });

}

Fence.prototype = new Shape();

Fence.prototype.addMarker = function(latLng) {
  var marker = this._addMarker(latLng);
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

    if (! this.markers.length)  {
      this.poly.setMap(null);
    }
  }

};


//------------------------------------------------------------------------------

function Square(map, latLng) {
  Shape.apply(this, arguments);
  // FIXME: Use kilometers
  this.radius = 0.01;
  // FIXME: Prompt user

  this._addMarker(latLng);

  this.rectange = new google.maps.Rectangle({
    strokeWeight: 3,
    fillColor: '#5555FF',
    map: map.googleMap,
    clickable: false
  });

  this._setBounds();
}

Square.prototype = new Shape();

Square.prototype._setBounds = function() {
  var radius = this.radius;
  var lat = this.markers[0].getPosition().lat();
  var lng = this.markers[0].getPosition().lng();

  this.rectange.setBounds(
    new google.maps.LatLngBounds(
      /* SW: */ new google.maps.LatLng(lat - radius, lng - radius),
      /* NE: */ new google.maps.LatLng(lat + radius, lng + radius)
    )
  );
};

Square.prototype.moveMarker = function(marker, latLng) {
  // debugger;
  this._setBounds();
};

Square.prototype.removeMarker = function(marker) {
  Shape.prototype.removeMarker.call(this, marker);
  this.rectange.setMap(null);
};

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
  map.setCurrentShape(
    new Square(map, event.latLng)
  );

  // this.map.addShape(square);
};

//------------------------------------------------------------------------------

function CreateFenceTool() {}

CreateFenceTool.prototype = new Tool();

CreateFenceTool.prototype.doContinue = false;

CreateFenceTool.prototype._colorize = function(shape, isComplete) {
  var markers = shape.markers;
  var pinColor = "FE7569";
  var chartsURL = 'http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|';

  markers.forEach(function(marker) {
    marker.setIcon(chartsURL + pinColor);
  });

  if (markers.length && ! shape.isComplete) {
    markers[0].setIcon(chartsURL + '009900');
    markers[markers.length - 1].setIcon(chartsURL + '000099');
  }
};

CreateFenceTool.prototype.markerClick = function(map, marker, shape, event) {
  if (shape === map.currentShape && shape.markers[0] === marker) {
    this.doContinue = false;
    shape.isComplete = true;
  } else {
    Tool.prototype.markerClick.apply(this, arguments);
  }
  this._colorize(shape);
};

CreateFenceTool.prototype.mapClick = function(map, event) {
  if (map.currentShape instanceof Fence && this.doContinue) {
    map.currentShape.addMarker(event.latLng);
  } else {
    var fence = new Fence(map, event.latLng);
    fence.isComplete = false;
    map.setCurrentShape(fence);
    this.doContinue = true;
  }
  this._colorize(map.currentShape);
};

CreateFenceTool.prototype.enable = function(map) {
  this.doContinue = true;
};

CreateFenceTool.prototype.disable = function(map) {
  map.currentShape.isComplete = true;
  this._colorize(map.currentShape);
};


//------------------------------------------------------------------------------

// function MapView(
//   domElement,
//   mapModel,
//   tools
// ) {

// }

// MapView.prototype = {
//   setTool: function(toolName) {

//   }
// };

//------------------------------------------------------------------------------

var map = new MapModel(
  document.getElementById('the-map'), {
    'delete': null,
    'fence': new CreateFenceTool(),
    'square': new CreateSquareTool(),
    'move': null
  }
);

map.setCurrentTool('fence');
// map.setCurrentTool('square');
