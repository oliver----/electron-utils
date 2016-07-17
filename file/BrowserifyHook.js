'use strict';

var extend = require('lodash/extend');
var path = require('path');
var browserify = require('browserify');

function BrowserifyHook(options) {
  this.options = extend({
    jsx: false,
    es6: false,
    cache: true,
  }, options);
}

BrowserifyHook.prototype.shouldHandleRequest = function(params) {
  var filePath = params.filePath;
  var ext = path.extname(filePath);
  if (this.options.jsx) {
    return ext === ".js" || ext === ".jsx";
  } else {
    return ext === ".js";
  }
};

BrowserifyHook.prototype.handleRequest = function(params, finish) {
  var sourcePath = params.filePath;
  // console.log('Bundling %s with browserify', sourcePath);
  var startTime = Date.now();
  var opts = {
    debug: true,
    extensions: []
  };
  if (this.options.cache) {
    opts.cache = {};
    opts.packageCache = {};
  }
  if (this.options.jsx) {
    opts.extensions.push('.jsx');
  }
  var b = browserify(opts).add(sourcePath);

  var useBabelify = this.options.jsx || this.options.es6;
  if (useBabelify) {
    var plugins = [];
    if (this.options.jsx) {
      plugins.push("syntax-jsx")
      plugins.push(
        [ "transform-react-jsx", {
          // this will generate calls such as in
          // $$(MyComp, props, ...children)
          "pragma": "$$"
        }]
      );
    }
    if (this.options.es6) {
      plugins.push(
        // support for es6 import/export
        // Note: the rest of es6 is supported natively
        // by the chrome
        // just import/export needs to be mapped to commonjs
        // so that browserify can work with it
        ["transform-es2015-modules-commonjs-simple", {
          "noMangle": true,
          "addExports": true
        }]
      );
    }
    b = b.transform("babelify", {
      plugins: plugins
    });
  }

  b.bundle(function(err, buf) {
    if (err) {
      console.error(err);
      finish(-2);
    } else {
      console.info('browserify finished after %s ms', Date.now()-startTime);
      finish({
        data: buf,
        mimeType: 'application/javascript'
      });
    }
  });
};

module.exports = BrowserifyHook;
