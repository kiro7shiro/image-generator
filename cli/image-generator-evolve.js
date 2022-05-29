/**
 * Evolve
 * CLI debug tool for evolving brain.js neural networks on a given data set.
 */

'use strict';

const fs = require('fs')
const path = require('path')
const termkit = require('../node_modules/terminal-kit/lib/termkit.js')
const term = termkit.terminal
const { Command, Option, InvalidArgumentError } = require('commander')
const brain = require('brain.js')
const Table = require('easy-table')
const { Data, Trainer } = require('../src/Trainer.js')

const program = new Command

//* commander.js helper functions
function commanderParseInt(value, dummyPrevious) {
    const parsedValue = parseInt(value, 10)
    if (isNaN(parsedValue)) throw new InvalidArgumentError('Not a number.')
    return parsedValue
}
function commanderParseObject(value, prev) {
    value = JSON.parse(value)
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
    .addOption(new Option('-s --settings <object>', 'brain options').default(Trainer.brainDefaults).argParser(commanderParseObject))
    .addOption(new Option('-l --logPeriod <number>', 'Iterations between logging out').default(10).argParser(commanderParseInt))
    .action(async function (source) {

        term.clear()

        // *initialize program vars
        const options = Object.assign({}, Trainer.evolutionDefaults, program.opts())
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
        const debugBox = new termkit.TextBox({
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
        const infoBox = new termkit.TextBox({
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
        const evolutionsTable = new Table
        const infoTable = new Table
        
        evolutionsTable.cell('iterations', 0)
        evolutionsTable.cell('error', 0)
        evolutionsTable.cell('fitness', 0)
        evolutionsTable.newRow()
        options.callback = 'drawEvolution'
        options.callbackPeriod = options.logPeriod
        const optionsText = `Options:\n${'-'.repeat(term.width / 4 - 1)}\n`
        const formatOptions = function (item, cell) {
            for (const key in item) {
                if (!Object.hasOwnProperty.call(item, key)) continue
                const val = item[key]
                if (typeof val === 'function') continue
                if (typeof val === 'object') {
                    cell(`${key}`, `\n${JSON.stringify(item[key], null, 4)}`)
                } else {
                    cell(`${key}`, `${item[key]}`)
                }
            }
        }
        optionsBox.setContent(optionsText + Table.print(options, formatOptions))
        const bestTxt = `Best genome:\n${'-'.repeat(term.width / 4 - 1)}\n`
        const debugTxt = `Memory usage:\n${'-'.repeat(term.width / 4 - 1)}\n`

        const infoHeaders = ['error', 'fitness', 'binaryThresh', 'leakyReluAlpha', 'hiddenLayers', 'activation']
        const formatInfos = function (item, cell) {
            for (const key in item) {
                if (!Object.hasOwnProperty.call(item, key)) continue
                if (!infoHeaders.includes(key)) continue
                const val = item[key]
                if (typeof val === 'function') continue
                if (typeof val === 'object') {
                    if (Array.isArray(val)) {
                        cell(`${key}`, `${val.join()}`)
                    } else {
                        cell(`${key}`, `\n${JSON.stringify(item[key], null, 4)}`)    
                    }
                } else {
                    cell(`${key}`, `${item[key]}`)
                }
            }
        }

        // parse data source into training set and start evolution
        const data = await Data.parse(source)
        const trainer = new Trainer
        options.callback = drawEvolution
        options.callbackPeriod = options.logPeriod
        try {
            let best = await trainer.evolve([...data], { evolution: options })
            // TODO
        } catch (error) {
            term.moveTo(1, term.height - 1, '\n\n')
            console.error(error)
        } finally {
            terminate()
        }

        async function makeImages(bestJSON, location) {
            const results = await Data.parse([])
            const best = new brain.NeuralNetwork().fromJSON(bestJSON)
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
            const height = term.height - 2
            const width = term.width - 2
            screen.resize({ xmin: 0, ymin: 0, xmax: 35, ymax: 4 })
            evolutionBox.setSizeAndPosition({
                x: 1,
                y: screen.y + screen.height + 1,
                height: 3,
                width: width / 4
            })
            bestBox.setSizeAndPosition({
                x: width * 0.25,
                y: screen.y + screen.height + 1,
                height: 7,
                width: width / 4
            })
            optionsBox.setSizeAndPosition({
                x: width * 0.5,
                y: screen.y + screen.height + 1,
                height: height,
                width: width / 4
            })
            debugBox.setSizeAndPosition({
                x: width * 0.75,
                y: screen.y + screen.height + 1,
                height: height,
                width: width / 4
            })
            infoBox.setSizeAndPosition({
                x: 1,
                y: bestBox.outputY + bestBox.outputHeight + 1,
                height: height / 2 - 1,
                width: width / 2 - 1
            })
        }

        /**
         * Draw evolution details to the screen.
         * @param {Object} info information's about the evolution process
         */
        async function drawEvolution() {

            term.hideCursor(true)

            const { iterations, error } = trainer
            const best = trainer.population[0]
            const topTen = trainer.population.slice(0, 10).map(function (generator) {
                const result = Object.assign({}, { error: generator.error, fitness: generator.fitness }, generator.options)
                return result
            })

            evolutionsTable.rows[0].iterations = iterations
            evolutionsTable.rows[0].error = error
            evolutionsTable.rows[0].fitness = best.fitness
            evolutionBox.setContent(evolutionsTable.toString())

            bestBox.setContent(bestTxt + Table.print(best.options))

            infoBox.setContent(Table.print(topTen, formatInfos))

            const memoryTxt = Table.print(trainer.used, function (obj, cell) {
                for (const key in obj) {
                    if (!Object.hasOwnProperty.call(obj, key)) continue
                    cell(`${key}`, `${Math.round(obj[key] / 1024 / 1024 * 100) / 100} MB`)
                }
            })
            debugBox.setContent(debugTxt + memoryTxt)

            await makeImages(best, '../training/results/')
            await drawImages('../training/results/')

            term.moveTo(1, term.height - 1)
            term.hideCursor(false)
        }

        /**
         * Draw result images on the screen.
         * @param {String} location where the results are stored
         */
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
                const resolved = path.resolve(location, file)
                try {
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
                }
            }
            //let stats = screen.draw({ delta: true })
            screen.draw({ delta: true })
        }

        // *startup
        term.grabInput(true)

    })

program.parse()