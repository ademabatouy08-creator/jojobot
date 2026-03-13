/**
 * ⚔️ JOJO BATTLE ENGINE - JONATHAN VS TOORU
 * Version : 2.0.0 (Logiciel de combat avancé)
 * Langage : JavaScript (Node.js)
 * Bibliothèque : Discord.js v14
 */

const { 
    Client, 
    GatewayIntentBits, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    SlashCommandBuilder, 
    REST, 
    Routes,
    Colors
} = require('discord.js');

// --- CONFIGURATION DES IDENTIFIANTS ---
const CONFIG = {
    TOKEN: process.env.TOKEN, // On ne met plus rien entre les guillemets ici
    CLIENT_ID: process.env.CLIENT_ID,
    ID_JONATHAN: "1404076132890050571",
    ID_TOORU: "1035229870348828723",
    MAX_HP: 500,
    MAX_ENERGY: 100
};

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Bot Jojo en ligne !'));
app.listen(port, () => console.log(`Serveur de maintien activé sur le port ${port}`));

// Base de données temporaire des combats
const activeBattles = new Map();

/**
 * CLASSE : MOTEUR DE PERSONNAGE
 * Gère les stats individuelles, les buffs et les probabilités.
 */
class Fighter {
    constructor(name, id, isJonathan) {
        this.name = name;
        this.id = id;
        this.hp = CONFIG.MAX_HP;
        this.energy = 50;
        this.isJonathan = isJonathan;
        this.isGuarding = false;
        this.critChance = 0.15; // 15% de chance de critique
        this.dodgeChance = 0.10; // 10% de chance d'esquive
    }

    takeDamage(amount) {
        if (this.isGuarding) {
            amount = Math.floor(amount / 2);
            this.isGuarding = false;
            return { dmg: amount, guarded: true };
        }
        this.hp -= amount;
        if (this.hp < 0) this.hp = 0;
        return { dmg: amount, guarded: false };
    }

    addEnergy(amount) {
        this.energy = Math.min(this.energy + amount, CONFIG.MAX_ENERGY);
    }

    useEnergy(amount) {
        if (this.energy >= amount) {
            this.energy -= amount;
            return true;
        }
        return false;
    }
}

/**
 * CLASSE : GESTIONNAIRE DE COMBAT
 * Le cœur du système (400 lignes de logique cumulée).
 */
class BattleManager {
    constructor(channelId) {
        this.channelId = channelId;
        this.p1 = new Fighter("Jonathan Joestar", CONFIG.ID_JONATHAN, true);
        this.p2 = new Fighter("Tooru", CONFIG.ID_TOORU, false);
        this.turn = CONFIG.ID_JONATHAN;
        this.round = 1;
        this.logs = ["Le destin commence maintenant."];
    }

    getFighter(id) {
        return id === this.p1.id ? this.p1 : this.p2;
    }

    getOpponent(id) {
        return id === this.p1.id ? this.p2 : this.p1;
    }

    processAction(userId, actionName) {
        const attacker = this.getFighter(userId);
        const defender = this.getOpponent(userId);
        const move = actionName.toLowerCase();

        if (this.turn !== userId) return { error: "Attends ton tour !" };

        let damage = 0;
        let healing = 0;
        let energyGain = 15;
        let flavor = "";
        let isCrit = Math.random() < attacker.critChance;
        let isDodge = Math.random() < defender.dodgeChance;

        // --- BRANCHEMENT DES TECHNIQUES EXCLUSIVES ---
        
        // JONATHAN JOESTAR (HAMON SKILLS)
        if (attacker.isJonathan) {
            switch (move) {
                case 'overdrive':
                    if (!attacker.useEnergy(30)) return { error: "Pas assez d'énergie Hamon (30 requis) !" };
                    damage = 70 + Math.floor(Math.random() * 30);
                    flavor = "☀️ **SUNLIGHT YELLOW OVERDRIVE !** Un enchaînement dévastateur !";
                    break;
                case 'zoom':
                    damage = 35 + Math.floor(Math.random() * 10);
                    flavor = "👊 **ZOOM PUNCH.** Jonathan décroche ses articulations !";
                    break;
                case 'luck':
                    healing = 60;
                    flavor = "⚔️ **LUCK & PLUCK.** Jonathan puise dans son courage.";
                    break;
                case 'metal':
                    damage = 45;
                    attacker.addEnergy(20);
                    flavor = "⛓️ **METAL SILVER OVERDRIVE.** Le Hamon passe à travers l'acier !";
                    break;
                default:
                    return { error: "Attaques Jonathan : `overdrive`, `zoom`, `luck`, `metal`" };
            }
        } 
        // TOORU (WONDER OF U / CALAMITY SKILLS)
        else {
            switch (move) {
                case 'wonder':
                    if (!attacker.useEnergy(40)) return { error: "Pas assez d'énergie de Stand (40 requis) !" };
                    damage = 85 + Math.floor(Math.random() * 20);
                    flavor = "🎭 **WONDER OF U.** La calamité s'abat. Tout objet devient mortel !";
                    break;
                case 'pursuit':
                    damage = 40;
                    attacker.addEnergy(10);
                    flavor = "🏃 **POURSUITE.** Quiconque s'approche de Tooru court à sa perte.";
                    break;
                case 'rokakaka':
                    healing = 80;
                    damage = 30; // L'échange équivalent blesse un peu Jonathan
                    flavor = "🍎 **ROKAKAKA.** Un échange équivalent se produit...";
                    break;
                case 'flow':
                    damage = 50;
                    flavor = "💧 **RAIN FLOW.** La pluie transperce Jonathan comme des balles.";
                    break;
                default:
                    return { error: "Attaques Tooru : `wonder`, `pursuit`, `rokakaka`, `flow`" };
            }
        }

        // --- CALCUL DES RÉSULTATS ---
        if (isDodge && damage > 0) {
            this.logs.push(`💨 ${defender.name} a esquivé l'attaque !`);
            damage = 0;
        } else {
            if (isCrit) damage = Math.floor(damage * 1.5);
            const result = defender.takeDamage(damage);
            damage = result.dmg;
            if (result.guarded) this.logs.push(`🛡️ ${defender.name} a bloqué la moitié des dégâts.`);
            if (isCrit) this.logs.push(`🔥 COUP CRITIQUE !`);
        }

        attacker.hp = Math.min(attacker.hp + healing, CONFIG.MAX_HP);
        attacker.addEnergy(energyGain);

        this.logs.push(`${attacker.isJonathan ? "🔵" : "🔴"} ${flavor}`);
        this.turn = defender.id;
        this.round++;

        return { success: true };
    }

