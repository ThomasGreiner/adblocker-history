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

function initYears(products) {
  let endYear = null;
  for (let id in products) {
    let product = products[id];
    
    let start = new Date(product.started || product.releases[0][0]).getFullYear();
    if (!startYear || start < startYear) {
      startYear = start;
    }
    
    let end = new Date(product.ended || product.releases[product.releases.length - 1][0]).getFullYear();
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

function initAdblockers(lines, products) {
  let result = [];
  for (let y = 0; y < lines.length; y++) {
    for (let id of lines[y]) {
      let product = products[id];
      if (!product || product.releases.length === 0)
        return;
      
      product.releases = product.releases.map((release) => {
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
      
      product.id = id;
      product.vendor = product.vendor || "other";
      product.base = product.base && products[product.base];
      product.x = product.releases[0].x - 20;
      product.xmin = (product.started) ? dateToX(product.started) : product.releases[0].x;
      product.xmax = (product.ended) ? dateToX(product.ended) : product.releases[product.releases.length - 1].x;
      product.y = (y + 1) * 50;
      
      result.push(product);
    }
  }
  return result;
}

function initEngines(xmax, vendors, engines, products) {
  return engines.map((engine) => {
    let path = [];
    let min = {x: xmax, y: 0};
    
    function getPoint([productId, versionId]) {
      let product = products[productId];
      if (!product)
        return;
      
      let x = 0;
      let y = product.y;
      
      switch (versionId) {
        case "started":
        case "ended":
          x = dateToX(product[versionId]);
          break;
        default:
          for (let release of product.releases) {
            if (release.version == versionId) {
              x = release.x;
              break;
            }
          }
      }
      
      if (x < min.x) {
        min.x = x + 5;
        min.y = product.y - 20;
      }
      
      return {x, y};
    }
    
    for (let release of engine.start) {
      let {x, y} = getPoint(release);
      
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
    
    if (engine.end) {
      for (let release of engine.end) {
        let {x, y} = getPoint(release);
        
        path.push({x: xmax, y: y + 15});
        path.push({x: x - 15, y: y + 15});
        path.push({x: x - 15, y: y - 15});
        path.push({x: xmax, y: y - 15});
      }
    }
    
    let vendor = vendors.find((vendor) => vendor.id == engine.vendor);
    engine.vendor = vendor ? vendor.id : "other";
    engine.path = path;
    engine.min = min;
    return engine;
  });
}

function calcRelations(products) {
  for (let id in products) {
    let product = products[id];
    if (!product.base)
      continue;
    
    product.ydiff = product.base.y - product.y;
  }
}

function onData([products, engines, lines, vendors, meta]) {
  return io.getTemplate().then((template) => {
    let date = new Date();
    let years = initYears(products);
    let width = years.length * 120;
    
    let data = {
      created: {
        date: date.toISOString(),
        x: dateToX(date)
      },
      width,
      height: lines.length * 50 + 100,
      years,
      products: initAdblockers(lines, products),
      engines: initEngines(width, vendors, engines, products),
      vendors,
      meta
    };
    
    calcRelations(products);
    return template(data);
  });
}

module.exports.create = function() {
  return Promise.all([
    io.get("products"),
    io.get("engines"),
    io.get("lines"),
    io.get("vendors"),
    io.get("meta")
  ]).then(onData).catch((err) => console.error(err));
};
