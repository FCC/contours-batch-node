// **********************************************************

'use strict';

// **********************************************************

var configEnv = require('../config/env.json');
var NODE_ENV = process.env.NODE_ENV;
var NODE_PORT =  process.env.PORT || configEnv[NODE_ENV].NODE_PORT;
var host =  configEnv[NODE_ENV].HOST;
var geo_host =  configEnv[NODE_ENV].GEO_HOST;
var geo_space = configEnv[NODE_ENV].GEO_SPACE;
var data_dir = configEnv[NODE_ENV].DATA_DIR;
var bucket = configEnv[NODE_ENV].BUCKET_NAME;
var access_key = configEnv[NODE_ENV].ACCESS_KEY;
var secret_key = configEnv[NODE_ENV].SECRET_KEY;

var request = require('request');
var fs = require('fs-extra');
var AdmZip = require('adm-zip');
var unzip = require('unzip');
var AWS = require('aws-sdk');

AWS.config.update({
	accessKeyId: access_key,
	secretAccessKey: secret_key,
	region: 'us-west-2',
	apiVersions: {
		s3: '2006-03-01',
		// other service API versions
		}
});

var s3 = new AWS.S3();


//fetched files
var dum = fs.readFileSync(data_dir + '/file_list.txt', 'utf-8');
var files = dum.split('\n')
var fetched_files = [];
var dum1;

for (var i = 0; i < files.length; i++) {
	dum = files[i].split(' ');
	if (dum[0] != '') {
		fetched_files.push(dum[0]);
	}
}

var lat, lon, ns, ew, filename;
var root_url = 'https://prd-tnm.s3.amazonaws.com/StagedProducts/Elevation/1/GridFloat';

var filename = [];
var filepath = [];
var url = [];


for (lat = 40; lat >= 40; lat--) {
	for (lon = -106; lon <= -106; lon++) {
		var fi = makeFileName(lat, lon);
		//var fi_flt = fi.replace('.zip', '.flt').toLowerCase();
		var fi_flt = 'float' + fi.replace('.zip', '.flt').toLowerCase().replace('.flt', '_1.flt');
		console.log(fi_flt);
		
		if (fetched_files.indexOf(fi_flt) < 0 && fi_flt != '') {
			filename.push(fi);
			url.push(root_url + '/' + fi);
			filepath.push(data_dir + '/dummy/' + fi);
		}
	}
}

if (url.length > 0) {
	getFile(0);
}


function makeFileName(lat, lon) {

	var ns = 'n';
	if (lat < 0) {
		ns = 's';
	}
	var ew = 'w';
	if (lon >= 0) {
		ew = 'e';
	}
	
	var lat_ul = Math.abs(Math.ceil(lat));
	var lon_ul = Math.abs(Math.floor(lon));
	
	var lat_str = padZero(lat_ul, 2);
	var lon_str = padZero(lon_ul, 3);
	
	var filename = 'USGS_NED_1_' + ns + lat_str + ew + lon_str + '_GridFloat.zip';
	var filename = ns + lat_str + ew + lon_str + '.zip';
	
	return filename;
}

function padZero(a, n) {
	//n - total number of digits
	var a_str = a + '';
	while (a_str.length < n) {
		a_str = '0' + a_str;
	}
	
	return a_str;
}

function getFile(n) {
	console.log('n: ' + n);
	console.log('filepath: ' + filepath[n]);
	console.log('url: ' + url[n]);
	console.log('start download:')
	console.log(new Date());
	
	fs.emptyDirSync(data_dir + '/dummy');
	
	request({url: url[n], encoding: null, rejectUnauthorized: false, strictSSL: false}, function (err, response, body) {
		
		if (err) {
				
			//console.error('err.stack : ' + err.stack);
			//console.error('err.name : ' + err.name);
			//console.error('err.message : ' + err.message);
		
			var err_res = {};       
			err_res.responseStatus = {
				'status': 500,
				'type': 'Internal Server Error',
				'err': err.name +': '+ err.message      
			};  
				
			res.status(500);
			//res.send(err_res);
			if (n+1 < url.length) {
				getFile(n+1);
			}			

		}
		else {
		
			//console.log('response.statusCode : ' + response.statusCode);			
			//console.log('response.headers[content-type] : ' + response.headers['content-type']);
			//console.log('response.headers : ' + JSON.stringify(response.headers) );
			
			console.log('filename: ' + filename[n] + ' status: ' + response.statusCode);
			var flt_filename = 'float' + filename[n].replace('.zip', '.flt').toLowerCase().replace('.flt', '_1.flt');
			var flt_filepath = data_dir + '/dummy/' + flt_filename;
			if (response.statusCode == 200) {
			
				//console.log("write download file " + filepath);
				fs.writeFile(filepath[n], body, 'binary', function(err) {
					if(err) {
						return console.log(err);
					}
					
					//unzip

					console.log(filepath[n]);
					
					var zip = new AdmZip(filepath[n]);
					zip.extractAllTo(data_dir + '/dummy');
					
					console.log('uploading to S3: ' + flt_filepath);
					console.log(new Date())
					fs.readFile(flt_filepath, function(err, file_buffer){
						var params = {
							Bucket: bucket,
							Key : 'ned_1_zip/' + flt_filename,
							Body: file_buffer
						};

						s3.putObject(params, function (perr, pres) {
							if (perr) {
								console.log("Error uploading data: ", perr);

							} else {
								console.log("Successfully uploaded data");
								console.log(new Date());
								
								fs.appendFileSync(data_dir + '/file_list.txt', flt_filename + ' yes\n');
								fs.emptyDirSync(data_dir + '/dummy');
								if (n+1 < url.length) {
									getFile(n+1);
								}

							}
						});
					});			
				});
			
			}
			else {
				console.log('File not found: ' + url[n]);
				fs.appendFileSync(data_dir + '/file_list.txt', flt_filename + ' no\n');

				if (n+1 < url.length) {
					getFile(n+1);
				}
			}
			
		}
		
	});
		
}
			
