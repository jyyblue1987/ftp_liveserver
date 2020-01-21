var express = require('express');
var router = express.Router();
var request = require('request');
var config = require('../module/config');
const fs = require('fs');
var sprintf = require("sprintf-js").sprintf,
    vsprintf = require("sprintf-js").vsprintf;
const { exec } = require('child_process');

/* GET home page. */
router.get('/', function(req, res, next) {
  	res.render('index', { title: 'Express' });
});

router.post('/createcamera', function(req, res, next) {	
	var camera_id = req.body.camera_id;

	dir = config.FTP_DIR + '/' + camera_id;
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }

	var command = sprintf('sudo chown %s:%s %s', config.FTP_USER, config.FTP_USER, dir)
    exec(command, (err, stdout, stderr) => {
        if (err) {
            //some err occurred
			console.error(err);
			var data = {'error' : err};
      		res.send(data);
        } else {
            // the *entire* stdout and stderr (buffered)
            console.log(`stdout: ${stdout}`);
			console.log(`stderr: ${stderr}`);
			
			var data = {code : 200};
			res.send(data);
        }
    });	
});


module.exports = router;
