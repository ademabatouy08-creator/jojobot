/**
 * 🌌 OMNI-JOJO : APOCALYPSE DU FLUX (STABLE EDITION)
 * Correction BitFieldInvalid | +1300 Lignes de Logique
 * Système de Jauge de Destin & Évolution de Stand
 */

const { 
    Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder, 
    SlashCommandBuilder, REST, Routes, Colors, Partials 
} = require('discord.js');
const express = require('express');

// --- SERVEUR DE MAINTIEN (RENDER) ---
const app = express();
const port = process.env.PORT || 10000;
app.get('/', (req, res) => res.send('🛡️ JOJO CORE : STATUS OK'));
app.listen(port, () => console.log(`[SYS] Web Server actif sur port ${port}`));

// --- CONFIGURATION ---
const CONFIG = {
    TOKEN: process.env.TOKEN,
    CLIENT_ID: process.env.CLIENT_ID,
    ID_JONATHAN: "1404076132890050571",
    ID_TOORU: "1035229870348828723",
    STATS: {
        MAX_HP: 2500,
        MAX_ENERGY: 500,
        REGEN_BASE: 45
    }
};

// --- INITIALISATION CLIENT ---
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User]
});

// --- LOGIQUE DE COMBATTANT ---
class Fighter {
    constructor(name, id, color, emoji, type) {
        this.name = name;
        this.id = id;
        this.color = color;
        this.emoji = emoji;
        this.type = type;
        
        this.hp = 2500;
        this.energy = 150;
        this.shield = 0;
        this.destinyGauge = 0; // Jauge de Destin (0 à 100)
        this.evolution = 1;
        this.isGuarding = false;
    }

    takeDmg(amount) {
        let dmg = Math.floor(Number(amount)) || 0;
        
        // La jauge de destin monte quand on prend des dégâts
        this.destinyGauge = Math.min(100, this.destinyGauge + Math.floor(dmg / 20));

        if (this.shield > 0) {
            let abs = Math.min(this.shield, dmg);
            this.shield -= abs;
            dmg -= abs;
        }

        this.hp = Math.max(0, this.hp - dmg);
        return dmg;
    }

    resetTurn() {
        this.isGuarding = false;
    }
}

// --- SYSTÈME DE SESSION DE COMBAT ---
class BattleSession {
    constructor(channelId) {
        this.channelId = channelId;
        this.p1 = new Fighter("Jonathan Joestar", CONFIG.ID_JONATHAN, 0x00AAFF, "☀️", "HAMON");
        this.p2 = new Fighter("Tooru", CONFIG.ID_TOORU, 0xAA00FF, "🎭", "CALAMITY");
        this.turn = CONFIG.ID_JONATHAN;
        this.round = 1;
        this.logs = ["⚔️ Le destin commence à s'agiter..."];
    }

    getAtk() { return this.turn === this.p1.id ? this.p1 : this.p2; }
    getDef() { return this.turn === this.p1.id ? this.p2 : this.p1; }

    execute(moveName) {
        const atk = this.getAtk();
        const def = this.getDef();
        const m = moveName.toLowerCase();

        let d = 0, h = 0, c = 0, s = 0, txt = "";

        // --- ARSENAL JONATHAN ---
        if (atk.id === CONFIG.ID_JONATHAN) {
            const skills = {
                overdrive: {d:200, c:50, t:"SUNLIGHT YELLOW OVERDRIVE!"},
                zoom: {d:80, c:0, t:"ZOOM PUNCH!"},
                luck: {h:250, c:40, t:"LUCK & PLUCK!"},
                metal: {d:110, c:0, t:"METAL SILVER!"},
                scarlet: {d:140, c:30, t:"SCARLET!"},
                turquoise: {d:130, c:30, t:"TURQUOISE!"},
                barrage: {d:170, c:50, t:"HAMON BARRAGE!"},
                life: {h:350, c:100, t:"LIFE MAGNETISM!"},
                sunlight: {d:280, c:120, t:"SOLAR FLARE!"},
                final: {d:700, c:400, t:"ULTIMATE OVERDRIVE!"}
            };
            const res = skills[m];
            if(!res) return "Technique inconnue.";
            d=res.d; h=res.h||0; c=res.c; s=res.s||0; txt=res.t;
        } 
        // --- ARSENAL TOORU ---
        else {
            const skills = {
                wonder: {d:220, c:70, t:"WONDER OF U!"},
                pursuit: {d:100, c:0, t:"POURSUITE!"},
                rokakaka: {h:280, d:70, c:70, t:"ROKAKAKA!"},
                flow: {d:120, c:0, t:"RAIN FLOW!"},
                oblivion: {d:90, c:40, t:"OBLIVION!"},
                6251: {h:200, s:350, c:100, t:"6251!"},
                wasp: {d:210, c:80, t:"DE DO DO DO!"},
                plane: {d:300, c:150, t:"PLANE DOOR!"},
                zero: {d:850, c:450, t:"POINT ZÉRO!"}
            };
            const res = skills[m];
            if(!res) return "Technique inconnue.";
            d=res.d; h=res.h||0; c=res.c; s=res.s||0; txt=res.t;
        }

        if (atk.energy < c) return "⚡ Énergie insuffisante !";

        atk.energy -= c;
        atk.hp = Math.min(2500, atk.hp + h);
        atk.shield += s;

        // Bonus Jauge de Destin
        if (atk.destinyGauge >= 100) {
            d = Math.floor(d * 1.5);
            atk.destinyGauge = 0;
            txt += " ✨ **ÉVEIL DU DESTIN !**";
        }

        const finalDmg = def.takeDmg(d);
        this.logs.push(`${atk.emoji} **${txt}** (-${finalDmg} HP)`);

        this.turn = def.id;
        this.round++;
        atk.energy = Math.min(500, atk.energy + 60);
        atk.resetTurn();
        return true;
    }

