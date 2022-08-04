import http from "http";
import SocketIO from "socket.io";
import express from "express";

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (_, res) => res.render("home"));
app.get("/*", (_, res) => res.redirect("/"));


const httpServer = http.createServer(app);
const wsServer = SocketIO(httpServer);

const publicRoom = () => {
    const {sockets:{adapter:{sids, rooms}}} = wsServer;
    const publicRooms = [];
    rooms.forEach((_,value) => {
        if(sids.get(value) === undefined) {
            publicRooms.push(value);
        }
    })
    return publicRooms;
}    
const countRoom = (roomName) => {
    return wsServer.sockets.adapter.rooms.get(roomName)?.size
};


wsServer.on("connection", (socket) => {
    socket["nickname"] = "Anon";
    socket.on("enter_room", (roomName, done) => {
        socket.join(roomName);
        socket.to(roomName).emit("welcome", socket.nickname, countRoom(roomName));
        wsServer.sockets.emit("room_change", publicRoom());
        done();
    });
    socket.on("message", (msg, roomName) => {
        socket.to(roomName).emit("msg", `${socket.nickname}: ${msg}`);
    });
    socket.on("nickname", (nickname) => {
        socket["nickname"] = nickname;
    });
    socket.on("disconnect", () => {
        wsServer.sockets.emit("room_change", publicRoom());
    });
    socket.on("offer", (offer, roomName) => {
        socket.to(roomName).emit("offer", offer);
    })
    socket.on("answer", (answer, roomName) => {
        socket.to(roomName).emit("answer", answer);
    });
    socket.on("ice", (ice, roomName) => {
        socket.to(roomName).emit("ice", ice);
    })
    socket.on("disconnecting", () => {
        socket.rooms.forEach((room) => socket.to(room).emit("bye"))
    })
});
const handleListen = () => console.log(`Listening on http://localhost:3000`);
httpServer.listen(3000, handleListen);