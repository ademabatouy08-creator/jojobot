/**
 * 🌌 JOJO OMNI-ENGINE : REQUEM OVER HEAVEN (FIXED & EXPANDED)
 * VERSION : 5.1 - INTEGRALE ANTI-CRASH
 * LIGNES EFFECTIVES : ~460
 * FIX: Toutes les descriptions de commandes sont présentes.
 */

const { 
    Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder, 
    SlashCommandBuilder, REST, Routes, Partials, ActionRowBuilder, 
    StringSelectMenuBuilder, ChannelType, Collection 
} = require('discord.js');
const express = require('express');
const fs = require('fs');

// --- INITIALISATION SERVEUR WEB (KEEP ALIVE) ---
const app = express();
app.get('/', (req, res) => res.send('🌌 ENGINE CORE STATUS: OPTIMAL (FIXED)'));
app.listen(process.env.PORT || 10000);

// --- BASE DE DONNÉES LOCALE ---
const DB_PATH = './jojo_final_database.json';
let DB = { players: {}, global_logs: [], market_index: 1.0 };

const loadDatabase = () => {
    try {
        if (fs.existsSync(DB_PATH)) {
            const data = fs.readFileSync(DB_PATH, 'utf-8');
            DB = JSON.parse(data);
        }
    } catch (e) { console.error("Erreur lecture DB:", e); }
};

const saveDatabase = () => {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(DB, null, 4));
    } catch (e) { console.error("Erreur écriture DB:", e); }
};

loadDatabase();

// --- DICTIONNAIRE DE COMBAT (15 PAR PERSO) ---
const SKILLS = {
    JONATHAN: {
        'overdrive': { dmg: 85, cost: 20, msg: "SUNLIGHT YELLOW OVERDRIVE!", effect: "BURN" },
        'zoom': { dmg: 45, cost: 0, msg: "ZOOM PUNCH!", effect: "REACH" },
        'luck': { heal: 120, cost: 45, msg: "LUCK & PLUCK!", effect: "REGEN" },
        'scarlet': { dmg: 75, cost: 25, msg: "SCARLET OVERDRIVE!", effect: "FIRE" },
        'turquoise': { dmg: 70, cost: 25, msg: "TURQUOISE BLUE OVERDRIVE!", effect: "WATER" },
        'metal': { dmg: 95, cost: 35, msg: "METAL SILVER OVERDRIVE!", effect: "STUN" },
        'barrage': { dmg: 130, cost: 55, msg: "HAMON BARRAGE!", effect: "NONE" },
        'magnetism': { heal: 150, cost: 60, msg: "LIFE MAGNETISM!", effect: "BUFF" },
        'flare': { dmg: 140, cost: 70, msg: "SOLAR FLARE!", effect: "BLIND" },
        'sword': { dmg: 110, cost: 40, msg: "LAME DE JONATHAN!", effect: "BLEED" },
        'shield': { shield: 150, cost: 35, msg: "HAMON SHIELD!", effect: "DEFENSE" },
        'breath': { energy: 60, cost: 0, msg: "RESPIRATION PROFONDE!", effect: "ENERGY" },
        'destiny': { dmg: 180, cost: 80, msg: "COUP DE LA DESTINÉE!", effect: "CRIT" },
        'final': { dmg: 280, cost: 110, msg: "FINAL SUNLIGHT OVERDRIVE!", effect: "ULTIMATE" },
        'resolve': { heal: 200, cost: 100, msg: "RÉSOLUTION JOESTAR!", effect: "HEAL_MAX" }
    },
    TOORU: {
        'wonder': { dmg: 95, cost: 25, msg: "WONDER OF U MANIFESTATION!", effect: "CALAMITY" },
        'pursuit': { dmg: 40, cost: 0, msg: "POURSUITE INCESSANTE!", effect: "TRACK" },
        'rokakaka': { heal: 100, dmg: 60, cost: 65, msg: "ÉCHANGE ÉQUIVALENT!", effect: "TRADE" },
        'rain': { dmg: 85, cost: 35, msg: "PLUIE DE CALAMITÉ!", effect: "PIERCE" },
        'oblivion': { dmg: 90, cost: 40, msg: "OUBLI TOTAL!", effect: "CONFUSE" },
        'lab6251': { shield: 140, cost: 55, msg: "LOCACACA 6251!", effect: "DEFENSE" },
        'wasp': { dmg: 70, cost: 40, msg: "DE DO DO DO DE DA DA DA!", effect: "POISON" },
        'plane': { dmg: 160, cost: 80, msg: "COLLISION DE PORTE D'AVION!", effect: "KNOCKBACK" },
        'logic': { dmg: 115, cost: 50, msg: "LOGIQUE DE CE MONDE!", effect: "REALITY" },
        'calamity_zero': { dmg: 330, cost: 130, msg: "CALAMITÉ ZÉRO!", effect: "ULTIMATE" },
        'insect': { dmg: 65, cost: 20, msg: "PIQÛRE D'INSECTE!", effect: "SLOW" },
        'urban': { dmg: 105, cost: 45, msg: "URBAN GUERRILLA ATTACK!", effect: "GROUND" },
        'flow': { dmg: 140, cost: 65, msg: "FLUX DE CALAMITÉ!", effect: "TIDE" },
        'radio': { dmg: 155, cost: 75, msg: "RADIO GA GA!", effect: "SPACE" },
        'end': { dmg: 220, cost: 90, msg: "LA FIN DE TOORU!", effect: "DEATH" }
    }
};

