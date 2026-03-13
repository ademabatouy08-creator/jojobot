/**
 * 🌌 OMNI-JOJO FINAL ENGINE : ULTIMATE EDITION
 * Jonathan Joestar vs Tooru (Wonder of U)
 * Architecture Pro-Scale | Zéro NaN | Système de Critique & Esquive
 */

const { 
    Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder, 
    SlashCommandBuilder, REST, Routes, Colors 
} = require('discord.js');
const express = require('express');

// --- INITIALISATION DU SERVEUR DE MAINTIEN (RENDER) ---
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('🛡️ PROTOCOLE JOJO : OPÉRATIONNEL'));
app.listen(port, () => console.log(`[SYS] Web Server actif sur port ${port}`));

// --- CONFIGURATION GLOBALE ---
const CONFIG = {
    TOKEN: process.env.TOKEN,
    CLIENT_ID: process.env.CLIENT_ID,
    ID_JONATHAN: "1404076132890050571",
    ID_TOORU: "1035229870348828723",
    LIMITS: {
        MAX_HP: 1500,
        MAX_ENERGY: 300,
        BASE_REGEN: 35
    }
};

// --- MOTEUR DE CLASSES (POUR GONFLER LE CODE ET LA LOGIQUE) ---

class Fighter {
    constructor(name, id, color, emoji, isJonathan) {
        this.name = name;
        this.id = id;
        this.color = color;
        this.emoji = emoji;
        this.isJonathan = isJonathan;
        
        // Initialisation forcée (Anti-NaN)
        this.hp = 1500;
        this.energy = 80;
        this.shield = 0;
        this.critChance = isJonathan ? 0.15 : 0.10;
        this.dodgeChance = isJonathan ? 0.05 : 0.12;
        this.defenseBase = 10;
    }

    // Système de calcul de dégâts complexe
    receiveDamage(rawAmount) {
        let amount = Math.floor(Number(rawAmount)) || 0;
        
        // Test d'esquive
        if (Math.random() < this.dodgeChance) return { dmg: 0, type: "ESQUIVE" };

        // Réduction défense
        amount = Math.max(0, amount - this.defenseBase);

        // Gestion bouclier
        if (this.shield > 0) {
            let absorbed = Math.min(this.shield, amount);
            this.shield = Math.max(0, this.shield - absorbed);
            amount = Math.max(0, amount - absorbed);
        }

        this.hp = Math.max(0, Math.floor(this.hp - amount));
        return { dmg: amount, type: "NORMAL" };
    }

    addEnergy(val) {
        this.energy = Math.min(CONFIG.LIMITS.MAX_ENERGY, Math.floor(this.energy + Number(val)));
    }

    addHp(val) {
        this.hp = Math.min(CONFIG.LIMITS.MAX_HP, Math.floor(this.hp + Number(val)));
    }
}

class BattleSession {
    constructor(channelId) {
        this.channelId = channelId;
        this.p1 = new Fighter("Jonathan Joestar", CONFIG.ID_JONATHAN, 0x00AAFF, "☀️", true);
        this.p2 = new Fighter("Tooru", CONFIG.ID_TOORU, 0xAA00FF, "🎭", false);
        this.turn = CONFIG.ID_JONATHAN;
        this.round = 1;
        this.logs = ["✨ Le rideau se lève sur un duel millénaire."];
    }

    getActor() { return this.turn === this.p1.id ? this.p1 : this.p2; }
    getEnemy() { return this.turn === this.p1.id ? this.p2 : this.p1; }

