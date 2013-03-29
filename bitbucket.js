(function() {

  var Bitbucket = function(delegate) {
    this.delegate = delegate;

    this.OAUTH_CONSUMER_KEY = '6PreHKPUjgPLvSPEmP';
    this.OAUTH_CONSUMER_SECRET = 'HWcgZFXRpdh3FvUn4YubGxaNLgLYAhJ6';

    this.oauth_request_token_url = 'https://bitbucket.org/!api/1.0/oauth/request_token';
    this.oauth_authorize_token_url = 'https://bitbucket.org/!api/1.0/oauth/authenticate?oauth_token=';
    this.oauth_access_token_url = 'https://bitbucket.org/!api/1.0/oauth/access_token';
  };

  Bitbucket.prototype.authRequirements = function(callback) {
    var self = this;
    this.requestToken(function(err,response) {
      if (err) {
        return callback(err);
      }

      response = parseQueryString(response);
      var authURL = this.oauth_authorize_token_url + response.oauth_token;

      self.delegate.persistence.set('secret', response.oauth_token_secret);
      self.delegate.persistence.set('token', response.oauth_token);

      callback({
        authType: "oauth",
        url: authURL + response.oauth_token
      });
    });
  };

  Bitbucket.prototype.requestToken = function(callback) {
    var callbackURL = this.delegate.callbackURL();
    var time = new Date().getTime();
    HTTP.request({
      url: this.oauth_request_token_url,
      method: 'POST',
      oauth: {
        oauth_consumer_key: this.OAUTH_CONSUMER_KEY,
        oauth_nonce: this.getNonce(7),
        oauth_signature: 'POST&'+this.oauth_request_token_url+'&'+this.oauth_consumer_key,
        oauth_signature_method: 'PLAINTEXT',
        oauth_timestamp: time,
        oauth_callback: callbackURL
      }
    }, callback);
  };

  Bitbucket.prototype.authenticate = function(params) {
    var self = this;

    self.access_token(params, function(err, response) {
      if(err) {
        console.log(err);
        return;
      }

      var auth = parseQueryString(response);

      self.getMemberDetails('me', auth, function(err, userDetails) {
        if(err) {
          console.log(err);
          return;
        }
        userDetails = JSON.parse(userDetails);
        self.delegate.createAccount({
          name: userDetails.first_name + ' ' + userDetails.last_name,
          identifier: userDetails.username,
          secret: JSON.stringify(auth)
        });
      });
    });
  };


  BitBucket.prototype.getMemberDetails = function(id, auth, callback) {
    HTTP.request({
      url: 'https://api.bitbucket.org/1.0/user',
      method: 'GET',
      oauth: {
        oauth_consumer_key: this.OAUTH_CONSUMER_KEY,
        oauth_token: auth.oauth_token,
        oauth_token_secret: auth.oauth_token_secret,
        oauth_version: '1.0'
      }
    }, callback);
  };


  Bitbucket.prototype.accessToken = function(params,callback) {
    var oauth_token = this.persistence.get('token');
    HTTP.request({
      url: this.oauth_access_token_url,
      method: 'POST',
      oauth: {
        oauth_consumer_key: this.OAUTH_CONSUMER_KEY,
        oauth_token: oauth_token,
        oauth_nonce: this.getNonce(7),
        oauth_signature: 'POST&'+this.oauth_access_token_url+'&'+this.oauth_consumer_key,
        oauth_signature_method: 'PLAINTEXT',
        oauth_timestamp: time
      }
    }, callback);
  };

  Bitbucket.prototype.update = function(user, callback) {
    this.getInvitations(user, function(err, response) {
      if (err) {
        callback(err, null);
        return;
      }

      var id = 0;
      var processed = [];
      var invitations = JSON.parse(response);
      for (var i = 0; i < invitations.length; i++) {
        var s = new Text();
        var groups = [];
        for (var j = 0; j < invitations[i].groups.length; j++) {
          groups.push(invitations[i].groups[j]);
        }
        s.text = "You were invited to the following groups: " + groups.join(',') + " by " + invitations[i].invited_by.username + " on " + invitations[i].utc_sent_on;
        s.id = id++;
        s.notfication = s.text;
        processed.push(s);
      }
      callback(null, processed);
    });
  };

  Bitbucket.prototype.getInvitations = function(user, callback) {
    HTTP.request({
      method: 'GET',
      url: 'https://api.bitbucket.org/1.0/users/' + user.identifier + '?oauth_token=' + JSON.parse(user.secret).oauth_token_secret
    }, callback);
  };

  Bitbucket.prototype.updatePreferences = function(callback) {
    callback({
      'interval': 900,
      'min': 300,
      'max': 3600
    });
  };

  Bitbucket.prototype.getNonce = function(len) {
    charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var randomString = '';
    for (var i = 0; i < len; i++) {
      var randomPoz = Math.floor(Math.random() * charSet.length);
      randomString += charSet.substring(randomPoz,randomPoz+1);
    }
    return randomString;
  };

  PluginManager.registerPlugin(Bitbucket, 'com.jonseager.bitbucket');

})();

