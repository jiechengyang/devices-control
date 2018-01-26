(function(){
	window.onload = () => {
		switchEvent("#device-switch",() =>{
			console.log('开');
		},() =>{
			console.log('关');
		});
		switchEvent("span[name='device-switch']",(ele) =>{
			var device_id = $(ele).data('id') ? $(ele).data('id') : $(ele).attr('data-id');
			jQuery.ajax({
				type: 'POST',
				url: '/devicesControl',
				data: {is_on: 2, device_id: device_id},
				//dataType:'JSON',
				success: function(data) {
					console.log(data);
					if (data === '1') {
						window.location.reload();
					}
				},
				error: function(XMLHttpRequest, textStatus, errorThrown) {
					 layer.alert(XMLHttpRequest.status);
					 layer.alert(XMLHttpRequest.readyState);
					 layer.alert(textStatus);                                              
				}
			});
		},(ele) =>{
			var device_id = $(ele).data('id') ? $(ele).data('id') : $(ele).attr('data-id');
			jQuery.ajax({
				type: 'POST',
				url: '/devicesControl',
				data: {is_on: 1, device_id: device_id},
				success: function(data) {
					console.log(data);
					if (data === '1') {
						window.location.reload();
					}
				},
				error: function(XMLHttpRequest, textStatus, errorThrown) {
					 layer.alert(XMLHttpRequest.status);
					 layer.alert(XMLHttpRequest.readyState);
					 layer.alert(textStatus); 
				}
			});
		});
	}
})();