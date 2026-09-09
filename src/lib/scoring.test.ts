import { scoreScale, scoreAll, reverseCode, SCORING_SPECS, RawResponses } from "./scoring";

let pass = 0;
let fail = 0;
function check(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : `  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`}`);
  ok ? pass++ : fail++;
}
const spec = (id: string) => SCORING_SPECS.find((s) => s.scale_id === id)!;

// 1. Reverse-code formula on a 1-7 scale: 2 -> 6
check("reverseCode 1-7: 2 -> 6", reverseCode(2, { min: 1, max: 7 }), 6);
check("reverseCode 1-5: 1 -> 5", reverseCode(1, { min: 1, max: 5 }), 5);

// 2. TIPI extraversion: tipi_1=6, tipi_6_r=2 (reversed to 6) -> mean(6,6)=6
check("TIPI extraversion reverse+mean", scoreScale({ tipi_1: 6, tipi_6_r: 2 }, spec("tipi")).tipi_extraversion, 6);

// 3. TIPI dimension with one item missing -> null (maxPropMissing=0)
check("TIPI 2-item, one missing -> null", scoreScale({ tipi_1: 6 }, spec("tipi")).tipi_extraversion, null);

// 4. SWLS sum, all present: 5+6+7+4+3 = 25
check("SWLS sum", scoreScale({ swls_1: 5, swls_2: 6, swls_3: 7, swls_4: 4, swls_5: 3 }, spec("swls")).swls_total, 25);

// 5. SWLS with 1 of 5 missing (0.2, allowed), prorated: present mean * 5
//    present = 5,6,7,4 -> mean 5.5 -> *5 = 27.5
check("SWLS prorated sum (1 missing)", scoreScale({ swls_1: 5, swls_2: 6, swls_3: 7, swls_4: 4 }, spec("swls")).swls_total, 27.5);

// 6. SWLS with 2 of 5 missing (0.4 > 0.2) -> null
check("SWLS too much missing -> null", scoreScale({ swls_1: 5, swls_2: 6, swls_3: 7 }, spec("swls")).swls_total, null);

// 7. SPANE: all positive=4 (sum 24), all negative=2 (sum 12), balance = 12
const spaneResp: RawResponses = {
  spane_pos_1: 4, spane_pos_2: 4, spane_pos_3: 4, spane_pos_4: 4, spane_pos_5: 4, spane_pos_6: 4,
  spane_neg_1: 2, spane_neg_2: 2, spane_neg_3: 2, spane_neg_4: 2, spane_neg_5: 2, spane_neg_6: 2,
};
const spaneScores = scoreScale(spaneResp, spec("spane"));
check("SPANE positive sum", spaneScores.spane_p, 24);
check("SPANE negative sum", spaneScores.spane_n, 12);
check("SPANE balance = P - N", spaneScores.spane_balance, 12);

// 8. MVS reverse item: mvs_ss_3_r raw=1 on 1-5 -> coded 5. Success subscale
//    items: ss_1..6 with ss_3_r and ss_6_r reversed.
//    raw: 5,5,1,5,5,1 -> coded: 5,5,5,5,5,5 -> mean 5
const mvsResp: RawResponses = {
  mvs_ss_1: 5, mvs_ss_2: 5, mvs_ss_3_r: 1, mvs_ss_4: 5, mvs_ss_5: 5, mvs_ss_6_r: 1,
};
check("MVS success reverse+mean = 5", scoreScale(mvsResp, spec("mvs")).mvs_success, 5);

// 9. PES reverse item pes_5_r raw=1 on 1-7 -> coded 7; all others 7 -> mean 7
const pesResp: RawResponses = {
  pes_1: 7, pes_2: 7, pes_3: 7, pes_4: 7, pes_5_r: 1, pes_6: 7, pes_7: 7, pes_8: 7, pes_9: 7,
  smallself_1: 3, smallself_2: 5,
};
const smpes = scoreScale(pesResp, spec("small_pes"));
check("PES reverse+mean = 7", smpes.pes_total, 7);
check("Small Self kept separate (mean 3,5 = 4)", smpes.small_self, 4);

// 10. scoreAll merges across scales without collision
const merged = scoreAll({ ...spaneResp, swls_1: 5, swls_2: 5, swls_3: 5, swls_4: 5, swls_5: 5 }, SCORING_SPECS);
check("scoreAll includes spane_balance and swls_total", [merged.spane_balance, merged.swls_total], [12, 25]);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
