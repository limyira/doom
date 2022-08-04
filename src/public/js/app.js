const socket = io();

const welcome = document.querySelector("#welcome");
const enterRoom = welcome.querySelector("form");
const call = document.querySelector("#call");
const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");



call.hidden = true;
welcome.hidden = false;
let roomName;
let roomSize;
let muted = false;
let cameraOff = false;
let myPeerConnection;
let myDataChannel;


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

const handleCamera = async () => {
  const videoTracks = await stream.getVideoTracks();
  videoTracks.forEach((track) => {
    if(track.enabled === true) {
      cameraBtn.innerText = "Turn Camera On";
      track.enabled = false;
    } else {
      cameraBtn.innerText = "Turn Camera Off";
      track.enabled = true;
    }
  })
}

//  caemra event
async function getCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((device) => device.kind === "videoinput");
    const currentCamera = myStream.getVideoTracks()[0];
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


async function getMedia(deviceId) {
  const initialConstrains = {
    audio: true,
    video: { facingMode: "user" },
  };
  const cameraConstraints = {
    audio: true,
    video: { deviceId: { exact: deviceId } },
  };
  try {
    myStream = await navigator.mediaDevices.getUserMedia(
      deviceId ? cameraConstraints : initialConstrains
    );
    myFace.srcObject = myStream;
    if (!deviceId) {
      await getCameras();
    }
  } catch (e) {
    console.log(e);
  }
}

function handleMuteClick() {
  myStream
    .getAudioTracks()
    .forEach((track) => (track.enabled = !track.enabled));
  if (!muted) {
    muteBtn.innerText = "Unmute";
    muted = true;
  } else {
    muteBtn.innerText = "Mute";
    muted = false;
  }
}
function handleCameraClick() {
  myStream
    .getVideoTracks()
    .forEach((track) => (track.enabled = !track.enabled));
  if (cameraOff) {
    cameraBtn.innerText = "Turn Camera Off";
    cameraOff = false;
  } else {
    cameraBtn.innerText = "Turn Camera On";
    cameraOff = true;
  }
}

async function handleCameraChange() {
  await getMedia(camerasSelect.value);
  if (myPeerConnection) {
    const videoTrack = myStream.getVideoTracks()[0];
    const videoSender = myPeerConnection
      .getSenders()
      .find((sender) => sender.track.kind === "video");
    videoSender.replaceTrack(videoTrack);
  }
}


async function initCall() {
  welcome.hidden = true;
  call.hidden = false;
  await getMedia();
  makeConnection();
}



muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);
camerasSelect.addEventListener("input", handleCameraChange);




enterRoom.addEventListener("submit", handleEnterroom);




socket.on("welcome", async (user,newCount) => {
  const offer = await myPeerConnection.createOffer();
  myPeerConnection.setLocalDescription(offer);
  socket.emit("offer", offer, roomName);
  addText(`${user} 님이입장하셨습니다.`);
  const h3 = document.querySelector("h3");
  h3.innerText= `Room ${roomName} (${newCount})`
  roomSize = h3.innerText;
})


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

socket.on("offer", async (offer) => {
  myPeerConnection.setRemoteDescription(offer);
  const answer = await myPeerConnection.createAnswer();
  myPeerConnection.setLocalDescription(answer);
  socket.emit("answer", answer, roomName);
});

socket.on("answer", (answer) => {
  console.log("received the answer");
  myPeerConnection.setRemoteDescription(answer);
});

socket.on("ice", (ice) => {
  console.log("received candidate");
  myPeerConnection.addIceCandidate(ice);
});


function makeConnection() {
  myPeerConnection = new RTCPeerConnection();
  myPeerConnection.addEventListener("icecandidate", handleIce);
  myPeerConnection.addEventListener("addstream", handleAddStream);
  myStream
    .getTracks()
    .forEach((track) => myPeerConnection.addTrack(track, myStream));
}

function handleIce(data) {
  socket.emit("ice", data.candidate, roomName);
}

function handleAddStream(data) {
  const peerFace = document.getElementById("peerFace");
  peerFace.srcObject = data.stream;
}