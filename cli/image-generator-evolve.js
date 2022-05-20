const fs = require('fs')
const path = require('path')
const termkit = require('../node_modules/terminal-kit/lib/termkit.js')
const term = termkit.terminal
const Table = require('easy-table')
const { Command, Option, InvalidArgumentError } = require('commander')
const { Data, Trainer } = require('../src/Trainer.js')

const program = new Command

function myParseInt(value, dummyPrevious) {
    // parseInt takes a string and a radix
    const parsedValue = parseInt(value, 10)
    if (isNaN(parsedValue)) throw new InvalidArgumentError('Not a number.')
    return parsedValue
}

program
    .description('evolve brains on a data set')
    .argument('<source>', 'data source to evolve on')
    .addOption(new Option('-e --elitism <factor>', 'factor for selecting the number of elite brains').default(0.01).argParser(parseFloat))
    .addOption(new Option('-g --maxGenerations <max>', 'maximum generations to evolve').default(1024).argParser(myParseInt))
    .addOption(new Option('-l --maxLayers <max>', 'maximum layers of one brain').default(128).argParser(myParseInt))
    .addOption(new Option('-n --maxNeurons <max>', 'maximum neurons of one brain').default(128).argParser(myParseInt))
    .addOption(new Option('-p --populationSize <size>', 'size of population').default(128).argParser(myParseInt))
    .addOption(new Option('-t --training <options>', 'training options').default(Trainer.trainDefaults))
    .action(async function (source) {

        // *init
        const options = program.opts()
        const generationTable = new Table
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
        const screen = termkit.ScreenBuffer.create({ dst: term, height: 4, width: 17, noFill: true })
        screen.y = title.outputY + 3
        const targetImage = await termkit.ScreenBuffer.loadImage(
            '../training/simple/circle.jpg',
            {
                terminal: term,
                shrink: { width: term.width, height: (term.height - 1) }
            }
        )
        targetImage.dst = screen
        const resultImage = await termkit.ScreenBuffer.loadImage(
            '../training/simple/circle.jpg',
            {
                terminal: term,
                shrink: { width: term.width, height: (term.height - 1) }
            }
        )
        resultImage.dst = screen
        resultImage.x = 9

        const evolutionHeaders = new termkit.TextBox({
            parent: document,
            content: '',
            contentHasMarkup: 'legacyAnsi',
            x: 0,
            y: 0,
            attr: { bgColor: 'default' }
        })

        const evolutionBox = new termkit.TextBox({
            parent: document,
            content: '',
            contentHasMarkup: 'legacyAnsi',
            x: 0,
            y: 0,
            attr: { bgColor: 'default' },
            scrollable: true,
            vScrollBar: true
        })

        term.hideCursor()
        draw()

        // *logic
        let best = undefined
        const data = await Data.parse(source)
        const trainer = new Trainer()
        options.callback = drawGeneration
        options.callbackPeriod = 1
        options.training.iterations = 50
        options.training.errorThresh = 0.00005
        /* console.log(`\n`)
        console.log({ options }) */
        best = trainer.evolve(data, options)
        fs.writeFileSync(path.resolve('../debug/generator2.json'), JSON.stringify(best.generator.toJSON(), null, 4))
        //console.log({ best: best.genome })
        //terminate()

        // *callbacks
        function terminate() {
            term.grabInput(false)
            term.styleReset()
            term.hideCursor(false)
            term.moveTo(term.width, evolutionBox.outputY + evolutionBox.outputHeight + 1)
            term('\n')
            setTimeout(function () { term.processExit(0) }, 100)
        }
        function draw() {
            screen.fill(filler)
            targetImage.draw()
            resultImage.draw()
            let stats = screen.draw({ delta: true })
            term.styleReset()
            //console.error( stats )
        }
        function drawGeneration(info) {
            
            generationTable.cell('generation', options.maxGenerations - info.maxGenerations + 1)
            generationTable.cell('error', info.error)
            generationTable.cell('best', JSON.stringify(trainer.population[0].genome))
            generationTable.newRow()

            const generationText = generationTable.toString()
            const generationLines = generationText.split('\n')
            //const generationWidth = generationLines[0].length + 1

            evolutionHeaders.setSizeAndPosition({ x: 0, y: screen.y + screen.height + 1, height: 2, width: term.width - 2 })
            evolutionHeaders.setContent(generationLines.slice(0, 2).join('\n'))
            evolutionBox.setSizeAndPosition({ x: 0, y: screen.y + screen.height + 3, height: 10, width: term.width - 2 })
            evolutionBox.setContent(generationLines.slice(2).join('\n'))
            evolutionBox.scrollToBottom()

        }

        // *events
        term.on('key', function (name, matches, data) {
            //console.log("'key' event:", name)
            switch (name) {
                case 'CTRL_C':
                    terminate()
                    break
            }
        })

        // *startup
        //term.grabInput(true)
        term.grabInput({ mouse: 'button' })

    })

program.parse()