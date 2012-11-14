//serverid:channel,[]
var LOGS = {

};

var Manager = {
  currentChannel: {
    server_id : -1,
    channel: ""
  },
  servers:[],
  channels:[],
  server_template:_.template($('#server-template').html()),
  sendMessage:function() {
    var text = $('#text-input').val();  
    if(text==""){  
      return ;  
    } 
    try{  
      socket_action("sendLog",  {'server_id':this.currentChannel.server_id,'channel': this.currentChannel.channel, 'message' : text});
      message('<p class="event">Sent: '+text+'</p>')  
    } catch(exception){  
      message('<p class="warning">'+'</p>');  
    }  

    $('#text-input').val("");  
  },
  init:function() { 
    $(function(){
      $('#text-input').keypress(function(event) {  
        if (event.keyCode == '13') {  
          Manager.sendMessage();  
          return;
        }  
      });

      Manager.initAddServer();
    });
  },
  pushLogs:function(logs) {
    if ( logs == null || logs.length == 0 ) return;
    var hasCurrentChannel = false;
    for ( var i = 0,_n=logs.length ; i < _n; i++) {
      var server_id = logs[i].server_id;
      var channel = logs[i].channel;
      LOGS[server_id] = LOGS[server_id] || {};
      LOGS[server_id][channel] = LOGS[server_id][channel] || [];
      LOGS[server_id][channel].push(logs[i]);
      LOGS[server_id][channel].sort(function(a,b){return a.log_id>b.log_id;})

      if ( server_id == this.currentChannel.server_id && channel == this.currentChannel.channel)
      {
        hasCurrentChannel = true;
      }
    }

    if ( hasCurrentChannel ) {
      this.updateChatting();
    }
  },
  updateChatting: function () {
    var server_id = this.currentChannel.server_id;
    LOGS[server_id] = LOGS[server_id] || {};
    LOGS[server_id][this.currentChannel.channel] = LOGS[server_id][this.currentChannel.channel] || [];
      
    var currentLogs = LOGS[this.currentChannel.server_id][this.currentChannel.channel];
    var lastLog = $("#chatLog .message:last");
    var last_log_id = -1;
    if ( lastLog.length > 0 ) {
      last_log_id = lastLog.attr('log_id');
    }
    for ( var i = 0, _n = currentLogs.length; i< _n ; i++ ) {
      if ( currentLogs[i].log_id <= last_log_id) continue;
      var appendLog = currentLogs[i];
      var logTimeString = new Date(appendLog.timestamp).toLocaleTimeString().substr(0,5)
      var isSystemMessage = ( appendLog.from == undefined );
      var fromString;
      if ( isSystemMessage ) {
        fromString = "- ";
      } else {
        fromString = '<b>'+appendLog.from+': </b>';
      }
      var $message = $('<p class="message" log_id="'+appendLog.log_id+'"><span class="log-time">'+logTimeString+'</span>'+fromString+appendLog.message+'</p>');
      if ( isSystemMessage ) {
        $message.addClass("system");
      }
      $("#chatLog").append($message);
      var currentScroll = $("#chatLog").scrollTop()
      $("#chatLog").scrollTop(currentScroll+40);
    }
  },
  setCurrentChannel:function(channel_info) {
    var server_id = channel_info.server_id;
    var channel_name = channel_info.channel;
    if ( server_id != this.currentChannel.server_id || channel_name!= this.currentChannel.channel )
    {
      this.currentChannel.server_id = server_id;
      this.currentChannel.channel = channel_name;
      $("#chatLog").html("");
      this.updateChatting();  
    }
  },
  setServers:function(connection_info) {
    var servers = connection_info['servers'];
    var channels = connection_info['channels'];

    this.servers = servers;
    this.channels = channels;

    this.updateServerListView();
    socket_action("getInitLogs",{});
  },
  updateServerListView:function() {
    //update by Manager's servers, channels
    var $serverList = $("#serverList");
    $serverList.html("");
    for (var i = 0 ; i < this.servers.length; i++) {
      var $server = this.servers[i];
      var $server_elem = $(this.server_template($server))
      $("#serverList").append($server_elem)
      var $channel_ul = $server_elem.find(".ul-channels");
      for ( var j = 0 ; j < this.channels.length; j++) {
        var $channel = this.channels[j];
        if ($channel.server_id == $server.id )
        {
          var $channel_li = $('<li><a><i class="icon-chevron-right"></i>'+$channel.channel+'</a></li>');
          $channel_ul.append($channel_li);
          (function(server,channel){
            $channel_li.click(function(){
              Manager.setCurrentChannel({"server_id":server,"channel":channel});
            });
          })($server.id,$channel.channel);
        }
      }
      var $channel_add = $('<li><a><i class="icon-plus"></i>ADD CHANNEL</a></li>')
      $channel_ul.append($channel_add);
      (function(server) {
        $channel_add.click(function() {
          socket_action('addChannel',{"server_id":server,"channel":prompt("Enter Channel Name")});
        });
      })($server.id);
    }
    var $addServer_elem = $('<a id="ADD Server"><i class="icon-plus"></i>ADD SERVER</a>');
    $serverList.append($addServer_elem);
    $addServer_elem.click(function(){
      Manager.showAddServer();
    });   
  },
  initAddServer:function() {
    $("#addServer-form").submit(function(){

      $("#addServer-div").hide();  

      var data = {};
      $("#addServer-form input").each(function() {
        var $val;
        switch($(this).attr("type")) {
          case "text":
            $val = $(this).val();
            if ($(this).attr("integer")!=undefined) {
              $val = parseInt($val);
            }
            break;
          case "checkbox":
            $val = $(this).attr("checked")=="checked";
            break;
        }
        
        var $t = $(this).attr("name").split("-");
        if ( $t.length == 1 ) {
          data[$t[0]] = $val;
          return;
        } 
        data[$t[0]] = data[$t[0]] || {};
        data[$t[0]][$t[1]] = $val;
      })
      socket_action("addServer", {server : data});
      return false;
    });
  },
  showAddServer:function() {
    $("#addServer-div input").val("");
    $("#addServer-div").show();
  }
};
Manager.init();

