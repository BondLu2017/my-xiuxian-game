const Game = (function() {
    let state = {
        exp: 0, maxExp: 100, money: 100, hp: 100, maxHp: 100, 
        mp: 50, maxMp: 50, 
        baseAtk: 15, 
        atk: 15, realmIndex: 0,
        spiritType: "", spiritDesc: "", trainMult: 1.0,
        potions: 0, currentSkillIndex: 0,
        loot: { "妖丹": 0, "獸皮": 0, "精血": 0 },
        mySkills: [],
        currentWeapon: { name: "生鏽鐵劍", mult: 1.0, price: 0 },
        currentArmor: { name: "布衣", def: 0, price: 0 },
        currentShoe: { name: "無", escapeRate: 0, price: 0 },
        hasInitialSkill: false,
        isDemon: false,
        isFacingInnerDemon: false
    };

    let isInBattle = false;
    let enemy = null;

    const realms = ["凡人", "煉氣前期", "煉氣中期", "煉氣後期", "築基期", "金丹大能", "得道成仙"];
    const monsters = [
        { name: "噬血蝙蝠", hp: 40, atk: 8, drop: "獸皮" },
        { name: "荒野毒蜂", hp: 60, atk: 15, drop: "精血" },
        { name: "赤練蛇", hp: 120, atk: 25, drop: "精血" },
        { name: "幽冥白虎", hp: 400, atk: 70, drop: "妖丹" },
        { name: "築基修士", hp: 1000, atk: 160, drop: "妖丹" }
    ];
    const weapons = [
        { name: "精鋼長劍", mult: 1.5, price: 300 },
        { name: "寒鐵重劍", mult: 2.2, price: 800 },
        { name: "青蓮道劍", mult: 4.5, price: 3500 }
    ];
    const armors = [
        { name: "皮甲", def: 0.15, price: 250 },
        { name: "玄鐵重鎧", def: 0.35, price: 900 },
        { name: "五行寶甲", def: 0.70, price: 6000 }
    ];
    const shoes = [
        { name: "疾風靴", escapeRate: 0.4, price: 500 },
        { name: "踏空履", escapeRate: 0.6, price: 1500 },
        { name: "縮地成寸靴", escapeRate: 0.85, price: 5000 }
    ];
    const allSkills = [
        { name: "烈焰咒", mult: 2.5, cost: 10 },
        { name: "奔雷疾", mult: 2.0, cost: 8 },
        { name: "金剛經", mult: 1.5, cost: 12 }
    ];

    const SAVE_KEY = "xiuxian_save_blue_saint_v4";

    function save() { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
    function load() {
        const data = localStorage.getItem(SAVE_KEY);
        if (data) {
            state = JSON.parse(data);
            if(state.hasInitialSkill) document.getElementById('start-skill-overlay').style.display = 'none';
            updateDisplay();
        }
    }

    function addLog(msg) {
        const log = document.getElementById('log');
        const entry = document.createElement('div');
        entry.innerHTML = `> ${msg}`;
        log.appendChild(entry);
        log.scrollTop = log.scrollHeight;
    }

    function checkDeath(reason) {
        if (state.hp <= 0) {
            state.hp = 0; updateDisplay();
            document.getElementById('death-reason').innerText = reason;
            document.getElementById('death-screen').style.display = 'flex';
            return true;
        }
        return false;
    }

    function updateDisplay() {
        document.getElementById('money').innerText = state.money;
        document.getElementById('shop-money').innerText = state.money;
        let displayRealm = realms[state.realmIndex];
        if (state.isDemon) displayRealm = `<span style="color:#ff4444;">(魔)</span> ${displayRealm}`;
        document.getElementById('realm').innerHTML = displayRealm;
        document.getElementById('hp').innerText = Math.ceil(state.hp);
        document.getElementById('maxHp').innerText = state.maxHp;
        document.getElementById('mp').innerText = Math.ceil(state.mp);
        document.getElementById('maxMp').innerText = state.maxMp;
        document.getElementById('exp').innerText = Math.floor(state.exp);
        document.getElementById('maxExp').innerText = Math.floor(state.maxExp);
        let currentAtk = Math.ceil(state.atk * state.currentWeapon.mult);
        document.getElementById('atk').innerText = state.realmIndex >= 6 ? "∞" : currentAtk;
        document.getElementById('weapon-name').innerText = state.currentWeapon.name;
        document.getElementById('weapon-info').innerText = `倍率: ${state.currentWeapon.mult}x`;
        document.getElementById('armor-name').innerText = state.currentArmor.name;
        document.getElementById('armor-info').innerText = `減傷: ${Math.round(state.currentArmor.def * 100)}%`;
        document.getElementById('shoe-name').innerText = state.currentShoe.name;
        document.getElementById('shoe-info').innerText = `逃跑: ${Math.round(state.currentShoe.escapeRate * 100)}%`;
        document.getElementById('spirit').innerText = state.isDemon ? "墮入魔道" : state.spiritType;
        document.getElementById('spirit-info').innerText = state.isDemon ? "魔道附身：傷害翻倍，突破凶險！" : state.spiritDesc;
        document.getElementById('loot-list').innerText = `妖丹x${state.loot["妖丹"]}, 獸皮x${state.loot["獸皮"]}, 精血x${state.loot["精血"]}`;
        document.getElementById('potion-count').innerText = state.potions;
        document.getElementById('use-potion-btn').disabled = state.potions <= 0;
        if(isInBattle && enemy) {
            document.getElementById('enemy-hp').innerText = Math.max(0, Math.ceil(enemy.hp));
            document.getElementById('enemy-atk').innerText = Math.ceil(enemy.atk);
        }
        let sList = state.mySkills.map((s, i) => 
            `<span onclick="Game.setSkill(${i})" style="cursor:pointer; border:1px solid ${i===state.currentSkillIndex?'#ffd700':'#444'}; padding:2px; margin-right:5px; font-size:11px;">${s.name}</span>`
        ).join("");
        document.getElementById('skill-list-ui').innerHTML = "神通庫：" + sList;
    }

    return {
        init: function() { load(); },

        // --- 核心操作 ---
        pickInitialSkill: function(idx) {
            state.mySkills.push(allSkills[idx]);
            state.hasInitialSkill = true;
            addLog(`<span style="color:#ffd700;">✨ 葉大仙贈予你草鞋與功法。</span>`);
            state.currentShoe = { name: "草鞋", escapeRate: 0.25, price: 0 };
            document.getElementById('start-skill-overlay').style.display='none';
            const spirits = [{ n: "金", d: "攻擊力 +5", m: 1.2 }, { n: "木", d: "氣血上限 +50", m: 1.2 }, { n: "天靈根", d: "修煉 250%", m: 2.5 }];
            let s = spirits[Math.floor(Math.random() * spirits.length)];
            state.spiritType = s.n; state.trainMult = s.m; state.spiritDesc = s.d;
            if(s.n === "金") state.baseAtk += 5;
            if(s.n === "木") { state.maxHp += 50; state.hp = state.maxHp; }
            state.atk = state.baseAtk;
            updateDisplay(); save();
        },

        train: function() {
            if(state.exp >= state.maxExp) return addLog("瓶頸已至，請速速突破！");
            let gainExp = Math.floor(20 * (state.isDemon ? 2.0 : 1.0) * state.trainMult);
            state.exp = Math.min(state.maxExp, state.exp + gainExp);
            state.mp = Math.min(state.maxMp, state.mp + 10);
            state.hp -= 5;
            addLog(`🧘 納氣中... 修為 +${gainExp}`);
            if (checkDeath("走火入魔。")) return;
            updateDisplay(); save();
        },

        breakthrough: function() {
            if(state.exp < state.maxExp) return addLog("修為不足。");
            if(state.realmIndex === 5) {
                addLog(`<span style="color:red;">🔥 警告：心魔顯現！</span>`);
                state.isFacingInnerDemon = true; isInBattle = true;
                enemy = { name: "心魔", hp: 3000, atk: 220, drop: "無" };
                document.getElementById('main-btns').style.display = 'none';
                document.getElementById('battle-btns').style.display = 'grid';
                document.getElementById('battle-panel').style.display = 'block';
                document.getElementById('enemy-name').innerText = enemy.name;
                updateDisplay(); return;
            }
            if(Math.random() > 0.4) {
                state.realmIndex++; state.exp=0; state.maxExp*=2.5; 
                state.baseAtk += 15; state.atk = state.baseAtk;
                document.getElementById('advance-overlay').style.display = 'flex';
                addLog(`<span class="log-win">🎊 成功晉升！</span>`);
            } else {
                state.exp -= Math.floor(state.exp * 0.3); state.hp -= 30;
                addLog(`💥 突破失敗！修為倒退。`);
                checkDeath("突破反噬。");
            }
            updateDisplay(); save();
        },

        // --- 戰鬥與探險 ---
        startAdventure: function() {
            if(state.hp < 20) return addLog("氣血虛弱。");
            let r = Math.random();
            if(r < 0.6) {
                isInBattle = true;
                let m = monsters[Math.min(state.realmIndex, monsters.length-1)];
                enemy = { ...m, hp: m.hp + state.realmIndex*50, atk: m.atk + state.realmIndex*20 };
                document.getElementById('main-btns').style.display = 'none';
                document.getElementById('battle-btns').style.display = 'grid';
                document.getElementById('battle-panel').style.display = 'block';
                document.getElementById('enemy-name').innerText = enemy.name;
                addLog(`⚔️ 遭遇妖獸【${enemy.name}】！`);
            } else if(r < 0.85) { this.renderShop(); document.getElementById('shop-overlay').style.display = 'flex'; }
            else { 
                if (Math.random() < 0.2) this.triggerQiaoQiaoEvent();
                else { state.money += 50; addLog(`🍀 撿到 靈石 +50`); }
            }
            updateDisplay(); save();
        },

        triggerQiaoQiaoEvent: function() {
            let roll = Math.random() * 100;
            let skill = (roll < 45) ? { name: "金剛不壞童子身", type: "passive" } : 
                        (roll < 90) ? { name: "鬥破山河焚仙訣", type: "passive" } : { name: "彭大仙滅世功法", type: "active", cost: 0 };
            if (state.mySkills.some(s => s.name === skill.name)) {
                state.potions += 1; addLog(`<span class="log-qiaoqiao">🌸 蕎蕎：「師兄給你藥！」</span>`);
            } else {
                state.mySkills.push(skill); addLog(`<span class="log-divine">✨ 獲得神功：【${skill.name}】！</span>`);
            }
            updateDisplay(); save();
        },

        attackEnemy: function() {
            let d = Math.ceil(state.atk * state.currentWeapon.mult * (state.isDemon?2:1) * (0.9 + Math.random()*0.2));
            enemy.hp -= d; addLog(`🗡️ 造成 ${d} 傷害。`);
            if(enemy.hp <= 0) this.winBattle(); else this.enemyTurn();
        },

        castCurrentSpell: function() {
            let s = state.mySkills[state.currentSkillIndex];
            if(s.type === "passive") return addLog("這是被動技能。");
            if(s.name === "彭大仙滅世功法") { addLog(`<span style="color:red;">🔥 施展捨命一擊！</span>`); state.hp = 1; enemy.hp = 0; this.winBattle(); return; }
            if(state.mp < (s.cost || 0)) return addLog("靈力不足。");
            state.mp -= (s.cost || 0);
            let d = Math.ceil(state.atk * state.currentWeapon.mult * 2.5);
            enemy.hp -= d; addLog(`🔥 施展【${s.name}】，造成 ${d} 傷害！`);
            if(enemy.hp <= 0) this.winBattle(); else this.enemyTurn();
        },

        escapeBattle: function() {
            if(state.isFacingInnerDemon) return addLog("心魔戰無法逃跑！");
            if(Math.random() < state.currentShoe.escapeRate + 0.1) {
                addLog(`💨 逃跑成功！`); this.endBattle();
            } else { addLog(`❌ 逃跑失敗！`); this.enemyTurn(); }
        },

        enemyTurn: function() {
            let d = Math.ceil(enemy.atk * (1 - state.currentArmor.def));
            state.hp -= d; addLog(`👹 反擊造成 ${d} 傷害。`);
            if (checkDeath("力戰而亡。")) return;
            updateDisplay(); save();
        },

        winBattle: function() {
            if(state.isFacingInnerDemon) return this.triggerEnding();
            state.money += 200; addLog(`🏆 戰勝！靈石 +200`);
            this.endBattle();
        },

        // --- 商店與系統 ---
        buyItem: function(type, idx) {
            let item = (type==='weapon') ? weapons[idx] : (type==='armor') ? armors[idx] : (type==='shoe') ? shoes[idx] : {name:"大還丹", price:100};
            if(state.money < item.price) return addLog("靈石不足！");
            state.money -= item.price;
            if(type==='weapon') state.currentWeapon = item;
            else if(type==='armor') state.currentArmor = item;
            else if(type==='shoe') state.currentShoe = item;
            else state.potions++;
            addLog(`🛍️ 買到 ${item.name}。`);
            updateDisplay(); save();
        },

        restartGame: function() {
            localStorage.removeItem(SAVE_KEY);
            location.reload();
        },

        triggerEnding: function() {
            state.realmIndex = 6; state.atk = 999999;
            document.getElementById('advance-overlay').style.display = 'flex';
            document.getElementById('advance-title').innerText = "🎉 藍聖成仙！";
            this.endBattle();
        },

        endBattle: function() {
            isInBattle = false;
            document.getElementById('main-btns').style.display = 'grid';
            document.getElementById('battle-btns').style.display = 'none';
            document.getElementById('battle-panel').style.display = 'none';
            updateDisplay(); save();
        },

        renderShop: function() {
            let bList = document.getElementById('shop-items-list');
            bList.innerHTML = "";
            weapons.forEach((w,i) => { if(i <= state.realmIndex) bList.innerHTML += `<div class="shop-item" onclick="Game.buyItem('weapon',${i})"><span>🗡️ ${w.name}</span><b>${w.price}</b></div>`; });
            armors.forEach((a,i) => { if(i <= state.realmIndex) bList.innerHTML += `<div class="shop-item" onclick="Game.buyItem('armor',${i})"><span>🛡️ ${a.name}</span><b>${a.price}</b></div>`; });
            bList.innerHTML += `<div class="shop-item" onclick="Game.buyItem('potion',0)"><span>💊 大還丹</span><b>100</b></div>`;
        },

        rest: function() { state.mp = state.maxMp; addLog(`😴 靈力補滿。`); updateDisplay(); save(); },
        setSkill: function(idx) { state.currentSkillIndex = idx; updateDisplay(); },
        closeShop: function() { document.getElementById('shop-overlay').style.display = 'none'; },
        choosePath: function(t) { if(t==='body') state.maxHp+=100; else state.maxMp+=50; state.hp=state.maxHp; document.getElementById('advance-overlay').style.display='none'; updateDisplay(); save(); }
    };
})();

Game.init();