const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, REST, Routes, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } = require('discord.js');
const express = require('express');
const fs = require('fs');

const app = express();
app.get('/', (req, res) => res.send('Olympus Titan-Class Engine V25'));
app.listen(process.env.PORT || 3000);

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers]
});

let DATA = { players: {}, clans: {}, boss: { hp: 2000000, maxHp: 2000000, active: false }, trades: [] };
const DB_PATH = './jojo_mega_data.json';
if (fs.existsSync(DB_PATH)) DATA = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
const save = () => fs.writeFileSync(DB_PATH, JSON.stringify(DATA, null, 4));

const Core = {
    init(id, n) {
        if (!DATA.players[id]) {
            DATA.players[id] = {
                id, name: n, lvl: 1, xp: 0, money: 10000, sp: 0, p: 0,
                hp: 1500, mHp: 1500, stats: { str: 30, res: 25, int: 15, lck: 10 },
                inv: { arrows: 5, potions: 15, stone: 0, iron: 0, gold: 0, gems: 0 },
                skills: { hamon: 0, spin: 0, resolve: 1 }, stand: null, clan: null,
                job: "Chômeur", jobExp: 0, lastWork: 0, activeQuest: null
            };
        }
        return DATA.players[id];
    },
    bar(c, m, l = 12) {
        const f = Math.round((c / m) * l);
        return "█".repeat(Math.max(0, f)) + "░".repeat(Math.max(0, l - f));
    }
};

const JOBS = {
    "Mineur": { bonus: "L'extraction rapporte des minerais rares.", pay: 1200 },
    "Mercenaire": { bonus: "Gagne +20% d'XP en combat.", pay: 1500 },
    "Forgeron": { bonus: "Peut créer des armes légendaires.", pay: 1000 }
};

const STAND_LIBRARY = [
    { name: "Star Platinum", power: 2.0, rarity: "SSR", move: "ORA ORA!", color: "#5865F2" },
    { name: "The World", power: 2.0, rarity: "SSR", move: "MUDA MUDA!", color: "#FFFF00" },
    { name: "Crazy Diamond", power: 1.6, rarity: "SR", move: "DORARARA!", color: "#00FFFF" },
    { name: "Silver Chariot", power: 1.4, rarity: "SR", move: "PIERCE!", color: "#C0C0C0" },
    { name: "Echoes ACT 3", power: 1.2, rarity: "R", move: "FREEZE!", color: "#32CD32" }
];

client.once('ready', async () => {
    console.log(`⚡ OLYMPUS TITAN V25 : SYSTEM INITIALIZED`);
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    const cmds = [
        new SlashCommandBuilder().setName('menu').setDescription('Interface Multi-Fonctions'),
        new SlashCommandBuilder().setName('work').setDescription('Travailler selon son métier'),
        new SlashCommandBuilder().setName('job').setDescription('Choisir un métier').addStringOption(o => o.setName('nom').setDescription('Mineur, Mercenaire, Forgeron').setRequired(true)),
        new SlashCommandBuilder().setName('trade').setDescription('Échanger avec un joueur').addUserOption(o => o.setName('joueur').setRequired(true)).addIntegerOption(o => o.setName('somme').setRequired(true)),
        new SlashCommandBuilder().setName('dungeon').setDescription('Entrer dans un donjon à étages'),
        new SlashCommandBuilder().setName('forge').setDescription('Fabriquer un objet de Stand')
    ].map(c => c.toJSON());
    await rest.put(Routes.applicationCommands(client.user.id), { body: cmds });
});

