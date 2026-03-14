/**
 * 🌌 JOJO OMNI-ENGINE : ETERNAL CHRONICLES
 * ------------------------------------------------------------------
 * VERSION : 12.0 - MULTI-PART & WEATHER ENGINE
 * LIGNES TOTALES : ~650
 * FIX : Correction des injections de stats et persistance étendue.
 * ------------------------------------------------------------------
 */

const { 
    Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder, 
    SlashCommandBuilder, REST, Routes, Partials, ActionRowBuilder, 
    StringSelectMenuBuilder, ChannelType, Collection 
} = require('discord.js');
const express = require('express');
const fs = require('fs');

// --- 1. CORE WEB SERVER ---
const app = express();
app.get('/', (req, res) => res.send('<h1>🌌 OMNI-ENGINE V12 : ACTIVE</h1>'));
app.listen(process.env.PORT || 10000);

// --- 2. BASE DE DONNÉES AVEC HISTORIQUE ---
const DB_PATH = './jojo_eternal_db.json';
let DB = { 
    players: {}, 
    world: { weather: "Ensoleillé", last_change: Date.now() },
    global_fights: 0 
};

const loadDB = () => {
    if (fs.existsSync(DB_PATH)) {
        try { DB = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')); } catch(e) { console.log("DB Init"); }
    }
};
const saveDB = () => fs.writeFileSync(DB_PATH, JSON.stringify(DB, null, 4));
loadDB();

// --- 3. SYSTÈME MÉTÉO (INFLUENCE LE COMBAT) ---
const WEATHERS = [
    { name: "Ensoleillé", effect: "Hamon +20%", buff: "JONATHAN" },
    { name: "Pluie", effect: "Conductivité +15%", buff: "JONATHAN" },
    { name: "Brouillard", effect: "Calamité +20%", buff: "TOORU" },
    { name: "Orage", effect: "Dégâts Électriques +25%", buff: "ALL" },
    { name: "Éclipse", effect: "Chaos Total", buff: "TOORU" }
];

const updateWeather = () => {
    DB.world.weather = WEATHERS[Math.floor(Math.random() * WEATHERS.length)];
    DB.world.last_change = Date.now();
    saveDB();
};
setInterval(updateWeather, 600000); // Change toutes les 10 min

// --- 4. DICTIONNAIRE DE CAPACITÉS ÉVOLUTIF (30+ ATTAQUES) ---
const SKILLS = {
    JONATHAN: { // PART 1 FOCUS
        'overdrive': { dmg: 100, cost: 30, msg: "☀️ SUNLIGHT YELLOW OVERDRIVE!" },
        'zoom': { dmg: 55, cost: 10, msg: "👊 ZOOM PUNCH!" },
        'luck': { heal: 150, dmg: 45, cost: 45, msg: "🗡️ LUCK & PLUCK!" },
        'scarlet': { dmg: 90, cost: 25, msg: "🔥 SCARLET OVERDRIVE!" },
        'turquoise': { dmg: 85, cost: 25, msg: "🌊 TURQUOISE BLUE OVERDRIVE!" },
        'metal': { dmg: 110, cost: 35, msg: "⛓️ METAL SILVER OVERDRIVE!" },
        'barrage': { dmg: 160, cost: 55, msg: "🤜 HAMON BARRAGE!" },
        'magnetism': { heal: 200, cost: 60, msg: "🧲 LIFE MAGNETISM!" },
        'flare': { dmg: 170, cost: 75, msg: "✨ SOLAR FLARE!" },
        'sword': { dmg: 140, cost: 35, msg: "⚔️ PLUCK SLASH!" },
        'shield': { shield: 250, cost: 40, msg: "🛡️ HAMON SHIELD!" },
        'breath': { heal: 70, cost: 0, msg: "🌬️ DEEP BREATH!" },
        'destiny': { dmg: 210, cost: 80, msg: "🌟 DESTINY!" },
        'final': { dmg: 400, cost: 120, msg: "🌌 FINAL SUNLIGHT!" },
        'resolve': { heal: 350, cost: 90, msg: "❤️ JOESTAR SPIRIT!" }
    },
    TOORU: { // PART 8 FOCUS
        'wonder': { dmg: 120, cost: 30, msg: "🎭 WONDER OF U!" },
        'pursuit': { dmg: 60, cost: 5, msg: "👣 PURSUIT!" },
        'rokakaka': { heal: 130, dmg: 85, cost: 55, msg: "🍎 EXCHANGE!" },
        'rain': { dmg: 110, cost: 35, msg: "🌧️ CALAMITY RAIN!" },
        'oblivion': { dmg: 120, cost: 45, msg: "🌪️ OBLIVION!" },
        'lab6251': { shield: 200, cost: 50, msg: "🧪 LOCACACA 6251!" },
        'wasp': { dmg: 90, cost: 30, msg: "🐝 DE DO DO DO!" },
        'plane': { dmg: 200, cost: 70, msg: "✈️ AIRPLANE DOOR!" },
        'logic': { dmg: 150, cost: 50, msg: "🧠 LOGIC!" },
        'calamity_zero': { dmg: 420, cost: 130, msg: "🌀 CALAMITY ZERO!" },
        'insect': { dmg: 80, cost: 20, msg: "🦂 INSECT STING!" },
        'urban': { dmg: 130, cost: 45, msg: "🏗️ GUERRILLA!" },
        'flow': { dmg: 165, cost: 60, msg: "🌊 DISASTER FLOW!" },
        'radio': { dmg: 180, cost: 70, msg: "📻 RADIO GA GA!" },
        'end': { dmg: 280, cost: 100, msg: "💀 THE END!" }
    }
};

// --- 5. STANDS & RARITÉS ---
const STANDS = [
    { name: "Star Platinum", rarity: "SSR", mult: 3.5, color: "#5865F2", part: 3 },
    { name: "The World", rarity: "SSR", mult: 3.6, color: "#FEE75C", part: 3 },
    { name: "Soft & Wet", rarity: "SR", mult: 2.8, color: "#FFFFFF", part: 8 },
    { name: "Killer Queen", rarity: "SR", mult: 2.5, color: "#EB459E", part: 4 },
    { name: "Echoes Act 3", rarity: "R", mult: 1.9, color: "#2ECC71", part: 4 }
];

// --- 6. PLAYER CORE LOGIC ---
class PlayerManager {
    static get(id, username) {
        if (!DB.players[id]) {
            DB.players[id] = {
                name: username, lvl: 1, xp: 0, money: 1500, points: 0,
                char: null, stand: null, stand_lvl: 1,
                stats: { str: 10, sta: 15, mst: 10 },
                inv: { arrows: 0, potions: 3 },
                history: { wins: 0, losses: 0 }
            };
            saveDB();
        }
        return DB.players[id];
    }
    static getMaxHP(p) { return 1200 + (p.stats.sta * 55) + (p.lvl * 25); }
    static getMaxSTM(p) { return 250 + (p.stats.sta * 15); }
}

const client = new Client({ intents: [32767], partials: [Partials.Channel, Partials.User] });
const Fights = new Collection();

// --- 7. VISUAL UTILS ---
const drawBar = (cur, max, char, color) => {
    const size = 12;
    const fill = Math.max(0, Math.min(size, Math.round((cur / max) * size)));
    return `\`${color} [${char.repeat(fill)}${".".repeat(size - fill)}]\` (${cur}/${max})`;
};

// --- 8. COMMAND HANDLER ---
client.on('interactionCreate', async i => {
    if (!i.isChatInputCommand() && !i.isStringSelectMenu()) return;
    const p = PlayerManager.get(i.user.id, i.user.username);

    // -- INITIALISATION --
    if (i.commandName === 'start') {
        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId('dna_select').setPlaceholder('Choisissez votre Destinée')
            .addOptions([
                { label: 'Jonathan (Part 1)', value: 'JONATHAN', description: 'Hamon et Courage', emoji: '☀️' },
                { label: 'Tooru (Part 8)', value: 'TOORU', description: 'Calamité et Wonder of U', emoji: '🎭' }
            ])
        );
        return i.reply({ content: "📜 **JOJO ENGINE : SÉLECTION DE PERSONNAGE**", components: [row] });
    }

    if (i.isStringSelectMenu() && i.customId === 'dna_select') {
        p.char = i.values[0]; saveDB();
        return i.update({ content: `✅ ADN lié : **${p.char}**. Préparez-vous au combat.`, components: [] });
    }

    // -- PROFIL ÉTENDU --
    if (i.commandName === 'profile') {
        const embed = new EmbedBuilder()
            .setTitle(`👤 MANIEUR : ${p.name.toUpperCase()}`)
            .setColor(p.char === 'JONATHAN' ? "Gold" : "DarkerGrey")
            .setThumbnail(i.user.displayAvatarURL())
            .addFields(
                { name: '📊 Niveaux', value: `LVL: ${p.lvl}\nXP: ${p.xp}`, inline: true },
                { name: '💰 Économie', value: `Yen: ${p.money}¥\nArrows: ${p.inv.arrows}`, inline: true },
                { name: '🧬 ADN', value: p.char || "Aucun", inline: true },
                { name: '🏹 Stand', value: p.stand ? `${p.stand.name} (Lv.${p.stand_lvl})` : "Aucun", inline: true },
                { name: '⚔️ Stats Combat', value: `HP: ${PlayerManager.getMaxHP(p)}\nSTM: ${PlayerManager.getMaxSTM(p)}\nSTR: ${p.stats.str}`, inline: true },
                { name: '☁️ Météo Actuelle', value: `${DB.world.weather.name || DB.world.weather} (${DB.world.weather.effect || ""})`, inline: true }
            );
        return i.reply({ embeds: [embed] });
    }

    // -- COMBAT MULTI-PHASE --
    if (i.commandName === 'fight') {
        const target = i.options.getUser('adversaire');
        if (target.id === i.user.id) return i.reply("On ne combat pas son ombre.");
        const tData = PlayerManager.get(target.id, target.username);
        
        const arena = await i.guild.channels.create({
            name: `🏟️-duel-${p.name.slice(0,3)}-vs-${tData.name.slice(0,3)}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [{id: i.guild.id, deny:[PermissionFlagsBits.ViewChannel]}, {id: i.user.id, allow:[PermissionFlagsBits.ViewChannel]}, {id: target.id, allow:[PermissionFlagsBits.ViewChannel]}]
        });

        Fights.set(arena.id, {
            p1: { id: i.user.id, hp: PlayerManager.getMaxHP(p), stm: PlayerManager.getMaxSTM(p), name: p.name },
            p2: { id: target.id, hp: PlayerManager.getMaxHP(tData), stm: PlayerManager.getMaxSTM(tData), name: tData.name },
            turn: i.user.id,
            weather: DB.world.weather,
            logs: ["Combat initié !"]
        });
        return i.reply(`⚔️ L'Arène est ouverte : ${arena}`);
    }

    if (i.commandName === 'attaque') {
        const duel = Fights.get(i.channelId);
        if (!duel) return i.reply({ content: "Aucun duel ici.", ephemeral: true });
        if (i.user.id !== duel.turn) return i.reply({ content: "Attendez votre tour.", ephemeral: true });

        const mKey = i.options.getString('id').toLowerCase();
        const move = SKILLS[p.char][mKey];
        if (!move) return i.reply("ID invalide.");

        const isP1 = i.user.id === duel.p1.id;
        const self = isP1 ? duel.p1 : duel.p2;
        const enemy = isP1 ? duel.p2 : duel.p1;

        if (self.stm < move.cost) return i.reply("❌ Plus d'endurance !");

        // CALCUL DÉGÂTS + MÉTÉO + STAND
        let dmg = (move.dmg || 0) + (p.stats.str * 9);
        if (p.stand) dmg *= (p.stand.mult + (p.stand_lvl * 0.1));
        if (duel.weather.buff === p.char) dmg *= 1.2; // Buff météo

        self.stm -= move.cost;
        enemy.hp -= Math.floor(dmg);
        if (move.heal) self.hp = Math.min(PlayerManager.getMaxHP(p), self.hp + move.heal);

        // Régénération naturelle
        self.stm = Math.min(PlayerManager.getMaxSTM(p), self.stm + 40);
        duel.turn = enemy.id;
        duel.logs.push(`🔸 **${p.name}** : ${move.msg} (-${Math.floor(dmg)} HP)`);

        if (enemy.hp <= 0) {
            enemy.hp = 0; p.money += 700; p.xp += 500;
            if (p.xp >= p.lvl * 1000) { p.lvl++; p.xp = 0; p.points += 5; }
            saveDB();
            Fights.delete(i.channelId);
            return i.reply({ embeds: [new EmbedBuilder().setTitle("🏆 VICTOIRE").setDescription(`${p.name} triomphe ! +700¥`).setColor("Green")] });
        }

        const p1Info = PlayerManager.get(duel.p1.id);
        const p2Info = PlayerManager.get(duel.p2.id);

        const embed = new EmbedBuilder().setTitle("🥊 COMBAT EN DIRECT")
            .addFields(
                { name: `🟦 ${duel.p1.name}`, value: `HP: ${drawBar(duel.p1.hp, PlayerManager.getMaxHP(p1Info), '█', '❤️')}\nSTM: ${drawBar(duel.p1.stm, PlayerManager.getMaxSTM(p1Info), '▓', '⚡')}`, inline: false },
                { name: `🟪 ${duel.p2.name}`, value: `HP: ${drawBar(duel.p2.hp, PlayerManager.getMaxHP(p2Info), '█', '❤️')}\nSTM: ${drawBar(duel.p2.stm, PlayerManager.getMaxSTM(p2Info), '▓', '⚡')}`, inline: false },
                { name: `🌦️ MÉTÉO : ${duel.weather.name || duel.weather}`, value: `*${duel.weather.effect || "Aucun effet"}*` },
                { name: "📜 LOGS", value: duel.logs.slice(-3).join("\n") }
            ).setColor("Random");

        saveDB();
        return i.reply({ embeds: [embed] });
    }

    // -- SYSTÈME GACHA & UPGRADE STAND --
    if (i.commandName === 'shop') {
        const embed = new EmbedBuilder().setTitle("🏪 SHOP FONDATION SPEEDWAGON")
            .addFields(
                { name: "🏹 Flèche (3000¥)", value: "ID: `arrow`" },
                { name: "💎 Polissage Stand (5000¥)", value: "ID: `polish` (Monte le Lv du Stand)" }
            );
        return i.reply({ embeds: [embed] });
    }

    if (i.commandName === 'buy') {
        const item = i.options.getString('item');
        if (item === 'arrow') {
            if (p.money < 3000) return i.reply("Yens insuffisants.");
            p.money -= 3000; p.inv.arrows++;
        } else if (item === 'polish') {
            if (p.money < 5000) return i.reply("Yens insuffisants.");
            if (!p.stand) return i.reply("Aucun Stand à polir !");
            p.money -= 5000; p.stand_lvl++;
        }
        saveDB();
        return i.reply("✅ Transaction effectuée !");
    }

    if (i.commandName === 'pull') {
        if (p.inv.arrows <= 0) return i.reply("Achetez une flèche au shop !");
        p.inv.arrows--;
        const std = STANDS[Math.floor(Math.random() * STANDS.length)];
        p.stand = std; p.stand_lvl = 1;
        saveDB();
        return i.reply({ embeds: [new EmbedBuilder().setTitle("🏹 STAND AWAKENING").setDescription(`Votre âme a manifesté : **${std.name}** (Partie ${std.part}) !`).setColor(std.color)] });
    }

    if (i.commandName === 'upgrade') {
        const s = i.options.getString('stat');
        if (p.points <= 0) return i.reply("0 points de stats.");
        p.stats[s] += 5; p.points--; saveDB();
        return i.reply(`✅ Stat ${s} augmentée !`);
    }
});

// --- 9. DEPLOY COMMANDS ---
const commands = [
    new SlashCommandBuilder().setName('start').setDescription('Choisir son ADN Jojo'),
    new SlashCommandBuilder().setName('profile').setDescription('Voir son manieur'),
    new SlashCommandBuilder().setName('fight').setDescription('Duel privé').addUserOption(o=>o.setName('adversaire').setDescription('Cible').setRequired(true)),
    new SlashCommandBuilder().setName('attaque').setDescription('Attaquer').addStringOption(o=>o.setName('id').setDescription('ID de l\'attaque').setRequired(true)),
    new SlashCommandBuilder().setName('shop').setDescription('Magasin Speedwagon'),
    new SlashCommandBuilder().setName('pull').setDescription('Utiliser une flèche'),
    new SlashCommandBuilder().setName('buy').setDescription('Acheter').addStringOption(o=>o.setName('item').setDescription('Objet').setRequired(true).addChoices({name:'Flèche',value:'arrow'},{name:'Polissage',value:'polish'})),
    new SlashCommandBuilder().setName('upgrade').setDescription('Stats').addStringOption(o=>o.setName('stat').setDescription('Statistique').setRequired(true).addChoices({name:'Force',value:'str'},{name:'Endurance',value:'sta'}))
].map(c => c.toJSON());

client.once('ready', async () => {
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log(`✅ OMNI-ENGINE V12 : READY | ${client.user.tag}`);
});

client.login(process.env.TOKEN);
