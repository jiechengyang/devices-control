const mysql = require('mysql');
const util = require('util');
const HOST = '127.0.0.1';
const USER = 'root';
const PASS = 'root';
const prefix = 'byt_';
const DATABASE = 'byt_iot';
const PORT = 3306
const db = mysql.createPool({
    host:HOST,
    user:USER,
    password:PASS,
    database:DATABASE,
    port:PORT
});

// 查找一条；
var findOne = (table,where,callback) =>{ 
    // whre is arr; [{id:1},{username:admin}];
    var _WHERE = '';
    if (util.isObject(where)) {
        _WHERE += ' WHERE ';
        for (var k in where) {
            _WHERE += k + "='" + where[k] + "' AND ";
        }
      
        _WHERE = _WHERE.slice(0,-4);
    } else if(typeof where =='string') {
        _WHERE = ' WHERE '+where;
    }

   var sql = "SELECT * FROM " + prefix + table  + _WHERE + ' LIMIT 1';
   console.log(sql + '-------------------------findOne');
   db.query(sql, (err, data) => {
        if (err) {
            callback(err, 0);
        } else {
            callback(err, data[0]);
        }
   });
}
// 按条件查询所有
var findAll = (table, fields, where, callback) => {
	let _where = '1';
	let _fields = fields || '*';
	if (util.isObject(where)) {
		for(var p in where) {
			_where += " AND (`" + p + "` = '" + where[p] + "'),"
		}
		_where = _where.substr(0, _where.length-1);
	} else {
		_where = '';
		_where += where;
	}

	let sql = 'SELECT ' + _fields + ' FROM ' + prefix + table + ' WHERE ' + _where;
	console.log(sql + '-------------------------findAll');
	db.query(sql, callback);
}

// 查找所有；
var select = (table,callback) => { 
    var sql = "SELECT * FROM " + prefix + table;
    console.log(sql);
    db.query(sql, callback);
}

// 插入
var insert  = (table,obj,callback) =>{
    //insert into table() values()
    //{username:'guojikai',age:'55',sex:'1'}
    var fields = '';
    var values = '';
    for ( var k in obj) {
        fields += k + ',';
        values = values + "'" + obj[k] + "',"
    }
    fields = fields.slice(0,-1);
    values = values.slice(0,-1);
    var sql = "INSERT INTO " + prefix + table + '(' + fields + ') VALUES(' + values + ')';
    console.log(sql + '--------------');
    db.query(sql, callback);
}

// 修改
var update = (table,sets,where,callback) => {
    var _SETS = '';
    var _WHERE = '1';
    var keys = '';
    var values = '';
    for (var k in sets) {
        _SETS += k + "='" + sets[k] + "',";
    }

    _SETS = _SETS.slice(0, -1);
    
    for (var k2 in where) {
        _WHERE += ' AND (' + k2 + "='" + where[k2] + "'),";
    }

    _WHERE = _WHERE.substr(0, _WHERE.length-1);

    var sql = "UPDATE " + prefix + table + '  SET ' + _SETS + ' WHERE ' + _WHERE;
    console.log(sql + '--------------update');
    db.query(sql, callback);
}

// 删除
var del = (table,where,callback) =>{
    var _WHERE = '1';
    
    for (var k2 in where) {
        _WHERE += ' AND (' + k2 + "='" + where[k2] + "'),";
    }

    _WHERE = _WHERE.substr(0, _WHERE.length-1);
    
    var sql = "DELETE  FROM " + prefix + table + '  WHERE ' + _WHERE;
    db.query(sql, callback);
}

module.exports={
    db: db,
    insert: insert,
    select: select,
    findOne: findOne,
    findAll: findAll,
    del: del,
    update: update
};