const fs = require('fs')
const path = require('path')

const express = require('express')
const app = express()

const http = require('http')
const server = http.createServer(app)
const { Server } = require('socket.io')
const io = new Server(server)

const { Data } = require('../src/Data.js')
const { Trainer } = require('../src/Trainer.js')

const PORT = 7777

app.use(express.static(path.join(__dirname, 'public')))

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html')
})

const trainer = new Trainer

io.on('connection', async function (socket) {

    console.log(`client connected: ${socket.id}`)

    socket.on('getTargets', function () {
        const targets = fs.readdirSync('./public/training/simple')
        socket.emit('setTargets', targets)
        console.log(`targets send...`)
    })
    socket.on('disconnect', function () {
        trainer.running = false
        console.log(`client disconnected: ${socket.id}`)
    })

    const trainData = await Data.parse('./public/training/simple')

    async function makeImages(best, location) {
        const results = await Data.parse([])
        for (let dCnt = 0; dCnt < trainData.length; dCnt++) {
            const { input, info, file } = trainData[dCnt]
            let output = Object.values(best.run(input))
            results.push({ output, info, file })
        }
        await results.toImages({ location, save: true })
        return results
    }

    async function update(info) {
        const { iterations, error, best } = info
        console.log({ iterations, error })
        await makeImages(best, './public/training/results')
        const results = fs.readdirSync('./public/training/simple')
        socket.emit('update', { iterations, error, results, genome: best.options, fitness: best.fitness })
    }

    const options = Trainer.evolutionDefaults
    options.callback = update
    options.callbackPeriod = 1
    options.maxGenerations = 100
    options.populationSize = 50
    options.training.iterations = 1
    options.settings.maxLayers = 2
    options.settings.maxNeurons = 16

    let best = await trainer.evolve(trainData, { evolution: options })

    const { error, fitness, options: genome } = best
    console.log({ error, fitness, genome })

})

server.listen(PORT, function () {
    console.log(`listening on *:${PORT}`)
})