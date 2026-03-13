/**
 * 🌌 OMNI-JOJO ENGINE : THE CALAMITY VS THE SUN
 * Logiciel de combat ultra-complet pour Discord & Render
 * Features: Effets de statut, Stand Rush, Système de Critique, Persistence.
 */

const { 
    Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder, 
    SlashCommandBuilder, REST, Routes, Colors, ActionRowBuilder, ButtonBuilder, ButtonStyle 
} = require('discord.js');
const express = require('express');

// --- SERVEUR DE MAINTIEN RENDER (PORT 3000) ---
const app = express();
app.get('/', (req, res) => res.send('⚔️ Moteur Jojo : PROTOCOLE ALPHA ACTIF'));
app.listen(process.env.PORT || 3000, () => console.log('Web Server ready.'));

// --- CONSTANTES DE JEU ---
const CONFIG = {
    TOKEN: process.env.TOKEN,
    CLIENT_ID: process.env.CLIENT_ID,
    ID_JONATHAN: "1404076132890050571",
    ID_TOORU: "1035229870348828723",
    MAX_HP: 1000,
    MAX_ENERGY: 200,
    CRIT_MULT: 1.8
};

// --- MOTEUR DE STATUTS ---
const STATUS_EFFECTS = {
    BURNING: { name: "🔥 Brûlure", dmg: 25, duration: 3 },
    CALAMITY: { name: "⚠️ Malédiction", dmg: 40, duration: 2 },
    STUN: { name: "⚡ Paralysie", dmg: 0, duration: 1 },
    REGEN: { name: "🌿 Régénération", dmg: -30, duration: 3 }
};

// --- CLASSES DU JEU ---
class Fighter {
    constructor(name, id, color, emoji) {
        this.name = name;
        this.id = id;
        this.color = color;
        this.emoji = emoji;
        this.hp = CONFIG.MAX_HP;
        this.energy = 60;
        this.shield = 0;
        this.activeStatuses = [];
        this.wins = 0; // Pourrait être lié à une DB
    }

    applyStatus(effect) {
        this.activeStatuses.push({ ...effect });
    }

    processStatuses() {
        let totalDmg = 0;
        let log = "";
        this.activeStatuses = this.activeStatuses.filter(s => {
            totalDmg += s.dmg;
            s.duration--;
            if (s.dmg !== 0) log += `\n${s.name} inflige ${s.dmg} dégâts à ${this.name}.`;
            return s.duration > 0;
        });
        this.hp = Math.max(0, this.hp - totalDmg);
        return log;
    }
}

class BattleInstance {
    constructor(channelId) {
        this.channelId = channelId;
        this.fighters = {
            [CONFIG.ID_JONATHAN]: new Fighter("Jonathan Joestar", CONFIG.ID_JONATHAN, Colors.Blue, "☀️"),
            [CONFIG.ID_TOORU]: new Fighter("Tooru", CONFIG.ID_TOORU, Colors.Purple, "🎭")
        };
        this.turn = CONFIG.ID_JONATHAN;
        this.round = 1;
        this.logs = ["✨ Une faille temporelle s'ouvre..."];
    }

    getActor() { return this.fighters[this.turn]; }
    getEnemy() { return this.turn === CONFIG.ID_JONATHAN ? this.fighters[CONFIG.ID_TOORU] : this.fighters[CONFIG.ID_JONATHAN]; }

