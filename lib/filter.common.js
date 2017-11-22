exports.startLogger = function(next, reqData, req, res) {
  //console.log(reqData);
  next();
}

exports.endLogger = function(next, reqData, req, res, result) {
  //console.log(result);
  next();
}