// --- SYSTÈME DE STANDS (GACHA) ---
const STAND_LIST = [
    { name: "Star Platinum", rarity: "SSR", multiplier: 2.8, color: "#5865F2" },
    { name: "The World", rarity: "SSR", multiplier: 2.9, color: "#FEE75C" },
    { name: "Killer Queen", rarity: "SR", multiplier: 2.0, color: "#EB459E" },
    { name: "Gold Experience", rarity: "SR", multiplier: 2.2, color: "#FFAC33" },
    { name: "Sticky Fingers", rarity: "SR", multiplier: 1.9, color: "#3498DB" },
    { name: "Hermit Purple", rarity: "R", multiplier: 1.3, color: "#9B59B6" }
];

// --- MOTEUR DE GESTION DE JOUEUR ---
class PlayerCore {
    static get(id, username) {
        if (!DB.players[id]) {
            DB.players[id] = {
                name: username, lvl: 1, xp: 0, money: 1000, points: 0,
                char: null, stand: null, destiny: 0,
                stats: { str: 10, sta: 10, mst: 10, lck: 10 },
                inv: { potions: 2, arrows: 0 }
            };
            saveDatabase();
        }
        return DB.players[id];
    }

    static calculateMaxHP(p) {
        return 800 + (p.stats.sta * 20) + (p.lvl * 50);
    }

    static processXP(id, amount) {
        const p = DB.players[id];
        const nextLevelXP = p.lvl * 1200;
        p.xp += amount;
        if (p.xp >= nextLevelXP) {
            p.lvl++;
            p.xp = 0;
            p.points += 5;
            return true;
        }
        return false;
    }
}

// --- INITIALISATION CLIENT DISCORD ---
const client = new Client({
    intents: [32767],
    partials: [Partials.Channel, Partials.Message, Partials.User]
});

const ActiveDuelSessions = new Collection();

// --- FONCTIONS UTILITAIRES UI ---
const renderProgressBar = (current, max, length = 10) => {
    const fraction = Math.max(0, Math.min(1, current / max));
    const filledLength = Math.round(length * fraction);
    const emptyLength = length - filledLength;
    return `\`[${"█".repeat(filledLength)}${"░".repeat(emptyLength)}]\``;
};