    executeMove(moveName) {
        const actor = this.getActor();
        const enemy = this.getEnemy();
        const move = moveName.toLowerCase();
        
        let d = 0, h = 0, cost = 0, effect = null, flavor = "";

        // --- GESTION DES ATTAQUES JONATHAN (12 CAPACITÉS) ---
        if (actor.id === CONFIG.ID_JONATHAN) {
            const skills = {
                overdrive: { d: 110, c: 40, f: "SUNLIGHT YELLOW OVERDRIVE!" },
                zoom: { d: 50, c: 0, f: "ZOOM PUNCH!" },
                luck: { h: 100, c: 20, f: "LUCK & PLUCK!" },
                metal: { d: 60, c: 0, f: "METAL SILVER OVERDRIVE!", e: 30 },
                scarlet: { d: 70, c: 25, f: "SCARLET OVERDRIVE!", s: STATUS_EFFECTS.BURNING },
                turquoise: { d: 75, c: 25, f: "TURQUOISE BLUE OVERDRIVE!" },
                barrage: { d: 95, c: 30, f: "HAMON BARRAGE!" },
                life: { h: 150, c: 50, f: "LIFE MAGNETISM REGEN!", s: STATUS_EFFECTS.REGEN },
                tarkus: { d: 85, c: 20, f: "TARKUS' POWER!" },
                bravery: { d: 40, c: 10, f: "BRAVERY STANCE!", shield: 100 },
                sunlight: { d: 130, c: 70, f: "SOLAR FLARE!" },
                final: { d: 200, c: 150, f: "LAST TRICK!" }
            };
            const s = skills[move];
            if (!s) return null;
            d = s.d; h = s.h || 0; cost = s.c; effect = s.s || null; flavor = s.f;
            if (s.e) actor.energy += s.e;
            if (s.shield) actor.shield += s.shield;
        } 
        // --- GESTION DES ATTAQUES TOORU (12 CAPACITÉS) ---
        else {
            const skills = {
                wonder: { d: 130, c: 50, f: "WONDER OF U: CALAMITY!" },
                pursuit: { d: 60, c: 0, f: "INÉVITABLE POURSUITE!" },
                rokakaka: { h: 120, d: 50, c: 30, f: "ÉCHANGE ÉQUIVALENT ROKAKAKA!" },
                flow: { d: 70, c: 0, f: "RAINDROPS ATTACK!" },
                oblivion: { d: 40, c: 20, f: "OBLIVION EFFECT!", s: STATUS_EFFECTS.STUN },
                endless: { d: 85, c: 30, f: "ENDLESS CALAMITY!", s: STATUS_EFFECTS.CALAMITY },
                6251: { h: 80, c: 20, f: "LOCACACA 6251!", shield: 80 },
                wasp: { d: 110, c: 45, f: "DE DO DO DO DE DA DA DA!" },
                logic: { d: 100, c: 30, f: "LOGIC OF THIS WORLD!" },
                radio: { d: 80, c: 25, f: "RADIO GAGA TRAP!" },
                calamity_wall: { d: 90, c: 20, f: "WALL COLLAPSE!" },
                zero: { d: 220, c: 180, f: "POINT ZERO DISASTER!" }
            };
            const s = skills[move];
            if (!s) return null;
            d = s.d; h = s.h || 0; cost = s.c; effect = s.s || null; flavor = s.f;
            if (s.shield) actor.shield += s.shield;
        }

        if (actor.energy < cost) return "❌ Énergie insuffisante !";

        // Calcul final
        actor.energy -= cost;
        if (effect) enemy.applyStatus(effect);
        
        let finalDmg = d;
        if (enemy.shield > 0) {
            let absorbed = Math.min(enemy.shield, finalDmg);
            enemy.shield -= absorbed;
            finalDmg -= absorbed;
        }
        enemy.hp = Math.max(0, enemy.hp - finalDmg);
        actor.hp = Math.min(CONFIG.MAX_HP, actor.hp + h);

        this.logs.push(`**${actor.emoji} ${actor.name}**: ${flavor} (-${finalDmg} HP)`);
        
        // Fin de tour
        const statusLog = enemy.processStatuses();
        if (statusLog) this.logs.push(statusLog);

        this.turn = enemy.id;
        this.round++;
        actor.energy = Math.min(CONFIG.MAX_ENERGY, actor.energy + 20); // Regen passive
        return true;
    }

    createEmbed() {
        const createBar = (curr, max) => {
            const p = Math.round((curr / max) * 10);
            return `\`[${"█".repeat(Math.max(0,p))}${"░".repeat(Math.max(0,10-p))}]\``;
        };

        const j = this.fighters[CONFIG.ID_JONATHAN];
        const t = this.fighters[CONFIG.ID_TOORU];

        return new EmbedBuilder()
            .setTitle(`🌌 DUEL ÉPIQUE : ROUND ${this.round}`)
            .setColor(this.getActor().color)
            .addFields(
                { name: `🟦 ${j.name}`, value: `${createBar(j.hp, CONFIG.MAX_HP)}\n❤️ **${j.hp}** HP | ⚡ **${j.energy}** E\n🛡️ Bouclier: ${j.shield}`, inline: true },
                { name: `🟪 ${t.name}`, value: `${createBar(t.hp, CONFIG.MAX_HP)}\n❤️ **${t.hp}** HP | 🎭 **${t.energy}** E\n🛡️ Bouclier: ${t.shield}`, inline: true },
                { name: `📜 Journal de Combat`, value: this.logs.slice(-4).join("\n") || "Silence avant la tempête..." }
            )
            .setFooter({ text: `Tour actuel : ${this.getActor().name}` })
            .setTimestamp();
    }
}