var Channel = Backbone.Model.extend({
  defaults: function() {
    return {
      channel: "Unknown Channel Name",
      last_log: {
        channel: "",
        from: "", //userName
        log_id: -1 , //log_id
        message: "", //message
        server_id: -1,
        timestamp: 0 //, //timestamp 134997575971
      },
      server_id : -1,
      topic:"",
      user_count :0 
    };
  }
});

var ChannelList = Backbone.Collection.extend({
  model: Channel
});

var ChannelView = Backbone.View.extend({
  tagName: "li",
  events: {
    "click": "setActive"
  },
  initialize: function() {
    this.model.bind('change', this.render, this);
    _.bindAll(this, 'render');
  },
  render: function() {
    var channel_name = this.model.get('channel');
    $(this.el).html('<a><i class="icon-chevron-right"></i>'+channel_name+'</a>');
    return this;
  },
  setActive: function() {
    var $t = this.model;
    $t.set('active',true);
    serverListView.collection.each(function(e){ 
      if($t!=e) {
        e.set('active',false); 
      }
    });

    var channel_name = $t.get('channel');
    $("#irc-channel-name").text(channel_name);
    Manager.setCurrentChannel($t.toJSON());
  }
});

var ChannelListView  = Backbone.View.extend({
  initialize: function(channels){
    this.collection = new ChannelList();
    for ( var i = 0 ; i < channels.length; i++) {
      this.collection.add(new Channel(channels[i]));
    }

    this.render();
  },
  render: function(){
    $(this.el).html("");
    var self = this;
    _(this.collection.models).each(function(item){ // in case collection is not empty
      self.appendItem(item);
    }, this);
    return this
  },
  appendItem: function(item){
    var channelView = new ChannelView({
      model: item
    });
    $(this.el).append(channelView.render().el);
  }  
});


var Server = Backbone.Model.extend({
  defaults: function() {
    return {
      name: "Unknown Server Name",
      id : -1,
      channels : [],
      active : false
    };
  },

});

var ServerList = Backbone.Collection.extend({
  model: Server
});

var ServerView = Backbone.View.extend({
  tagName: "li",
  template: _.template($('#server-template').html()),
  initialize: function() {
    this.model.bind('change', this.render, this);
    
    _.bindAll(this, 'render');
  },
  render: function() {
    $(this.el).addClass("active");
    var channels = this.model.get('channels');
    
    this.$el.html(this.template(this.model.toJSON()));
    this.$('.ul-channels').append(
      (new ChannelListView(channels)).render().$el
    )
    return this;
  },
  setActive: function() {
    var $t = this.model;
    $t.set('active',true);
    serverListView.collection.each(function(e){ 
      if($t!=e) {
        e.set('active',false); 
      }
    });
  }
})

