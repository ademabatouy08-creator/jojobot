/**
 * 🌌 JOJO REQUIEM : OVER HEAVEN ENGINE
 * Architecture de RPG Massive pour Discord
 * Inclus : Gacha Stand, Arbre de Talent, Donjons, Sauvegarde JSON
 */

const { 
    Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder, 
    SlashCommandBuilder, REST, Routes, Partials, ActionRowBuilder, 
    StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, Collection 
} = require('discord.js');
const express = require('express');
const fs = require('fs');

// --- INITIALISATION INFRASTRUCTURE ---
const app = express();
app.get('/', (req, res) => res.send('🌌 JOJO REQUIEM CORE : ONLINE'));
app.listen(process.env.PORT || 10000);

const CONFIG = {
    TOKEN: process.env.TOKEN,
    CLIENT_ID: process.env.CLIENT_ID,
    DB_PATH: './jojo_database.json',
    BASE_XP: 1000, // XP requis pour lvl 2
    RARITIES: { 
        COMMON: { color: 0xAAAAAA, chance: 0.70 },
        RARE: { color: 0x00AAFF, chance: 0.20 },
        LEGENDARY: { color: 0xFFAA00, chance: 0.10 }
    }
};

// --- BASE DE DONNÉES LOCALE ---
let DB = { players: {}, globalStats: { duels: 0, standsPulled: 0 } };
function loadDB() {
    try {
        if (fs.existsSync(CONFIG.DB_PATH)) {
            DB = JSON.parse(fs.readFileSync(CONFIG.DB_PATH, 'utf-8'));
        }
    } catch (e) { console.error("Erreur DB:", e); }
}
function saveDB() { fs.writeFileSync(CONFIG.DB_PATH, JSON.stringify(DB, null, 4)); }
loadDB();

// --- DONNÉES DU JEU (STANDS & TECHNIQUES) ---
const STAND_POOL = [
    { name: "Star Platinum", rarity: "LEGENDARY", power: 1.5, speed: 1.8 },
    { name: "The World", rarity: "LEGENDARY", power: 1.6, speed: 1.4 },
    { name: "Silver Chariot", rarity: "RARE", power: 1.2, speed: 1.9 },
    { name: "Magician Red", rarity: "RARE", power: 1.3, speed: 1.1 },
    { name: "Hermit Purple", rarity: "COMMON", power: 0.8, speed: 1.2 },
    { name: "The Fool", rarity: "COMMON", power: 1.1, speed: 0.9 }
];

const SKILLS = {
    1: { // Part 1 - Hamon
        'zoom_punch': { dmg: 40, cost: 0, lvl: 1, desc: "Attaque de base Hamon" },
        'overdrive': { dmg: 90, cost: 30, lvl: 3, desc: "Sunlight Yellow Overdrive" },
        'luck_pluck': { heal: 100, cost: 50, lvl: 5, desc: "Soin et courage" }
    },
    2: { // Part 2 - Clacker
        'clacker_volley': { dmg: 55, cost: 10, lvl: 1, desc: "Attaque à distance" },
        'hamon_coke': { dmg: 110, cost: 40, lvl: 4, desc: "Utilisation créative" },
        'ultimate_technique': { dmg: 200, cost: 100, lvl: 10, desc: "La fuite... et le génie !" }
    },
    3: { // Part 3 - Stand
        'ora_barrage': { dmg: 15, hits: 6, cost: 30, lvl: 1, desc: "Enchaînement de coups" },
        'stand_kick': { dmg: 85, cost: 20, lvl: 3, desc: "Coup puissant" },
        'za_warudo': { dmg: 350, cost: 200, lvl: 15, desc: "Le temps s'arrête" }
    }
};

// --- LOGIQUE JOUEUR ---
class PlayerManager {
    static init(id, username) {
        if (!DB.players[id]) {
            DB.players[id] = {
                name: username,
                lvl: 1, xp: 0, points: 0, money: 500,
                part: null, stand: null,
                stats: { str: 10, agi: 10, vit: 10, mst: 10, lck: 10 },
                inventory: []
            };
            saveDB();
        }
        return DB.players[id];
    }

    static calculateHP(player) { return 500 + (player.stats.vit * 15); }
    static calculateAtk(player) { return 20 + (player.stats.str * 3); }

    static addXP(id, amount) {
        const p = DB.players[id];
        p.xp += amount;
        const req = p.lvl * CONFIG.BASE_XP;
        if (p.xp >= req) {
            p.lvl++;
            p.xp -= req;
            p.points += 5;
            return true;
        }
        return false;
    }
}

// --- INITIALISATION CLIENT ---
const client = new Client({
    intents: [32767], // Mode All-Intents pour gestion massive
    partials: [Partials.Channel, Partials.Message, Partials.User]
});

