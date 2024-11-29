import TerminalComponent from './components/Terminal';
import "./App.css";
import { useCallback, useEffect, useState } from 'react';
import FileTree from './components/Tree';
import Socket from "./socket";
import AceEditor from "react-ace";

import "ace-builds/src-noconflict/mode-java";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/ext-language_tools";

function App() {
  const [fileTree, setFileTree] = useState({});
  const [fileContent, setFileContent] = useState("");
  const [code, setCode] = useState("");
  const [selectedFile, setSelectedFile] = useState("");

  // Dynamically calculate isSaved based on fileContent and code
  const isSaved = fileContent === code;

  const getFileTree = async () => {
    const res = await fetch('http://localhost:9000/files');
    const data = await res.json();
    setFileTree(data.tree);
  };

  const getFileContent = useCallback(async () => {
    if (!selectedFile) return;
    const response = await fetch(`http://localhost:9000/files/content?path=${selectedFile}`);
    const data = await response.json();
    setFileContent(data.content);
  }, [selectedFile]);

  useEffect(() => {
    getFileTree();
  }, []);

  useEffect(() => {
    if (selectedFile) getFileContent();
  }, [getFileContent, selectedFile]);

  useEffect(() => {
    setCode(fileContent);
  }, [fileContent]);

  useEffect(() => {
    if (code && !isSaved) {
      const timer = setTimeout(() => {
        Socket.emit("code:change", {
          path: selectedFile,
          content: code,
        });
        setFileContent(code); // Update fileContent after emitting to reflect saved state
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [code, selectedFile, isSaved]);

  useEffect(() => {
    const handleFileRefresh = () => getFileTree();
    Socket.on("file:refresh", handleFileRefresh);
    return () => Socket.off("file:refresh", handleFileRefresh);
  }, []);

  return (
    <div id='playground-container'>
      <div id='code-editor'>
        <div className='files'>
          <FileTree 
            tree={fileTree}
            onselect={(path) => {
              setSelectedFile(path);
            }}
          />
        </div>
        <div className='editor'>
          {selectedFile && <p>{selectedFile.replaceAll("/", ">")} {isSaved ? "Saved" : "Unsaved"}</p>}
          <AceEditor
            mode="java"
            theme="github"
            value={code}
            onChange={(newCode) => setCode(newCode)}
          />
        </div>
      </div>
      <div>
        <TerminalComponent />
      </div>
    </div>
  );
}

export default App;
