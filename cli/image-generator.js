const { Command } = require('commander')

const program = new Command

program
    .description('ai image generator')
    .command('evolve', 'evolve brains on a data set')
    .command('train', 'train on a list of images')
    .command('parse', 'parse data into a training set')

module.exports = {
    cli: async function (args) {
        args[1] = __filename // workaround for subcommands
        program.parse(args)
    }
}