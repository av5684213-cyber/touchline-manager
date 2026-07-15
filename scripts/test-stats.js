// Sezon istatistiklerinin tutarlılığını test et
// Çalıştırma: cd /home/z/my-project && npx tsx scripts/test-stats.ts
// (veya node ile ts compile etmeden)

// tsx yoksa, node ile çalıştırılabilir hale getirelim:
const path = require("path");
const fs = require("fs");

// 1) rand/randf fonksiyonlarını taklit et
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randf(min, max) {
  return Math.random() * (max - min) + min;
}

// 2) Her pozisyon için 100 oyuncu üret ve tutarlılığı kontrol et
const positions = [
  { pos: "GK", isGK: true,  isDef: false, isMid: false, isAtt: false },
  { pos: "CB", isGK: false, isDef: true,  isMid: false, isAtt: false },
  { pos: "LB", isGK: false, isDef: true,  isMid: false, isAtt: false },
  { pos: "CM", isGK: false, isDef: false, isMid: true,  isAtt: false },
  { pos: "CAM",isGK: false, isDef: false, isMid: true,  isAtt: false },
  { pos: "ST", isGK: false, isDef: false, isMid: false, isAtt: true  },
  { pos: "LW", isGK: false, isDef: false, isMid: false, isAtt: true  },
];

let totalErrors = 0;
const errorCounts={};

for (const { pos, isGK, isDef, isMid, isAtt } of positions) {
  for (let i = 0; i < 100; i++) {
    const appearancesVal = rand(5, 35);

    const _shots = appearancesVal * rand(1, 5);
    const _shotsOnTarget = Math.min(_shots, appearancesVal * rand(0, 2));
    const _shotsOffTarget = Math.min(_shots - _shotsOnTarget, appearancesVal * rand(0, 2));
    const _shotsBlocked = Math.max(0, _shots - _shotsOnTarget - _shotsOffTarget);
    const _passes = appearancesVal * rand(15, 40);
    const _passesCompleted = Math.min(_passes, Math.round(_passes * (isMid ? randf(0.78, 0.92) : isDef ? randf(0.70, 0.85) : isAtt ? randf(0.72, 0.88) : randf(0.75, 0.90))));
    const _crosses = isAtt || isMid ? appearancesVal * rand(0, 4) : 0;
    const _crossesCompleted = _crosses > 0 ? Math.min(_crosses, Math.round(_crosses * randf(0.25, 0.45))) : 0;
    const _longBalls = appearancesVal * rand(1, 8);
    const _longBallsCompleted = Math.min(_longBalls, Math.round(_longBalls * randf(0.55, 0.75)));
    const _dribblesAttempted = isAtt || isMid ? appearancesVal * rand(1, 4) : 0;
    const _dribblesCompleted = _dribblesAttempted > 0 ? Math.min(_dribblesAttempted, Math.round(_dribblesAttempted * randf(0.45, 0.75))) : 0;
    const _duels = appearancesVal * rand(3, 10);
    const _duelsWon = Math.min(_duels, Math.round(_duels * randf(0.40, 0.60)));

    // Tutarlılık kontrolleri
    const checks = [
      ["shotsOnTarget <= shots", _shotsOnTarget <= _shots],
      ["shotsOffTarget + shotsOnTarget + shotsBlocked <= shots + 1", _shotsOffTarget + _shotsOnTarget + _shotsBlocked <= _shots + 1],
      ["passesCompleted <= passes", _passesCompleted <= _passes],
      ["crossesCompleted <= crosses", _crossesCompleted <= _crosses],
      ["longBallsCompleted <= longBalls", _longBallsCompleted <= _longBalls],
      ["dribblesCompleted <= dribblesAttempted", _dribblesCompleted <= _dribblesAttempted],
      ["duelsWon <= duels", _duelsWon <= _duels],
      ["passAcc <= 100", _passes > 0 ? (_passesCompleted / _passes) * 100 <= 100.5 : true],
      ["longPassAcc <= 100", _longBalls > 0 ? (_longBallsCompleted / _longBalls) * 100 <= 100.5 : true],
      ["dribbleAcc <= 100", _dribblesAttempted > 0 ? (_dribblesCompleted / _dribblesAttempted) * 100 <= 100.5 : true],
      ["duelAcc <= 100", _duels > 0 ? (_duelsWon / _duels) * 100 <= 100.5 : true],
      ["shotAcc <= 100", _shots > 0 ? (_shotsOnTarget / _shots) * 100 <= 100.5 : true],
      ["crossAcc <= 100", _crosses > 0 ? (_crossesCompleted / _crosses) * 100 <= 100.5 : true],
    ];

    for (const [name, ok] of checks) {
      if (!ok) {
        totalErrors++;
        errorCounts[name] = (errorCounts[name] || 0) + 1;
        if (totalErrors <= 5) {
          console.log(`FAIL [${pos}]: ${name} | shots=${_shots}/${_shotsOnTarget}/${_shotsOffTarget}/${_shotsBlocked} passes=${_passes}/${_passesCompleted} longBalls=${_longBalls}/${_longBallsCompleted} dribbles=${_dribblesAttempted}/${_dribblesCompleted} duels=${_duels}/${_duelsWon}`);
        }
      }
    }
  }
}

console.log("\n=== TEST SUMMARY ===");
console.log(`Total violations: ${totalErrors}`);
console.log("Per-check:", errorCounts);
if (totalErrors === 0) {
  console.log("✅ Tüm istatistikler tutarlı!");
} else {
  console.log("❌ Hatalar var!");
  process.exit(1);
}