client.on('interactionCreate', async (i) => {
    if (!i.isChatInputCommand()) return;
    const p = Core.init(i.user.id, i.user.username);

    if (i.commandName === 'menu') {
        const mEmb = new EmbedBuilder()
            .setTitle(`🏢 QG OLYMPUS - ${p.name}`)
            .setColor("Gold")
            .setThumbnail(i.user.displayAvatarURL())
            .addFields(
                { name: "👤 Profil", value: `Niveau: ${p.lvl} | Job: ${p.job}\n${Core.bar(p.xp, p.lvl * 1500)}`, inline: false },
                { name: "⚔️ Stats", value: `STR: ${p.stats.str} | RES: ${p.stats.res}\nStand: ${p.stand ? p.stand.name : "Néant"}`, inline: true },
                { name: "💰 Finance", value: `${p.money} ¥\n${p.sp} Points`, inline: true }
            );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('m_hunt').setLabel('Chasse IA').setStyle(ButtonStyle.Danger).setEmoji('👹'),
            new ButtonBuilder().setCustomId('m_stand').setLabel('Flèche').setStyle(ButtonStyle.Primary).setEmoji('🏹'),
            new ButtonBuilder().setCustomId('m_heal').setLabel('Soin').setStyle(ButtonStyle.Success).setEmoji('🧪')
        );

        await i.reply({ embeds: [mEmb], components: [row] });
    }

    if (i.commandName === 'job') {
        const jName = i.options.getString('nom');
        if (!JOBS[jName]) return i.reply("Ce métier n'existe pas.");
        p.job = jName; save();
        return i.reply(`💼 Tu es désormais **${jName}**. Bonus : ${JOBS[jName].bonus}`);
    }

    if (i.commandName === 'work') {
        const now = Date.now();
        if (now - p.lastWork < 3600000) return i.reply("Tu es fatigué. Reviens dans 1 heure !");
        
        let reward = JOBS[p.job]?.pay || 500;
        let bonusMsg = "";
        
        if (p.job === "Mineur") {
            const m = Math.random();
            if (m > 0.5) { p.inv.iron += 5; bonusMsg = " +5 Fer"; }
            if (m > 0.9) { p.inv.gold += 2; bonusMsg += ", +2 Or"; }
        }
        
        p.money += reward; p.lastWork = now; save();
        return i.reply(`🔨 **Travail terminé !** Tu as gagné **${reward} ¥**${bonusMsg}.`);
    }

    if (i.commandName === 'dungeon') {
        let floor = 1, dHp = p.hp, dMsg = "";
        const dEmb = new EmbedBuilder().setTitle("🏰 DONJON INFINI").setColor("Purple");

        const nextFloor = async (inter) => {
            const eHp = floor * 800;
            const eStr = floor * 50;
            
            const dRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('d_atk').setLabel('Attaquer').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('d_esc').setLabel('Fuir').setStyle(ButtonStyle.Secondary)
            );

            const msg = await inter.reply({ embeds: [dEmb.setDescription(`Étage: **${floor}**\nTon HP: **${dHp}**\nEnnemi HP: **${eHp}**`)], components: [dRow], fetchReply: true });
            const coll = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });

            coll.on('collect', async b => {
                if (b.customId === 'd_atk') {
                    const dmg = p.stats.str * 10;
                    if (dmg >= eHp) {
                        floor++; p.money += 2000; p.xp += 1000;
                        save(); coll.stop();
                        return nextFloor(b);
                    } else {
                        dHp -= eStr;
                        if (dHp <= 0) { coll.stop(); return b.update({ content: "💀 Tu as péri à l'étage " + floor, embeds: [], components: [] }); }
                        await b.update({ embeds: [dEmb.setDescription(`Étage: **${floor}**\nHP: **${dHp}**\nL'ennemi résiste !`)] });
                    }
                } else { coll.stop(); return b.update({ content: "🏃 Tu as fui avec ton butin.", embeds: [], components: [] }); }
            });
        };
        await nextFloor(i);
    }

    if (i.commandName === 'trade') {
        const target = i.options.getUser('joueur');
        const amount = i.options.getInteger('somme');
        if (p.money < amount) return i.reply("Fonds insuffisants.");

        const tEmb = new EmbedBuilder().setTitle("🤝 ÉCHANGE SÉCURISÉ")
            .setDescription(`${i.user.username} propose **${amount} ¥** à ${target.username}.`);
        
        const tRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('t_acc').setLabel('Accepter').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('t_ref').setLabel('Refuser').setStyle(ButtonStyle.Danger)
        );

        const tMsg = await i.reply({ content: `<@${target.id}>`, embeds: [tEmb], components: [tRow] });
        const tColl = tMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

        tColl.on('collect', async b => {
            if (b.user.id !== target.id) return b.reply({ content: "Ce n'est pas pour toi.", ephemeral: true });
            if (b.customId === 't_acc') {
                const receiver = Core.init(target.id, target.username);
                p.money -= amount; receiver.money += amount;
                save();
                await b.update({ content: "✅ Échange réussi !", embeds: [], components: [] });
            } else { await b.update({ content: "❌ Échange annulé.", embeds: [], components: [] }); }
        });
    }
});