    createEmbed() {
        return new EmbedBuilder()
            .setTitle(`🏟️ ROUND ${this.round} - LE DESTIN DES JOESTAR`)
            .setColor(this.turn === CONFIG.ID_JONATHAN ? Colors.Blue : Colors.Purple)
            .addFields(
                { name: `🟦 Jonathan Joestar`, value: `❤️ HP: ${this.p1.hp}/${CONFIG.MAX_HP}\n⚡ Hamon: ${this.p1.energy}%`, inline: true },
                { name: `🟪 Tooru`, value: `❤️ HP: ${this.p2.hp}/${CONFIG.MAX_HP}\n🎭 Stand: ${this.p2.energy}%`, inline: true },
                { name: `📜 Journal de Combat`, value: this.logs.slice(-3).join("\n") || "Début du duel..." }
            )
            .setFooter({ text: `C'est au tour de : ${this.getFighter(this.turn).name}` })
            .setTimestamp();
    }

    isEnded() { return this.p1.hp <= 0 || this.p2.hp <= 0; }
    getWinner() { return this.p1.hp <= 0 ? this.p2 : this.p1; }
}

// --- INITIALISATION DES COMMANDES ---
const commands = [
    new SlashCommandBuilder()
        .setName('fight')
        .setDescription('Ouvrir un salon de duel exclusif')
        .addUserOption(o => o.setName('cible').setDescription('Ton adversaire de destin').setRequired(true)),
    new SlashCommandBuilder()
        .setName('attaque')
        .setDescription('Lancer une capacité')
        .addStringOption(o => o.setName('nom').setDescription('Nom de la technique').setRequired(true)),
    new SlashCommandBuilder()
        .setName('guard')
        .setDescription('Réduire les prochains dégâts de 50%')
];

// --- GESTION DES INTERACTIONS ---
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, user, guild, channelId } = interaction;

    // 1. COMMANDE /FIGHT
    if (commandName === 'fight') {
        const target = options.getUser('cible');
        
        // Sécurité IDs
        const isJon = user.id === CONFIG.ID_JONATHAN || target.id === CONFIG.ID_JONATHAN;
        const isTooru = user.id === CONFIG.ID_TOORU || target.id === CONFIG.ID_TOORU;

        if (!isJon || !isTooru) {
            return interaction.reply({ content: "❌ Seuls Jonathan Joestar et Tooru peuvent déclencher cet événement.", ephemeral: true });
        }

        const channel = await guild.channels.create({
            name: `🏟-duel-${user.username}`,
            type: 0,
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: target.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            ]
        });

        activeBattles.set(channel.id, new BattleManager(channel.id));
        await interaction.reply(`Le destin est scellé. Rendez-vous ici : ${channel}`);
        await channel.send({ content: "Le combat commence !", embeds: [activeBattles.get(channel.id).createEmbed()] });
    }

    // 2. COMMANDE /ATTAQUE
    if (commandName === 'attaque') {
        const battle = activeBattles.get(channelId);
        if (!battle) return interaction.reply({ content: "Aucun combat ici.", ephemeral: true });

        const result = battle.processAction(user.id, options.getString('nom'));
        if (result.error) return interaction.reply({ content: result.error, ephemeral: true });

        await interaction.reply({ embeds: [battle.createEmbed()] });

        if (battle.isEnded()) {
            const winner = battle.getWinner();
            await interaction.followUp(`🏆 **${winner.name.toUpperCase()} A REMPORTÉ LE COMBAT !**`);
            activeBattles.delete(channelId);
            setTimeout(() => interaction.channel.delete().catch(() => {}), 30000);
        }
    }

    // 3. COMMANDE /GUARD
    if (commandName === 'guard') {
        const battle = activeBattles.get(channelId);
        if (!battle || battle.turn !== user.id) return interaction.reply({ content: "Action impossible.", ephemeral: true });

        battle.getFighter(user.id).isGuarding = true;
        battle.turn = battle.getOpponent(user.id).id;
        battle.logs.push(`🛡️ ${user.username} se met en garde !`);
        
        await interaction.reply({ embeds: [battle.createEmbed()] });
    }
});

// --- Lancement des commandes slash ---
client.once('ready', async () => {
    const rest = new REST({ version: '10' }).setToken(CONFIG.TOKEN);
    await rest.put(Routes.applicationCommands(CONFIG.CLIENT_ID), { body: commands });
    console.log(`[SYSTEM] ${client.user.tag} est prêt à combattre.`);
});

client.login(CONFIG.TOKEN);