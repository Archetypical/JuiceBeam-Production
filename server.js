require("rootpath")();

//create server
var express = require("express");
//var expressWs = require('express-ws');
//var expressWs = expressWs(express());
//var pubSubHubbub = require("pubsubhubbub");
const path = require("path");
var app = express();
const http = require("http");
const server = http.createServer(app);
const io = require("socket.io")(server, { cors: { origin: "*" } });

const cors = require("cors");
const bodyParser = require("body-parser");
const errorHandler = require("./_middleware/error-handler");
const auth = require("./_middleware/authorize");
const db = require("_helpers/db");
const eventHelper = require("./events/event.helper");
//const videoApi = require("./videos/video.service");
const { secret } = require("config.json");

module.exports = {
  eventNotify,
};

//var pubSubSubscriber = pubSubHubbub.createServer(options);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());
//serve production build files from public folder
app.use(express.static(path.join(__dirname, "public")));

// api routes
app.use("/api/users", require("./users/users.controller"));
app.use("/api/events", require("./events/events.controller"));
app.use("/api/videos", require("./videos/video.controller"));
app.use("/api/admin", require("./admin/admin.controller"));



//when a user first connects to the stream page
//either give them the current event info
//or send "off" if there are no events playing
io.of("/api/notify").on("connection", async function (socket) {
  socket.join("EventNotify");
  console.log("User Subscribed to Events");
  //Looks for current event
  let eventInfo = await eventHelper.eventChecker();
  if (eventInfo != "off") {
    socket.emit("event", eventInfo);
  } else socket.emit("off");
});


//serve production build
app.get("/*", function (req, res) {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

//sends event notify users an event when it starts
//or when it stops
function eventNotify(info) {
  if (info != "off") {
    io.of("/api/notify").to("EventNotify").emit("event", info);
  } else {
    io.of("/api/notify").to("EventNotify").emit("off", info);
  }
}

// global error handler
app.use(errorHandler);

// start server
const port =
  process.env.NODE_ENV === "production" ? process.env.PORT || 80 : 4000;
server.listen(port, () => console.log("Server listening on port " + port));
