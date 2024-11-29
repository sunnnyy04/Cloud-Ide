const http = require('http');
const express = require('express');
const { Server: SocketServer } = require('socket.io');
const pty = require('node-pty');
const app = express();
const path = require('path');
const cors = require('cors');
const chokidar = require('chokidar');
const { exec } = require('child_process');
const fs = require("fs/promises");

app.use(cors());

const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);
  const userDir = `./user/d${socket.id}`;

  // Create user directory and Dockerfile
  fs.mkdir(userDir, { recursive: true })
    .then(() => {
      console.log(`Directory created: ${userDir}`);
      const dockerfilePath = path.join(userDir, 'Dockerfile');
      const dockerfileContent = `
        FROM ubuntu:22.04
        ENV DEBIAN_FRONTEND=noninteractive
        RUN apt-get update && apt-get install -y \
            build-essential cmake g++ gcc gdb vim git \
            && rm -rf /var/lib/apt/lists/*
        WORKDIR /app
        COPY . /app
        
      `;
      return fs.writeFile(dockerfilePath, dockerfileContent.trim());
    })
    .then(() => {
      console.log(`Dockerfile created at ${userDir}`);

      // Build the Docker image
      const imagetag=socket.id.toLowerCase();
      exec(`docker build -t ${imagetag} ${userDir}`, (err, stdout, stderr) => {
        if (err) {
          console.error(`Error building Docker image: ${err.message}`);
          return;
        }
        if (stderr) {
          console.error(`Docker build stderr: ${stderr}`);
          
        }
        console.log(`Docker build stdout: ${stdout}`);

        // Run the Docker container
        exec(`docker run -dit --name ${imagetag} ${imagetag}`, (runErr, runStdout, runStderr) => {
          if (runErr) {
            console.error(`Error running Docker container: ${runErr.message}`);
            return;
          }
          if (runStderr) {
            console.error(`Docker run stderr: ${runStderr}`);
            return;
          }
          console.log(`Docker container started: ${runStdout}`);

          // Now, run the terminal session inside the container
          const ptyProcess = pty.spawn('docker', ['exec', '-it', imagetag, 'sh'], {
            name: 'xterm-color',
            cols: 80,
            rows: 30,
            cwd: process.env.INIT_CWD,
            env: process.env,
          });

          // Emit terminal data to the client
          ptyProcess.onData((data) => {
            io.emit('terminal:data', data);
          });

          // Handle writing to the terminal
          socket.on('terminal:write', (data) => {
            ptyProcess.write(data);
          });

          // Handle code change event
          socket.on("code:change", async ({ path, content }) => {
            try {
              await fs.writeFile(`./user/${path}`, content);
            } catch (error) {
              console.error(`Error writing file: ${error.message}`);
            }
          });
        });
      });
    })
    .catch((error) => {
      console.error(`Error creating directory or Dockerfile: ${error.message}`);
    });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

server.listen(9000, () => console.log("Server is running on port 9000"));

app.get('/files', async (req, res) => {
  const fileTree = await genFileTree('./user');
  return res.json({ tree: fileTree });
});

app.get('/files/content', async (req, res) => {
  const path = req.query.path;
  const content = await fs.readFile(`./user${path}`, 'utf-8');
  return res.json({ content });
});

async function genFileTree(directory) {
  const tree = {};

  async function buildTree(currentDir, currentTree) {
    const files = await fs.readdir(currentDir);
    for (const file of files) {
      const filePath = path.join(currentDir, file);
      const stat = await fs.stat(filePath);
      if (stat.isDirectory()) {
        currentTree[file] = {};
        await buildTree(filePath, currentTree[file]);
      } else {
        currentTree[file] = null;
      }
    }
  }

  await buildTree(directory, tree);
  return tree;
}

chokidar.watch('./user').on('all', (event, path) => {
  console.log(event, path);
  io.emit("file:refresh", path);
});
