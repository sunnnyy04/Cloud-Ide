import {io } from "socket.io-client"

const Socket =io('http://localhost:9000')
export default Socket;