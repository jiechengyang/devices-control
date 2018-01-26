require('babel-register');  // 依赖babel
const express = require('express');
const net = require('net');
const util = require('util');
const sprintf = require("sprintf-js").sprintf;
const mysqlTool = require('../my_modules/mysqlTool');
const dtuConfig = require('../my_modules/dtuConfig');
let router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  mysqlTool.select('device', (err, data) => {
  	 res.render('index', { title: '设备控制', head: '设备管理', 'devicesData': data});
  });
});

router.post('/devicesControl', (req, res, next) => {
	// console.log(req.body);
	var defaultCmd = ['DTU_AS_CLIENT', 'WIFI'];
	mysqlTool.findOne('device', 'id=' + req.body.device_id, async(err, data) => {
	    try {
	    	var cmd = req.body.is_on == 2 ? data.on_cmd : data.off_cmd;
	        var getawait1 = await async1(cmd, defaultCmd, req.body.is_on, req.body.device_id);
	        var result = getawait1 == 1 ? '1' : '0';
	        util.log(result);
	        res.redirect('/');
	    } catch (e){
	        console.log(e);
	        res.send(e.message);
	    }
	});

});

router.post('/ledControl', (req, res, next) => {
	util.log(req.body);
	// res.json(['success', "服务器收到一个Ajax ["+type+"] 请求，信息为："+info]);
	var socket = new net.Socket();
	socket.connect(dtuConfig.socketHostPort, dtuConfig.socketHostIp, async() => {
		console.log('(LED)CONNECTED TO: ' + dtuConfig.socketHostIp + ':' + dtuConfig.socketHostPort);
		try {
			var getawait2 = await async2(socket, req.body.led_message);
			var result = getawait2  ? '1' : '0';
			res.send(result);
		} catch(e) {
	        console.log(e);
	        res.send(e.message);
		}
	});
	socket.on('end', () => {
		console.log('(LED)断开与服务器连接');
	});
	res.redirect('/');
});

async function async1(cmd, defaultCmd, isOn, id) {
    return new Promise(function (resolve, reject) {
        setTimeout(function () {
        	var cmdArr = cmd.split('#');
			if(in_array(cmdArr[0], defaultCmd)) {
				var socket = new net.Socket();
				// 在给定的套接字上启动一个连接。
				// var socket = net.connect({host: dtuConfig.socketHostIp, port: dtuConfig.socketHostPort}, () => {
				// 	console.log('CONNECTED TO: ' + dtuConfig.socketHostIp + ':' + dtuConfig.socketHostPort);
				// 	socket.write(cmd);
				// 	socket.end();
				// });
				socket.connect(dtuConfig.socketHostPort, dtuConfig.socketHostIp, () => {
				    console.log('CONNECTED TO: ' + dtuConfig.socketHostIp + ':' + dtuConfig.socketHostPort);
				    // 建立连接后立即向服务器发送数据，服务器将收到这些数据 
				    // 在 socket 上发送数据。第二个参数制定了字符串的编码 - 默认是 UTF8 编码。如果全部数据都成功刷新到内核的缓冲则返回 true。如果全部或部分数据在用户内中排队，则返回 false。当缓冲再次空闲的时候将触发 'drain' 事件。当数据最终都被写出之后，可选的 callback 参数将会被执行 - 可能不会立即执行。
				    socket.write(cmd);	
				    // socket.setKeepAlive
				    // 启用/禁用长连接功能， 并且在第一个长连接探针被发送到一个空闲的 socket 之前可选则配置初始延迟。enable 默认为 false。
				    // 半关闭 socket。例如发送一个 FIN 包。服务端仍可以发送数据。
				    socket.end();				
				});

				socket.on('data', (data) => {
					var result = data.toString();
					if (result !== '1') {
						resolve(0);
					}
			        mysqlTool.update('device', {'is_on': isOn}, {'id': id}, (err, data) =>{
			        	if (err) {
			        		resolve(0);
			        		return console.error(err);
			        	}
			        	resolve(1);
			        });
					socket.end();
				});

				socket.on('end', () => {
					console.log('断开与服务器连接');
				});
			}
			util.log(cmd);
        }, 1);
    });
}

async function async2(socket, mesage)
{
	return new Promise((resolve, reject) => {
		setTimeout(() => {
		  console.log('LED CONNECTED TO: ' + dtuConfig.socketHostIp + ':' + dtuConfig.socketHostPort);
		  var ledAddr = '001';
		  var content = '!#' + sprintf("%03d", ledAddr) + message + '$$';
		  var cmd = 'LED#' +dtuConfig.dtuIds[1] + '#' + content; 
		  var res = socket.write(cmd);
		  socket.end();	
		  resolve(res);
		}, 1)
	});
}

function in_array(needle, hasyk) 
{
	var flag = false;
	for(var p in hasyk) {
		if (needle == hasyk[p]) {
			flag = true;
			break;
		}
	}

	return flag;
}

module.exports = router;
