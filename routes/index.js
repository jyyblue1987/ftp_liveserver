var express = require('express');
var router = express.Router();
var request = require('request');
var config = require('../module/config');
const fs = require('fs');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post('/holdresume', function(req, res, next) {
  
});



module.exports = router;
