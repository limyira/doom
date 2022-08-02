const socket = io();

const welcome = document.querySelector("#welcome");
const enterRoom = welcome.querySelector("form");
const call = document.querySelector("#call");

call.hidden = true;
welcome.hidden = false;
let roomName;


const addText = (text) => {
  const messageList = call.querySelector("ul");
  const li = document.createElement("li");
  li.innerText = text;
  messageList.appendChild(li);
}

const handleMessageSubmit = (event) => {
  event.preventDefault();
  const input = message.querySelector("input");
  const messageText = input.value;
  socket.emit("message", messageText, roomName);
  addText(`you: ${messageText}`);
  input.value = "";

}

const showRoom = () => {
  call.hidden = false;
  welcome.hidden = true;
  const h3 = document.querySelector("h3");
  h3.innerText = `Room: ${roomName}`;
  const message = document.querySelector("#message");
  message.addEventListener("submit", handleMessageSubmit)
}

const handleEnterroom = (event) => {
  event.preventDefault();
  const input = enterRoom.querySelector("input");
  socket.emit("enter_room", input.value, showRoom);
  roomName = input.value;
  input.value = "";

}

enterRoom.addEventListener("submit", handleEnterroom);

socket.on("msg", (msg) => {
  addText(msg);
});