var ServerListView  = Backbone.View.extend({
  el: $("#serverList"),
  initialize: function(servers){
    this.collection = new ServerList();
    for ( var i = 0 ; i < servers.length; i++) {
      this.collection.add(new Server(servers[i]));
    }

    this.render();
  },
  render: function(){
    var self = this;
    $(this.el).html("");
    _(this.collection.models).each(function(item){ // in case collection is not empty
      self.appendItem(item);
    }, this);
  },
  appendItem: function(item){
    var serverView = new ServerView({
      model: item
    });
    $(this.el).append(serverView.render().el);
  }  
});

var socket;  


function connect(access_token, callback_onopen) {
  var host = "ws://laika.redfeel.net:9001/";  
  try{  
    socket = new WebSocket(host);  
    message('<p class="event">Socket Status: '+socket.readyState+'</p>');  
    socket.onopen = function(){  
     message('<p class="event">Socket Status: '+socket.readyState+' (open)'+'</p>');  
     callback_onopen(access_token);
    }  
    socket.onmessage = function(msg){  
      if ( JSON.parse(msg.data).type !="pushLog")
        message('<p class="message">Received: '+msg.data+'</p>');  
      socket_message(msg);
    }  
    socket.onclose = function(){  
      message('<p class="event">Socket Status: '+socket.readyState+' (Closed)'+'</p>');  
    }  
  } catch(exception){  
    message('<p>Error'+exception+'</p>');  
  }    
}

function sent_log(type,data){  
  try{  
    message('<p class="event">Sent by system: '+type +" data: "+JSON.stringify(data)+'</p>');  
  } catch(exception){  
    message('<p class="warning">'+'</p>');  
  }  

}  

function message(msg){  
  $('#debugLog').append(msg);  
  var currentScroll = $("#debugLog").scrollTop()
  $("#debugLog").scrollTop(currentScroll+40);
}  
  
function socket_action(action_name, data) {
  if ( action_name!="pushLogs") sent_log(action_name,data);

  socket.send(JSON.stringify({"type":action_name, "data": data}));
}

function getHash(key) {
  var keyvals = location.hash.substr(1).split("&");
  for ( var i = 0 ; i < keyvals.length ; i++ ) {
    if ( keyvals[i].split("=")[0] == key ) {
      return keyvals[i].split("=")[1]
    }
  }
  return "";
}

function socket_message(msg) {
  var data = JSON.parse(msg.data);

  if ( data.status != 0 ) {
    switch (data.status) {
      case -401:
      //재 register필요 
        break;
      case -404:
      //type error 알수없는 요청
        break;
      case -500:
      //서버 에러.. 알수없는에러..
        break;
      default:
      
    }
    alert(data.status + " error");
    return;
  }
  
  var inner_data = data.data;
  switch(data.type) {
    case "register":
      socket_action("login",{"auth_key":inner_data.auth_key})
      break;
    case "login":
    case "addServer":
    case "addChannel":
      socket_action("getServers",{});
      break;
    case "getServers":
      Manager.setServers(inner_data); // { servers:[],channels:[]}
      break;
    case "getInitLogs":
      Manager.pushLogs(inner_data.logs);
      break;
    case "getPastLogs":
      Manager.pushLogs(inner_data.logs);
      break;
    case "pushLog":
    case "sendLog":
      Manager.pushLogs([inner_data.log]);
      //ACK : socket_action("pushLogs",{"log_ids":ids});
      break;
    default:
      //alert("unkown data type")
  }
}

var serverListView;

$(function(){
  if ( getHash("access_token").length > 0 ) {
    $("#auth").attr("href","./");
    $("#auth span").text("Logout");
    connect(getHash("access_token"),function(access_token) {
      socket_action("register",{"access_token":access_token});
    });
  } else {
    var auth_url = "https://accounts.google.com/o/oauth2/auth?"
    var params = { scope : "https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.profile",
    redirect_uri : "http://localhost",
    client_id : "812906460657-6m0d0bsmrtqjt2h9jd29kui3pdg69eb2.apps.googleusercontent.com",
    response_type :"token",
    state: "/profile" };
    var str=[]; for ( i in params) str.push(i+"="+params[i]);

    $("#auth").attr("href",auth_url+str.join("&"));
    $("#auth span").text("Sign in");
  }  
});

$(function() {
  $(document).resize(function() {
    $("#chatLog,#debugLog").height($(this).height()-200)
  }).resize();
  
  $("#debugLog").hide();          
  $("#debug-checkbox").click(function () {
    if ( $("#debug-checkbox").attr('checked')=="checked" ) {
      $("#debugLog").show();          
    } else {
      $("#debugLog").hide();          
    }
  });
});