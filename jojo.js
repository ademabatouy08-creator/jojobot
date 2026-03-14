const BATTLE_SESSIONS = new Map();

function createBattle(p1Id, p2Id, channelId) {
    const p1 = DATA.players[p1Id];
    const p2 = DATA.players[p2Id];
    const session = {
        id: `BTL-${Date.now()}`,
        players: [
            { ...p1, currentHp: GameEngine.calculateHP(p1), currentStm: GameEngine.calculateStamina(p1), controller: p1Id },
            { ...p2, currentHp: GameEngine.calculateHP(p2), currentStm: GameEngine.calculateStamina(p2), controller: p2Id }
        ],
        turn: 0,
        channel: channelId,
        history: []
    };
    BATTLE_SESSIONS.set(session.id, session);
    return session;
}

const JOBS = {
    "Archéologue": { bonus: "arrow_find", rate: 0.15 },
    "Médecin": { bonus: "heal_mult", rate: 1.5 },
    "Garde du corps": { bonus: "def_boost", rate: 1.2 },
    "Voleur": { bonus: "money_steal", rate: 0.2 }
};

client.on('interactionCreate', async (idx) => {
    if (!idx.isChatInputCommand()) return;
    const p = GameEngine.getPlayer(idx.user.id, idx.user.username);

    if (idx.commandName === 'work') {
        const lastWork = p.last_work || 0;
        if (Date.now() - lastWork < 3600000) return idx.reply("Reviens dans une heure !");
        const baseGain = 500 + (p.lvl * 20);
        const jobBonus = p.job ? (baseGain * 0.5) : 0;
        p.money += (baseGain + jobBonus);
        p.last_work = Date.now();
        saveSystem();
        return idx.reply(`💼 Travail terminé ! Gain : **${baseGain + jobBonus} ¥**.`);
    }

    if (idx.commandName === 'set_job') {
        const jobName = idx.options.getString('metier');
        if (!JOBS[jobName]) return idx.reply("Métier inconnu.");
        if (p.lvl < 15) return idx.reply("Niveau 15 requis pour un métier.");
        p.job = jobName;
        saveSystem();
        return idx.reply(`🎓 Félicitations, vous êtes maintenant **${jobName}** !`);
    }

    if (idx.commandName === 'boss_hunt') {
        const boss = { name: "DIO", hp: 15000, atk: 400 };
        const pAtk = p.stats.str * 5;
        const damageDealt = Math.min(boss.hp, pAtk + (Math.random() * 200));
        p.xp += damageDealt;
        saveSystem();
        return idx.reply(`🧛 Vous avez attaqué **${boss.name}** et infligé **${Math.floor(damageDealt)}** points de dégâts !`);
    }

    if (idx.commandName === 'equip') {
        const item = idx.options.getString('item');
        if (!p.inventory_items) p.inventory_items = [];
        if (!p.inventory_items.includes(item)) return idx.reply("Vous ne possédez pas cet équipement.");
        p.equipped = item;
        saveSystem();
        return idx.reply(`⚔️ **${item}** équipé !`);
    }
});

const STAND_ABILITIES_PROTOTYPE = {
    "Stop Time": (attacker, defender) => {
        defender.skip_turn = true;
        return "Le temps s'est arrêté !";
    },
    "Restoration": (attacker) => {
        attacker.currentHp += 300;
        return "Les blessures sont soignées !";
    },
    "Bomb Trap": (attacker, defender) => {
        defender.currentHp -= 500;
        return "Une explosion dévastatrice !";
    }
};

function processBattleTurn(sessionId, moveType) {
    const session = BATTLE_SESSIONS.get(sessionId);
    const active = session.players[session.turn % 2];
    const target = session.players[(session.turn + 1) % 2];

    let log = "";
    if (moveType === "attack") {
        const dmg = (active.stats.str * 10) - (target.stats.res * 2);
        target.currentHp -= Math.max(50, dmg);
        log = `**${active.name}** frappe fort et inflige ${dmg} !`;
    }

    if (target.currentHp <= 0) {
        BATTLE_SESSIONS.delete(sessionId);
        return { log, gameOver: true, winner: active.name };
    }

    session.turn++;
    return { log, gameOver: false };
}

