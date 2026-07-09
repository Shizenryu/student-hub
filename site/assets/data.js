// Shizenryu Student Hub — ALL content lives here.
// Edit this file to add terms, kumite, maxims or flashcard decks.
// Schemas are documented in CLAUDE.md.

const TERMS = {
 1:[["Karate","Empty hand"],["Dojo","Training hall"],["Sensei","Teacher — 'one who has gone before'"],
    ["Kihon","Foundation / basic"],["Kumite","Meeting of hands"],["Kihon Kumite","Basic partner work"],
    ["Jun-zuki","Front punch"],["Gyaku-zuki","Reverse punch"],["Uchi-uke","Inside parry"],
    ["Gedan-uke","Lower parry"],["Mae-geri","Front kick"],["Yori ashi","Front foot slides first"],
    ["Tsugi ashi","Back foot slides first"]],
 2:[["Ayumi ashi","Step through to opposite side"],["Sonaba","On the spot"],["Nagashi","Slipping offline"],
    ["Mawashi-geri","Roundhouse kick"],["Yoko-geri","Side kick"],["Soto-uke","Outside parry"],
    ["Sekui-uke","Inside lower parry"],["Morote-uke","Double-arm shield"],["Uraken","Backfist"],
    ["Uke","To receive"],["Jodan","Upper level"],["Chudan","Middle level"],["Gedan","Lower level"]],
 3:[["Kagi-zuki","Hook punch"],["Tobikomi-zuki","Snap punch from a relaxed state"],["Teisho","Palm heel"],
    ["Age-empi","Rising elbow"],["Mawashi-empi","Circular elbow"],["Kaki-uke","Hook-hand parry"],
    ["Mawashi-uke","Circular parry"],["Ma-ai","Distance / range"],["Sen no sen","Intercepting as the attack begins"],
    ["Jiyu Kumite","Free play"],["Hansha Kumite","Contact reflex partner work"],["Kakie","Listening hands / push hands"],
    ["Tenti","Moving"],["Tentai","Twisting"],["Tengi","Attacking"]],
 4:[["Sanchin","Core kata — Sanchin boxing"],["Rokushu","Kata of grip releasing"],["Naifuanchin","Kata of grappling"],
    ["Ohyo Kumite","Variations on the kumite"],["Tui Shou","Pushing hands"],
    ["Hara","The centre — everything moves from it"],["Gassho","Palms together — salutation"],
    ["Kyu","Student grade"],["Dan","Black-belt degree"],["Mon","Junior tag grades"],
    ["Shodan","First degree — 'first step'"],["Nidan","Second degree"],["Sandan","Third degree"],
    ["Shihan","Master of instructors"],["Renshi","Polished / trained instructor"],
    ["Kyoshi","Teacher / expert"],["Hanshi","Model / grandmaster"]]
};

const MAXIMS = [
 "Once the kicking distance is closed, keep it closed.",
 "Combinations occur as a response to an opponent's actions, not because they are a favourite set of techniques.",
 "Control and strike the opponent at the same time.",
 "Openings are felt with contact, not seen with the eye.",
 "Seek control of your opponent's posture as a prerequisite to a counterattack.",
 "Always deflect, parry, cover, and trap. These defences are superior to direct blocks.",
 "Footwork and position are a major part of the battle in unbalancing and controlling an opponent.",
 "Everything moves from the hara.",
 "In defence, be like the dragonfly that perches on the stick raised to hit it.",
 "Full mastery of one technique is better than the incomplete mastery of two."
];

const KUMITE = [
 {n:1, side:"OS", belt:"9th Kyu",  steps:["jun-zuki","uchi-uke","gyaku-zuki"]},
 {n:2, side:"OS", belt:"8th Kyu",  steps:["mae-geri","gedan-uke","gyaku-zuki"]},
 {n:3, side:"SS", belt:"7th Kyu",  steps:["jun-zuki","nagashi soto-uke","gyaku-zuki"]},
 {n:4, side:"SS", belt:"7th Kyu",  steps:["mae-geri","sekui-uke","gyaku-zuki"]},
 {n:5, side:"OS", belt:"6th Kyu",  steps:["mawashi-geri","nagashi morote-uke","uraken","gyaku-zuki"]},
 {n:6, side:"SS", belt:"6th Kyu",  steps:["gedan mawashi-geri","shin block","jun-zuki","gyaku-zuki"]},
 {n:7, side:"SS", belt:"5th Kyu",  steps:["kagi-zuki","mawashi-uke","kagi-zuki"]},
 {n:8, side:"SS", belt:"5th Kyu",  steps:["kagi-zuki","jodan-uke","lock arm","teisho & takedown"]},
 {n:9, side:"SS", belt:"4th Kyu",  steps:["jun-zuki","kaki-uke","mae-geri","gyaku-zuki"]},
 {n:10,side:"OS", belt:"4th Kyu",  steps:["jun-zuki","sen no sen — nagashi-uke (rear hand)","tobikomi-zuki"]},
 {n:11,side:"SS", belt:"3rd Kyu",  steps:["crossed hand low grip (sword)","underhand grip & takedown"]},
 {n:12,side:"SS", belt:"3rd Kyu",  steps:["crossed hand grip (scabbard)","overhand grip & takedown"]}
];

