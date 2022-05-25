const express = require('express')
const app = express()
const http = require('http')
const server = http.createServer(app)
const { Server } = require('socket.io')
const io = new Server(server)
const sharp = require('sharp')



app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html')
})

io.on('connection', async function (socket) {
    const file = '../training/simple/circle.jpg'
    const testData = await sharp(file).raw().toBuffer({ resolveWithObject: true })
    io.emit('imageData', testData)
    console.log('data send...')
})

server.listen(3000, function () {
    console.log('listening on *:3000')
})