const QUEST_BOARD = [
    { id: 1, title: "Livraison Speedwagon", reward: 1200, reqLvl: 1 },
    { id: 2, title: "Nettoyage de ruelle", reward: 2500, reqLvl: 10 },
    { id: 3, title: "Infiltration Passione", reward: 8000, reqLvl: 30 }
];

function generateLoot(p) {
    const roll = Math.random();
    if (roll > 0.95) return "Flèche d'Or";
    if (roll > 0.80) return "Badge de Police";
    if (roll > 0.50) return "Briquet Briquet";
    return "Déchet";
}

const CLAN_WARS = {
    active: false,
    participants: [],
    start: () => { CLAN_WARS.active = true; },
    end: () => { CLAN_WARS.active = false; }
};

function calculateStandPower(stand) {
    if (!stand) return 0;
    const rarities = { "SSR": 5, "SR": 3, "R": 1 };
    return rarities[stand.rarity] * 100;
}

const GLOBAL_ECONOMY = {
    tax_rate: 0.05,
    collect: (amount) => amount * (1 - GLOBAL_ECONOMY.tax_rate)
};

function upgradeStand(id) {
    const p = DATA.players[id];
    if (p.money >= 10000 && p.stand) {
        p.money -= 10000;
        p.stand.dmg += 50;
        saveSystem();
        return true;
    }
    return false;
}

const VAMPIRE_STATS = {
    sun_weakness: true,
    night_boost: 2.0,
    check: (isNight) => isNight ? VAMPIRE_STATS.night_boost : 0.5
};

function addTitle(id, title) {
    const p = DATA.players[id];
    if (!p.titles.includes(title)) {
        p.titles.push(title);
        saveSystem();
    }
}

const ACHIEVEMENTS = [
    { name: "Premier Sang", check: (p) => p.history.wins >= 1 },
    { name: "Millionnaire", check: (p) => p.money >= 1000000 },
    { name: "Maître Stand", check: (p) => p.lvl >= 50 && p.stand }
];

function updateXp(id, amount) {
    const p = DATA.players[id];
    p.xp += amount;
    const leveled = STATUS_MANAGER.checkLevelUp(p);
    if (leveled) {
        p.stats.str += 2;
        p.stats.res += 2;
        p.stats.sta += 2;
    }
    saveSystem();
    return leveled;
}

const WEATHER_SYSTEM = {
    current: "Soleil",
    change: () => {
        const states = ["Soleil", "Pluie", "Tempête", "Brouillard"];
        WEATHER_SYSTEM.current = states[Math.floor(Math.random() * states.length)];
    }
};

function getTravelTime(from, to) {
    const zones = ["Morioh", "Naples", "Le Caire"];
    const dist = Math.abs(zones.indexOf(from) - zones.indexOf(to));
    return dist * 600000;
}

const BLACK_MARKET_ITEMS = {
    "Masque de Pierre": 50000,
    "Doigt de Sukuna": 100000,
    "Arc de Stand": 25000
};

function buyBlackMarket(id, item) {
    const p = DATA.players[id];
    const price = BLACK_MARKET_ITEMS[item];
    if (p.money >= price) {
        p.money -= price;
        if (!p.inventory_items) p.inventory_items = [];
        p.inventory_items.push(item);
        saveSystem();
        return true;
    }
    return false;
}

const SERVER_CONFIG = {
    maintenance: false,
    double_xp: false,
    event_active: true
};