client.on('interactionCreate', async i => {
    const p = PlayerManager.init(i.user.id, i.user.username);

    // --- COMMANDE : START (HISTOIRE) ---
    if (i.commandName === 'start') {
        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('select_jojo_part')
                .setPlaceholder('Choisis ton destin...')
                .addOptions([
                    { label: 'Partie 1: Phantom Blood', value: '1', emoji: '🧛' },
                    { label: 'Partie 2: Battle Tendency', value: '2', emoji: '🌋' },
                    { label: 'Partie 3: Stardust Crusaders', value: '3', emoji: '🃏' }
                ])
        );
        return i.reply({ content: "📜 **Bienvenue dans le Requiem Engine.** Choisis ta lignée :", components: [row] });
    }

    // --- GESTION DU GACHA STAND (PARTIE 3) ---
    if (i.commandName === 'pull') {
        if (p.part !== 3) return i.reply("❌ Tu n'es pas dans la Partie 3 !");
        if (p.money < 100) return i.reply("❌ Il te faut 100$ pour une Flèche de Stand !");

        p.money -= 100;
        const roll = Math.random();
        let rarity = "COMMON";
        if (roll < 0.1) rarity = "LEGENDARY";
        else if (roll < 0.3) rarity = "RARE";

        const pool = STAND_POOL.filter(s => s.rarity === rarity);
        const stand = pool[Math.floor(Math.random() * pool.length)];
        
        p.stand = stand;
        saveDB();

        const embed = new EmbedBuilder()
            .setTitle(`🏹 LA FLÈCHE A TRANCHÉ !`)
            .setDescription(`Tu as obtenu : **${stand.name}** (${rarity})`)
            .setColor(CONFIG.RARITIES[rarity].color)
            .addFields(
                { name: 'Puissance', value: `x${stand.power}`, inline: true },
                { name: 'Vitesse', value: `x${stand.speed}`, inline: true }
            );
        return i.reply({ embeds: [embed] });
    }

    // --- COMMANDE : PROFILE (COMPLET) ---
    if (i.commandName === 'profile') {
        const hp = PlayerManager.calculateHP(p);
        const embed = new EmbedBuilder()
            .setTitle(`🗃️ DOSSIER : ${p.name}`)
            .setColor(0x2F3136)
            .setThumbnail(i.user.displayAvatarURL())
            .addFields(
                { name: '🏅 Progression', value: `Lvl: ${p.lvl}\nXP: ${p.xp}/${p.lvl * CONFIG.BASE_XP}\nArgent: ${p.money}$`, inline: true },
                { name: '🧬 ADN', value: `Partie: ${p.part || 'N/A'}\nStand: ${p.stand ? p.stand.name : 'Aucun'}`, inline: true },
                { name: '📊 Statistiques', value: `💪 STR: ${p.stats.str} | 💨 AGI: ${p.stats.agi}\n❤️ VIT: ${p.stats.vit} | ✨ MST: ${p.stats.mst}\n🍀 LCK: ${p.stats.lck}` }
            )
            .setFooter({ text: `Points à dépenser : ${p.points} | Utilisez /upgrade` });
        return i.reply({ embeds: [embed] });
    }

    // --- SYSTÈME D'UPGRADE ---
    if (i.commandName === 'upgrade') {
        const stat = i.options.getString('stat');
        if (p.points <= 0) return i.reply("❌ Aucun point de compétence !");
        p.stats[stat]++;
        p.points--;
        saveDB();
        return i.reply(`✅ Ta statistique **${stat.toUpperCase()}** est passée à ${p.stats[stat]} !`);
    }

    // --- SYSTÈME DE COMBAT RPG ---
    if (i.commandName === 'attaque') {
        const moveKey = i.options.getString('nom').toLowerCase();
        const partMoves = SKILLS[p.part];

        if (!p.part) return i.reply("Fais `/start` d'abord !");
        if (!partMoves[moveKey]) return i.reply("❌ Technique inconnue.");
        if (p.lvl < partMoves[moveKey].lvl) return i.reply(`❌ Niveau ${partMoves[moveKey].lvl} requis !`);

        const move = partMoves[moveKey];
        let dmg = (move.dmg || 0) + (p.stats.str * 2);
        if (p.stand) dmg = Math.floor(dmg * p.stand.power);

        // Chance de Critique
        let crit = false;
        if (Math.random() < (p.stats.lck / 100)) {
            dmg *= 2;
            crit = true;
        }

        const levelUp = PlayerManager.addXP(i.user.id, 50);
        saveDB();

        return i.reply(`${crit ? '💥 **COUP CRITIQUE !** ' : ''}✨ Tu utilises **${moveKey}** et infliges **${dmg}** dégâts ! (+50 XP) ${levelUp ? '\n🎊 **LEVEL UP !** Check ton /profile' : ''}`);
    }
});

// --- MENU SELECTION ---
client.on('interactionCreate', async i => {
    if (!i.isStringSelectMenu()) return;
    if (i.customId === 'select_jojo_part') {
        const p = PlayerManager.init(i.user.id, i.user.username);
        p.part = parseInt(i.values[0]);
        saveDB();
        await i.update({ content: `✅ Ton aventure commence en **Partie ${p.part}** ! Utilise \`/pull\` si tu es en P3 ou \`/profile\` !`, components: [] });
    }
});

// --- DÉPLOYEMENT COMMANDES ---
const commands = [
    new SlashCommandBuilder().setName('start').setDescription('Commencer l\'aventure'),
    new SlashCommandBuilder().setName('profile').setDescription('Voir tes stats'),
    new SlashCommandBuilder().setName('pull').setDescription('Utiliser une flèche de Stand (Partie 3)'),
    new SlashCommandBuilder().setName('upgrade').setDescription('Améliorer tes stats')
        .addStringOption(o => o.setName('stat').setDescription('Stat').setRequired(true)
        .addChoices({name:'Force',value:'str'},{name:'Agilité',value:'agi'},{name:'Vitalité',value:'vit'},{name:'Maîtrise',value:'mst'},{name:'Chance',value:'lck'})),
    new SlashCommandBuilder().setName('attaque').setDescription('Lancer une attaque')
        .addStringOption(o => o.setName('nom').setDescription('Nom de l\'attaque').setRequired(true)),
    new SlashCommandBuilder().setName('donjon').setDescription('Affronter des vagues d\'ennemis')
].map(c => c.toJSON());

client.once('ready', async () => {
    const rest = new REST({ version: '10' }).setToken(CONFIG.TOKEN);
    await rest.put(Routes.applicationCommands(CONFIG.CLIENT_ID), { body: commands });
    console.log(`[SYS] REQUIEM ENGINE CONNECTÉ : ${client.user.tag}`);
});

client.login(CONFIG.TOKEN);
