const { Command } = require('commander')

const program = new Command

program
    .description('ai image generator')
    .command('train', 'train on a list of images')

module.exports = {
    cli: async function (args) {
        args[1] = __filename // workaround for subcommands
        program.parse(args)
    }
}