function logAction(msg) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${msg}`);
}

const SKILL_TREE = {
    "FORCE_I": { cost: 5, effect: (p) => p.stats.str += 10 },
    "RESISTANCE_I": { cost: 5, effect: (p) => p.stats.res += 10 },
    "VITALITE_I": { cost: 5, effect: (p) => p.stats.sta += 10 }
};

function unlockSkill(id, skillId) {
    const p = DATA.players[id];
    const skill = SKILL_TREE[skillId];
    if (p.skill_points >= skill.cost) {
        p.skill_points -= skill.cost;
        skill.effect(p);
        saveSystem();
        return true;
    }
    return false;
}

const NPC_VENDORS = {
    "Tonio": { item: "Plat de Pâtes", price: 300, heal: 500 },
    "Speedwagon": { item: "Infos", price: 1000, heal: 0 }
};

function getDailyNews() {
    return "Aujourd'hui, les manieurs de Stand gagnent 20% d'XP en plus !";
}

const BOT_PERMISSIONS = {
    ADMIN: "8",
    USER: "0"
};

function checkPerms(member) {
    return member.permissions.has(GatewayIntentBits.Administrator);
}

const RANKING_SYSTEM = {
    getTop: () => Object.values(DATA.players).sort((a,b) => b.lvl - a.lvl).slice(0, 5)
};

function applyStatBonus(p) {
    if (p.race === "Vampire") return p.stats.str * 1.5;
    return p.stats.str;
}

const WORLD_MAP = {
    "Morioh": { type: "Safe", pvp: false },
    "Naples": { type: "Danger", pvp: true },
    "Le Caire": { type: "Boss", pvp: true }
};

function canPvp(zone) {
    return WORLD_MAP[zone].pvp;
}

const EMERGENCY_SAVE = () => {
    console.log("Sauvegarde d'urgence...");
    saveSystem();
};

process.on('uncaughtException', (err) => {
    console.error('CRASH:', err);
    EMERGENCY_SAVE();
});

function computeFinalDefense(p) {
    return p.stats.res * 0.8 + (p.lvl * 0.5);
}

const STAMINA_REGEN_TICK = 5;
function regeneratePlayer(p) {
    p.stm = Math.min(GameEngine.calculateStamina(p), p.stm + STAMINA_REGEN_TICK);
}

const LOOT_BOX_RARITY = {
    COMMON: 0.70,
    RARE: 0.25,
    LEGENDARY: 0.05
};

function openLootBox(id) {
    const p = DATA.players[id];
    const roll = Math.random();
    if (roll < LOOT_BOX_RARITY.LEGENDARY) return "Stand Arrow SSR";
    if (roll < LOOT_BOX_RARITY.RARE) return "Stand Arrow SR";
    return "Potion x5";
}

const CLAN_LEVELS = {
    1: 0,
    2: 10000,
    3: 50000,
    4: 100000
};

function getClanRank(clan) {
    if (clan.xp >= CLAN_LEVELS[4]) return "Elite";
    if (clan.xp >= CLAN_LEVELS[2]) return "Actif";
    return "Débutant";
}

const SESSION_CLEANER = setInterval(() => {
    const now = Date.now();
    BATTLE_SESSIONS.forEach((session, id) => {
        if (now - parseInt(id.split('-')[1]) > 300000) BATTLE_SESSIONS.delete(id);
    });
}, 60000);

function getStatusColor(hp, max) {
    const ratio = hp / max;
    if (ratio > 0.6) return "Green";
    if (ratio > 0.3) return "Orange";
    return "Red";
}

const COMBO_SYSTEM = {
    current: 0,
    add: () => { COMBO_SYSTEM.current++; },
    reset: () => { COMBO_SYSTEM.current = 0; }
};

function applyComboBonus(dmg) {
    return dmg * (1 + (COMBO_SYSTEM.current * 0.1));
}

const FINAL_INIT = () => {
    logAction("Système d'extension chargé.");
};
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => {
    res.send('Olympus Engine est en ligne. Statut : OK');
});
app.listen(PORT, () => {
    console.log(`Serveur de liaison Olympus actif sur le port ${PORT}`);
});

const QUEST_GENERATOR = {
    titles: ["Traquer le traître", "Récupérer la flèche", "Protéger la ville", "Duel sanglant"],
    rewards: [500, 1000, 2500, 5000],
    generate: () => {
        const i = Math.floor(Math.random() * QUEST_GENERATOR.titles.length);
        return { title: QUEST_GENERATOR.titles[i], cash: QUEST_GENERATOR.rewards[i] };
    }
};

const VAMPIRE_LOGIC = {
    burn: (p) => {
        if (p.race === "Vampire" && !TIME_SYSTEM.isDay()) return 0;
        if (p.race === "Vampire" && TIME_SYSTEM.isDay()) return 100;
        return 0;
    }
};

const HAMON_SYSTEM = {
    training_cost: 5000,
    learn: (id) => {
        const p = DATA.players[id];
        if (p.money >= HAMON_SYSTEM.training_cost) {
            p.money -= HAMON_SYSTEM.training_cost;
            p.race = "Hamon";
            saveSystem();
            return true;
        }
        return false;
    }
};

const STAND_REQUIAEM_CHANCE = 0.01;
function tryRequiem(id) {
    const p = DATA.players[id];
    if (Math.random() < STAND_REQUIAEM_CHANCE) {
        p.stand.rarity = "REQUIEM";
        p.stand.dmg *= 3;
        saveSystem();
        return true;
    }
    return false;
}

const ARENA_QUEUE = [];
function joinQueue(id) {
    if (!ARENA_QUEUE.includes(id)) ARENA_QUEUE.push(id);
    if (ARENA_QUEUE.length >= 2) {
        const p1 = ARENA_QUEUE.shift();
        const p2 = ARENA_QUEUE.shift();
        return { p1, p2 };
    }
    return null;
}

const MATERIAL_EXCHANGE = {
    "iron_to_gold": { in: 10, out: 1 },
    "gold_to_diamond": { in: 5, out: 1 }
};

function exchangeMaterials(id, type) {
    const p = DATA.players[id];
    const formula = MATERIAL_EXCHANGE[type];
    if (p.materials[type.split('_')[0]] >= formula.in) {
        p.materials[type.split('_')[0]] -= formula.in;
        p.materials[type.split('_')[2]] += formula.out;
        saveSystem();
    }
}

const GLOBAL_NOTIFICATIONS = [];
function pushNotif(msg) {
    GLOBAL_NOTIFICATIONS.push(msg);
    if (GLOBAL_NOTIFICATIONS.length > 5) GLOBAL_NOTIFICATIONS.shift();
}

const LOOT_RARITY_LOGIC = (luck) => {
    const roll = Math.random() + luck;
    if (roll > 1.2) return "LEGENDARY";
    if (roll > 0.9) return "RARE";
    return "COMMON";
};

const CLAN_VAULT = new Map();
function depositToVault(clanName, amount) {
    const current = CLAN_VAULT.get(clanName) || 0;
    CLAN_VAULT.set(clanName, current + amount);
}

const SPEEDWAGON_BUFF = (p) => {
    if (p.clan === "Speedwagon") return 1.15;
    return 1.0;
};

const BATTLE_XP_CALC = (winnerLvl, loserLvl) => {
    const diff = loserLvl - winnerLvl;
    return Math.max(50, 150 + (diff * 10));
};

const COMBO_BREAKER = (p) => {
    return p.stats.res > 100 ? 0.2 : 0;
};

const ITEM_DURABILITY = new Map();
function checkBroken(itemId) {
    const dur = ITEM_DURABILITY.get(itemId) || 100;
    return dur <= 0;
}

const WORLD_STATE = {
    isUnderSiege: false,
    siegeProgress: 0
};

function applySiegeDmg(id) {
    if (WORLD_STATE.isUnderSiege) {
        DATA.players[id].hp -= 50;
    }
}

const PRESTIGE_REWARDS = {
    1: "Badge de Bronze",
    5: "Badge d'Or",
    10: "Aura Divine"
};

function getPrestigeReward(lvl) {
    return PRESTIGE_REWARDS[lvl] || "Aucune";
}

const FAST_TRAVEL_ZONES = ["Morioh", "Naples", "Le Caire"];
function canFastTravel(p) {
    return p.money >= 500 && p.lvl >= 20;
}

const STAND_STORAGE = new Map();
function storeStand(id, stand) {
    STAND_STORAGE.set(id, stand);
}

const TAX_OFFICE = {
    balance: 0,
    tax: (amt) => {
        const t = amt * 0.1;
        TAX_OFFICE.balance += t;
        return amt - t;
    }
};

const CRITICAL_ERROR_RECOVERY = () => {
    console.log("Tentative de récupération des données...");
    saveSystem();
};

const BOT_HEARTBEAT = setInterval(() => {
    console.log(`[HB] Joueurs: ${Object.keys(DATA.players).length}`);
}, 3600000);

const PLAYER_STATUS_FLAGS = {
    isBanned: (id) => false,
    isMuted: (id) => false
};

const XP_CURVE = (lvl) => Math.floor(100 * Math.pow(lvl, 1.5));

const SESSION_METRICS = {
    commandsExecuted: 0,
    duelsFinished: 0
};

const RESOURCE_REGEN = () => {
    Object.values(DATA.players).forEach(p => {
        p.money += 1;
    });
};

const FINAL_WAKEUP = () => {
    console.log("Boucle principale Olympus attachée au port " + PORT);
};
FINAL_WAKEUP();
