const socket = io();

const welcome = document.querySelector("#welcome");
const enterRoom = welcome.querySelector("form");
const call = document.querySelector("#call");
const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");
const peerFace= document.querySelector("#peerFace");



call.hidden = true;
welcome.hidden = false;
let roomName;
let roomSize;
let stream;
let muted = false;
let camera = true;
let myPeerConnection;


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

const handleNicknameSubmit = (event) => {
  event.preventDefault();
  const input = nickname.querySelector("input");
  socket.emit("nickname", input.value);
  input.value="";
}

const showRoom = () => {
  call.hidden = false;
  welcome.hidden = true;
  const h3 = document.querySelector("h3");
  h3.innerText= `Room: ${roomName}`;
  const message = document.querySelector("#message form");
  const nickname = document.querySelector("#nickname form");
  message.addEventListener("submit", handleMessageSubmit);
  nickname.addEventListener("submit", handleNicknameSubmit);
 
  
}

const handleEnterroom = async (event) => {
  event.preventDefault();
  const input = enterRoom.querySelector("input");
  await initCall();
  socket.emit("enter_room", input.value, showRoom);
  roomName = input.value;
  input.value = "";

}
enterRoom.addEventListener("submit", handleEnterroom);


//  caemra event

const initCall = async () =>{
  await getMedia();
  makeConnection();
}

const getMedia = async (deviceId) => {
  const initialConstraints = {
    video: {facingMode:"user"},
    audio: true,
  }
  const cameraConstraints = {
    video: {deviceId: {exact: deviceId}},
    audio: true,
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia(
      deviceId ? cameraConstraints : initialConstraints 
    )
    myFace.srcObject= stream;
    if(!deviceId) {
      await getCameras();
    }
  } catch(e) {
    console.log(e);
  }
}


const handleMute = () => {
  stream.getAudioTracks().forEach((track) => track.enabled = !track.enabled);
  if (muted) {
    muteBtn.innerText = "Mute";
    muted= false;
  } else {
    muteBtn.innerText = "Unmute";
    muted = true;
  }
}


const handleCameraOption = () => {
  stream.getVideoTracks().forEach((track) => track.enabled = !track.enabled);
 
  if(camera) {
    cameraBtn.innerText = "Turn camera On";
    camera = false;
  } else {
    cameraBtn.innerText = "Turn camera Off";
    camera = true;
  }
}


const handleCameraChange = async () => {
  await getMedia(camerasSelect.value);
  const videoTrack = stream.getVideoTracks()[0];
  if(myPeerConnection) {
    const sender = myPeerConnection.getSenders().find(sender => sender.track.kind === "video");
    sender.replaceTrack(videoTrack);
  }
}


async function getCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((device) => device.kind === "videoinput");
    const currentCamera = stream.getVideoTracks()[0];
    cameras.forEach((camera) => {
      const option = document.createElement("option");
      option.value = camera.deviceId;
      option.innerText = camera.label;
      if (currentCamera.label === camera.label) {
        option.selected = true;
      }
      camerasSelect.appendChild(option);
    });
  } catch (e) {
    console.log(e);
  }
}

muteBtn.addEventListener("click", handleMute);
cameraBtn.addEventListener("click", handleCameraOption);
camerasSelect.addEventListener("input", handleCameraChange);


// socket


socket.on("welcome", async (user,newCount) => {
  const offer = await myPeerConnection.createOffer();
  myPeerConnection.setLocalDescription(offer);
  socket.emit("offer", offer, roomName);
  addText(`${user} 님이입장하셨습니다.`);
  const h3 = document.querySelector("h3");
  h3.innerText= `Room ${roomName} (${newCount})`
  roomSize = h3.innerText;
})

socket.on("offer", async (offer) => {
  myPeerConnection.setRemoteDescription(offer);
  const answer = await myPeerConnection.createAnswer();
  myPeerConnection.setLocalDescription(answer);
  socket.emit("answer", answer, roomName);
})

socket.on("answer", (answer) => {
  myPeerConnection.setRemoteDescription(answer);
});

socket.on("room_change", (rooms) => {
  const roomList = welcome.querySelector("ul");
  roomList.innerHTML ="";
  rooms.forEach((room) => {
    const li = document.createElement("li");
    li.innerText= room;
    roomList.appendChild(li);
})



})
socket.on("msg", (msg) => {
  addText(msg);
});

socket.on("ice", (ice) => {
  myPeerConnection.addIceCandidate(ice);
})

socket.on("bye", () => {
  myPeerConnection.addEventListener("connectionstatechange", handleState);


})

// Rtc code

const handleState =() => {
  if(myPeerConnection.iceConnectionState === "disconnected") {
    myPeerConnection.close();
    peerFace.remove();
  }
}

const makeConnection = async () => {
  myPeerConnection = new RTCPeerConnection();
  myPeerConnection.addEventListener("icecandidate", handleIce);
  myPeerConnection.addEventListener("addstream", handleAddstream);
  stream.getTracks().forEach((track) => myPeerConnection.addTrack(track, stream));
  console.log(myPeerConnection.iceConnectionState)
}

const handleIce = (data) => {
  socket.emit("ice", data.candidate, roomName);
}

const handleAddstream = (data) => {
  peerFace.srcObject = data.stream;
}