const DECKS = [
 {id:'maxims', name:'The Maxims', cls:'d1', cards:[
  ["Once the kicking distance is closed…","…keep it closed."],
  ["When do combinations occur?","As a response to an opponent's actions — not because they are a favourite set of techniques."],
  ["What should happen at the same time as controlling the opponent?","Striking. Control and strike the opponent at the same time."],
  ["How are openings found?","Felt with contact — not seen with the eye."],
  ["What is the prerequisite to a counterattack?","Control of your opponent's posture."],
  ["Which defences are superior to direct blocks?","Deflect, parry, cover, and trap — always."],
  ["What plays a major part in unbalancing a committed attacker?","Footwork and position."],
  ["Why are dodging, ducking and weaving unnecessary?","They demand high stamina — and are not needed if the opponent's attacking limbs are properly controlled."],
  ["Where does everything move from?","The hara."],
  ["In defence, be like…","…the dragonfly that perches on the stick raised to hit it."],
  ["Full mastery of one technique is better than…","…the incomplete mastery of two."]
 ]},
 {id:'zen', name:'Zen & Karate', cls:'d2', cards:[
  ["Where does the word 'Zen' come from?","Japanese pronunciation of the Chinese 'Chan', from the Sanskrit 'dhyana' — meditation, contemplative absorption."],
  ["Who traditionally links meditation and martial practice at Shaolin?","Bodhidharma (Daruma in Japanese), said to have travelled from India to China and settled at the Shaolin Monastery."],
  ["Why is Zen taught by direct methods rather than discussion?","Zen is not an intellectual system — it is an experiential discipline. Its truths are better felt than explained."],
  ["What is the aim of Zen meditation?","Not escape from life, but liberation from fragmentation — reconciling our internal opposites."],
  ["What four pairs of opposites do the martial arts reconcile?","Stillness & movement · softness & hardness · yielding & force · mind & body."],
  ["If karate is not fundamentally about fighting, what is it about?","Self-mastery. The capacity to deal with conflict is a by-product of that deeper process."],
  ["Who is our greatest opponent?","Rarely another person — our own loss of equilibrium."],
  ["What is 'true training'?","The cultivation of control, awareness, and appropriate response. To react blindly requires no training at all."],
  ["Is Zen passive or pacifist?","No. Zen is not weakness or sentimental idealism — it points beyond emotional reactivity."],
  ["State the Zen ideal of action.","To do exactly what needs to be done, when it needs to be done."]
 ]},
 {id:'natural', name:'The Natural Way & Roots', cls:'d3', cards:[
  ["What does 'Shizen' mean?","Nature, natural, spontaneous — a state of being that is authentic, effortless, in harmony with its environment. A 'self-sown' philosophy."],
  ["Who suggested the name Shizenryu, and what did he provide?","Toru Takamizawa, one of Ian's last Japanese Wado-Ryu teachers — he provided the calligraphy."],
  ["Ryu, Ha, Do — distinguish them.","Ryu: style/school/path. Ha: a personal rendition of a Ryu. Do: the umbrella 'Way' — the Tao."],
  ["Name the three classical roots of Okinawan karate.","Shuri-te (quick, linear, agile), Naha-te (rooted, breath, close-range), Tomari-te (the bridge between them)."],
  ["Which three kata does Shizenryu treat as the root of the art?","Sanchin, Rokushu (Tensho), and Naifuanchin."],
  ["Translate Sanchin.","'Three conflicts' — at first, the battle of mind, body and spirit. Peel the onion and more is revealed."],
  ["Translate Naifuanchin.","'Internal divided conflict' — the grappling kata."],
  ["Translate Rokushu.","'Six hands' — five animals, plus the snake that grips you. The kata of grip releasing."],
  ["What did the old masters say about Sanchin?","All karate begins and ends with Sanchin. It is both basic and advanced — the lens to study every kata."],
  ["What geometry does Sanchin contain?","The circle, the triangle and the square — unity, through the triangle, to manifest form."],
  ["Why do old kata names carry numbers like 18, 36, 72, 108?","Buddhist sacred numbers — each reduces to 9 (1+8, 3+6, 7+2, 1+0+8). The older the kata, the more consistent the pattern."],
  ["What is kakedameshi?","An aggressive form of pushing hands preserved in Motobu-Ryu — possibly the original free-sparring of Okinawan karate."]
 ]},
 {id:'tuishou', name:'Tui Shou — Pushing Hands', cls:'d4', cards:[
  ["What gap does pushing hands bridge?","The gap between kata and spontaneous application."],
  ["What is its purpose?","To develop and maintain the ability to detect, redirect and counter force through tactile sensitivity and contact reflex."],
  ["How do the basic fixed drills neutralise force?","Turning at the waist, or transferring incoming force from one hand to the other — avoiding direct collision."],
  ["How does a smaller person deal with superior strength?","Yield, redirect, and return force efficiently — never collide with it."],
  ["Recite the pushing hands verse.","Yield to force / And bend its angle; / This will avoid / An ugly tangle."],
  ["What is the training progression after fixed drills?","Moving pushing hands → Sanchin boxing → Rokushu grip releasing → Naifuanchin grappling."],
  ["Why must these methods be developed without pre-arrangement?","Watching, thinking, then executing is too slow — pushing hands replaces the thinking formula with contact reflex."],
  ["What qualities does pushing hands cultivate?","Sensitivity, timing, balance, adaptability — the ability to cover, trap, neutralise and counter under pressure."],
  ["Why does close range matter for kata?","Only at close-contact distance can the hands-on methods within traditional kata be properly understood and applied in combination."]
 ]},
 {id:'needs', name:'The 6 Human Needs', cls:'d5', cards:[
  ["Name the six human needs.","Certainty · Uncertainty/Variety · Significance · Love/Connection · Growth · Contribution."],
  ["Which four are needs of the personality?","Certainty, variety, significance, love/connection — everyone must feel these are met, even if they lie to themselves to do so."],
  ["Which two are needs of the spirit?","Growth and contribution — not everyone finds a way to satisfy them, though they are necessary for lasting fulfilment."],
  ["Which need regulates all the others?","Contribution. Focused on giving, you gain certainty, variety, significance, connection and growth at once."],
  ["What happens when we stop growing?","'When we stop growing, we die.' Anything you want to remain in your life must be cultivated — or it degenerates."],
  ["What is the danger of over-focusing on significance?","Comparison focuses on differences — it blocks true connection with others. Used well, significance raises standards."],
  ["How does the dojo meet the need for certainty?","Structure: the etiquette, the same stretch in the same order, the discipline of repetition."],
  ["How does the dojo meet the need for variety?","The resisting partner, the new kumite, the permanent surprise of pushing hands."],
  ["A training plateau may signal which need has taken over?","Certainty — training has quietly become a comfort ritual. Growth requires deliberate uncertainty."]
 ]},
 {id:'grades', name:'Grades, Titles & Rank', cls:'d6', cards:[
  ["What does Shodan literally mean?","'First degree' — the first step. The black belt marks where real study begins, not where it ends."],
  ["Name Dan grades 1 to 5.","Shodan, Nidan, Sandan, Yondan, Godan."],
  ["Name Dan grades 6 to 10.","Rokudan, Shichidan (Nanadan), Hachidan, Kudan (Kyudan), Judan."],
  ["What does Sensei mean?","'Teacher' — one who has gone before. Typically applied to 1st–5th Dan."],
  ["Shihan?","Senior master instructor — 'master of instructors'. Often reserved for 4th Dan and above."],
  ["Renshi, Kyoshi, Hanshi — in order.","Renshi: polished/trained instructor. Kyoshi: advanced teacher/expert. Hanshi: model master/grandmaster (8th Dan+)."],
  ["What is Menkyo Kaiden?","'Licence of total transmission' — a classical master-to-disciple title bestowed by a founder, predating the kyu/dan system. Not a grade."],
  ["What does the Menkyo award mean in Shizenryu?","Custodianship — holder of the keys that unlock the physical, historical and spiritual code of the art. The research is ongoing."],
  ["Why did Zen Shorin Do cap grades at Godan?","A deliberate stand against rank inflation — following Harada's principle that there would never be higher than 5th Dan."],
  ["What are Mon grades?","Coloured tags for juniors — catching-up stages that bring Junior Shodan holders into full alignment with the adult syllabus by Nidan."]
 ]}
];