    process(moveName) {
        const actor = this.getActor();
        const enemy = this.getEnemy();
        const m = moveName.toLowerCase();

        let d = 0, h = 0, cost = 0, sh = 0, txt = "";

        // --- ARSENAL JONATHAN (LOGIQUE MASSIVE) ---
        if (actor.isJonathan) {
            const skills = {
                overdrive: {d:140, c:45, t:"SUNLIGHT YELLOW OVERDRIVE!"},
                zoom: {d:60, c:0, t:"ZOOM PUNCH!"},
                luck: {h:150, c:40, t:"LUCK & PLUCK!"},
                metal: {d:80, c:0, t:"METAL SILVER OVERDRIVE!"},
                scarlet: {d:95, c:30, t:"SCARLET OVERDRIVE!"},
                turquoise: {d:90, c:30, t:"TURQUOISE BLUE!"},
                barrage: {d:120, c:40, t:"HAMON BARRAGE!"},
                life: {h:200, c:70, t:"LIFE MAGNETISM!"},
                tarkus: {d:105, c:25, t:"FORCE DE TARKUS!"},
                bravery: {sh:250, c:50, t:"POSTURE DE BRAVOURE!"},
                sunlight: {d:170, c:80, t:"SOLAR FLARE!"},
                plis: {d:100, h:50, c:40, t:"HAMON DETECTOR!"},
                healing: {h:300, c:120, t:"DEEP PASS HAMON!"},
                wine: {d:125, c:45, t:"SNEEZE OVERDRIVE!"},
                bubble: {d:145, c:60, t:"BUBBLE HAMON!"},
                spirit: {sh:150, d:70, c:50, t:"WILLPOWER!"},
                final: {d:350, c:250, t:"THE FINAL OVERDRIVE!"}
            };
            const s = skills[m];
            if(!s) return null;
            d=s.d||0; h=s.h||0; cost=s.c||0; sh=s.sh||0; txt=s.t;
        } 
        // --- ARSENAL TOORU (LOGIQUE MASSIVE) ---
        else {
            const skills = {
                wonder: {d:160, c:60, t:"WONDER OF U!"},
                pursuit: {d:80, c:0, t:"POURSUITE INCESSANTE!"},
                rokakaka: {h:180, d:60, c:50, t:"ROKAKAKA FRUIT!"},
                flow: {d:90, c:0, t:"RAIN FLOW!"},
                oblivion: {d:70, c:35, t:"OBLIVION!"},
                endless: {d:115, c:45, t:"ENDLESS CALAMITY!"},
                6251: {h:120, sh:180, c:50, t:"LOCACACA 6251!"},
                wasp: {d:140, c:55, t:"DE DO DO DO DE DA DA DA!"},
                logic: {d:130, c:45, t:"LOGIQUE DU MONDE!"},
                radio: {d:100, c:40, t:"RADIO GAGA!"},
                calamity_wall: {d:110, sh:100, c:40, t:"WALL COLLAPSE!"},
                insect: {d:145, c:55, t:"OBLADI OBLADA!"},
                plane: {d:180, c:90, t:"PLANE DOOR FALL!"},
                cane: {d:95, c:25, t:"CANE STRIKE!"},
                identity: {d:125, h:60, c:45, t:"SATORU AKEFU!"},
                trap: {sh:200, d:50, c:60, t:"CALAMITY TRAP!"},
                zero: {d:380, c:280, t:"CALAMITÉ ZÉRO!"}
            };
            const s = skills[m];
            if(!s) return null;
            d=s.d||0; h=s.h||0; cost=s.c||0; sh=s.sh||0; txt=s.t;
        }

        if (actor.energy < cost) return "⚡ Énergie insuffisante !";

        // Traitement Technique
        actor.energy -= cost;
        actor.addHp(h);
        actor.shield += sh;

        // Calcul Critique
        let isCrit = Math.random() < actor.critChance;
        let finalDmg = isCrit ? Math.floor(d * 1.5) : d;

        const res = enemy.receiveDamage(finalDmg);
        
        let logMsg = `${actor.emoji} **${txt}**`;
        if (res.type === "ESQUIVE") logMsg += ` 💨 **ESQUIVÉ !**`;
        else logMsg += ` 💥 **-${res.dmg} HP** ${isCrit ? "‼️ (CRITIQUE)" : ""}`;

        this.logs.push(logMsg);
        this.turn = enemy.id;
        this.round++;
        actor.addEnergy(CONFIG.LIMITS.BASE_REGEN);
        return true;
    }

    render() {
        const bar = (curr, max) => {
            const size = 12;
            const p = Math.max(0, Math.min(size, Math.floor((curr / max) * size)));
            return `\`[${"█".repeat(p)}${"░".repeat(size - p)}]\``;
        };

        return new EmbedBuilder()
            .setTitle(`🏟️ ARÈNE DU DESTIN : ROUND ${this.round}`)
            .setColor(this.getActor().color)
            .addFields(
                { name: `🟦 JONATHAN`, value: `${bar(this.p1.hp, 1500)}\n❤️ **${this.p1.hp}** HP\n⚡ **${this.p1.energy}** E\n🛡️ **${this.p1.shield}** SH`, inline: true },
                { name: `🟪 TOORU`, value: `${bar(this.p2.hp, 1500)}\n❤️ **${this.p2.hp}** HP\n🎭 **${this.p2.energy}** E\n🛡️ **${this.p2.shield}** SH`, inline: true },
                { name: `📜 CHRONIQUE DU COMBAT`, value: this.logs.slice(-4).join("\n") }
            )
            .setFooter({ text: `Au tour de : ${this.getActor().name}` })
            .setTimestamp();
    }
}

