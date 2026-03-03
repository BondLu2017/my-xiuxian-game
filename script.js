const Game = (function() {
    // === 核心私有數據 (Console 抓不到) ===
    let state = {
        exp: 0, maxExp: 100, money: 100, hp: 100, maxHp: 100, 
        mp: 50, maxMp: 50, atk: 15, realmIndex: 0,
        spiritType: "", spiritDesc: "", trainMult: 1.0,
        potions: 0, currentSkillIndex: 0,
        loot: { "妖丹": 0, "獸皮": 0, "精血": 0 },
        mySkills: [],
        currentWeapon: { name: "生鏽鐵劍", mult: 1.0, price: 0 },
        currentArmor: { name: "布衣", def: 0, price: 0 },
        hasInitialSkill: false 
    };

    let isInBattle = false;
    let enemy = null;

    // 遊戲常數設定
    const realms = ["凡人", "煉氣前期", "煉氣中期", "煉氣後期", "築基期", "金丹大能"];
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
    const allSkills = [
        { name: "烈焰咒", mult: 2.5, cost: 10 },
        { name: "奔雷疾", mult: 2.0, cost: 8 },
        { name: "金剛經", mult: 1.5, cost: 12 }
    ];

    // === 存檔系統 ===
    const SAVE_KEY = "xiuxian_save_data_pro";

    function save() {
        localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    }

    function load() {
        const data = localStorage.getItem(SAVE_KEY);
        if (data) {
            state = JSON.parse(data);
            if(state.hasInitialSkill) {
                document.getElementById('start-skill-overlay').style.display = 'none';
                addLog("<span class='log-win'>✨ 往世因果覺醒，修為已恢復。</span>");
            }
            updateDisplay();
        }
    }

    // === 內部私有函數 ===
    function addLog(msg) {
        const log = document.getElementById('log');
        log.innerHTML += `> ${msg}<br>`;
        log.scrollTop = log.scrollHeight;
    }

    function checkDeath(reason) {
        if (state.hp <= 0) {
            state.hp = 0; updateDisplay();
            document.getElementById('death-reason').innerText = reason;
            document.getElementById('death-screen').style.display = 'flex';
            localStorage.removeItem(SAVE_KEY); // 死亡清除存檔
            return true;
        }
        return false;
    }

    function updateDisplay() {
        document.getElementById('realm').innerText = realms[state.realmIndex];
        document.getElementById('hp').innerText = Math.ceil(state.hp);
        document.getElementById('maxHp').innerText = state.maxHp;
        document.getElementById('mp').innerText = Math.ceil(state.mp);
        document.getElementById('maxMp').innerText = state.maxMp;
        document.getElementById('money').innerText = state.money;
        document.getElementById('exp').innerText = Math.floor(state.exp);
        document.getElementById('maxExp').innerText = Math.floor(state.maxExp);
        document.getElementById('spirit').innerText = state.spiritType;
        document.getElementById('spirit-info').innerText = state.spiritDesc;
        document.getElementById('weapon-name').innerText = state.currentWeapon.name;
        document.getElementById('weapon-info').innerText = `倍率: ${state.currentWeapon.mult}x`;
        document.getElementById('armor-name').innerText = state.currentArmor.name;
        document.getElementById('armor-info').innerText = `減傷: ${Math.round(state.currentArmor.def*100)}%`;
        document.getElementById('loot-list').innerText = `妖丹x${state.loot["妖丹"]}, 獸皮x${state.loot["獸皮"]}, 精血x${state.loot["精血"]}`;
        document.getElementById('potion-count').innerText = state.potions;
        document.getElementById('use-potion-btn').disabled = state.potions <= 0;
        
        if(isInBattle && enemy) {
            document.getElementById('enemy-hp').innerText = Math.max(0, Math.ceil(enemy.hp));
        }

        let sList = state.mySkills.map((s, i) => 
            `<span onclick="Game.setSkill(${i})" style="cursor:pointer; border:1px solid ${i===state.currentSkillIndex?'#ffd700':'#444'}; padding:2px; margin-right:5px;">${s.name}</span>`
        ).join("");
        document.getElementById('skill-list-ui').innerHTML = "神通庫：" + sList;
    }

    // === 暴露接口 ===
    return {
        init: function() { load(); },

        pickInitialSkill: function(idx) {
            state.mySkills.push(allSkills[idx]);
            state.hasInitialSkill = true;
            document.getElementById('start-skill-overlay').style.display='none';
            const spirits = [
                { n: "金", d: "【金】：攻擊力 +5", m: 1.2 },
                { n: "木", d: "【木】：氣血上限 +50", m: 1.2 },
                { n: "水", d: "【水】：靈力回復加快", m: 1.2 },
                { n: "火", d: "【火】：神通傷害 +15%", m: 1.2 },
                { n: "土", d: "【土】：天生減傷 10%", m: 1.2 },
                { n: "天靈根", d: "【天】：修煉速度 250%", m: 2.5 }
            ];
            let s = spirits[Math.floor(Math.random() * spirits.length)];
            state.spiritType = s.n; state.trainMult = s.m; state.spiritDesc = s.d;
            if(s.n === "金") state.atk += 5;
            if(s.n === "木") { state.maxHp += 50; state.hp = state.maxHp; }
            if(s.n === "土") state.currentArmor.def += 0.1;
            addLog(`<span class="log-win">✨ 靈根感應：${s.d}！</span>`);
            updateDisplay(); save();
        },

        train: function() {
            if(state.exp >= state.maxExp) return addLog("瓶頸已至，請先突破！");
            let gainExp = Math.floor(20 * state.trainMult);
            let gainMp = (state.spiritType==="水"?20:10);
            state.exp = Math.min(state.maxExp, state.exp + gainExp);
            state.mp = Math.min(state.maxMp, state.mp + gainMp);
            state.hp -= 5;
            addLog(`🧘 納氣中... <span class="val-exp">修為 +${gainExp}</span>, <span class="val-mp">靈力 +${gainMp}</span>, <span class="val-down">氣血 -5</span>`);
            if (checkDeath("你強行修煉導致走火入魔。")) return;
            updateDisplay(); save();
        },

        breakthrough: function() {
            if(state.exp < state.maxExp) return addLog("修為不足。");
            if(Math.random() > 0.4) {
                state.realmIndex++; state.exp=0; state.maxExp*=2.5; state.atk+=20; state.maxHp+=50; state.hp=state.maxHp;
                addLog(`<span class="log-win">🎊 成功晉升至【${realms[state.realmIndex]}】！</span>`);
            } else {
                let loseExp = Math.floor(state.exp * 0.3);
                state.exp -= loseExp; state.hp -= 30;
                addLog(`💥 突破失敗！<span class="val-down">修為 -${loseExp}</span>, <span class="val-down">氣血 -30</span>`);
                if (checkDeath("突破反噬，身死道消。")) return;
            }
            updateDisplay(); save();
        },

        startAdventure: function() {
            if(state.hp < 20) return addLog("氣血虛弱，不敢外出。");
            let r = Math.random();
            if(r < 0.6) {
                // 進入戰鬥
                isInBattle = true;
                let m = monsters[Math.min(state.realmIndex, monsters.length-1)];
                enemy = { ...m, hp: m.hp + state.realmIndex*50, atk: m.atk + state.realmIndex*20 };
                document.getElementById('main-btns').style.display = 'none';
                document.getElementById('battle-btns').style.display = 'grid';
                document.getElementById('battle-panel').style.display = 'block';
                document.getElementById('enemy-name').innerText = enemy.name;
                addLog(`⚔️ 遭遇妖獸【${enemy.name}】！`);
            } else if(r < 0.85) {
                // 開啟商店
                this.renderShop();
                document.getElementById('shop-overlay').style.display = 'flex';
                document.getElementById('shop-money').innerText = state.money;
            } else {
                // 隨機奇遇
                let chance = Math.random();
                if (chance < 0.5) {
                    state.money += 50;
                    addLog(`🍀 奇遇：撿到 <span class="log-win">靈石 +50</span>`);
                } else {
                    let heal = Math.floor(state.maxHp * 0.3);
                    state.hp = Math.min(state.maxHp, state.hp + heal);
                    addLog(`🍀 奇遇：飲用靈泉，<span class="val-up">氣血回復 ${heal}</span>`);
                }
            }
            updateDisplay(); save();
        },

        renderShop: function() {
            let bList = document.getElementById('shop-items-list');
            bList.innerHTML = "";
            // 武器
            weapons.forEach((w,i) => { 
                if(i <= state.realmIndex) 
                    bList.innerHTML += `<div class="shop-item" onclick="Game.buyItem('weapon',${i})"><span>🗡️ ${w.name}</span><b>${w.price} 靈石</b></div>`; 
            });
            // 防具
            armors.forEach((a,i) => { 
                if(i <= state.realmIndex) 
                    bList.innerHTML += `<div class="shop-item" onclick="Game.buyItem('armor',${i})"><span>🛡️ ${a.name}</span><b>${a.price} 靈石</b></div>`; 
            });
            // 丹藥
            bList.innerHTML += `<div class="shop-item" onclick="Game.buyItem('potion',0)"><span>💊 大還丹</span><b>100 靈石</b></div>`;
        },

        buyItem: function(type, idx) {
            let item = (type==='weapon') ? weapons[idx] : (type==='armor' ? armors[idx] : {name:"大還丹", price:100});
            if(state.money < item.price) return addLog("靈石不足！");
            state.money -= item.price;
            if(type==='weapon') state.currentWeapon = item;
            else if(type==='armor') state.currentArmor = item;
            else state.potions++;
            addLog(`🛍️ 購得 ${item.name}。`);
            document.getElementById('shop-money').innerText = state.money;
            updateDisplay(); save();
        },

        rest: function() {
            state.mp = state.maxMp; // 只回復靈力
            addLog(`😴 閉目小憩，<span class="val-mp">靈力已補滿</span>。氣血需靠藥物或奇遇。`); 
            updateDisplay(); save();
        },

        attackEnemy: function() {
            let d = Math.ceil(state.atk * state.currentWeapon.mult);
            enemy.hp -= d;
            addLog(`🗡️ 你發動攻擊，造成 <span class="val-up">${d}</span> 傷害。`);
            if(enemy.hp <= 0) { 
                let getMoney = 150 + state.realmIndex*50;
                state.money += getMoney; state.loot[enemy.drop]++; 
                addLog(`<span class="log-win">🏆 擊殺妖獸！靈石 +${getMoney}</span>`); 
                this.endBattle(); 
            } else this.enemyTurn();
        },

        enemyTurn: function() {
            let d = Math.ceil(enemy.atk * (1 - state.currentArmor.def));
            state.hp -= d;
            addLog(`👹 ${enemy.name} 反擊，造成 <span class="val-down">${d}</span> 傷害。`);
            if (checkDeath("你死於妖獸之口。")) return;
            updateDisplay(); save();
        },

        endBattle: function() {
            isInBattle = false;
            document.getElementById('main-btns').style.display = 'grid';
            document.getElementById('battle-btns').style.display = 'none';
            document.getElementById('battle-panel').style.display = 'none';
            updateDisplay(); save();
        },

        castCurrentSpell: function() {
            let s = state.mySkills[state.currentSkillIndex];
            if(state.mp < s.cost) return addLog("靈力不足。");
            state.mp -= s.cost;
            let d = Math.ceil(state.atk * state.currentWeapon.mult * s.mult * (state.spiritType === "火" ? 1.15 : 1));
            enemy.hp -= d;
            if(s.name === "金剛經") state.hp = Math.min(state.maxHp, state.hp + 25);
            addLog(`<span class="val-mp">-${s.cost}靈力</span> 施展【${s.name}】，造成 <span class="val-up">${d}</span> 傷害！`);
            if(enemy.hp <= 0) { 
                state.money += (150 + state.realmIndex*50); state.loot[enemy.drop]++; 
                addLog(`<span class="log-win">🏆 神通破敵！</span>`); 
                this.endBattle(); 
            } else this.enemyTurn();
        },

        sellAllLoot: function() {
            let e = state.loot["妖丹"]*150 + state.loot["獸皮"]*40 + state.loot["精血"]*60;
            state.money += e; state.loot = { "妖丹": 0, "獸皮": 0, "精血": 0 };
            addLog(`💰 獲得 <span class="val-up">靈石 +${e}</span>`);
            document.getElementById('shop-money').innerText = state.money;
            updateDisplay(); save();
        },

        usePotion: function() {
            if(state.potions > 0) {
                state.potions--; 
                let heal = Math.floor(state.maxHp * 0.5);
                state.hp = Math.min(state.maxHp, state.hp + heal);
                addLog(`💊 服用丹藥，<span class="val-up">氣血 +${heal}</span>`);
            }
            updateDisplay(); save();
        },

        setSkill: function(idx) { state.currentSkillIndex = idx; updateDisplay(); },
        closeShop: function() { document.getElementById('shop-overlay').style.display = 'none'; }
    };
})();

// 初始化啟動
Game.init();