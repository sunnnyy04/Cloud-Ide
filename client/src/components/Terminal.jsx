// TerminalComponent.js
import { Terminal as XTerminal } from "@xterm/xterm";
import socket from "../socket";
import { useEffect, useRef } from 'react';
import "@xterm/xterm/css/xterm.css";

const TerminalComponent = () => {
    const terminalRef = useRef();

    useEffect(() => {
        const term = new XTerminal({
            rows:20,
        });
        term.open(terminalRef.current);
        term.onData((data) => {
            console.log(data);  
            socket.emit("terminal:write",data)
        });
        socket.on("terminal:data",(data)=>{
            console.log(data);  

            term.write(data);
        })


        return () => {
            term.dispose();
        };
    }, []);

    return (
        <div ref={terminalRef} id="terminal" style={{ width: '100%', height: '100%' }} />
    );
};

export default TerminalComponent;
