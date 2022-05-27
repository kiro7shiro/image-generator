const fs = require('fs')
const path = require('path')
const termkit = require('../node_modules/terminal-kit/lib/termkit.js')
const term = termkit.terminal
const { Command, Option, InvalidArgumentError } = require('commander')
const { Data, Trainer } = require('../src/Trainer.js')
const sharp = require('sharp')

const program = new Command

function commanderParseInt(value, dummyPrevious) {
    // parseInt takes a string and a radix
    const parsedValue = parseInt(value, 10)
    if (isNaN(parsedValue)) throw new InvalidArgumentError('Not a number.')
    return parsedValue
}

function commanderParseObject(value, prev) {
    value = JSON.parse(value)
    //console.log({ value, prev })
    return Object.assign(prev, value)
}

program
    .description('evolve brains on a data set')
    .argument('<source>', 'data source to evolve on')
    .addOption(new Option('-e --elitism <factor>', 'factor for selecting the number of elite brains').default(1 / 10).argParser(parseFloat))
    .addOption(new Option('-g --maxGenerations <number>', 'maximum generations to evolve').default(1024).argParser(commanderParseInt))
    .addOption(new Option('-m --mutationRate <number>', '').default(1 / 10).argParser(parseFloat))
    .addOption(new Option('-p --populationSize <number>', 'size of population').default(128).argParser(commanderParseInt))
    .addOption(new Option('-t --training <object>', 'training options').default(Trainer.trainDefaults).argParser(commanderParseObject))
    .addOption(new Option('-b --brain <object>', 'brain options').default(Trainer.brainDefaults).argParser(commanderParseObject))
    .addOption(new Option('-l --logPeriod <number>', 'Iterations between logging out').default(10).argParser(commanderParseInt))
    .addOption(new Option('-r --restart', 'Restart evolution').default(false))
    .action(async function (source) {

        // *init
        const options = Object.assign({}, Trainer.evolutionDefaults, program.opts())
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
        const evolutionBox = new termkit.TextBox({
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
        const bestBox = new termkit.TextBox({
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
        const evolutionText = [`iterations\t\t\t\terror\t\t\t\tfitness`, '-'.repeat(term.width / 2 - 1), '']
        const optionsText = `Options:\n\n` + options.toString({
            names: ['elitism', 'maxGenerations', 'mutationRate', 'populationSize', 'training', 'brain', 'logPeriod', 'restart']
        })
        optionsBox.setContent(optionsText)

        const data = await Data.parse(source)
        const trainer = new Trainer()
        options.callback = drawEvolution
        options.callbackPeriod = options.logPeriod
        let best = undefined
        do {
            best = await trainer.evolve(data, { evolution: options })
        } while (!best && options.restart)
        if (!best) term.moveTo(1, term.height - 3, 'evolution failed...')
        terminate()

        async function makeImages(best, location) {
            const results = await Data.parse([])
            for (let dCnt = 0; dCnt < data.length; dCnt++) {
                const { input, info, file } = data[dCnt]
                let output = Object.values(best.run(input))
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
            const height = Math.floor(term.height * 1 / 3)
            const width = term.width - 2
            screen.resize({ xmin: 0, ymin: 0, xmax: 35, ymax: 4 })
            evolutionBox.setSizeAndPosition({
                x: 1,
                y: screen.y + screen.height + 1,
                height: 3,
                width: width / 2
            })
            optionsBox.setSizeAndPosition({
                x: width / 2 + 4,
                y: screen.y + screen.height + 1,
                height: height * 2,
                width: width / 2
            })
            bestBox.setSizeAndPosition({
                x: 1,
                y: evolutionBox.outputY + 4,
                height: 40,
                width: width / 2
            })
        }

        async function drawEvolution(info) {
            const { iterations, error, best } = info
            await makeImages(best, '../training/results/')
            await drawImages('../training/results/')
            evolutionText[2] = `${iterations}\t\t\t\t${error}\t\t\t\t${best.fitness}`
            evolutionBox.setContent(evolutionText.join('\n'))
            const bestText = JSON.stringify(best.options, null, 4)
            bestBox.setContent(bestText)
            let usedTxt = ``
            for (let key in trainer.used) {
                usedTxt += `${key} ${Math.round(trainer.used[key] / 1024 / 1024 * 100) / 100} MB\n`
            }
            term.moveTo(1, term.height - 6, usedTxt)
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
                    const resolved = path.resolve(location, file)
                    const image = await termkit.ScreenBuffer.loadImage(
                        resolved,
                        {
                            terminal: term,
                            /* shrink: { width: term.width, height: term.height / 3 } */
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
            //let stats = screen.draw({ delta: true })
            screen.draw({ delta: true })
            term.hideCursor(false)
        }

        // *startup
        term.grabInput({ mouse: 'button' })

    })

program.parse()