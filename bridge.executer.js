var customMethod = {};
for(var key in bridge_config) {
  //console.log("method module load = " + bridge_config[key].module.filename);
  
  var moduel = customMethod[key] = bridge_config[key].module;
  moduel.methodConfig = bridge_config[key];
}
//console.log(customMethod);

/**
 * 入口
 */
exports.process = function(req, res) {
  console.log(req.body.req);
  var reqDataArray = req.body.req;
  var resData = {};

  this.excuteMethod(0, reqDataArray, resData, req, res);
}


/**
 * 機能を実行
 */
exports.excuteMethod = function(idx, reqDataArray, resData, req, res) {
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

    var beforeFilterArray = bridge_config[configKey].beforeFilter;
    excuteFilter(0, beforeFilterArray, reqData, req, res, function() {
      //beforeFilter(configKey, reqData, req, res);
      methodObj[reqData.method](reqData, function(result) {
        var afterFilterArray = bridge_config[configKey].afterFilter;
        excuteFilter(0, afterFilterArray, reqData, req, res, function() {
          //afterFilter(configKey, reqData, result, req, res);
          resData[reqData.key] = result;
          if (reqDataArray[++idx]) {
            exports.excuteMethod(idx, reqDataArray, resData, req, res);
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
  filterArray[idx](function() {
    if (filterArray[++idx]) {
      excuteFilter(idx, filterArray, reqData, req, res, callback, result);
    } else {
      callback();
    }
  }, reqData, req, res, result);
}



/*

exports.excuteMethod = function(ind, reqDataArray, resData, req, res) {
    //var reqData = JSON.parse(reqDataArray[ind]);
    var reqData = reqDataArray[ind];
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
        beforeFilter(configKey, reqData, req, res);
        methodObj[reqData.method](reqData, function(result) {
            afterFilter(configKey, reqData, result, req, res);
            //return result;
            resData[reqData.key] = result;

            if (reqDataArray[++ind]) {
                exports.excuteMethod(ind, reqDataArray, resData, req, res);
            } else {
                res.json(resData);
                //return resData;
            }

        }, req, res);
    } catch (e) {
        console.log(e.message);
        console.log(e.stack);
        res.json({error : e.message});
        //return {error : e.message};
    } finally {
        //return resData;
    }
};
*/

var beforeFilter = function(configKey, reqData, req, res) {
//console.log('--', configKey, bridge_config);
  var filters = bridge_config[configKey].beforeFilter;
  if (filters) {
    for(var ind in filters) {
      //console.log("beforeFilter - " + ind);
      filters[ind](reqData, req, res);
    }
  }
  //throw new Error('例外');
}

var afterFilter = function(configKey, reqData, result, req, res) {
  var filters = bridge_config[configKey].afterFilter;
  if (filters) {
    for(var ind in filters) {
      //console.log("afterFilter - " + ind);
      filters[ind](reqData, result, req, res);
    }
  }
}