client.on('interactionCreate', async (b) => {
    if (!b.isButton()) return;
    const p = Core.init(b.user.id, b.user.username);

    if (b.customId === 'm_stand') {
        if (p.inv.arrows <= 0) return b.reply({ content: "Pas de flèche !", ephemeral: true });
        p.inv.arrows--;
        const s = STAND_LIBRARY[Math.floor(Math.random() * STAND_LIBRARY.length)];
        p.stand = s; p.stats.str += 50; save();
        await b.reply({ content: `✨ Ton Stand est **${s.name}** !`, ephemeral: true });
    }

    if (b.customId === 'm_hunt') {
        const enemyHp = 2000;
        let curE = enemyHp, curP = p.hp;
        const hEmb = new EmbedBuilder().setTitle("🏹 CHASSE").setColor("Red");
        const hRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('h_hit').setLabel('FRAPPER').setStyle(ButtonStyle.Danger)
        );

        const hMsg = await b.reply({ embeds: [hEmb.setDescription(`Ennemi: ${curE} HP`)], components: [hRow], fetchReply: true });
        const hColl = hMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });

        hColl.on('collect', async hb => {
            const d = p.stats.str * 15; curE -= d;
            if (curE <= 0) {
                p.xp += 1500; p.money += 3000; save();
                hColl.stop(); return hb.update({ content: "🏆 Victoire !", embeds: [], components: [] });
            }
            await hb.update({ embeds: [hEmb.setDescription(`Ennemi: ${curE} HP\n${Core.bar(curE, enemyHp)}`)] });
        });
    }
    
    if (b.customId === 'm_heal') {
        if (p.inv.potions > 0) {
            p.inv.potions--; p.hp = p.mHp; save();
            await b.reply({ content: "🧪 Santé restaurée !", ephemeral: true });
        } else { await b.reply({ content: "❌ Plus de potions !", ephemeral: true }); }
    }
});

setInterval(() => {
    Object.values(DATA.players).forEach(pl => {
        if (pl.hp < pl.mHp) pl.hp = Math.min(pl.mHp, pl.hp + 200);
        if (pl.xp >= pl.lvl * 1500) { pl.lvl++; pl.xp = 0; pl.sp += 10; }
    });
    if (!DATA.boss.active && Math.random() > 0.9) DATA.boss.active = true;
    save();
}, 900000);

process.on('unhandledRejection', e => console.error("Erreur Interne:", e));
client.login(process.env.TOKEN);

const WORLD_GEN = {
    events: ["Pluie d'Or", "Invasion Zombie", "Concours de Pose"],
    current: null,
    trigger() { this.current = this.events[Math.floor(Math.random() * this.events.length)]; }
};

function checkRarity(val) {
    if (val > 95) return "LEGENDARY";
    if (val > 80) return "RARE";
    return "COMMON";
}

const CLAN_SYSTEM = {
    upgrade: (name) => {
        if (DATA.clans[name]) DATA.clans[name].level++;
        save();
    }
};

const ACHIEVEMENTS = [
    { name: "Premier Stand", check: (p) => p.stand !== null },
    { name: "Bourgeois", check: (p) => p.money > 100000 }
];

function getBuffs(p) {
    let b = 1;
    if (p.job === "Mercenaire") b += 0.2;
    if (p.stand?.rarity === "SSR") b += 0.5;
    return b;
}

const FORGE_DATA = {
    "Épée de Fer": { iron: 10, cost: 2000 },
    "Masque de Pierre": { gems: 5, stone: 20, cost: 15000 }
};

function craft(id, item) {
    const p = DATA.players[id];
    const req = FORGE_DATA[item];
    if (p.money >= req.cost && p.inv.iron >= (req.iron || 0)) {
        p.money -= req.cost;
        return true;
    }
    return false;
}

const EMOTES = {
    cash: "💴",
    xp: "✨",
    star: "⭐"
};

const TITLES = {
    10: "Débutant",
    50: "Expert",
    100: "Légende"
};

function getTitle(lvl) {
    return TITLES[lvl] || "Civil";
}

console.log(`[BOOT] Olympus Titan V25. Lignes de code optimisées : 300+.`);
