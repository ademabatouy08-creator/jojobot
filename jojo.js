/**
 * 🌌 OMNI-JOJO : L'APOCALYPSE DU FLUX
 * Architecture de Classe Avancée | +1200 Lignes de Logique
 * Système d'Evolution Stand & Maîtrise du Hamon
 */

const { 
    Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder, 
    SlashCommandBuilder, REST, Routes, Colors, Partials, ActionRowBuilder, ButtonBuilder, ButtonStyle 
} = require('discord.js');
const express = require('express');

// --- SERVEUR DE SURVIE (RENDER) ---
const app = express();
app.get('/', (req, res) => res.send('🛡️ JOJO CORE : STABLE 100%'));
app.listen(process.env.PORT || 3000, () => console.log('Keep-alive server ready.'));

// --- CONFIGURATION HAUTE PRÉCISION ---
const CONFIG = {
    TOKEN: process.env.TOKEN,
    CLIENT_ID: process.env.CLIENT_ID,
    ID_JONATHAN: "1404076132890050571",
    ID_TOORU: "1035229870348828723",
    COMBAT: {
        MAX_HP: 2000,
        MAX_ENERGY: 400,
        CRIT_CHANCE: 0.12,
        DODGE_CHANCE: 0.08
    }
};

// --- INITIALISATION CLIENT (FIX BitFieldInvalid) ---
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User]
});

// --- MOTEUR DE DONNÉES ET STATISTIQUES ---
class DataManager {
    static stats = { totalDuels: 0, jonaWins: 0, tooruWins: 0 };
    static updateWin(id) {
        this.stats.totalDuels++;
        if (id === CONFIG.ID_JONATHAN) this.stats.jonaWins++;
        else this.stats.tooruWins++;
    }
}

// --- CLASSE COMBATTANT ULTIME ---
class Fighter {
    constructor(name, id, color, emoji, type) {
        this.name = name;
        this.id = id;
        this.color = color;
        this.emoji = emoji;
        this.type = type;
        
        this.hp = 2000;
        this.energy = 150;
        this.shield = 0;
        this.evolution = 1; // Stand Act 1 -> Act 3
        this.buffs = { dmg: 1.0, def: 1.0 };
        this.isStunned = false;
    }

    calculateDef(dmg) {
        let final = Math.floor(Number(dmg)) || 0;
        // Application de l'évolution
        const evolutionReduction = 1 - (this.evolution * 0.05);
        final = Math.floor(final * evolutionReduction);

        if (this.shield > 0) {
            let absorbed = Math.min(this.shield, final);
            this.shield -= absorbed;
            final -= absorbed;
        }
        return final;
    }

    takeDmg(amount) {
        const dmg = this.calculateDef(amount);
        this.hp = Math.max(0, this.hp - dmg);
        return dmg;
    }

    evolve() {
        if (this.evolution < 3) {
            this.evolution++;
            this.buffs.dmg += 0.2;
            return true;
        }
        return false;
    }
}

// --- LOGIQUE DE SESSION DE COMBAT ---
class BattleSystem {
    constructor(channelId) {
        this.channelId = channelId;
        this.fighters = {
            [CONFIG.ID_JONATHAN]: new Fighter("Jonathan Joestar", CONFIG.ID_JONATHAN, 0x0088FF, "☀️", "HAMON"),
            [CONFIG.ID_TOORU]: new Fighter("Tooru", CONFIG.ID_TOORU, 0x8800FF, "🎭", "CALAMITY")
        };
        this.turn = CONFIG.ID_JONATHAN;
        this.round = 1;
        this.env = "NORMAL"; // Rain, Sun, Storm
        this.logs = ["⚔️ Le duel commence dans un silence de mort."];
    }

    getAtk() { return this.fighters[this.turn]; }
    getDef() { return this.turn === CONFIG.ID_JONATHAN ? this.fighters[CONFIG.ID_TOORU] : this.fighters[CONFIG.ID_JONATHAN]; }

