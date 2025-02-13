import { MessageType, WAMessage } from '@adiwajshing/baileys'
import chalk from 'chalk'
import Client from '../Client'
import { help, GroupEx } from '../lib'

import responses from '../lib/responses.json'
import Utils from '../Utils'
export class Message {
    validTypes = [MessageType.text, MessageType.image, MessageType.video, MessageType.extendedText]
    constructor(private client: Client, public group: GroupEx) {}

    handle = async (M: WAMessage): Promise<void> => {
        const from = M.key.remoteJid
        if (!from) return
        const { message } = M
        const body = message?.conversation
            ? message.conversation
            : message?.extendedTextMessage
            ? message.extendedTextMessage.text
            : message?.imageMessage
            ? message.imageMessage.caption
            : message?.videoMessage
            ? message.videoMessage.caption
            : null
        if (!body) return
        const opt = this.parseArgs(body)
        if (!opt) return
        const { flags, args } = opt
        if (!args[0].startsWith(this.client._config.prefix)) return void this.freeText(body, M)

        const command = args[0].slice(1).toLowerCase()

        const slicedJoinedArgs = args
            .join(' ')
            .slice(command.length + this.client._config.prefix.length)
            .trim()
        const barSplit = slicedJoinedArgs.includes('|') ? slicedJoinedArgs.split('|') : []

        const media =
            message?.imageMessage || message?.videoMessage
                ? M
                : message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage ||
                  message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage
                ? JSON.parse(JSON.stringify(M).replace('quotedM', 'm')).message.extendedTextMessage.contextInfo
                : null
        const sender = M.participant
        const mentioned = message?.extendedTextMessage?.contextInfo?.mentionedJid
            ? message.extendedTextMessage.contextInfo?.mentionedJid
            : message?.extendedTextMessage?.contextInfo?.participant
            ? [message.extendedTextMessage.contextInfo.participant]
            : []

        const group = await this.client.getGroupInfo(from)

        const { user, data: userData } = await this.client.getUser(sender)

        const username = user?.notify || user?.vname || user?.name || ''
        const [admin, iAdmin] = [group.admins.includes(sender), group.admins.includes(this.client.user.jid)]
        const mod = this.client._config.admins.includes(sender)
        console.log(
            chalk.green('[EXEC]', command),
            chalk.yellow('From', username),
            chalk.blue('in', group.metadata.subject)
        )
        if (userData.ban) return void this.client.reply(from, { body: responses['banned'] }, M)

        switch (command) {
            default:
                this.client.reply(from, { body: responses['invalid-command'] }, M)
                break
            case 'eval':
                if (mod) return void eval(slicedJoinedArgs)
                break
            case 'ban':
            case 'unban':
                if (!mod || mentioned.length === 0) return
                return this.client.banAction(from, mentioned, command === 'ban', M)
                break
            case 'hi':
                this.client.reply(from, { body: `Hi! ${username}` }, M)
                break
            case 'promote':
            case 'demote':
            case 'remove':
                this.client.reply(from, this.group.toggleEvent(from, mentioned || [], admin, iAdmin, command), M)
            case 'help':
                this.client.reply(from, { body: help(this.client, slicedJoinedArgs.toLowerCase().trim()) }, M)
                break
            case 'sticker':
                const sticker = !media
                    ? { body: responses['wrong-format-media'] }
                    : await Utils.createSticker(
                          await this.client.downloadMediaMessage(media),
                          flags.includes('--strech'),
                          barSplit[1],
                          barSplit[2]
                      )
                this.client.reply(from, sticker, M)
                break
            case 'anime':
            case 'manga':
            case 'character':
                this.client.reply(from, await Utils.searchAMC(slicedJoinedArgs, command), M)
                break
            case 'aid':
            case 'mid':
            case 'chid':
                this.client.reply(
                    from,
                    await Utils.getAMCById(
                        slicedJoinedArgs,
                        command === 'aid' ? 'anime' : command === 'mid' ? 'manga' : 'character'
                    ),
                    M
                )
                break
            case 'register':
                return void this.client.reply(
                    from,
                    await this.group.register(admin, group.data, true, slicedJoinedArgs.toLowerCase().trim()),
                    M
                )
            case 'unregister':
                return void this.client.reply(
                    from,
                    await this.group.register(admin, group.data, false, slicedJoinedArgs.toLowerCase().trim()),
                    M
                )
        }
    }

    validate = (M: WAMessage): string | boolean => {
        if (!M.message) return false
        if (!!M.key.fromMe || !M.participant) return false
        const type = Object.keys(M.message)[0]
        if (!this.validTypes.includes(type as MessageType)) return false
        return type
    }

    parseArgs = (text: string): false | parsedArgs => {
        const [args, flags]: string[][] = [[], []]
        if (!text) return false
        const baseArgs = text.split(' ')
        baseArgs.forEach((arg) => {
            if (arg?.startsWith('--')) flags.push(arg)
            args.push(arg)
        })
        return { args, flags }
    }

    freeText = async (text: string, M: WAMessage): Promise<void> => {
        const args = text.split(' ')
        const from = M.key.remoteJid
        if (!from) return
        const user = this.client.contacts[M.participant]
        const username = user?.notify || user?.vname || user?.name || ''
        const group = await this.client.getGroupInfo(from)

        const txt = args[0].toLowerCase()
        let body = ''
        switch (txt) {
            case 'hey':
                body = 'Hi there!'
                break
            case 'test':
                body = 'Well...'
                break
        }
        if (body) {
            console.log(
                chalk.green('TEXT', text),
                chalk.yellow('From', username),
                chalk.blue('in', group.metadata.subject)
            )
            this.client.reply(from, { body }, M)
        }
    }
}

export interface parsedArgs {
    args: string[]
    flags: string[]
}
