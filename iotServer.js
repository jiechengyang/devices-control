const net = require('net');
const util = require('util');
const DtuConfig = require('./my_modules/dtuConfig');
const klhaConfig = require('./my_modules/klhaConfig');
const dateFormat = require('dateformat');
const mysql = require('mysql');
const PORT = 8090;
var clients = [];
var klhaClients = [];
var is_klha = false;
var db = mysql.createConnection(klhaConfig.mysql);
const server =  net.createServer(function connectionListener(socket) {
	console.log('Client come in: ' + socket.remoteAddress +':'+ socket.remotePort);
	// 当接收到数据的时触发该事件。data 参数是一个 Buffer 或 String。数据编码由 socket.setEncoding() 设置。
	if (klhaConfig.server_info.host == socket.remoteAddress) {
		is_klha = true;
		// 发送响应包(第一次响应网关发过来的握手包，即服务端发起握手)
		sendHex(socket, klhaConfig.cmd.handleBagCmd);
	}
sendHex(socket, '150100000006100300000008');


	socket.on('data', function (data) {
		var hexData = data.toString('hex');
		var utf8Data = data.toString('utf8');
		var decData = getDecimalCmd(hexData);
		if (is_klha) {
			console.log('获取网关的16进制数据为:', hexData);
			var klhaGatewayKey = data.toString('utf8', 6); /*网关序列号*/
			console.log('网关序列号:', klhaGatewayKey);
			// 判断网关是否合法
			if(in_array(klhaGatewayKey, klhaConfig.cmd.gatewayKey)) {
				// 发送读取网关状态数据的请求
				util.log(klhaGatewayKey, 'gateway conneted---------------------------------');
				socket.gatewayLogo = klhaGatewayKey;
				// 添加定时
				socket.interval = setInterval((_socket) => {
				   sendHex(_socket, klhaConfig.cmd.readStatusCmd);
				}, klhaConfig.frequency, socket);
				
				klhaClients.push(socket);
				sendHex(socket, klhaConfig.cmd.readStatusCmd);
				return;
			}

			var dataPrefix = hexData.substr(0, 10);
			if (dataPrefix != '1501000000') {
				util.log('异常----------------------------');
				return;
			}

			var dataLength = hexData.substr(10, 2);
			if (dataLength == hexData.substr(12).length/2) {
				socket.deviceAddrs = [];
				var deviceAddr = parseInt(hexData.substr(20, 2) + hexData.substr(18, 2), 16).toString(2);/*所有通道的字节数*/
				console.log('所有通道的字节数', deviceAddr);
				for(var i = 0; i < deviceAddr.length; i++) {
					if(deviceAddr[i] == 1) {
						var index = deviceAddr.length - i;
						var addr = (Array(2).join('0') + (deviceAddr.length - i).toString(16)).slice(-2);
						console.log('设备地址:', addr);
						if (!in_array(addr, socket.deviceAddrs)) {
							socket.deviceAddrs.push(addr);
						}

						// 读取数据
						var readDataCmd = klhaConfig.cmd.readDataCmd.replace(/channel_num/, addr);
						sendHex(socket, readDataCmd);
						sleep(1);
					}
				}

				util.log(socket.gatewayLogo, ' online addrs -----------', socket.deviceAddrs);

				return;
			}

			if (socket.deviceAddrs) {
				var channelDataStr = hexData.substr(18);
				console.log(channelDataStr);
				for (var i = 0; i < socket.deviceAddrs.length; i++) {
					var dateTime = dateFormat(new Date(), 'yyyy-mm-dd HH:MM:ss');
					var sensorName = socket.deviceAddrs[i];
					// 清空原数据
					var delSql = "DELETE FROM data WHERE gateway_logo=" + socket.gatewayLogo + " AND sensor_name=" + sensorName;
					db.query(delSql, function(err, res) {
						if (err) {
							util.log('delete error: ' + err.message);
							return ;
						}

						util.log('affectedRows: ' + res.affectedRows);
					});	

					for (var j=0; j < channelDataStr.length/8; j++) {
						console.log('channelDataStr' + j, channelDataStr[j]);
						var channelNum = channelDataStr.substr(j * 8 + 0, 2);/*代表传感器类型*/
						var signed = channelDataStr.substr(j * 8 + 2, 2);/*有符号*/
						var value = parseInt(channelDataStr.substr(j * 8 + 4, 4), 16) / Math.pow(10, signed.charAt(1));/*数据值*/
						console.log('channelNum:%s,value:%s:', channelNum, value);
						var addSql = "INSERT INTO data VALUES (NULL, ?, ?, ?, ?, ?, ?, ?)";
						var addSqlParams = [dateTime, socket.gatewayLogo, sensorName, parseInt(j) + 1, channelNum, value, 0];
						db.query(addSql, addSqlParams, function(err, res) {
							if (err) {
								util.log(err.message);
								return ;
							}

							util.log(dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss"), 'insertId: ', res.insertId);
						});
					}				
				}
			}

		} else if (!in_array(decData, DtuConfig.dtuIds)) { /*表示不是LED、DEU发送过来的指令*/
			util.log(utf8Data);
			var utf8DataToArr = utf8Data.split('#');
			var dtuId = utf8DataToArr[1];
			var _cmd = utf8DataToArr[2];
			if (clients['dtu-' + dtuId]) {
				let _soket = clients['dtu-' + dtuId];
				console.log('DTU SOKET INFO:' + _soket.remoteAddress + ':' + _soket.remotePort);
				var result = sendHex(_soket, _cmd);
				var sendClientData = result ? '1' : '2';
				socket.write(sendClientData);
				socket.end();
			}
		} else {
			clients['dtu-' + decData] = socket;
		}
	});

	// 当 socket 的另一端发送一个 FIN 包的时候触发，从而结束 socket 的可读端。
	// 默认情况下（allowHalfOpen为false），socket 将发送一个 FIN 数据包，并且一旦写出它的等待写入队列就销毁它的文件描述符。当然，如果 allowHalfOpen 为 true，socket 就不会自动结束 end() 它的写入端，允许用户写入任意数量的数据。用户必须调用 end() 显示地结束这个连接（例如发送一个 FIN 数据包。）
	socket.on('end', function() {
		util.log('one client end');
	});

	// 一旦 socket 完全关闭就发出该事件。参数 had_error 是 boolean 类型，表明 socket 被关闭是否取决于传输错误
	socket.on('close', function(had_error) {
		if (is_klha) {
			for (key in klhaClients) {
				if (clients[key] === socket) {
					util.log('Client:' + key + ' end');
					clearInterval(klhaClients[key].interval);
					delete klhaClients[key];
					break;
				};
			}
		}

		if (had_error) {
			return console.error(had_error);
		}
		util.log('one client close');
	});

	socket.on('error', function (ex) {
		console.error('error', ex);
	});

	socket.on('drain', () => {
		console.log('drain event fired.');
	});
	// connect 事件
	// 当一个 socket 连接成功建立的时候触发该事件。 查看 net.createConnection()。
	//'drain' 事件
	// 当写入缓冲区变为空时触发。可以用来做上传节流。也可以查看：socket.write() 的返回值
	// 'lookup' 事件
	// 在找到主机之后创建连接之前触发。不可用于 UNIX socket。
	// 'timeout' 事件
	// 当 socket 超时的时候触发。该事件只是用来通知 socket 已经闲置。用户必须手动关闭。socket.setTimeout(3000);
});

server.on('error', (err) => {
	console.log(err);
	if (err.code  == 'EADDRINUSE') {
		console.log('(地址在使用,重试…)Address in use, retrying...');
		setTimeout(() => {
		  server.close();
		  server.listen(PORT, '0.0.0.0', HOST);
		}, 1000);
	}
	throw err;
});

server.listen(PORT, '0.0.0.0', () => {
	console.log('server bound');
	// 返回操作系统报告的 socket 的地址、地址族和端口。返回的对象有三个属性，例如： { port: 12346, family: 'IPv4', address: '127.0.0.1' }
	console.log('操作系统报告的:', server.address());
});

// cmd转成10进制
function getDecimalCmd(cmd)
{
	return parseInt(cmd.substring(0, 4), 16);
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

function sendHex (socket, command) 
{
    command = command || '01 03 00 00 F1 D8';
    command = command.replace(/[\s]*/ig, '');
    if (socket) {
    	console.log('发送的指令为:', command);
    	return socket.write(command, 'hex');
    }
}

// 休眠函数
function sleep (seconds) 
{
    var now = new Date();
    var exitTime = now.getTime() + seconds;
    var lock = true;
    while (lock) {
        now = new Date();
        if (now.getTime() > exitTime) {
        	lock = false;
        }
    }
}