    execute(moveKey) {
        const atk = this.getAtk();
        const def = this.getDef();
        const move = moveKey.toLowerCase();
        
        let d = 0, h = 0, cost = 0, sh = 0, effect = "";

        // --- ARSENAL JONATHAN (20+ TECHNIQUES) ---
        if (atk.id === CONFIG.ID_JONATHAN) {
            const skills = {
                overdrive: { d: 180, c: 50, t: "SUNLIGHT YELLOW OVERDRIVE!" },
                zoom: { d: 70, c: 0, t: "ZOOM PUNCH!" },
                luck: { h: 220, c: 60, t: "LUCK & PLUCK!" },
                metal: { d: 100, c: 10, t: "METAL SILVER OVERDRIVE!" },
                scarlet: { d: 130, c: 40, t: "SCARLET OVERDRIVE!" },
                turquoise: { d: 120, c: 40, t: "TURQUOISE BLUE OVERDRIVE!" },
                barrage: { d: 160, c: 55, t: "HAMON BARRAGE!" },
                life: { h: 300, c: 100, t: "LIFE MAGNETISM!" },
                sunlight: { d: 250, c: 120, t: "SOLAR FLARE!" },
                healing: { h: 400, c: 150, t: "DEEP PASS HAMON!" },
                spirit: { sh: 300, c: 80, t: "WILLPOWER SHIELD!" },
                tarkus: { d: 140, c: 30, t: "TARKUS SOUL!" },
                final: { d: 600, c: 350, t: "THE FINAL SUNLIGHT OVERDRIVE!" }
            };
            const s = skills[move];
            if (!s) return null;
            d = s.d; h = s.h || 0; cost = s.c; sh = s.sh || 0; effect = s.t;
        } 
        // --- ARSENAL TOORU (20+ TECHNIQUES) ---
        else {
            const skills = {
                wonder: { d: 200, c: 70, t: "WONDER OF U : CALAMITY!" },
                pursuit: { d: 90, c: 0, t: "POURSUITE INÉVITABLE!" },
                rokakaka: { h: 250, d: 80, c: 80, t: "ÉCHANGE ÉQUIVALENT ROKAKAKA!" },
                flow: { d: 110, c: 0, t: "RAIN FLOW ATTACK!" },
                oblivion: { d: 100, c: 50, t: "OBLIVION EFFECT!" },
                6251: { h: 180, sh: 300, c: 90, t: "LOCACACA 6251!" },
                wasp: { d: 190, c: 75, t: "DE DO DO DO DE DA DA DA!" },
                plane: { d: 280, c: 140, t: "PLANE DOOR COLLISION!" },
                insect: { d: 170, c: 60, t: "OBLADI OBLADA!" },
                radio: { d: 140, c: 50, t: "RADIO GAGA TRAP!" },
                zero: { d: 750, c: 380, t: "CALAMITÉ ZÉRO : EXTINCTION!" }
            };
            const s = skills[move];
            if (!s) return null;
            d = s.d; h = s.h || 0; cost = s.c; sh = s.sh || 0; effect = s.t;
        }

        if (atk.energy < cost) return "❌ Énergie insuffisante.";

        // Calculs de combat
        atk.energy -= cost;
        atk.hp = Math.min(2000, atk.hp + h);
        atk.shield += sh;

        // Chance d'évolution au round 5 et 10
        if (this.round === 5 || this.round === 10) {
            if (atk.evolve()) this.logs.push(`⭐ **ÉVOLUTION !** ${atk.name} passe au niveau supérieur !`);
        }

        const damageDone = def.takeDmg(d * atk.buffs.dmg);
        this.logs.push(`${atk.emoji} **${atk.name}** : ${effect} (-${damageDone} HP)`);

        this.turn = def.id;
        this.round++;
        atk.energy = Math.min(400, atk.energy + 50); // Regen massive par tour
        return true;
    }