// --- INITIALISATION BOT ---

const client = new Client({ intents: [32767] });
const arenas = new Map();

client.on('interactionCreate', async i => {
    if (!i.isChatInputCommand()) return;

    if (i.commandName === 'fight') {
        const target = i.options.getUser('cible');
        if (i.user.id === target.id) return i.reply("Auto-combat impossible.");
        
        const channel = await i.guild.channels.create({
            name: `🏟-jojo-final`,
            permissionOverwrites: [
                { id: i.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: CONFIG.ID_JONATHAN, allow: [3072] },
                { id: CONFIG.ID_TOORU, allow: [3072] }
            ]
        });

        arenas.set(channel.id, new BattleSession(channel.id));
        await i.reply(`L'arène finale est prête : ${channel}`);
        await channel.send({ embeds: [arenas.get(channel.id).render()] });
    }

    if (i.commandName === 'attaque') {
        const arena = arenas.get(i.channelId);
        if (!arena) return i.reply({ content: "Aucun combat ici.", ephemeral: true });
        if (i.user.id !== arena.turn) return i.reply({ content: "C'est le tour de ton adversaire !", ephemeral: true });

        await i.deferReply();
        const success = arena.process(i.options.getString('nom'));
        
        if (success === true) {
            await i.editReply({ embeds: [arena.render()] });
            if (arena.p1.hp <= 0 || arena.p2.hp <= 0) {
                const winner = arena.p1.hp > 0 ? arena.p1 : arena.p2;
                await i.followUp(`👑 **${winner.name.toUpperCase()} A REMPORTÉ LA VICTOIRE !**`);
                arenas.delete(i.channelId);
                setTimeout(() => i.channel.delete().catch(() => {}), 120000);
            }
        } else {
            await i.editReply(success || "⚠️ Nom d'attaque invalide.");
        }
    }

    if (i.commandName === 'help') {
        const j = i.user.id === CONFIG.ID_JONATHAN;
        const t = i.user.id === CONFIG.ID_TOORU;
        if (!j && !t) return i.reply("Accès refusé.");

        const hEmbed = new EmbedBuilder().setTitle(j ? "📖 Grimoire de Jonathan" : "📖 Archive de Tooru").setColor(j ? 0x00AAFF : 0xAA00FF);
        if (j) hEmbed.setDescription("**Hamon :** `overdrive`, `zoom`, `luck`, `metal`, `scarlet`, `turquoise`, `barrage`, `life`, `tarkus`, `bravery`, `sunlight`, `plis`, `healing`, `wine`, `bubble`, `spirit`, `final`.");
        else hEmbed.setDescription("**Calamité :** `wonder`, `pursuit`, `rokakaka`, `flow`, `oblivion`, `endless`, `6251`, `wasp`, `logic`, `radio`, `calamity_wall`, `insect`, `plane`, `cane`, `identity`, `trap`, `zero`.");
        
        return i.reply({ embeds: [hEmbed], ephemeral: true });
    }
});

client.once('ready', async () => {
    const rest = new REST({ version: '10' }).setToken(CONFIG.TOKEN);
    const slash = [
        new SlashCommandBuilder().setName('fight').setDescription('Créer un duel').addUserOption(o=>o.setName('cible').setDescription('Adversaire').setRequired(true)),
        new SlashCommandBuilder().setName('attaque').setDescription('Lancer une technique').addStringOption(o=>o.setName('nom').setDescription('Nom de l\'attaque').setRequired(true)),
        new SlashCommandBuilder().setName('help').setDescription('Afficher tes techniques secrètes')
    ];
    await rest.put(Routes.applicationCommands(CONFIG.CLIENT_ID), { body: slash });
    console.log(`[READY] Bot Omni-Jojo opérationnel.`);
});

client.login(CONFIG.TOKEN);
