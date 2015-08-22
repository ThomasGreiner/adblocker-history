var fs = require("fs");
var handlebars = require("handlebars");

var startYear = 2002;
var endYear = 2017;
var startDate = new Date(startYear, 1, 1);

function dateToX(date) {
  var date = new Date(date);
  var year = date.getFullYear();
  var month = date.getMonth();
  var day = date.getDate();
  var lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  
  var x = 0;
  x += (year - startYear) * 120;
  x += month * 10;
  x += ((day / lastDayOfMonth) * 10) >> 0;
  return x;
}

function initYears() {
  var arr = [];
  for (var i = startYear; i < endYear; i++) {
    arr.push({
      x: (i - startYear) * 120,
      year: i
    });
  }
  return arr;
}

function initAdblockers(lines, adblockers) {
  var result = [];
  for (var y = 0; y < lines.length; y++) {
    for (var id of lines[y]) {
      var adblocker = adblockers[id];
      if (!adblocker || adblocker.releases.length == 0)
        return;
      
      adblocker.releases = adblocker.releases.map(function(release) {
        var version = release[1].replace(/\.0$/, "");
        var type = "major";
        if (/[a-z]|\..*[\.\-]/.test(version)) {
          type = "patch";
        } else if (/\./.test(version)) {
          type = "minor";
        }
        return {
          date: release[0],
          isLongVersion: version.length > 4,
          type: type,
          version: version,
          x: dateToX(release[0])
        };
      });
      
      adblocker.id = id;
      adblocker.engine = adblocker.engine || "none";
      adblocker.base = adblocker.base && adblockers[adblocker.base];
      adblocker.x = adblocker.releases[0].x - 20;
      adblocker.xmin = adblocker.started && dateToX(adblocker.started) || adblocker.releases[0].x;
      adblocker.xmax = adblocker.ended && dateToX(adblocker.ended) || adblocker.releases[adblocker.releases.length - 1].x;
      adblocker.y = (y + 1) * 50;
      
      result.push(adblocker);
    }
  }
  return result;
}

function initEngines(xmax, engines, adblockers) {
  return engines.map(function(engine) {
    var path = [];
    var min = {x: xmax, y: 0};
    
    engine.path.forEach(function(point) {
      var adblocker = adblockers[point[0]];
      if (!adblocker)
        return;
      
      if (adblocker.xmin < min.x) {
        min.x = adblocker.xmin + 5;
        min.y = adblocker.y - 20;
      }
      
      var x = 0;
      var y = adblocker.y;
      
      switch (point[1]) {
        case "started":
        case "ended":
          x = dateToX(adblocker[point[1]]);
          break;
        default:
          for (var i = 0; i < adblocker.releases.length; i++) {
            var release = adblocker.releases[i];
            if (release.version == point[1]) {
              x = release.x;
              break;
            }
          }
      }
      
      var prev = path[path.length - 1];
      if (prev) {
        if (x - 15 < prev.x) {
          path.push({x: prev.x, y: y - 15});
        } else {
          path.push({x: x - 15, y: prev.y});
        }
      }
      
      path.push({x: x - 15, y: y - 15});
      path.push({x: x - 15, y: y + 15});
    });
    
    path.unshift({x: xmax, y: path[0].y});
    path.push({x: xmax, y: path[path.length - 1].y});
    
    engine.color = engine.color || "#888";
    engine.path = path;
    engine.min = min;
    return engine;
  });
}

function calcRelations(adblockers) {
  for (var id in adblockers) {
    var adblocker = adblockers[id];
    if (!adblocker.base)
      continue;
    
    adblocker.ydiff = adblocker.base.y - adblocker.y;
  }
}

function getData(callback) {
  fs.readFile("adblockers.json", "utf-8", function(err, content) {
    content = content.replace(/\n\s+\/\/[^\n]*\n/g, "\n");
    callback(JSON.parse(content));
  });
}

function getTemplate(callback) {
  fs.readFile("template.svg", "utf-8", function(err, content) {
    callback(handlebars.compile(content));
  });
}

module.exports.getSVG = function(callback) {
  getData(function(adblockerData) {
    var lines = adblockerData.lines;
    var adblockers = adblockerData.adblockers;
    var engines = adblockerData.engines;
    
    getTemplate(function(template) {
      var date = new Date();
      var width = (endYear - startYear) * 120;
      var data = {
        created: {
          date: date.toISOString(),
          x: dateToX(date)
        },
        width: width,
        height: (lines.length) * 50 + 100,
        years: initYears(),
        adblockers: initAdblockers(lines, adblockers),
        engines: initEngines(width, engines, adblockers)
      };
      
      calcRelations(adblockers);
      
      try {
        callback(template(data));
      } catch(ex) {
        callback(null);
        console.error(ex);
      }
    });
  });
}