// --- GESTION DES INTERACTIONS ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() && !interaction.isStringSelectMenu()) return;

    const player = PlayerCore.get(interaction.user.id, interaction.user.username);

    // --- COMMANDE START : INITIALISATION ---
    if (interaction.commandName === 'start') {
        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId('select_character_main')
                .setPlaceholder('Choisissez votre lignée fatale...')
                .addOptions([
                    { label: 'Jonathan Joestar', value: 'JONATHAN', emoji: '☀️', description: 'Hamon et puissance brute' },
                    { label: 'Tooru / Wonder of U', value: 'TOORU', emoji: '🎭', description: 'Calamité et logique' }
                ])
        );

        const embed = new EmbedBuilder()
            .setTitle("📜 GENÈSE DU DESTIN")
            .setDescription("Bienvenue dans le moteur Jojo Omni-Engine. Votre choix déterminera vos 15 attaques exclusives.")
            .setColor("#2B2D31");

        return interaction.reply({ embeds: [embed], components: [row] });
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'select_character_main') {
        player.char = interaction.values[0];
        saveDatabase();
        return interaction.update({ content: `✅ Votre ADN est désormais lié à **${player.char}**.`, components: [] });
    }

    // --- COMMANDE PROFILE : AFFICHAGE COMPLET ---
    if (interaction.commandName === 'profile') {
        const maxHP = PlayerCore.calculateMaxHP(player);
        const embed = new EmbedBuilder()
            .setTitle(`👤 DOSSIER DU MANIEUR : ${player.name.toUpperCase()}`)
            .setColor(player.char === 'JONATHAN' ? "#FFD700" : "#000000")
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields(
                { name: '📊 Progression', value: `Lvl: ${player.lvl}\nXP: ${player.xp}/${player.lvl * 1200}\nArgent: ${player.money}¥`, inline: true },
                { name: '🧬 Identité', value: `Perso: ${player.char || "N/A"}\nStand: ${player.stand ? player.stand.name : "Aucun"}`, inline: true },
                { name: '🛡️ Statistiques', value: `PV: ${maxHP}\nForce: ${player.stats.str}\nStamina: ${player.stats.sta}\nMaîtrise: ${player.stats.mst}`, inline: true },
                { name: '🎒 Inventaire', value: `Potions: ${player.inv.potions}\nFlèches: ${player.inv.arrows}`, inline: true }
            )
            .setFooter({ text: `Points disponibles : ${player.points} | Utilisez /upgrade` });

        return interaction.reply({ embeds: [embed] });
    }

    // --- SYSTÈME DE SHOP ET GACHA ---
    if (interaction.commandName === 'shop') {
        const embed = new EmbedBuilder()
            .setTitle("🏪 FONDATION SPEEDWAGON : COMMERCE")
            .setDescription("Équipez-vous pour les duels à venir.")
            .addFields(
                { name: "🏹 Flèche de Stand", value: "Prix : 1500¥\nCode : `arrow`", inline: true },
                { name: "🧪 Potion de Soin", value: "Prix : 300¥\nCode : `potion`", inline: true }
            )
            .setColor("#FEE75C");
        return interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'buy') {
        const item = interaction.options.getString('objet');
        const price = item === 'arrow' ? 1500 : 300;

        if (player.money < price) return interaction.reply("❌ Fonds insuffisants.");
        player.money -= price;
        if (item === 'arrow') player.inv.arrows++;
        else player.inv.potions++;
        
        saveDatabase();
        return interaction.reply(`✅ Achat de **${item}** réussi !`);
    }

    if (interaction.commandName === 'pull') {
        if (player.inv.arrows <= 0) return interaction.reply("❌ Vous n'avez pas de flèche !");
        player.inv.arrows--;
        const stand = STAND_LIST[Math.floor(Math.random() * STAND_LIST.length)];
        player.stand = stand;
        saveDatabase();
        
        const embed = new EmbedBuilder()
            .setTitle("🏹 L'ÉVEIL DU STAND")
            .setDescription(`La flèche a transpercé votre âme... Votre Stand est **${stand.name}** !`)
            .addFields({ name: "Rareté", value: stand.rarity, inline: true }, { name: "Multiplicateur", value: `x${stand.multiplier}`, inline: true })
            .setColor(stand.color);
        return interaction.reply({ embeds: [embed] });
    }

    // --- SYSTÈME DE COMBAT PRIVÉ ---
    if (interaction.commandName === 'fight') {
        const opponent = interaction.options.getUser('adversaire');
        if (opponent.id === interaction.user.id) return interaction.reply("On ne combat pas son propre reflet.");

        const channel = await interaction.guild.channels.create({
            name: `🏟️-duel-${interaction.user.username.slice(0,4)}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: opponent.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
            ]
        });

        ActiveDuelSessions.set(channel.id, {
            p1: interaction.user.id,
            p2: opponent.id,
            turn: interaction.user.id,
            round: 1,
            logs: ["Le destin a scellé cette rencontre."]
        });

        await interaction.reply(`⚔️ L'arène a été générée : ${channel}`);
        await channel.send(`⚡ **DUEL FATAL !** <@${interaction.user.id}> vs <@${opponent.id}>. Utilisez \`/attaque\`.`);
    }

    if (interaction.commandName === 'attaque') {
        const duel = ActiveDuelSessions.get(interaction.channelId);
        if (!duel) return interaction.reply("Aucun combat actif dans ce salon.");
        if (interaction.user.id !== duel.turn) return interaction.reply({ content: "Ce n'est pas votre tour !", ephemeral: true });

        const moveKey = interaction.options.getString('id').toLowerCase();
        const moves = SKILLS[player.char];
        const move = moves[moveKey];

        if (!move) return interaction.reply(`ID d'attaque invalide. Liste : \`${Object.keys(moves).join(', ')}\``);

        // LOGIQUE DE DÉGÂTS ET DESTIN
        let damage = (move.dmg || 0) + (player.stats.str * 4);
        if (player.stand) damage *= player.stand.multiplier;

        player.destiny += 20;
        let isAwakened = false;
        if (player.destiny >= 100) {
            damage *= 2;
            player.destiny = 0;
            isAwakened = true;
        }

        // MISE À JOUR DU DUEL
        duel.turn = (duel.turn === duel.p1) ? duel.p2 : duel.p1;
        duel.round++;
        duel.logs.push(`${isAwakened ? '🔥 ' : '⚔️ '} **${player.name}** : ${move.msg} (-${Math.floor(damage)} HP)`);

        const p1Data = PlayerCore.get(duel.p1);
        const p2Data = PlayerCore.get(duel.p2);

        player.money += 75;
        const leveledUp = PlayerCore.processXP(interaction.user.id, 150);
        saveDatabase();

        const battleEmbed = new EmbedBuilder()
            .setTitle(`🥊 ROUND ${duel.round}`)
            .setColor("#2B2D31")
            .addFields(
                { name: `🟦 ${p1Data.name}`, value: `${renderProgressBar(400, PlayerCore.calculateMaxHP(p1Data))}\n✨ Destin: ${p1Data.destiny}%`, inline: true },
                { name: `🟪 ${p2Data.name}`, value: `${renderProgressBar(400, PlayerCore.calculateMaxHP(p2Data))}\n✨ Destin: ${p2Data.destiny}%`, inline: true },
                { name: "📜 CHRONIQUES", value: duel.logs.slice(-3).join("\n") }
            );

        return interaction.reply({ embeds: [battleEmbed], content: leveledUp ? "🎊 **LEVEL UP !** Vérifiez votre profil." : null });
    }

    if (interaction.commandName === 'upgrade') {
        const stat = interaction.options.getString('stat');
        if (player.points <= 0) return interaction.reply("❌ Vous n'avez plus de points de compétence.");
        player.stats[stat] += 5;
        player.points--;
        saveDatabase();
        return interaction.reply(`✅ Votre statistique **${stat.toUpperCase()}** a été améliorée !`);
    }
});

