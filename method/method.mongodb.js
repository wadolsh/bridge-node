//mongodb = require('mongodb');
var mongodb = require('mongodb');
var ObjectID = mongodb.ObjectID;
//https://github.com/mongodb/node-mongodb-native
//http://mongodb.github.io/node-mongodb-native/api-generated/collection.html

var newId = function () {
  // Create a new ObjectID
  return useOid ? new ObjectID() : new ObjectID().toHexString();
};

var getId = function (id, tableName) {
  var collectionMeta = config.db.collections[tableName];
  var _useOid = collectionMeta && collectionMeta.useOid ? collectionMeta.useOid : useOid;
  return _useOid ? new ObjectID(id) : id;
}

var config = null;
var idName = null;
var useOid = null;
exports.init = function (_config) {
  config = _config;
  idName = _config.db.idName;
  useOid = _config.db.useOid;
}

/*
var Db = require('mongodb').Db,
  MongoClient = require('mongodb').MongoClient,
  Server = require('mongodb').Server,
  ReplSetServers = require('mongodb').ReplSetServers,
  ObjectID = require('mongodb').ObjectID,
  Binary = require('mongodb').Binary,
  GridStore = require('mongodb').GridStore,
  Grid = require('mongodb').Grid,
  Code = require('mongodb').Code,
  BSON = require('mongodb').pure().BSON,
  assert = require('assert');
*/

/**
 * 1件取得
 */
exports.reqData = function (reqData, callback) {
  var query = {};
  //query[idName] = reqData[idName];
  if (reqData[idName]) {
    query[idName] = getId(reqData[idName], reqData.dataName);
  } else if (reqData.parm) {
    query = reqData.parm;
  } else {
    query[idName] = null;
  }
  
  exports.methodConfig.db.database.collection(reqData.dataName).findOne(query, function (err, docs) {
    //if(err) throw err;
    if (err) return callback(null, err);
    callback(docs);
  });
};

/**
 * リスト取得
 */
exports.reqList = function (reqData, callback) {
  //console.log('reqListQuery', reqData.dataName, reqData.parm);
  var queryFilter = null;
  var projection = null;
  if (Array.isArray(reqData.parm)) {
    queryFilter = reqData.parm[0];
    projection = reqData.parm[1];
    console.log('queryFilter', queryFilter);
    console.log('projection', projection);
  }
  else {
    queryFilter = reqData.parm;
    projection = {};
  }

  var result = exports.methodConfig.db.database.collection(reqData.dataName).find(queryFilter, projection);
  if (reqData.option) {
    console.log('option', reqData.option);
    var option = null;
    if (Array.isArray(reqData.option)) {
      for (var idx in reqData.option) {
        option = reqData.option[idx];
        for (var key in option) {
          result[key](option[key]);
        }
      };
    }
    else {
      for (var key in reqData.option) {
        option = reqData.option[key];
        result[key](option);
      }
    }
  }
  result.toArray(function (err, docs) {
    //if(err) throw err;
    if (err) return callback(null, err);
    callback(docs);
  });
};

exports.reqCount = function (reqData, callback) {
  exports.methodConfig.db.database.collection(reqData.dataName).find(reqData.parm).count(function (err, docs) {
    console.log(docs);
    //if(err) throw err;
    if (err) return callback(null, err);
    callback(docs);
  });
};


exports.reqDistinct = function (reqData, callback) {
  exports.methodConfig.db.database.collection(reqData.dataName).distinct(reqData.field, reqData.parm, function (err, docs) {
    //if(err) throw err;
    if (err) return callback(null, err);
    callback(docs);
  });
};

exports.reqAggregate = function (reqData, callback) {
  exports.methodConfig.db.database.collection(reqData.dataName).aggregate(reqData.parm).toArray(function (err, docs) {
    //if(err) throw err;
    if (err) return callback(null, err);
    callback(docs);
  });
};

exports.reqInsert = function (reqData, callback) {
  // id採番
  //reqData.data[idName] = newId();
  if (Array.isArray(reqData.data)) {
    reqData.data.forEach(o => {
      o[idName] = o[idName] || newId();
    });
    exports.methodConfig.db.database.collection(reqData.dataName).insertMany(reqData.data, {
      w: 1
    }, function (err, docs) {
      //if(err) throw err;
      if (err) return callback(null, err);
      callback(docs);
    });
  } else {
    reqData.data[idName] = reqData.data[idName] || newId();
    exports.methodConfig.db.database.collection(reqData.dataName).insertOne(reqData.data, {
      w: 1
    }, function (err, docs) {
      //if(err) throw err;
      if (err) return callback(null, err);
      callback(docs);
    });
  }
};

/*
exports.reqInsertId = function(reqData, callback){
  MongoClient.connect(exports.methodConfig.db.url, function(err, db) {
    if(err) throw err;
    // id採番
    reqData.data[idName] = reqData.data[idName] || newId();
    db.collection(reqData.dataName).insertOne(reqData.data, {w:1}, function (err, docs) {
      if(err) throw err;
      callback(docs[0]);
    });
  });
};
*/