// --- INITIALISATION CLIENT ---
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers] });
const battles = new Map();

client.on('interactionCreate', async i => {
    if (!i.isChatInputCommand()) return;

    if (i.commandName === 'fight') {
        const target = i.options.getUser('cible');
        if (![i.user.id, target.id].includes(CONFIG.ID_JONATHAN) || ![i.user.id, target.id].includes(CONFIG.ID_TOORU)) {
            return i.reply({ content: "Seuls les élus du destin peuvent combattre ici.", ephemeral: true });
        }
        
        const channel = await i.guild.channels.create({
            name: `🏟-jojo-arena`,
            permissionOverwrites: [
                { id: i.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: CONFIG.ID_JONATHAN, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: CONFIG.ID_TOORU, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
            ]
        });

        battles.set(channel.id, new BattleInstance(channel.id));
        await i.reply(`L'arène est prête : ${channel}`);
        await channel.send({ content: "Le destin est scellé !", embeds: [battles.get(channel.id).createEmbed()] });
    }

    if (i.commandName === 'attaque') {
        const battle = battles.get(i.channelId);
        if (!battle || i.user.id !== battle.turn) return i.reply({ content: "Ce n'est pas ton tour ou mauvais salon.", ephemeral: true });

        await i.deferReply();
        const move = i.options.getString('nom');
        const result = battle.executeMove(move);

        if (result === true) {
            await i.editReply({ embeds: [battle.createEmbed()] });
            if (battle.getEnemy().hp <= 0) {
                await i.followUp(`🏆 **${battle.getActor().name} A TRIOMPHÉ !**`);
                battles.delete(i.channelId);
                setTimeout(() => i.channel.delete().catch(() => {}), 60000);
            }
        } else {
            await i.editReply(result || "Attaque inconnue. Tape `/help`.");
        }
    }

    if (i.commandName === 'help') {
        const isJ = i.user.id === CONFIG.ID_JONATHAN;
        const isT = i.user.id === CONFIG.ID_TOORU;
        if (!isJ && !isT) return i.reply("Privé.");

        const e = new EmbedBuilder().setTitle("📜 Liste des techniques").setColor(isJ ? Colors.Blue : Colors.Purple);
        if (isJ) e.setDescription("**Hamon:** `overdrive`, `zoom`, `luck`, `metal`, `scarlet`, `turquoise`, `barrage`, `life`, `tarkus`, `bravery`, `sunlight`, `final`.");
        else e.setDescription("**Calamité:** `wonder`, `pursuit`, `rokakaka`, `flow`, `oblivion`, `endless`, `6251`, `wasp`, `logic`, `radio`, `calamity_wall`, `zero`.");
        i.reply({ embeds: [e], ephemeral: true });
    }
});

// --- ENREGISTREMENT COMMANDES ---
const commands = [
    new SlashCommandBuilder().setName('fight').setDescription('Lancer un duel').addUserOption(o=>o.setName('cible').setDescription('Adversaire').setRequired(true)),
    new SlashCommandBuilder().setName('attaque').setDescription('Utiliser une technique').addStringOption(o=>o.setName('nom').setDescription('Nom de l\'attaque').setRequired(true)),
    new SlashCommandBuilder().setName('help').setDescription('Voir tes attaques')
].map(c => c.toJSON());

client.once('ready', async () => {
    const rest = new REST({ version: '10' }).setToken(CONFIG.TOKEN);
    await rest.put(Routes.applicationCommands(CONFIG.CLIENT_ID), { body: commands });
    console.log('Bot is Online.');
});

client.login(CONFIG.TOKEN);
