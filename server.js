#!/usr/bin/env node

"use strict";

const http = require("http");
const {create} = require("./lib/svg");

function onRequest(req, resp) {
  if (req.url != "/") {
    resp.writeHead(404);
    resp.end();
    return;
  }
  
  resp.writeHead(200, {"Content-Type": "image/svg+xml"});
  create().then((svg) => resp.end(svg));
}

http.createServer(onRequest).listen(8080);
console.log("Server started at 127.0.0.1:8080");