exports.reqBulkUpdate = function (reqData, callback, req) {
  var query = req.query ? req.query : {};
  //query[idName] = reqData.data[idName];
  query[idName] = getId(reqData.data[idName], reqData.dataName);
  delete reqData.data[idName];

  var bulk = exports.methodConfig.db.database.collection(reqData.dataName).initializeUnorderedBulkOp();
  var bulkDatas = reqData.data;
  var selected = null;
  for (var i = 0, size = bulkDatas.length; i < size; i++) {
    selected = bulkDatas[i];
    bulk.find(selected.find).updateOne({
      $set: selected.update
    });
    //console.log(selected);
  }
  bulk.execute(function (err, docs) {
    //if(err) throw err;
    if (err) return callback(null, err);

    if (docs == 0) {
      callback({});
      return;
    }
    callback(docs);
  });
};

exports.reqUpdate = function (reqData, callback, req) {
  var query = req.query ? req.query : {};
  //query[idName] = reqData.data[idName];
  query[idName] = getId(reqData.data[idName], reqData.dataName);
  delete reqData.data[idName];

  var updateData = {};

  Object.keys(reqData.data).forEach(function(key) {
    if (key.startsWith('$')) {
      updateData[key] = reqData.data[key];
      delete reqData.data[key];
    }
  });
  updateData['$set'] = reqData.data;

  exports.methodConfig.db.database.collection(reqData.dataName)
         .updateOne(query, updateData, function (err, docs) {
    //if (err) throw err;
    if (err) return callback(null, err);

    if (docs == 0) {
      callback({});
      return;
    }
    callback(reqData.data);
  });
};

exports.reqUpdateOperator = function (reqData, callback, req) {
  var query = req.query ? req.query : {};
  //query[idName] = reqData.data[idName];
  //query[idName] = getId(reqData.data[idName], reqData.dataName);
  for (var key in reqData.query) {
    query[key] = reqData.query[key];
  }
  delete reqData.data[idName];
  var updateData = reqData.operator;

  if (updateData['$set']) {
    var $setData = reqData.data;
    for (var key in $setData) {
      updateData['$set'][key] = $setData[key];
    }
  }
  else {
    updateData['$set'] = reqData.data;
  }

  console.log('query:', query);
  console.log('updateData:', updateData);
  exports.methodConfig.db.database.collection(reqData.dataName).updateMany(query, updateData, function (err, docs) {
    //if (err) throw err;
    if (err) return callback(null, err);
    if (docs == 0) {
      callback({});
      return;
    }
    callback(updateData);
  });
};
/*
exports.reqSave = function(reqData, callback){
    MongoClient.connect(exports.methodConfig.db.url, function(err, db) {
        if(err) throw err;
        db.collection(reqData.dataName).save(reqData.data, {w:1}, function (err, docs) {
            if(err) throw err;
            callback(docs);
        });
    });
};
*/

exports.reqSave = function (reqData, callback, req) {
  var id = reqData.data[idName];
  if (id) {
    //update
    var query = req.query ? req.query : {};
    //query[idName] = id;
    query[idName] = getId(id, reqData.dataName);
    delete reqData.data[idName];
    //console.log('query', query, reqData.data);
    exports.methodConfig.db.database.collection(reqData.dataName).updateOne(query, {
      $set: reqData.data,
    }, {
      multi: true
    }, function (err, docs) {
      if (err) {
        //throw err;
        return callback(null, err);
      }
      if (docs == 0) {
        callback({});
        return;
      }
      callback(reqData.data);
      //callback(docs.ops[0]);
    });
  }
  else {
    reqData.data[idName] = newId();
    exports.methodConfig.db.database.collection(reqData.dataName).insertOne(reqData.data, {
      w: 1
    }, function (err, docs) {
      if (err) {
        //throw err;
        return callback(null, err);
      }
      callback(reqData.data);
    });
  }
};

exports.reqDelete = function (reqData, callback, req) {
  var query = reqData.query ? reqData.query : {};
  //query[idName] = reqData[idName];
  console.log('---------', reqData[idName], reqData[idName] == '*');
  if (reqData[idName] == '*') {
    query = {};
  }
  else if (reqData[idName]) {
    query[idName] = getId(reqData[idName], reqData.dataName);
  }
  else {
    callback({
      delete: false
    });
    return;
  }

  console.log(reqData);
  console.log(query);
  exports.methodConfig.db.database.collection(reqData.dataName).remove(query, {
    w: 1
  }, function (err, docs) {
    if (err) {
      //throw err;
      return callback(null, err);
    }
    callback(docs);
  });
};

exports.reqDrop = function (reqData, callback, req) {
  //var query = reqData.query ? reqData.query : {};
  //query[idName] = getId(reqData[idName], reqData.dataName);
  exports.methodConfig.db.database.listCollections({
    name: reqData.dataName
  }).hasNext(function (err, exist) {
    console.log('reqDrop', exist, reqData);
    if (exist) {
      exports.methodConfig.db.database.collection(reqData.dataName).drop(function (err, drop) {
        //if (err) throw err;
        if (err) return callback(null, err);
        callback({
          exist: exist,
          drop: drop
        });
      });
    }
    else {
      callback({
        exist: exist
      });
    }
  });
};
