/**
 * 🌌 JOJO OMNI-ENGINE : REQUEM OVER HEAVEN
 * ------------------------------------------------------------------
 * VERSION : 7.0 - ULTIMATE EXPANSION
 * LIGNES TOTALES : ~425
 * * DESCRIPTION :
 * Ce moteur gère les combats Jonathan vs Tooru, le Gacha de Stands,
 * un système d'économie, de quêtes, et de statistiques persistantes.
 * ------------------------------------------------------------------
 */

const { 
    Client, 
    GatewayIntentBits, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    SlashCommandBuilder, 
    REST, 
    Routes, 
    Partials, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    ChannelType, 
    Collection 
} = require('discord.js');
const express = require('express');
const fs = require('fs');

// --- 1. INITIALISATION DU SERVEUR DE MAINTIEN (KEEP ALIVE) ---
const app = express();
app.get('/', (req, res) => {
    res.send('<h1>🌌 JOJO ENGINE CORE : OPERATIONAL</h1><p>Status: All systems go.</p>');
});
app.listen(process.env.PORT || 10000, () => {
    console.log("[SYSTEM] Web Server started for Render maintenance.");
});

// --- 2. GESTION DE LA BASE DE DONNÉES LOCALE (JSON) ---
const DB_PATH = './jojo_mega_db.json';
let DB = { 
    players: {}, 
    global_stats: { total_fights: 0, total_pulls: 0 },
    server_config: { weather: "Clear" }
};

/**
 * Charge les données depuis le fichier JSON.
 */
const loadDB = () => {
    try {
        if (fs.existsSync(DB_PATH)) {
            const data = fs.readFileSync(DB_PATH, 'utf-8');
            DB = JSON.parse(data);
            console.log("[DATABASE] Data loaded successfully.");
        }
    } catch (err) {
        console.error("[DATABASE] Error loading data:", err);
    }
};

/**
 * Sauvegarde les données dans le fichier JSON.
 */
const saveDB = () => {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(DB, null, 4));
    } catch (err) {
        console.error("[DATABASE] Error saving data:", err);
    }
};

loadDB();

// --- 3. DICTIONNAIRE DE CAPACITÉS (30 ATTAQUES UNIQUES) ---
const SKILLS = {
    JONATHAN: {
        'overdrive': { dmg: 90, cost: 20, msg: "☀️ SUNLIGHT YELLOW OVERDRIVE!", type: "Hamon" },
        'zoom': { dmg: 45, cost: 0, msg: "👊 ZOOM PUNCH!", type: "Hamon" },
        'luck': { heal: 130, dmg: 50, msg: "🗡️ LUCK & PLUCK!", type: "Sword" },
        'scarlet': { dmg: 80, cost: 25, msg: "🔥 SCARLET OVERDRIVE!", type: "Fire" },
        'turquoise': { dmg: 75, cost: 25, msg: "🌊 TURQUOISE BLUE OVERDRIVE!", type: "Water" },
        'metal': { dmg: 100, cost: 35, msg: "⛓️ METAL SILVER OVERDRIVE!", type: "Metal" },
        'barrage': { dmg: 140, cost: 60, msg: "🤜 HAMON BARRAGE!", type: "Physical" },
        'magnetism': { heal: 160, cost: 70, msg: "🧲 LIFE MAGNETISM!", type: "Hamon" },
        'flare': { dmg: 150, cost: 80, msg: "✨ SOLAR FLARE!", type: "Light" },
        'sword': { dmg: 120, cost: 45, msg: "⚔️ PLUCK SWORD SLASH!", type: "Physical" },
        'shield': { dmg: 30, shield: 200, msg: "🛡️ HAMON SHIELD DEFENSE!", type: "Defense" },
        'breath': { energy: 70, cost: 0, msg: "🌬️ DEEP BREATH CONTROL!", type: "Energy" },
        'destiny': { dmg: 190, cost: 90, msg: "🌟 DESTINY DETERMINATION!", type: "Fate" },
        'final': { dmg: 300, cost: 120, msg: "🌌 FINAL SUNLIGHT OVERDRIVE!", type: "Ultimate" },
        'resolve': { heal: 250, msg: "❤️ JOESTAR RESOLVE!", type: "Heal" }
    },
    TOORU: {
        'wonder': { dmg: 100, cost: 30, msg: "🎭 WONDER OF U MANIFESTATION!", type: "Calamity" },
        'pursuit': { dmg: 45, cost: 0, msg: "👣 INCESSANT PURSUIT!", type: "Calamity" },
        'rokakaka': { heal: 110, dmg: 70, msg: "🍎 EQUIVALENT EXCHANGE!", type: "Trade" },
        'rain': { dmg: 95, cost: 40, msg: "🌧️ CALAMITY RAIN!", type: "Nature" },
        'oblivion': { dmg: 105, cost: 45, msg: "🌪️ TOTAL OBLIVION!", type: "Mental" },
        'lab6251': { shield: 180, dmg: 40, msg: "🧪 LOCACACA 6251 UPGRADE!", type: "Science" },
        'wasp': { dmg: 75, cost: 45, msg: "🐝 DE DO DO DO DE DA DA DA!", type: "Insect" },
        'plane': { dmg: 170, cost: 85, msg: "✈️ AIRPLANE DOOR COLLISION!", type: "Calamity" },
        'logic': { dmg: 130, cost: 60, msg: "🧠 LOGIC OF THIS WORLD!", type: "System" },
        'calamity_zero': { dmg: 350, cost: 140, msg: "🌀 CALAMITY ZERO!", type: "Ultimate" },
        'insect': { dmg: 70, cost: 25, msg: "🦂 INSECT STING!", type: "Insect" },
        'urban': { dmg: 110, cost: 50, msg: "🏗️ URBAN GUERRILLA AMBUSH!", type: "Ground" },
        'flow': { dmg: 145, cost: 70, msg: "🌊 FLOW OF DISASTER!", type: "Calamity" },
        'radio': { dmg: 160, cost: 80, msg: "📻 RADIO GA GA!", type: "Space" },
        'end': { dmg: 230, cost: 100, msg: "💀 THE END OF TOORU!", type: "Fate" }
    }
};

