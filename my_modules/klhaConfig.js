module.exports = {
	cmd: {
		handleBagCmd: '15 01 22 22 00 01 80', /*握手包：15 01 22 22 00 10 +网关序列号*/
		readStatusCmd: '15 01 00 00 00 06 FF 01 55 55 00 0f', /*读状态值命令 最后一位取值范围:01-ff  表示1-64个设备地址*/
		readDataCmd: '15 01 00 00 00 06 channel_num 03 00 00 00 08', /*读数据命令 最后一位表示通道数，与设备有关*/
		gatewayKey: ['1100201507100022',],/*网关序列号*/
	},
	mysql: {
	    host : 'localhost',
	    port : '3306',
	    user: 'root',
	    password: 'root',
	    database: 'byt_iot_klha'
	},
	device_id : {
		addr_2: '1100201507100022'
	},
	server_info: {
		host: '192.168.2.222',
	},
	frequency: 1000 * 2 * 60, // 读取频率，单位毫秒
	port: 7003, //监听端口, 连接新普慧气象站的DTU设置的端口
	host: '0.0.0.0' //本机IP
};