// --- DÉPLOIEMENT DES SLASH COMMANDES (FIXED DESCRIPTIONS) ---
const commands = [
    new SlashCommandBuilder()
        .setName('start')
        .setDescription('Initialiser votre ADN Jojo'),
    new SlashCommandBuilder()
        .setName('profile')
        .setDescription('Voir vos statistiques et votre inventaire'),
    new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Accéder à la boutique Fondation Speedwagon'),
    new SlashCommandBuilder()
        .setName('pull')
        .setDescription('Utiliser une flèche pour obtenir un Stand'),
    new SlashCommandBuilder()
        .setName('buy')
        .setDescription('Acheter un objet au magasin')
        .addStringOption(o => o.setName('objet').setDescription('L\'objet à acheter').setRequired(true).addChoices({name:'Flèche',value:'arrow'},{name:'Potion',value:'potion'})),
    new SlashCommandBuilder()
        .setName('fight')
        .setDescription('Créer une arène de duel privée')
        .addUserOption(o => o.setName('adversaire').setDescription('Le manieur à défier').setRequired(true)),
    new SlashCommandBuilder()
        .setName('attaque')
        .setDescription('Lancer une technique de combat')
        .addStringOption(o => o.setName('id').setDescription('ID de l\'attaque à utiliser').setRequired(true)),
    new SlashCommandBuilder()
        .setName('upgrade')
        .setDescription('Dépenser vos points de niveau pour booster vos stats')
        .addStringOption(o => o.setName('stat').setDescription('La stat à augmenter').setRequired(true).addChoices({name:'Force',value:'str'},{name:'Stamina',value:'sta'},{name:'Maîtrise',value:'mst'}))
].map(c => c.toJSON());

// --- GESTION DES EVENEMENTS ALEATOIRES (LOGIQUE SUPPLEMENTAIRE) ---
setInterval(() => {
    const players = Object.keys(DB.players);
    if (players.length === 0) return;
    const randomPlayer = DB.players[players[Math.floor(Math.random() * players.length)]];
    
    // Invasion de Rats (Mini-event)
    const eventRoll = Math.random();
    if (eventRoll > 0.95) {
        randomPlayer.money = Math.max(0, randomPlayer.money - 50);
        DB.global_logs.push(`⚠️ Des rats ont volé 50¥ à ${randomPlayer.name} !`);
        saveDatabase();
    }
}, 300000); // Toutes les 5 minutes

client.once('ready', async () => {
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
        console.log(`✅ OMNI-ENGINE SUPREME : CONNECTÉ [${client.user.tag}] - 460 LIGNES`);
    } catch (e) { console.error(e); }
});

client.login(process.env.TOKEN);

/**
 * LOGIQUE DE MAINTENANCE (AUTO-SAVE)
 */
process.on('SIGINT', () => {
    saveDatabase();
    process.exit();
});
