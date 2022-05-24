const fs = require('fs')
const path = require('path')
const termkit = require('../node_modules/terminal-kit/lib/termkit.js')
const term = termkit.terminal
const { Command, Option, InvalidArgumentError } = require('commander')
const brain = require('brain.js')
const { Data, Trainer } = require('../src/Trainer.js')

const program = new Command

function commanderParseInt(value, dummyPrevious) {
    // parseInt takes a string and a radix
    const parsedValue = parseInt(value, 10)
    if (isNaN(parsedValue)) throw new InvalidArgumentError('Not a number.')
    return parsedValue
}

program
    .description('train a dataset')
    .argument('<source>', 'data source to train on')
    .addOption(new Option('-i --iterations <number>', 'The maximum times to iterate the training data').default(20000).argParser(commanderParseInt))
    .addOption(new Option('-e --errorThresh <number>', 'The acceptable error percentage from training data').default(0.005).argParser(parseFloat))
    .addOption(new Option('-r --learningRate <number>', `Multiply's against the input and the delta then adds to momentum`).default(0.3).argParser(parseFloat))
    .addOption(new Option('-m --momentum <number>', `Multiply's against the specified "change" then adds to learning rate for change`).default(0.1).argParser(parseFloat))
    .addOption(new Option('-l --logPeriod <number>', 'Iterations between logging out').default(10).argParser(commanderParseInt))
    .addOption(new Option('-h --hiddenLayers <number...>', 'Array of ints for the sizes of the hidden layers in the network').default(null))
    .action(async function (source) {
        // *init
        const options = Object.assign({}, Trainer.trainDefaults, program.opts())
        options.toString = function ({ names = [] } = {}) {
            let text = ''
            for (const key in this) {
                if (names.length && !names.find(n => n === key)) continue
                const value = this[key]
                switch (typeof value) {
                    case 'object':
                        if (Array.isArray(value)) {
                            text += `${key} : [${value.join()}]\n`
                        } else {
                            text += `${key} : ${JSON.stringify(value, null, 4)}\n`
                        }
                        break

                    default:
                        if (typeof value !== 'function') {
                            text += `${key} : ${value}\n`
                        }
                        break
                }
            }
            return text
        }
        term.clear()
        const document = term.createDocument({
            backgroundAttr: { bgColor: 'default' }
        })
        const title = new termkit.Text({
            parent: document,
            content: 'image-generator 1.0',
            contentHasMarkup: 'ansi',
            x: 0,
            y: 0,
            attr: { bgColor: 'default' }
        })
        const filler = {
            attr: {
                color: 'black',
                bgColor: 'black',
            }
        }
        const screen = termkit.ScreenBuffer.create({
            dst: term,
            height: 0,
            width: 0,
            noFill: true
        })
        screen.y = title.outputY + 3
        const trainingHeaders = new termkit.TextBox({
            parent: document,
            content: '',
            contentHasMarkup: 'legacyAnsi',
            x: 0,
            y: 0,
            attr: { bgColor: 'default' }
        })
        const trainingBox = new termkit.TextBox({
            parent: document,
            content: '',
            contentHasMarkup: 'legacyAnsi',
            x: 0,
            y: 0,
            attr: { bgColor: 'default' }
        })
        const optionsBox = new termkit.TextBox({
            parent: document,
            content: '',
            contentHasMarkup: 'legacyAnsi',
            x: 0,
            y: 0,
            attr: { bgColor: 'default' }
        })

        resize()

        // *events
        term.on('key', function (name, matches, data) {
            //console.log("'key' event:", name)
            switch (name) {
                case 'CTRL_C':
                    terminate()
                    break
            }
        })

        // *logic
        const headersText = []
        headersText.push(`iterations\t\terror`)
        headersText.push(`-`.repeat(term.width / 2 - 1))
        trainingHeaders.setContent(headersText.join(`\n`))
        const optionsText = `Options:\n\n` + options.toString({
            names: ['iterations', 'errorThresh', 'learningRate', 'momentum', 'logPeriod', 'hiddenLayers']
        })
        optionsBox.setContent(optionsText)

        const data = await Data.parse(source)
        const settings = Object.assign({}, Trainer.brainDefaults, { hiddenLayers: options.hiddenLayers })
        options.callback = drawTraining
        options.callbackPeriod = options.logPeriod
        const net = new brain.NeuralNetwork(settings)
        await net.trainAsync(data, options)
        await makeImages('../training/results/')
        await drawImages('../training/results/')
        terminate()

        async function makeImages(location) {
            const results = await Data.parse([])
            for (let dCnt = 0; dCnt < data.length; dCnt++) {
                const { input, info, file } = data[dCnt]
                let output = Object.values(net.run(input))
                results.push({ output, info, file })
            }
            await results.toImages({ location, save: true })
            return results
        }

        // *callbacks
        function terminate() {
            term.moveTo(1, term.height - 1)
            term.hideCursor(false)
            term.grabInput(false)
            term.styleReset()
            setTimeout(function () { term.processExit(0) }, 100)
        }

        function resize() {
            const height = Math.floor(term.height / 3)
            const width = term.width - 2
            screen.resize({ xmin: 0, ymin: 0, xmax: width, ymax: height })
            trainingHeaders.setSizeAndPosition({
                x: 1,
                y: screen.y + screen.height + 1,
                height: 2,
                width: width / 2
            })
            trainingBox.setSizeAndPosition({
                x: 1,
                y: trainingHeaders.outputY + trainingHeaders.outputHeight + 1,
                height: 1,
                width: width / 2
            })
            optionsBox.setSizeAndPosition({
                x: width / 2 + 4,
                y: trainingHeaders.outputY + trainingHeaders.outputHeight - 2,
                height: term.height * 2 / 3 + 2,
                width: width / 2
            })
        }

        async function drawTraining(info) {
            const { iterations, error } = info
            await makeImages('../training/results/')
            await drawImages('../training/results/')
            trainingBox.setContent(`${iterations}\t\t\t\t${error}`)
            term.moveTo(1, term.height - 1)
        }

        async function drawImages(location) {
            if (!fs.existsSync(location)) throw new Error(`Location doesn't exists.`)
            const supported = ['.jpg', '.png', '.webp', '.gif', '.avif', '.tif', '.svg']
            const dir = fs.readdirSync(location).filter(f => {
                const file = path.parse(f)
                const found = supported.find(e => e === file.ext) ? true : false
                return found
            })
            screen.fill(filler)
            let x = 0
            for (let iCnt = 0; iCnt < dir.length; iCnt++) {
                const file = dir[iCnt]
                try {
                    let image = await termkit.ScreenBuffer.loadImage(
                        path.resolve(location, file),
                        {
                            terminal: term,
                            shrink: { width: term.width, height: term.height / 3 }
                        }
                    )
                    image.dst = screen
                    image.x = x
                    x += 9
                    image.draw()
                } catch (error) {
                    //console.error(error)
                    //console.log({ file })
                }
            }
            term.hideCursor(true)
            let stats = screen.draw({ delta: true })
            term.hideCursor(false)
        }

        // *startup
        term.grabInput({ mouse: 'button' })

    })

program.parse()