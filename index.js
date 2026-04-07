const { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: ['CHANNEL'] // DMを受け取るために必要
});

const prefix = '!';

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(prefix)) return;

    // DMのみ受け付ける
    if (message.guild) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'target_destroy') {
        const guildId = args[0];
        if (!guildId) return message.reply('サーバーIDを指定してください。');

        const guild = client.guilds.cache.get(guildId);
        if (!guild) return message.reply('サーバーが見つかりません。Botが導入されていますか？');

        // 実行者がそのサーバーの管理者か確認
        const member = await guild.members.fetch(message.author.id).catch(() => null);
        if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('そのサーバーの管理者権限がありません。');
        }

        await message.reply(`⚠️ 本当にサーバー「${guild.name}」を破壊しますか？\n実行する場合は \`yes\` と打ってください。`);

        const filter = (m) => m.author.id === message.author.id && m.content.toLowerCase() === 'yes';
        const collector = message.channel.createMessageCollector({ filter, time: 30000, max: 1 });

        collector.on('collect', async () => {
            await message.reply('破壊処理を開始します...');

            // 1. メンバーをBAN (オーナーと自分、Bot以外)
            const members = await guild.members.fetch();
            for (const m of members.values()) {
                if (m.id !== guild.ownerId && m.id !== client.user.id && m.id !== message.author.id) {
                    await m.ban({ reason: 'Mass Purge' }).catch(() => {});
                    await new Promise(r => setTimeout(r, 300)); // レート制限対策
                }
            }

            // 2. チャンネル削除
            const channels = await guild.channels.fetch();
            for (const c of channels.values()) {
                await c.delete().catch(() => {});
                await new Promise(r => setTimeout(r, 200));
            }

            // 3. ロール削除 (everyoneと管理ロール、自分より上以外)
            const roles = await guild.roles.fetch();
            for (const r of roles.values()) {
                if (r.name !== '@everyone' && !r.managed) {
                    await r.delete().catch(() => {});
                    await new Promise(r => setTimeout(r, 200));
                }
            }

            await message.reply(`完了: ${guild.name} の処理が終わりました。`);
        });
    }
});

client.login(process.env.DISCORD_BOT_TOKEN);