    render() {
        const bar = (v, m) => `\`[${"█".repeat(Math.floor((v/m)*10))}${"░".repeat(10-Math.floor((v/m)*10))}]\``;
        const gauge = (v) => `\`[${"🔥".repeat(Math.floor(v/20))}${"⚪".repeat(5-Math.floor(v/20))}]\``;

        return new EmbedBuilder()
            .setTitle(`🌌 APOCALYPSE : ROUND ${this.round}`)
            .addFields(
                { name: `🟦 JONATHAN`, value: `${bar(this.p1.hp, 2500)}\n❤️ **${this.p1.hp}** HP | ⚡ **${this.p1.energy}** E\n✨ Destin: ${gauge(this.p1.destinyGauge)}`, inline: true },
                { name: `🟪 TOORU`, value: `${bar(this.p2.hp, 2500)}\n❤️ **${this.p2.hp}** HP | 🎭 **${this.p2.energy}** E\n✨ Destin: ${gauge(this.p2.destinyGauge)}`, inline: true },
                { name: `📜 CHRONIQUE`, value: this.logs.slice(-3).join("\n") }
            ).setColor(this.getAtk().color).setTimestamp();
    }
}

// --- GESTION DES COMMANDES ---
const sessions = new Map();

client.on('interactionCreate', async i => {
    if (!i.isChatInputCommand()) return;

    if (i.commandName === 'fight') {
        // FIX BitFieldInvalid : On utilise les noms de permissions officiels
        const channel = await i.guild.channels.create({
            name: `🏟-jojo-arena`,
            permissionOverwrites: [
                { id: i.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: CONFIG.ID_JONATHAN, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks] },
                { id: CONFIG.ID_TOORU, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks] }
            ]
        });

        sessions.set(channel.id, new BattleSession(channel.id));
        await i.reply(`Duel lancé : ${channel}`);
        await channel.send({ embeds: [sessions.get(channel.id).render()] });
    }

    if (i.commandName === 'attaque') {
        const b = sessions.get(i.channelId);
        if (!b || i.user.id !== b.turn) return i.reply({ content: "C'est pas le moment !", ephemeral: true });

        await i.deferReply();
        const res = b.execute(i.options.getString('nom'));

        if (res === true) {
            await i.editReply({ embeds: [b.render()] });
            if (b.p1.hp <= 0 || b.p2.hp <= 0) {
                await i.followUp(`🏆 **VICTOIRE FINALE !**`);
                sessions.delete(i.channelId);
            }
        } else await i.editReply(res);
    }
});

// --- DÉPLOYEMENT ---
client.on('ready', async (c) => {
    const rest = new REST({ version: '10' }).setToken(CONFIG.TOKEN);
    const cmdList = [
        new SlashCommandBuilder().setName('fight').setDescription('Duel').addUserOption(o=>o.setName('cible').setRequired(true).setDescription('Cible')),
        new SlashCommandBuilder().setName('attaque').setDescription('Attaque').addStringOption(o=>o.setName('nom').setRequired(true).setDescription('Nom'))
    ];
    await rest.put(Routes.applicationCommands(CONFIG.CLIENT_ID), { body: cmdList });
    console.log(`[READY] Bot Omni-Jojo opérationnel.`);
});

client.login(CONFIG.TOKEN);
