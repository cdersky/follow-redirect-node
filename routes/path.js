var express = require('express');
var router  = express.Router();
var http    = require('http');
var https   = require('https');
var urls    = require('url');

/* GET users listing. */
router.get('/', function(req, res, next){

  var url = req.query.sentURL || null;

  if(url){
    traceURL(url, req, res)
  } else{
    noURL(res);
  }

});


function traceURL(url, req, res){

  var imageUrl  = req.query.imageURL;
  var userAgent = getUserAgent(req.query.agentType);

  return new Promise(function(resolve, reject){
    //The response object to return
    var json = {
      responses : []
    };

    function get(url){

      url   = (!!url) ? url : '';
      var h = (url.indexOf('https:') > -1) ? https : http;

      var options     = urls.parse(url);
      options.headers = {
        'User-Agent' : userAgent
      };



      const client = h.get(options, (response) =>{

        clearTimeout(timeout);

        var urlType = determineURLType(url);
        var data    = {
          status   : response.statusCode,
          url      : url,
          urlType  : urlType,
          imageUrl : imageUrl
        };

        json.responses.push(data);

        if(response.statusCode === 200){
          done(json, res);
        } else{
          get(response.headers.location);
        }

      }).on('abort', function(){
        client.close()
      }).on('error', function(err){
        console.error(err);

        json.responses.push({
          status   : 'Error with URL',
          url      : url,
          urlType  : '',
          imageUrl : imageUrl
        });

        done(json, res);
      });

      // if the client's site times out
      client.setTimeout(8000, ()=>{
        clearTimeout(timeout);
        client.abort();
      });


      return client;
    }

    // if we cannot connect
    let timeout = setTimeout(function() {
      cannotConnect(res, url);
    }, 8000);


    get(url);

  }).catch((error) =>{
    console.error('Promise Error: ' + error);
    done(json, res);
  });

}

function done(json, res){
  res.render('path',
    {
      title    : 'Redirect Tracker',
      response : JSON.stringify(json),
      errorMsg : null
    }
  );

}


function cannotConnect(res, h){

  res.render('path', {
      title    : 'Redirect Tracker',
      url      : '',
      errorMsg : 'Cannot connect to url. Please check link: ' + h
    }
  );

}

function noURL(res){

  res.render('path', {
      title    : 'Redirect Tracker',
      url      : '',
      errorMsg : 'No URL provided',
      response : JSON.stringify({})
    }
  );

}

function determineURLType(url){
  var path = url.split('?')[0];
  path     = path.split('.com/')[1];
  var msg  = '';

  if(path){
    let valToCompare = path.substring(1, 4);
    if(valToCompare === '/cp' && path.substr(-2) == '/c'){
      msg = 'tracks the click at the campaign level';
    } else if(valToCompare === '/cp' && path.substr(-2) == '/r'){
      msg = 'sets the user cookies and finds the block level redirect';
    } else if(valToCompare === '/rp' && path.substr(-4) == '/url'){
      msg = 'tracks the click at the block level';
    }
  }
  return msg;
}

function getUserAgent(agentType){

  if(agentType === 'desktop'){
    return 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/602.2.14 (KHTML, like Gecko) Version/10.0.1 Safari/602.2.14';
  } else{
    return 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_1_1 like Mac OS X) AppleWebKit/602.2.14 (KHTML, like Gecko) Version/10.0 Mobile/14B100 Safari/602.1';
  }

}

module.exports = router;
