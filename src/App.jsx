import 'global';
// import Button from "@material-ui/core/Button"
// import IconButton from "@material-ui/core/IconButton"
// import TextField from "@material-ui/core/TextField"
// import AssignmentIcon from "@material-ui/icons/Assignment"
// import PhoneIcon from "@material-ui/icons/Phone"
import React, { useEffect, useRef, useState } from "react"
import { CopyToClipboard } from "react-copy-to-clipboard"
import Peer from "simple-peer"
import io from "socket.io-client"
import './App.css'

const socket = io.connect('http://localhost:8000')

function App() {

  const [me, setMe] = useState("");
  const [stream, setStream] = useState();
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState();
  const [callAccepted, setCallAccepted] = useState(false);
  const [idToCall, setIdToCall] = useState("");
  const [callEnded, setCallEnded] = useState(false);
  const [name, setName] = useState("");
  const [streamSet, setStreamSet] = useState(false);
  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();

  useEffect(() => {
    // if (!streamSet) {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      // console.log("Stream:", stream);
      setStream(stream);
      setStreamSet(true);
      if (myVideo.current) {
        myVideo.current.srcObject = stream;
        console.log("myVideo ref:", myVideo?.current?.srcObject);
      } else {
        console.log("myVideo ref is undefined");
      }
    })
    // }
    socket.on("me", (id) => {
      setMe(id)
    })

    socket.on("callUser", (data) => {
      setReceivingCall(true)
      setCaller(data.from)
      setName(data.name)
      setCallerSignal(data.signal)
    })
  }, [streamSet])

  const callUser = (id) => {
    console.log("Initiating call with ID:", id);
    console.log("Stream:", stream);

    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream
    })
    console.log("Peer object:", peer);

    peer.on("signal", (data) => {
      socket.emit("callUser", {
        userToCall: id,
        signalData: data,
        from: me,
        name: name
      })
    })
    peer.on("stream", (stream) => {

      userVideo.current.srcObject = stream

    })
    socket.on("callAccepted", (signal) => {
      setCallAccepted(true)
      peer.signal(signal)
    })

    connectionRef.current = peer
  }

  const answerCall = () => {
    setCallAccepted(true)
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream
    })
    peer.on("signal", (data) => {
      socket.emit("answerCall", { signal: data, to: caller })
    })
    peer.on("stream", (stream) => {
      userVideo.current.srcObject = stream
    })

    peer.signal(callerSignal)
    connectionRef.current = peer
  }

  const leaveCall = () => {
    setCallEnded(true)
    connectionRef.current.destroy()
  }


  return (
    <div className='bg-slate-500'>
      <h1 style={{ textAlign: "center", color: '#fff' }}>Zoomish</h1>
      <div className="container">
        <div className="video-container">
          <div className="video">
            {streamSet &&
              <video playsInline muted ref={myVideo} autoPlay style={{ width: "300px" }} />}
          </div>
          <div className="video">
            {callAccepted && !callEnded ?
              <video playsInline ref={userVideo} autoPlay style={{ width: "300px" }} /> :
              null}
          </div>
        </div>
        <div className="myId my-5 space-x-5">
          <input
            className='border-2 rounded-lg border-black'
            placeholder='Name'
            id="filled-basic"
            label="Name"
            variant="filled"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ marginBottom: "20px" }}
          />
          <CopyToClipboard text={me} style={{ marginBottom: "2rem" }}>
            <button variant="contained" color="primary"
            // startIcon={<AssignmentIcon fontSize="large" />}
            >
              Copy ID
            </button>
          </CopyToClipboard>

          <input
            className='border-2 rounded-lg border-black'
            placeholder='Caller-id'
            id="filled-basic"
            label="ID to call"
            variant="filled"
            value={idToCall}
            onChange={(e) => setIdToCall(e.target.value)}
          />
          <div className="call-button">
            {callAccepted && !callEnded ? (
              <button variant="contained" color="secondary" onClick={leaveCall}>
                End Call
              </button>
            ) : (
              <button className='m-5 px-3 py-1 bg-emerald-500 border-2 rounded-lg border-black' color="primary" aria-label="call" onClick={() => callUser(idToCall)}> CAll
                {/* <PhoneIcon fontSize="large" /> */}
              </button>
            )}
            {idToCall}
          </div>
        </div>
        <div>
          {receivingCall && !callAccepted ? (
            <div className="caller">
              <h1 >{name} is calling...</h1>
              <button variant="contained" color="primary" onClick={answerCall}>
                Answer
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default App

// npm i simple-peer socket.io-client @material-ui/core @material-ui/icons react-copy-to-clipboard --force