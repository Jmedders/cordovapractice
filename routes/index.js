'use strict';
require('dotenv').config();
var knex = require('../db/knex');
var jwt = require('jsonwebtoken');
var bearerToken = require('express-bearer-token');
var express = require('express');
var router = express.Router();
var bcrypt = require('bcrypt');
var token;
var errors;
var GeoPoint = require('geopoint');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});


router.post('/api/signup', function(req, res, next) {
  var password = bcrypt.hashSync(req.body.password, 8);

  var zip = parseInt(req.body.zip_code);

  knex('users')
  .where({
    username: req.body.username
  })
  .then(function(data) {
    if(data.length > 0) {
      res.json({errors: "username is already taken"});
    }
    else {
      knex('users')
      .insert({
        username: req.body.username,
        password: password,
        email: req.body.email,
        street_address: req.body.street_address,
        city: req.body.city,
        state: req.body.state,
        zip_code: zip,
        is_admin: false
      }).returning("*")
      .then(function(user) {
        token = jwt.sign({ id: user[0].id, username: user[0].username, is_admin: user[0].is_admin}, process.env.SECRET);
        console.log(token);
        res.json({token:token});
        // res.redirect('/bikes');
      }).catch(function(err) {
        console.log(err);
      })
    }
  })
});

router.post('/login', function(req, res, next){
  console.log('posting');
  knex('users')
  .where({
    username: req.body.username
  })
  .first()
  .then(function(data){
    if(!data){
      res.json({errors: 'username or password is incorrect'})
    } else if(bcrypt.compareSync(req.body.password, data.password)){
      token = jwt.sign({id: data.id, username: data.username, is_admin: data.is_admin}, process.env.SECRET);
      res.json({token:token});
      console.log("token is: ", token);
    } else {
      res.json({errors: 'username or password is incorrect'})
    }
  }).catch(function(err){
    next(err);
  })
})

router.get('/api/users', function (req,res,next) {
  var wrapArr = [];
  knex('users').then(function(data){
    //json stuff here?
    var querierlat = parseFloat(data[0].latitude);
    var querierlong = parseFloat(data[0].longitude);
    var querierloc = new GeoPoint(querierlat, querierlong);



    for (var i = 0; i < data.length; i++) {
      var obj = {};
      var userlatitude = parseFloat(data[i].latitude);
      var userlongitude = parseFloat(data[i].longitude);
      var userlocation = new GeoPoint(userlatitude, userlongitude);
      var miles = querierloc.distanceTo(userlocation);
      if(miles < 50){
        var usersnames = data[i].username;
        var userids = data[i].id;
        obj.username = usersnames;
        obj.distance = miles;
        obj.userid = userids;
        wrapArr.push(obj);
      }
    }
    return wrapArr
  })
  .then(function(data){
    var promiseArr = [];
    for (let i = 0; i < data.length; i++) {
      promiseArr.push(
        knex('users_bands').where('user_id', data[i]['userid'])
              .fullOuterJoin('bands', 'bands.id', 'users_bands.band_id')
      )
    }
    return Promise.all(promiseArr);
  })
  .then(function(userbands){
    for (var i = 0; i < userbands.length; i++) {
      var currentUser = wrapArr[i];
      currentUser.bandlist = [];
      for (var j = 0; j < userbands[i].length; j++) {
        currentUser.bandlist.push(userbands[i][j]['name']);
      }
    }
    res.json(wrapArr)
  })
});
module.exports = router;