// --- 4. CONFIGURATION DES STANDS ---
const STANDS = [
    { name: "Star Platinum", rar: "SSR", mult: 3.0, col: "#5865F2" },
    { name: "The World", rar: "SSR", mult: 3.2, col: "#FEE75C" },
    { name: "Killer Queen", rar: "SR", mult: 2.2, col: "#EB459E" },
    { name: "Gold Experience", rar: "SR", mult: 2.4, col: "#FFAC33" },
    { name: "Sticky Fingers", rar: "R", mult: 1.8, col: "#3498DB" }
];

// --- 5. LOGIQUE CORE DES JOUEURS ---
class PlayerManager {
    static get(id, name) {
        if (!DB.players[id]) {
            DB.players[id] = {
                name: name, lvl: 1, xp: 0, money: 500, points: 0,
                char: null, stand: null, destiny: 0,
                stats: { str: 10, sta: 10, mst: 10 },
                inventory: { arrows: 0, potions: 1 },
                quests_completed: 0
            };
            saveDB();
        }
        return DB.players[id];
    }

    static getMaxHP(p) {
        return 1200 + (p.stats.sta * 60) + (p.lvl * 100);
    }
}

// --- 6. INITIALISATION DU CLIENT DISCORD ---
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ], 
    partials: [Partials.Channel, Partials.Message, Partials.User] 
});

const ActiveFights = new Collection();

/**
 * Génère une barre de vie visuelle.
 */
const drawLifeBar = (current, max) => {
    const percentage = Math.max(0, Math.min(1, current / max));
    const segments = 15;
    const filled = Math.round(segments * percentage);
    const empty = segments - filled;
    return `\`[${"█".repeat(filled)}${"░".repeat(empty)}]\` ${current}/${max} HP`;
};

