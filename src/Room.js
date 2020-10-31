import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import * as Chance from 'chance';

import Video from './Video';

const chance = new Chance();

const Room = (props) => {
  const [userDetails, setUserDetails] = useState({
    id: chance.guid(),
    name: chance.name(),
  });
  const [peers, setPeers] = useState([]);

  const socketRef = useRef();
  const refVideo = useRef();
  const peersRef = useRef([]);

  const roomId = props.match.params.roomId;

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        refVideo.current.srcObject = stream;

        socketRef.current = io.connect('http://localhost:3001');

        // sending the user details and roomid to join in the room
        socketRef.current.emit('join-room', roomId, userDetails);

        socketRef.current.on('users-present-in-room', (users) => {
          const peers = [];

          // To all users who are already in the room initiating a peer connection
          users.forEach((user) => {
            const peer = createPeer(
              user.socketId,
              socketRef.current.id,
              stream
            );

            peersRef.current.push({
              peerId: user.socketId,
              peer,
              name: user.name,
            });

            peers.push({
              peerId: user.socketId,
              peerObj: peer,
            });
          });

          setPeers(peers);
        });

        // once the users initiate signal we will call add peer
        // to acknowledge the signal and send the stream
        socketRef.current.on('user-joined', (payload) => {
          const peer = addPeer(payload.signal, payload.callerId, stream);
          peersRef.current.push({
            peerId: payload.callerId,
            peer,
            name: payload.name,
          });

          setPeers((users) => [
            ...users,
            { peerId: payload.callerId, peerObj: peer },
          ]);
        });

        // once the signal is accepted calling the signal with signal
        // from other user so that stream can flow between peers
        socketRef.current.on('signal-accepted', (payload) => {
          const item = peersRef.current.find((p) => p.peerId === payload.id);
          item.peer.signal(payload.signal);
        });

        // if some user is disconnected removing his references.
        socketRef.current.on('user-disconnected', (payload) => {
          const item = peersRef.current.find((p) => p.peerId === payload);
          if (item) {
            item.peer.destroy();
            peersRef.current = peersRef.current.filter(
              (p) => p.peerId !== payload
            );
          }
          setPeers((users) => users.filter((p) => p.peerId !== payload));
        });
      });
  }, []);

  function createPeer(userToSignal, callerId, stream) {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
    });

    peer.on('signal', (signal) => {
      socketRef.current.emit('initiate-signal', {
        userToSignal,
        callerId,
        signal,
      });
    });

    return peer;
  }

  function addPeer(incomingSignal, callerId, stream) {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
    });

    peer.on('signal', (signal) => {
      socketRef.current.emit('ack-signal', { signal, callerId });
    });

    peer.signal(incomingSignal);

    return peer;
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <video muted ref={refVideo} autoPlay playsInline />
        <span>{userDetails.name}</span>
      </div>
      {peers.map((peer, index) => {
        return (
          <Video
            key={peersRef.current[index].peerId}
            peer={peer.peerObj}
            name={peersRef.current[index].name}
          />
        );
      })}
    </div>
  );
};

export default Room;
