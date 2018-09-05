"use strict";

const io = require("./io");

let startYear = null;

function dateToX(date) {
  date = new Date(date);
  let year = date.getFullYear();
  let month = date.getMonth();
  let day = date.getDate();
  let lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  
  let x = (year - startYear) * 120;
  x += month * 10;
  x += ((day / lastDayOfMonth) * 10) >> 0;
  return x;
}

function initYears(adblockers) {
  let endYear = null;
  for (let id in adblockers) {
    let adblocker = adblockers[id];
    
    let start = new Date(adblocker.started || adblocker.releases[0][0]).getFullYear();
    if (!startYear || start < startYear) {
      startYear = start;
    }
    
    let end = new Date(adblocker.ended || adblocker.releases[adblocker.releases.length - 1][0]).getFullYear();
    if (!endYear || end > endYear) {
      endYear = end;
    }
  }
  
  let arr = [];
  for (let year = startYear; year <= endYear + 1; year++) {
    arr.push({
      x: (year - startYear) * 120,
      year: year
    });
  }
  return arr;
}

function initAdblockers(lines, adblockers) {
  let result = [];
  for (let y = 0; y < lines.length; y++) {
    for (let id of lines[y]) {
      let adblocker = adblockers[id];
      if (!adblocker || adblocker.releases.length === 0)
        return;
      
      adblocker.releases = adblocker.releases.map((release) => {
        let version = release[1].replace(/\.0$/, "");
        let type = "major";
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
      adblocker.vendor = adblocker.vendor || "other";
      adblocker.base = adblocker.base && adblockers[adblocker.base];
      adblocker.x = adblocker.releases[0].x - 20;
      adblocker.xmin = (adblocker.started) ? dateToX(adblocker.started) : adblocker.releases[0].x;
      adblocker.xmax = (adblocker.ended) ? dateToX(adblocker.ended) : adblocker.releases[adblocker.releases.length - 1].x;
      adblocker.y = (y + 1) * 50;
      
      result.push(adblocker);
    }
  }
  return result;
}

function initEngines(xmax, vendors, engines, adblockers) {
  return engines.map((engine) => {
    let path = [];
    let min = {x: xmax, y: 0};
    
    for (let point of engine.path) {
      let adblocker = adblockers[point[0]];
      if (!adblocker)
        continue;
      
      if (adblocker.xmin < min.x) {
        min.x = adblocker.xmin + 5;
        min.y = adblocker.y - 20;
      }
      
      let x = 0;
      let y = adblocker.y;
      
      switch (point[1]) {
        case "started":
        case "ended":
          x = dateToX(adblocker[point[1]]);
          break;
        default:
          for (let release of adblocker.releases) {
            if (release.version == point[1]) {
              x = release.x;
              break;
            }
          }
      }
      
      let prev = path[path.length - 1];
      if (prev) {
        if (x - 15 < prev.x) {
          path.push({x: prev.x, y: y - 15});
        } else {
          path.push({x: x - 15, y: prev.y});
        }
      }
      
      path.push({x: x - 15, y: y - 15});
      path.push({x: x - 15, y: y + 15});
    }
    
    path.unshift({x: xmax, y: path[0].y});
    path.push({x: xmax, y: path[path.length - 1].y});
    
    let vendor = vendors.find((vendor) => vendor.id == engine.vendor);
    engine.vendor = vendor ? vendor.id : "other";
    engine.path = path;
    engine.min = min;
    return engine;
  });
}

function calcRelations(adblockers) {
  for (let id in adblockers) {
    let adblocker = adblockers[id];
    if (!adblocker.base)
      continue;
    
    adblocker.ydiff = adblocker.base.y - adblocker.y;
  }
}

function onData([adblockers, engines, lines, vendors]) {
  return io.getTemplate().then((template) => {
    let date = new Date();
    let years = initYears(adblockers);
    let width = years.length * 120;
    
    let data = {
      created: {
        date: date.toISOString(),
        x: dateToX(date)
      },
      width,
      height: lines.length * 50 + 100,
      years,
      adblockers: initAdblockers(lines, adblockers),
      engines: initEngines(width, vendors, engines, adblockers),
      vendors
    };
    
    calcRelations(adblockers);
    return template(data);
  });
}

module.exports.create = function() {
  return Promise.all([
    io.get("adblockers"),
    io.get("engines"),
    io.get("lines"),
    io.get("vendors")
  ]).then(onData).catch((err) => console.error(err));
};
