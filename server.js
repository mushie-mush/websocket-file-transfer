const express = require("express");
const path = require("path");
const { instrument } = require("@socket.io/admin-ui");

const app = express();
const server = require("http").createServer(app);

const io = require("socket.io")(server, {
  cors: {
    origin: ["https://admin.socket.io"],
    credentials: true,
  },
});

app.use(express.static(path.join(__dirname + "/public")));

io.on("connection", function (socket) {
  socket.on("sender-join", function (data) {
    socket.join(data.uid);
  });
  socket.on("receiver-join", function (data) {
    socket.join(data.uid);
    socket.in(data.sender_uid).emit("init", data.uid);
  });
  socket.on("file-meta", function (data) {
    socket.in(data.uid).emit("fs-meta", data.metadata);
  });
  socket.on("fs-start", function (data) {
    socket.in(data.uid).emit("fs-share-start", {});
  });
  socket.on("file-raw", function (data) {
    socket.in(data.uid).emit("fs-share", data.buffer);
  });
});

server.listen(process.env.PORT || 5000);

instrument(io, { auth: false });