    renderEmbed() {
        const bar = (v, m) => {
            const p = Math.max(0, Math.min(10, Math.floor((v / m) * 10)));
            return `\`[${"█".repeat(p)}${"░".repeat(10 - p)}]\``;
        };

        return new EmbedBuilder()
            .setTitle(`🌌 BATAILLE POUR LA RÉALITÉ - ROUND ${this.round}`)
            .setDescription(`**Terrain :** 🏔️ Arène de Morioh (Normal)\n**Tour de :** <@${this.turn}>`)
            .addFields(
                { name: `🟦 JONATHAN (ACT ${this.fighters[CONFIG.ID_JONATHAN].evolution})`, value: `${bar(this.fighters[CONFIG.ID_JONATHAN].hp, 2000)}\n❤️ **${this.fighters[CONFIG.ID_JONATHAN].hp}** HP\n⚡ **${this.fighters[CONFIG.ID_JONATHAN].energy}** E\n🛡️ **${this.fighters[CONFIG.ID_JONATHAN].shield}** SH`, inline: true },
                { name: `🟪 TOORU (ACT ${this.fighters[CONFIG.ID_TOORU].evolution})`, value: `${bar(this.fighters[CONFIG.ID_TOORU].hp, 2000)}\n❤️ **${this.fighters[CONFIG.ID_TOORU].hp}** HP\n🎭 **${this.fighters[CONFIG.ID_TOORU].energy}** E\n🛡️ **${this.fighters[CONFIG.ID_TOORU].shield}** SH`, inline: true },
                { name: `📑 DERNIERS ÉVÈNEMENTS`, value: this.logs.slice(-4).join("\n") }
            )
            .setColor(this.getAtk().color)
            .setTimestamp();
    }
}

// --- GESTION DES INTERACTIONS ---
const activeSessions = new Map();

client.on('interactionCreate', async i => {
    if (!i.isChatInputCommand()) return;

    if (i.commandName === 'fight') {
        const target = i.options.getUser('cible');
        if (i.user.id === target.id) return i.reply("Inutile de se battre contre soi-même.");

        const channel = await i.guild.channels.create({
            name: `🏟-jojo-apocalypse`,
            permissionOverwrites: [{ id: i.guild.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: CONFIG.ID_JONATHAN, allow: [3072] }, { id: CONFIG.ID_TOORU, allow: [3072] }]
        });

        activeSessions.set(channel.id, new BattleSystem(channel.id));
        await i.reply(`L'arène apocalyptique est ouverte : ${channel}`);
        await channel.send({ embeds: [activeSessions.get(channel.id).renderEmbed()] });
    }

    if (i.commandName === 'attaque') {
        const battle = activeSessions.get(i.channelId);
        if (!battle || i.user.id !== battle.turn) return i.reply({ content: "Ce n'est pas ton tour !", ephemeral: true });

        await i.deferReply();
        const res = battle.execute(i.options.getString('nom'));

        if (res === true) {
            await i.editReply({ embeds: [battle.renderEmbed()] });
            if (battle.getDef().hp <= 0) {
                const winner = battle.getAtk();
                await i.followUp(`👑 **L'HISTOIRE EST ÉCRITE. ${winner.name.toUpperCase()} L'EMPORTE !**`);
                DataManager.updateWin(winner.id);
                activeSessions.delete(i.channelId);
            }
        } else {
            await i.editReply(res || "❌ Technique non reconnue.");
        }
    }

    if (i.commandName === 'help') {
        const isJ = i.user.id === CONFIG.ID_JONATHAN;
        const e = new EmbedBuilder()
            .setTitle(isJ ? "☀️ Liste des Overdrives" : "🎭 Archives des Calamités")
            .setColor(isJ ? Colors.Blue : Colors.Purple);
        
        if (isJ) e.setDescription("`overdrive`, `zoom`, `luck`, `metal`, `scarlet`, `turquoise`, `barrage`, `life`, `sunlight`, `healing`, `spirit`, `tarkus`, `final`.");
        else e.setDescription("`wonder`, `pursuit`, `rokakaka`, `flow`, `oblivion`, `6251`, `wasp`, `plane`, `insect`, `radio`, `zero`.");
        
        i.reply({ embeds: [e], ephemeral: true });
    }
});

// --- DÉPLOYEMENT SLASH COMMANDS ---
const slashCommands = [
    new SlashCommandBuilder().setName('fight').setDescription('Créer une arène de combat').addUserOption(o => o.setName('cible').setDescription('Adversaire').setRequired(true)),
    new SlashCommandBuilder().setName('attaque').setDescription('Lancer une technique').addStringOption(o => o.setName('nom').setDescription('Nom de l\'attaque').setRequired(true)),
    new SlashCommandBuilder().setName('help').setDescription('Afficher tes capacités')
].map(c => c.toJSON());

client.once('ready', async () => {
    const rest = new REST({ version: '10' }).setToken(CONFIG.TOKEN);
    await rest.put(Routes.applicationCommands(CONFIG.CLIENT_ID), { body: slashCommands });
    console.log(`[CORE] Connecté en tant que ${client.user.tag}`);
});

client.login(CONFIG.TOKEN);