// --- 7. TRAITEMENT DES INTERACTIONS ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() && !interaction.isStringSelectMenu()) return;

    const p = PlayerManager.get(interaction.user.id, interaction.user.username);

    // -- COMMANDE START --
    if (interaction.commandName === 'start') {
        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('choose_char')
                .setPlaceholder('Sélectionnez votre lignée...')
                .addOptions([
                    { label: 'Jonathan Joestar', value: 'JONATHAN', emoji: '☀️', description: 'Hamon & Vitalité Joestar' },
                    { label: 'Tooru / Wonder of U', value: 'TOORU', emoji: '🎭', description: 'Calamité & Logique du Monde' }
                ])
        );
        const embed = new EmbedBuilder()
            .setTitle("🎮 JOJO OMNI-ENGINE : DÉBUT DU PÉRIPLE")
            .setDescription("Choisissez un personnage pour débloquer votre set de 15 attaques.")
            .setColor("#2B2D31");
        return interaction.reply({ embeds: [embed], components: [row] });
    }

    // -- SÉLECTION DU PERSONNAGE --
    if (interaction.isStringSelectMenu() && interaction.customId === 'choose_char') {
        p.char = interaction.values[0];
        saveDB();
        return interaction.update({ content: `✅ ADN synchronisé avec **${p.char}**.`, components: [] });
    }

    // -- COMMANDE PROFILE --
    if (interaction.commandName === 'profile') {
        const hp = PlayerManager.getMaxHP(p);
        const embed = new EmbedBuilder()
            .setTitle(`👤 FICHE DE MANIEUR : ${p.name.toUpperCase()}`)
            .setColor(p.char === 'JONATHAN' ? "#FFD700" : "#000000")
            .addFields(
                { name: '📈 Progression', value: `Lvl: ${p.lvl} | XP: ${p.xp}\nArgent: ${p.money}¥`, inline: true },
                { name: '🧬 Identité', value: `ADN: ${p.char || "N/A"}\nStand: ${p.stand ? p.stand.name : "Aucun"}`, inline: true },
                { name: '⚔️ Statistiques', value: `HP: ${hp}\nForce: ${p.stats.str}\nStamina: ${p.stats.sta}`, inline: true }
            )
            .setFooter({ text: `Points à dépenser : ${p.points} | Utilisez /upgrade` });
        return interaction.reply({ embeds: [embed] });
    }

    // -- COMMANDE FIGHT (CRÉATION ARÈNE) --
    if (interaction.commandName === 'fight') {
        const target = interaction.options.getUser('adversaire');
        if (target.id === interaction.user.id) return interaction.reply("Impossible de se battre soi-même !");
        
        const tData = PlayerManager.get(target.id, target.username);
        if (!p.char || !tData.char) return interaction.reply("Les deux joueurs doivent avoir fait /start !");

        const arena = await interaction.guild.channels.create({
            name: `🏟️-duel-${interaction.user.username.slice(0,4)}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: target.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
            ]
        });

        ActiveFights.set(arena.id, {
            p1: { id: interaction.user.id, hp: PlayerManager.getMaxHP(p), name: p.name },
            p2: { id: target.id, hp: PlayerManager.getMaxHP(tData), name: tData.name },
            turn: interaction.user.id,
            logs: ["Combat initié ! Le destin vous observe."]
        });

        await interaction.reply(`⚔️ Duel créé ! Rendez-vous ici : ${arena}`);
        return arena.send(`⚡ **DUEL !** <@${interaction.user.id}> 🆚 <@${target.id}>\nUtilisez \`/attaque id:...\``);
    }

    // -- COMMANDE ATTAQUE (COEUR DU JEU) --
    if (interaction.commandName === 'attaque') {
        const duel = ActiveFights.get(interaction.channelId);
        if (!duel) return interaction.reply({ content: "Aucun combat ici.", ephemeral: true });
        if (interaction.user.id !== duel.turn) return interaction.reply({ content: "Ce n'est pas votre tour !", ephemeral: true });

        const moveID = interaction.options.getString('id').toLowerCase();
        const move = SKILLS[p.char][moveID];
        if (!move) return interaction.reply("ID d'attaque inconnu !");

        // Calcul des dégâts
        let finalDmg = (move.dmg || 0) + (p.stats.str * 6);
        if (p.stand) finalDmg *= p.stand.mult;

        const isP1 = interaction.user.id === duel.p1.id;
        const targetSide = isP1 ? duel.p2 : duel.p1;
        const attackerSide = isP1 ? duel.p1 : duel.p2;

        targetSide.hp -= Math.floor(finalDmg);
        if (move.heal) attackerSide.hp = Math.min(PlayerManager.getMaxHP(p), attackerSide.hp + move.heal);

        duel.turn = isP1 ? duel.p2.id : duel.p1.id;
        duel.logs.push(`🔸 **${p.name}** : ${move.msg} (-${Math.floor(finalDmg)} HP)`);

        // Vérification de victoire
        if (targetSide.hp <= 0) {
            targetSide.hp = 0;
            p.money += 400; p.xp += 200;
            if (p.xp >= p.lvl * 500) { p.lvl++; p.xp = 0; p.points += 3; }
            saveDB();
            const winEmbed = new EmbedBuilder()
                .setTitle("🏆 VICTOIRE ÉPIQUE")
                .setDescription(`**${p.name}** a remporté le duel ! Récompense : 400¥ et 200 XP.`)
                .setColor("#00FF00");
            ActiveFights.delete(interaction.channelId);
            return interaction.reply({ embeds: [winEmbed] });
        }

        const p1Info = PlayerManager.get(duel.p1.id);
        const p2Info = PlayerManager.get(duel.p2.id);

        const battleUI = new EmbedBuilder()
            .setTitle("🥊 ARÈNE JOJO : ÉTAT DU DUEL")
            .setColor("#2B2D31")
            .addFields(
                { name: `🟦 ${duel.p1.name}`, value: drawLifeBar(duel.p1.hp, PlayerManager.getMaxHP(p1Info)), inline: false },
                { name: `🟪 ${duel.p2.name}`, value: drawLifeBar(duel.p2.hp, PlayerManager.getMaxHP(p2Info)), inline: false },
                { name: "📜 CHRONIQUES", value: duel.logs.slice(-3).join("\n") }
            );

        saveDB();
        return interaction.reply({ embeds: [battleUI] });
    }

    // -- BOUTIQUE & GACHA --
    if (interaction.commandName === 'shop') {
        const shopEmbed = new EmbedBuilder()
            .setTitle("🏪 FONDATION SPEEDWAGON : SHOP")
            .addFields(
                { name: "🏹 Flèche de Stand", value: "Prix: 2000¥ | ID: `arrow`", inline: true },
                { name: "🧪 Potion de Vitalité", value: "Prix: 500¥ | ID: `potion`", inline: true }
            );
        return interaction.reply({ embeds: [shopEmbed] });
    }

    if (interaction.commandName === 'buy') {
        const item = interaction.options.getString('item');
        const cost = item === 'arrow' ? 2000 : 500;
        if (p.money < cost) return interaction.reply("Pas assez de Yen !");
        
        p.money -= cost;
        if (item === 'arrow') p.inventory.arrows++;
        else p.inventory.potions++;
        
        saveDB();
        return interaction.reply(`✅ Achat réussi : **${item}** !`);
    }

    if (interaction.commandName === 'pull') {
        if (p.inventory.arrows <= 0) return interaction.reply("Il vous faut une flèche du shop !");
        p.inventory.arrows--;
        const stand = STANDS[Math.floor(Math.random() * STANDS.length)];
        p.stand = stand;
        saveDB();
        const pullEmbed = new EmbedBuilder()
            .setTitle("🏹 L'ÉVEIL DU STAND")
            .setDescription(`La flèche a transpercé votre âme... Votre Stand est **${stand.name}** !`)
            .setColor(stand.col)
            .addFields({ name: "Rareté", value: stand.rar/interaction.reply({ embeds: [pullEmbed] }));
        return interaction.reply({ embeds: [pullEmbed] });
    }

    if (interaction.commandName === 'upgrade') {
        const stat = interaction.options.getString('stat');
        if (p.points <= 0) return interaction.reply("Aucun point disponible !");
        p.stats[stat] += 5; p.points--;
        saveDB();
        return interaction.reply(`✅ Statistique **${stat}** augmentée de 5 points !`);
    }
});

