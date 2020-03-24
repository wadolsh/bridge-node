var bridge_config = null;
var customMethod = {};

module.exports = function(config) {
  for(var key in config) {
//console.log("method module load = " + config[key].module.filename, key, config[key].module);
    var module = customMethod[key] = config[key].module;
    module.methodConfig = config[key];
    if (module.init) module.init(module.methodConfig);
  }
  bridge_config = config;
  return {
    route: route,
    process: process
  }
}

var route = function(req, res) {
  var requestUrl = req.url;
console.log('url:' + requestUrl, req.method, req.headers['x-forwarded-for'] || req.connection.remoteAddress);
  //console.log(requestUrl);
  var pathNames = requestUrl.split(/[/?]/);
  var routhFunc = route;
  for (var i=0, length=pathNames.length; i < length; i++) {
    var path = pathNames[i].trim();
    if (!path) continue;
    if (routhFunc[path]) {
      routhFunc = routhFunc[path];
    } else if (routhFunc === route) {
      res.end('PathName: ' + requestUrl + "\n");
      return;
    }
  }
  routhFunc(req, res);
}

route.bridge = function(req, res){
  res.json = function(json) {
    res.end(JSON.stringify(json, null, 2));
  }
  process(req, res);
};


/**
 * 入口
 */
var process = function(req, res) {
  console.log(JSON.stringify(req.body.req, function(key, value) {
    if (typeof value === "string") {
      return value.substring(0, 1000);
    }
    return value;
  }));
  var reqDataArray = req.body.req;
  var resData = {};
  excuteMethod(0, reqDataArray, resData, req, res);
}

/**
 * 機能を実行
 */
var excuteMethod = function(idx, reqDataArray, resData, req, res) {
  //var reqData = JSON.parse(reqDataArray[idx]);
  var reqData = reqDataArray[idx];
  reqData = typeof reqData == 'string' ? JSON.parse(reqData) : reqData;
  try {
//console.log('method:', reqData.method);
    var configKey = null;
    var methodObj = null;
    var selected = null;
    for (var key in customMethod) {
      selected = customMethod[key];
      if (selected[reqData.method]) {
        configKey = key;
        methodObj = selected;
        break;
      }
    }

    if (!configKey) {
      res.json({error : 'Not exists method.'});
      return;
    }

    var beforeFilterArray = bridge_config[configKey].beforeFilter || [];
    excuteFilter(0, beforeFilterArray, reqData, req, res, function() {
      //beforeFilter(configKey, reqData, req, res);
      methodObj[reqData.method](reqData, function(result, err) {
        if (err) {
          resData['error'] = err.errmsg || JSON.stringify(err);
          res.json(resData);
          return;
        }
        var afterFilterArray = bridge_config[configKey].afterFilter || [];
        excuteFilter(0, afterFilterArray, reqData, req, res, function() {
          //afterFilter(configKey, reqData, result, req, res);
          resData[reqData.key] = result;
          if (reqDataArray[++idx]) {
            excuteMethod(idx, reqDataArray, resData, req, res);
          } else {
            res.json(resData);
          }
        }, result);
      }, req, res);
    });

  } catch (e) {
      console.log(e.message, e.stack);
      res.json({error : e.message});
  } finally {
      //return resData;
  }
};

var excuteFilter = function(idx, filterArray, reqData, req, res, callback, result) {
  if (!filterArray || !filterArray[idx]) {
    callback();
    return;
  }
  filterArray[idx](function() {
    if (filterArray[++idx]) {
      excuteFilter(idx, filterArray, reqData, req, res, callback, result);
    } else {
      callback();
    }
  }, reqData, req, res, result);
}
