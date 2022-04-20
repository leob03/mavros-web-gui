console.log("js code loaded");

var body = document.querySelector("body");
var pageTitle = document.querySelector("title");
var flightModeLabel = document.getElementById("flightModeLabel");
var armButton = document.getElementById("armButton");
var takeOffButton = document.getElementById("takeOffButton");
var landButton = document.getElementById("landButton");

armButton.onclick = arm;
takeOffButton.onclick = takeOff;
landButton.onclick = land;

var url = "ws://" + location.hostname + ":9090";
var ros = new ROSLIB.Ros({ url: url });

function speak(txt) {
  var utterance = new SpeechSynthesisUtterance(txt);
  window.speechSynthesis.speak(utterance);
}

ros.on("connection", function () {
  pageTitle.innerText = "Connected";
});

ros.on("close", function () {
  pageTitle.innerText = "Disconnected";
  flightModeLabel.innerHTML = "";
  setTimeout(function () {
    pageTitle.innerText = "";
    ros.connect(url);
  }, 2000);
});

var fcuState = {};

new ROSLIB.Topic({
  ros: ros,
  name: "/mavros/state",
  messageType: "mavros_msgs/State",
}).subscribe(function (msg) {
  flightModeLabel.innerHTML = msg.mode;
  if (fcuState.mode != msg.mode) {
    speak(msg.mode + " flight mode");
  }
  fcuState = msg;
});

new ROSLIB.Topic({
  ros: ros,
  name: "/mavros/statustext/recv",
  messageType: "mavros_msgs/StatusText",
}).subscribe(function (message) {
  var BLACKLIST = [];
  if (message.severity <= 4) {
    if (
      BLACKLIST.some(function (e) {
        return message.text.indexOf(e) != -1;
      })
    ) {
      console.log("Filtered out message " + message.text);
      return;
    }
    speak(message.text);
  }
});

function arm() {
  var arming = new ROSLIB.Service({
    ros: ros,
    name: "/mavros/cmd/arming",
    serviceType: "mavros_msgs/CommandBool",
  });

  var request = new ROSLIB.ServiceRequest({
    value: true,
  });

  arming.callService(request, function (result) {
    console.log("Result for " + arming.name + ":" + JSON.stringify(result));
  });
}

function takeOff() {
  var listener = new ROSLIB.Topic({
    ros: ros,
    name: "/mavros/global_position/global",
    messageType: "sensor_msgs/NavSatFix",
  });

  listener.subscribe(function (message) {
    console.log(
      "Received message on " + listener.name + ": " + JSON.stringify(message)
    );
    listener.unsubscribe();

    if (message.latitude && message.longitude) {
      console.log("here is where we'd take off");
      var takeoff = new ROSLIB.Service({
        ros: ros,
        name: "/mavros/cmd/takeoff",
        serviceType: "mavros_msgs/CommandTOL",
      });

      var request = new ROSLIB.ServiceRequest({
        min_pitch: 0,
        yaw: 0,
        latitude: message.latitude,
        longitude: message.longitude,
        altitude: 0,
      });

      takeoff.callService(request, function (result) {
        console.log(
          "Result for " + takeoff.name + ":" + JSON.stringify(result)
        );
      });
    }
  });
}

function land() {
  var listener = new ROSLIB.Topic({
    ros: ros,
    name: "/mavros/global_position/global",
    messageType: "sensor_msgs/NavSatFix",
  });

  listener.subscribe(function (message) {
    console.log(
      "Received message on " + listener.name + ": " + JSON.stringify(message)
    );
    listener.unsubscribe();

    if (message.latitude && message.longitude) {
      console.log("here is where we'd land");

      var land = new ROSLIB.Service({
        ros: ros,
        name: "/mavros/cmd/land",
        serviceType: "mavros_msgs/CommandTOL",
      });

      var request = new ROSLIB.ServiceRequest({
        min_pitch: 0,
        yaw: 0,
        latitude: message.latitude,
        longitude: message.longitude,
        altitude: 0,
      });

      land.callService(request, function (result) {
        console.log(
          "Result for " + takeoff.name + ":" + JSON.stringify(result)
        );
      });
    }
  });
}