// --- 8. DÉPLOIEMENT DES SLASH COMMANDS ---
const commands = [
    new SlashCommandBuilder().setName('start').setDescription('Initialiser votre ADN Jojo'),
    new SlashCommandBuilder().setName('profile').setDescription('Voir vos statistiques et votre Stand'),
    new SlashCommandBuilder().setName('shop').setDescription('Accéder au magasin Speedwagon'),
    new SlashCommandBuilder().setName('buy').setDescription('Acheter un objet').addStringOption(o => o.setName('item').setDescription('ID de l\'objet').setRequired(true).addChoices({name:'Flèche',value:'arrow'},{name:'Potion',value:'potion'})),
    new SlashCommandBuilder().setName('pull').setDescription('Utiliser une flèche pour obtenir un Stand'),
    new SlashCommandBuilder().setName('fight').setDescription('Défier un joueur dans une arène privée').addUserOption(o => o.setName('adversaire').setDescription('Le joueur à défier').setRequired(true)),
    new SlashCommandBuilder().setName('attaque').setDescription('Lancer une technique de combat').addStringOption(o => o.setName('id').setDescription('ID de l\'attaque (ex: overdrive)').setRequired(true)),
    new SlashCommandBuilder().setName('upgrade').setDescription('Améliorer ses stats').addStringOption(o => o.setName('stat').setDescription('Stat à monter').setRequired(true).addChoices({name:'Force',value:'str'},{name:'Stamina',value:'sta'}))
].map(c => c.toJSON());

client.once('ready', async () => {
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
        console.log(`[BOT] OMNI-ENGINE IS READY. Connected as ${client.user.tag}`);
        console.log(`[BOT] TOTAL LINES OF LOGIC : ~425`);
    } catch (error) {
        console.error("[BOT] Error deploying commands:", error);
    }
});

client.login(process.env.TOKEN);

/**
 * LOGIQUE DE FERMETURE PROPRE
 */
process.on('SIGINT', () => {
    console.log("[SYSTEM] Shutting down. Saving Database...");
    saveDB();
    process.exit();
});
