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


// ---- Belt study pages ----
// GRADES: one entry per belt; tier links to TERMS; mind/maxim shown on the study page.
const GRADES = [
 {
  "slug": "9th-kyu",
  "key": "9th Kyu",
  "banner": "RED BELT \u00b7 9TH KYU",
  "hex": "#C8102E",
  "white": true,
  "tier": 1,
  "maxim": "Full mastery of one technique is better than the incomplete mastery of two.",
  "mind": "Welcome to the first step. In Shizenryu, karate is not fundamentally about fighting \u2014 it is a discipline of self-mastery. The ability to deal with conflict is a by-product of a deeper process: learning control, awareness, and appropriate response."
 },
 {
  "slug": "8th-kyu",
  "key": "8th Kyu",
  "banner": "ORANGE BELT \u00b7 8TH KYU",
  "hex": "#ED8B00",
  "white": false,
  "tier": 1,
  "maxim": "Everything moves from the hara.",
  "mind": "Training meets two of our deepest needs at once: certainty \u2014 the safety of structure, etiquette and repetition \u2014 and variety, the challenge that makes us feel alive. Let the routine of basics become your foundation, and let each new technique stretch you."
 },
 {
  "slug": "7th-kyu",
  "key": "7th Kyu",
  "banner": "YELLOW BELT \u00b7 7TH KYU",
  "hex": "#E3BC00",
  "white": false,
  "tier": 2,
  "maxim": "Footwork and position are a major part of the battle in unbalancing and controlling an opponent who is committed to attack.",
  "mind": "When we stop growing, we die. Anything you want to keep \u2014 your skill, your health, your confidence \u2014 must be cultivated and expanded, or it degenerates. Every class is a chance to grow a little; consistency beats intensity."
 },
 {
  "slug": "6th-kyu",
  "key": "6th Kyu",
  "banner": "GREEN BELT \u00b7 6TH KYU",
  "hex": "#00843D",
  "white": true,
  "tier": 2,
  "maxim": "Always deflect, parry, cover, and trap. These defences are superior to direct blocks.",
  "mind": "Significance, used well, raises your standards. Compare yourself to who you were last month, not to the person beside you. Hierarchies of better and worse disconnect us; shared practice connects us."
 },
 {
  "slug": "5th-kyu",
  "key": "5th Kyu",
  "banner": "BLUE BELT \u00b7 5TH KYU",
  "hex": "#0072CE",
  "white": true,
  "tier": 3,
  "maxim": "Openings are felt with contact, not seen with the eye.",
  "mind": "You now begin to touch the listening skills of Shizenryu. Pushing hands bridges the gap between kata and spontaneous application: learning to detect, redirect and counter force through tactile sensitivity rather than strength. Yield to force and bend its angle."
 },
 {
  "slug": "4th-kyu",
  "key": "4th Kyu",
  "banner": "PURPLE BELT \u00b7 4TH KYU",
  "hex": "#702F8A",
  "white": true,
  "tier": 3,
  "maxim": "Combinations occur as a response to an opponent's actions, not because they are a favourite set of techniques.",
  "mind": "The martial arts, in their highest form, reconcile apparent opposites: stillness and movement, softness and hardness, yielding and force, mind and body. These are not conflicting forces but complementary aspects of a unified whole."
 },
 {
  "slug": "3rd-kyu",
  "key": "3rd Kyu",
  "banner": "BROWN BELT \u00b7 3RD KYU",
  "hex": "#8B5A2B",
  "white": true,
  "tier": 4,
  "maxim": "Seek control of your opponent's posture as a prerequisite to a counterattack.",
  "mind": "Partner work at this level \u2014 takedowns, rolling, ground work \u2014 is built on trust and connection. You cannot learn to receive force from someone you don't trust, and they cannot learn from you unless you give them honest, controlled attacks."
 },
 {
  "slug": "2nd-kyu",
  "key": "2nd Kyu",
  "banner": "BROWN BELT \u00b7 2ND KYU",
  "hex": "#7A4A21",
  "white": true,
  "tier": 4,
  "maxim": "Control and strike the opponent at the same time.",
  "mind": "Contribution completes training. A life \u2014 and a dojo \u2014 is incomplete without giving back. Help the junior grades; teaching a technique is the fastest way to discover what you don't yet understand about it."
 },
 {
  "slug": "1st-kyu",
  "key": "1st Kyu",
  "banner": "BROWN BELT \u00b7 1ST KYU",
  "hex": "#6B3F1D",
  "white": true,
  "tier": 4,
  "maxim": "Once the kicking distance is closed, keep it closed.",
  "mind": "Our greatest opponent is rarely another person, but our own loss of equilibrium. Aggression, fear and the need to dominate are expressions of internal imbalance. True training is the cultivation of clear action free from unnecessary disturbance."
 },
 {
  "slug": "shodan",
  "key": "Shodan",
  "banner": "BLACK BELT \u00b7 SHODAN",
  "hex": "#1A1A1A",
  "white": true,
  "tier": 4,
  "maxim": "In defence, be like the dragonfly that perches on the stick raised to hit it.",
  "mind": "Shodan means 'first step'. The black belt is not the end of the path \u2014 it marks the point where real study begins. To do exactly what needs to be done, when it needs to be done: this is the standard you now train towards."
 },
 {
  "slug": "nidan",
  "key": "Nidan",
  "banner": "BLACK BELT \u00b7 NIDAN",
  "hex": "#1A1A1A",
  "white": true,
  "tier": 4,
  "maxim": "Dodging, ducking, and weaving require a high degree of physical stamina and are unnecessary if the opponent's attacking limbs are being properly controlled.",
  "mind": "Move beyond rigid models, habitual reactions and emotional compulsion. Respond with clarity and appropriateness. This applies equally to the smallest and largest acts in life \u2014 from a difficult decision to responding under pressure."
 },
 {
  "slug": "sandan",
  "key": "Sandan",
  "banner": "BLACK BELT \u00b7 SANDAN",
  "hex": "#1A1A1A",
  "white": true,
  "tier": 4,
  "maxim": "Structure > Discipline > Measure / Accountability = Growth",
  "mind": "Zen and karate are not separate disciplines. They are two expressions of the same pursuit: the integration of the divided self into harmonious action. Individual \u2014 indivisible duality."
 }
];

// SYLLABUS: every item, in syllabus order. track: 'All' | 'Adult' (over-16s only) | 'Junior'.
// Source: Syllabus 2026 — do not edit without checking against it.
const SYLLABUS = [
 {
  "grade": "9th Kyu",
  "track": "All",
  "section": "Stretch",
  "item": "Part 1",
  "detail": "Our normal class stretch"
 },
 {
  "grade": "9th Kyu",
  "track": "All",
  "section": "Mara",
  "item": "Mara 1 to 4",
  "detail": "Practice pulling back and also mae geri to change sides"
 },
 {
  "grade": "9th Kyu",
  "track": "All",
  "section": "Kihon",
  "item": "jun-zuki",
  "detail": "Basic front punch"
 },
 {
  "grade": "9th Kyu",
  "track": "All",
  "section": "Kihon",
  "item": "gyaku-zuki",
  "detail": "Basic reverse punch"
 },
 {
  "grade": "9th Kyu",
  "track": "All",
  "section": "Kihon",
  "item": "uchi-uke",
  "detail": "Practice using front hand and back hand"
 },
 {
  "grade": "9th Kyu",
  "track": "All",
  "section": "Kihon",
  "item": "mae-geri",
  "detail": "Basic front kick off rear leg (ayumi ashi)"
 },
 {
  "grade": "9th Kyu",
  "track": "All",
  "section": "Kihon",
  "item": "uchi-uke >> gyaku-zuki",
  "detail": "Basic inside parry, reverse punch"
 },
 {
  "grade": "9th Kyu",
  "track": "All",
  "section": "Kihon Kumite",
  "item": "Kumite 1 (OS)",
  "detail": "jun-zuki >>> uchi-uke >> gyaku-zuki"
 },
 {
  "grade": "9th Kyu",
  "track": "Adult",
  "section": "Sanchin",
  "item": "Opening & closing",
  "detail": "Gassho - dantian, as above, so below, split into a duality, return to one"
 },
 {
  "grade": "9th Kyu",
  "track": "Adult",
  "section": "Hansha Kumite",
  "item": "jun-zuki > reflex uchi-uke",
  "detail": "Trap hand, punch to cause a reflex parry from the non-trapped hand"
 },
 {
  "grade": "9th Kyu",
  "track": "Adult",
  "section": "Kakie",
  "item": "Walking - linear",
  "detail": "Connect, bed in, rotating palms. Willow leaf palm"
 },
 {
  "grade": "8th Kyu",
  "track": "All",
  "section": "Stretch",
  "item": "Part 1, 2",
  "detail": "Part 2 = neck, wrists, ankles, waist, shoulders"
 },
 {
  "grade": "8th Kyu",
  "track": "All",
  "section": "Mara",
  "item": "Mara 1 to 6",
  "detail": "Practice pulling back and also mae geri to change sides"
 },
 {
  "grade": "8th Kyu",
  "track": "All",
  "section": "Kihon",
  "item": "gedan-uke >> gyaku-zuki",
  "detail": "Lower parry, reverse punch"
 },
 {
  "grade": "8th Kyu",
  "track": "All",
  "section": "Kihon",
  "item": "yori ashi - jun-zuki",
  "detail": "Front foot moves forward - front punch"
 },
 {
  "grade": "8th Kyu",
  "track": "All",
  "section": "Kihon",
  "item": "tsugi ashi >> mae-geri",
  "detail": "Slide back foot to front foot - front kick"
 },
 {
  "grade": "8th Kyu",
  "track": "All",
  "section": "Kihon Kumite",
  "item": "Kumite 2 (OS)",
  "detail": "mae-geri >>> gedan-uke >> gyaku-zuki"
 },
 {
  "grade": "8th Kyu",
  "track": "Adult",
  "section": "Sanchin",
  "item": "Footwork - 3 steps forward & back",
  "detail": "Use body to open and close the gates (knees, ankles & feet)"
 },
 {
  "grade": "8th Kyu",
  "track": "Adult",
  "section": "Hansha Kumite",
  "item": "jun-zuki > reflex uchi-uke > uraken",
  "detail": "Trap and punch to cause reflex parry. Trap the parry and backfist"
 },
 {
  "grade": "8th Kyu",
  "track": "Adult",
  "section": "Kakie",
  "item": "Walking - circle stepping",
  "detail": "Add circle steps - cat, cross, cat. Inside and outside"
 },
 {
  "grade": "7th Kyu",
  "track": "All",
  "section": "Stretch",
  "item": "Part 1, 2, 3",
  "detail": "3 = standing one-leg balance stretch"
 },
 {
  "grade": "7th Kyu",
  "track": "All",
  "section": "Mara",
  "item": "Mara 1 to 8",
  "detail": ""
 },
 {
  "grade": "7th Kyu",
  "track": "All",
  "section": "Kihon",
  "item": "nagashi soto-uke >> gyaku-zuki",
  "detail": "Basic training for Kumite 3"
 },
 {
  "grade": "7th Kyu",
  "track": "All",
  "section": "Kihon",
  "item": "ayumi ashi >> jun-zuki",
  "detail": "Step-through front punch"
 },
 {
  "grade": "7th Kyu",
  "track": "All",
  "section": "Kihon",
  "item": "yori ashi - gyaku-zuki",
  "detail": "Front foot moves first"
 },
 {
  "grade": "7th Kyu",
  "track": "All",
  "section": "Kihon",
  "item": "mawashi-geri",
  "detail": "Roundhouse kick off the rear leg (ayumi ashi), slip to the side (nagashi)"
 },
 {
  "grade": "7th Kyu",
  "track": "All",
  "section": "Kihon",
  "item": "Sonaba mae-geri",
  "detail": "Kick on the spot - simple lift and kick in range"
 },
 {
  "grade": "7th Kyu",
  "track": "All",
  "section": "Kihon",
  "item": "sekui-uke >> gyaku-zuki",
  "detail": "Inside lower parry, reverse punch"
 },
 {
  "grade": "7th Kyu",
  "track": "All",
  "section": "Kihon Kumite",
  "item": "Kumite 3 (SS)",
  "detail": "jun-zuki >>> nagashi soto-uke >> gyaku-zuki"
 },
 {
  "grade": "7th Kyu",
  "track": "All",
  "section": "Kihon Kumite",
  "item": "Kumite 4 (SS)",
  "detail": "mae-geri >>> sekui-uke >> gyaku-zuki"
 },
 {
  "grade": "7th Kyu",
  "track": "Adult",
  "section": "Sanchin",
  "item": "Sanchin section 1",
  "detail": "Single limb coordination - isometric & isotonic"
 },
 {
  "grade": "7th Kyu",
  "track": "Adult",
  "section": "Hansha Kumite",
  "item": "uraken > reflex soto-uke > gyaku-zuki",
  "detail": "Use backfist to cause reflex parry - reverse punch"
 },
 {
  "grade": "7th Kyu",
  "track": "Adult",
  "section": "Kakie",
  "item": "Walking - bamboo step",
  "detail": "Keep steady connection. Partner should feel the different intention"
 },
 {
  "grade": "6th Kyu",
  "track": "All",
  "section": "Stretch",
  "item": "Part 1, 2, 3, 4",
  "detail": "4 = warrior and drop"
 },
 {
  "grade": "6th Kyu",
  "track": "All",
  "section": "Mara",
  "item": "Mara 1 to 10",
  "detail": ""
 },
 {
  "grade": "6th Kyu",
  "track": "All",
  "section": "Kihon",
  "item": "Nagashi mawashi-geri",
  "detail": "Chudan, gedan"
 },
 {
  "grade": "6th Kyu",
  "track": "All",
  "section": "Kihon",
  "item": "Yoko-geri",
  "detail": "Side kick off the rear leg (ayumi ashi), slip to the side (nagashi)"
 },
 {
  "grade": "6th Kyu",
  "track": "All",
  "section": "Kihon",
  "item": "Nagashi morote-uke",
  "detail": "Slipping and using double arm (low & high) shield"
 },
 {
  "grade": "6th Kyu",
  "track": "All",
  "section": "Kihon Kumite",
  "item": "Kumite 5 (OS)",
  "detail": "mawashi-geri >>> nagashi morote-uke >> uraken >> gyaku-zuki"
 },
 {
  "grade": "6th Kyu",
  "track": "All",
  "section": "Kihon Kumite",
  "item": "Kumite 6 (SS)",
  "detail": "gedan mawashi-geri >>> shin block >> jun-zuki >> gyaku-zuki"
 },
 {
  "grade": "6th Kyu",
  "track": "Adult",
  "section": "Sanchin",
  "item": "Sanchin section 2",
  "detail": "Add pelvic swivel. Can use floor to feel flat back and S back"
 },
 {
  "grade": "6th Kyu",
  "track": "Adult",
  "section": "Hansha Kumite",
  "item": "gyaku-zuki > reflex uke > kagi-zuki",
  "detail": "Reverse punch to cause reflex parry - hook punch"
 },
 {
  "grade": "6th Kyu",
  "track": "Adult",
  "section": "Kakie",
  "item": "Fixed push",
  "detail": "The core status quo. Get this right and the rest is much easier"
 },
 {
  "grade": "5th Kyu",
  "track": "All",
  "section": "Stretch",
  "item": "Part 1, 2, 3, 4, 5",
  "detail": ""
 },
 {
  "grade": "5th Kyu",
  "track": "All",
  "section": "Mara",
  "item": "Mara 1 to 12",
  "detail": ""
 },
 {
  "grade": "5th Kyu",
  "track": "All",
  "section": "Sanchin",
  "item": "Sanchin opening & closing",
  "detail": ""
 },
 {
  "grade": "5th Kyu",
  "track": "All",
  "section": "Kihon",
  "item": "Uke waza: uchi, soto, jodan, gedan, nagashi, sekui",
  "detail": "A flow drill for parrying and deflecting"
 },
 {
  "grade": "5th Kyu",
  "track": "All",
  "section": "Kihon",
  "item": "Mae-geri - ayumi ashi, tsugi ashi, sonaba",
  "detail": "Ma-ai (distance) to manage kicking range"
 },
 {
  "grade": "5th Kyu",
  "track": "All",
  "section": "Kihon",
  "item": "Uraken - tate > yoko > ushiro",
  "detail": "Understanding waza at various angles"
 },
 {
  "grade": "5th Kyu",
  "track": "All",
  "section": "Kihon Kumite",
  "item": "Kumite 7 (SS)",
  "detail": "kagi-zuki >>> mawashi-uke >> kagi-zuki"
 },
 {
  "grade": "5th Kyu",
  "track": "All",
  "section": "Kihon Kumite",
  "item": "Kumite 8 (SS)",
  "detail": "kagi-zuki >>> jodan-uke >> lock arm >> teisho & takedown"
 },
 {
  "grade": "5th Kyu",
  "track": "All",
  "section": "Jiyu Kumite",
  "item": "Free flow exchange",
  "detail": ""
 },
 {
  "grade": "5th Kyu",
  "track": "All",
  "section": "Hansha Kumite",
  "item": "jun-zuki > reflex uchi-uke",
  "detail": "Trap hand, punch to cause a reflex parry from the non-trapped hand"
 },
 {
  "grade": "5th Kyu",
  "track": "All",
  "section": "Kakie",
  "item": "Solo walking - linear",
  "detail": ""
 },
 {
  "grade": "5th Kyu",
  "track": "Adult",
  "section": "Sanchin",
  "item": "Sanchin section 3",
  "detail": "Samsau - coordinate 3 limbs at the same time. Clearly defined movement"
 },
 {
  "grade": "5th Kyu",
  "track": "Adult",
  "section": "Hansha Kumite",
  "item": "kagi-zuki > age-empi",
  "detail": "Hook to create uke reaction > split arms to penetrate centre"
 },
 {
  "grade": "5th Kyu",
  "track": "Adult",
  "section": "Kakie",
  "item": "1st Change",
  "detail": "Challenge the wrist at the centreline"
 },
 {
  "grade": "5th Kyu",
  "track": "Adult",
  "section": "Kakie",
  "item": "2nd Change",
  "detail": "Challenge the elbow at the centreline"
 },
 {
  "grade": "4th Kyu",
  "track": "All",
  "section": "Stretch",
  "item": "Complete",
  "detail": ""
 },
 {
  "grade": "4th Kyu",
  "track": "All",
  "section": "Mara",
  "item": "Mara complete",
  "detail": ""
 },
 {
  "grade": "4th Kyu",
  "track": "All",
  "section": "Sanchin",
  "item": "Footwork - 3 steps forward & back",
  "detail": "Use body to open and close the gates (knees, ankles & feet)"
 },
 {
  "grade": "4th Kyu",
  "track": "All",
  "section": "Kihon",
  "item": "kaki-uke >> mae-geri >> gyaku-zuki",
  "detail": "Hook hand to catch at the wrist"
 },
 {
  "grade": "4th Kyu",
  "track": "All",
  "section": "Kihon",
  "item": "Tobikomi-zuki",
  "detail": "Snap punch from a relaxed state"
 },
 {
  "grade": "4th Kyu",
  "track": "All",
  "section": "Kihon",
  "item": "Mawashi-geri - ayumi ashi, tsugi ashi, sonaba",
  "detail": "Ma-ai (distance) to manage kicking range"
 },
 {
  "grade": "4th Kyu",
  "track": "All",
  "section": "Kihon Kumite",
  "item": "Kumite 9 (SS)",
  "detail": "jun-zuki >>> kaki-uke >> mae-geri >> gyaku-zuki"
 },
 {
  "grade": "4th Kyu",
  "track": "All",
  "section": "Kihon Kumite",
  "item": "Kumite 10 (OS)",
  "detail": "jun-zuki >>> sen no sen - nagashi-uke (rear hand) >> tobikomi-zuki"
 },
 {
  "grade": "4th Kyu",
  "track": "All",
  "section": "Jiyu Kumite",
  "item": "Free flow exchange",
  "detail": ""
 },
 {
  "grade": "4th Kyu",
  "track": "All",
  "section": "Hansha Kumite",
  "item": "jun-zuki > reflex uchi-uke > uraken",
  "detail": "Trap and punch to cause reflex parry. Trap the parry and backfist"
 },
 {
  "grade": "4th Kyu",
  "track": "All",
  "section": "Kakie",
  "item": "Solo walking - circle stepping",
  "detail": "Add circle steps - cat, cross, cat. Inside and outside"
 },
 {
  "grade": "4th Kyu",
  "track": "Adult",
  "section": "Sanchin",
  "item": "Sanchin complete with 3 ratios of breathing",
  "detail": "Clear timing to match the breath ratios"
 },
 {
  "grade": "4th Kyu",
  "track": "Adult",
  "section": "Hansha Kumite",
  "item": "age-empi > mawashi-empi",
  "detail": "Split guard to rising elbow to create uke reaction > trap and round elbow"
 },
 {
  "grade": "4th Kyu",
  "track": "Adult",
  "section": "Kakie",
  "item": "3rd Change",
  "detail": "Challenge the outside wrist at the centreline"
 },
 {
  "grade": "3rd Kyu",
  "track": "All",
  "section": "Stretch",
  "item": "Complete",
  "detail": ""
 },
 {
  "grade": "3rd Kyu",
  "track": "All",
  "section": "Mara",
  "item": "Mara complete",
  "detail": ""
 },
 {
  "grade": "3rd Kyu",
  "track": "All",
  "section": "Sanchin",
  "item": "Sanchin section 1",
  "detail": ""
 },
 {
  "grade": "3rd Kyu",
  "track": "All",
  "section": "Kihon",
  "item": "Safe rolling",
  "detail": ""
 },
 {
  "grade": "3rd Kyu",
  "track": "All",
  "section": "Kihon",
  "item": "Take down into guard",
  "detail": ""
 },
 {
  "grade": "3rd Kyu",
  "track": "All",
  "section": "Kihon",
  "item": "JJ - escape the mount",
  "detail": ""
 },
 {
  "grade": "3rd Kyu",
  "track": "All",
  "section": "Kihon Kumite",
  "item": "Kumite 11 (SS)",
  "detail": "Crossed hand low grip (sword) >>> underhand grip & takedown"
 },
 {
  "grade": "3rd Kyu",
  "track": "All",
  "section": "Kihon Kumite",
  "item": "Kumite 12 (SS)",
  "detail": "Crossed hand grip (scabbard) >>> overhand grip & takedown"
 },
 {
  "grade": "3rd Kyu",
  "track": "All",
  "section": "Jiyu Kumite",
  "item": "Free flow exchange",
  "detail": ""
 },
 {
  "grade": "3rd Kyu",
  "track": "All",
  "section": "Hansha Kumite",
  "item": "uraken > reflex soto-uke > gyaku-zuki",
  "detail": ""
 },
 {
  "grade": "3rd Kyu",
  "track": "Junior",
  "section": "Kakie (Child)",
  "item": "Fixed push",
  "detail": ""
 },
 {
  "grade": "3rd Kyu",
  "track": "Adult",
  "section": "Sanchin",
  "item": "Sanchin complete with 3 ratios of breathing",
  "detail": ""
 },
 {
  "grade": "3rd Kyu",
  "track": "Adult",
  "section": "Hansha Kumite",
  "item": "mawashi-empi (reflex uke) > jun-zuki",
  "detail": ""
 },
 {
  "grade": "3rd Kyu",
  "track": "Adult",
  "section": "Kakie",
  "item": "Intrusion",
  "detail": ""
 },
 {
  "grade": "3rd Kyu",
  "track": "Adult",
  "section": "Kakie",
  "item": "Circle step",
  "detail": ""
 },
 {
  "grade": "2nd Kyu",
  "track": "All",
  "section": "Stretch",
  "item": "Complete",
  "detail": ""
 },
 {
  "grade": "2nd Kyu",
  "track": "All",
  "section": "Mara",
  "item": "Mara complete",
  "detail": "Mastery over subtle body torsion"
 },
 {
  "grade": "2nd Kyu",
  "track": "All",
  "section": "Sanchin",
  "item": "Sanchin section 2",
  "detail": ""
 },
 {
  "grade": "2nd Kyu",
  "track": "All",
  "section": "Kihon",
  "item": "JJ - Module 1",
  "detail": ""
 },
 {
  "grade": "2nd Kyu",
  "track": "All",
  "section": "Kihon",
  "item": "JJ - Module 2",
  "detail": ""
 },
 {
  "grade": "2nd Kyu",
  "track": "All",
  "section": "Kihon",
  "item": "JJ - Module 3",
  "detail": ""
 },
 {
  "grade": "2nd Kyu",
  "track": "All",
  "section": "Kihon Kumite",
  "item": "Kumite 1 to 12",
  "detail": "Show variations (Ohyo Kumite)"
 },
 {
  "grade": "2nd Kyu",
  "track": "All",
  "section": "Jiyu Kumite",
  "item": "Free flow exchange",
  "detail": ""
 },
 {
  "grade": "2nd Kyu",
  "track": "All",
  "section": "Hansha Kumite",
  "item": "Complete Mara reflex flow drill",
  "detail": ""
 },
 {
  "grade": "2nd Kyu",
  "track": "Junior",
  "section": "Kakie (Child)",
  "item": "1st Change",
  "detail": ""
 },
 {
  "grade": "2nd Kyu",
  "track": "Adult",
  "section": "Rokushu",
  "item": "Complete kata",
  "detail": ""
 },
 {
  "grade": "2nd Kyu",
  "track": "Adult",
  "section": "Kakie",
  "item": "Double hand push",
  "detail": ""
 },
 {
  "grade": "2nd Kyu",
  "track": "Adult",
  "section": "Kakie",
  "item": "Double hand push with footwork",
  "detail": ""
 },
 {
  "grade": "1st Kyu",
  "track": "All",
  "section": "Stretch",
  "item": "Complete",
  "detail": ""
 },
 {
  "grade": "1st Kyu",
  "track": "All",
  "section": "Kata",
  "item": "Mara complete",
  "detail": ""
 },
 {
  "grade": "1st Kyu",
  "track": "All",
  "section": "Kata",
  "item": "Sanchin section 3",
  "detail": ""
 },
 {
  "grade": "1st Kyu",
  "track": "All",
  "section": "Kihon",
  "item": "JJ - Module 4",
  "detail": ""
 },
 {
  "grade": "1st Kyu",
  "track": "All",
  "section": "Kihon",
  "item": "JJ - Module 5",
  "detail": ""
 },
 {
  "grade": "1st Kyu",
  "track": "All",
  "section": "Kihon",
  "item": "JJ - Module 6",
  "detail": ""
 },
 {
  "grade": "1st Kyu",
  "track": "All",
  "section": "Kihon Kumite",
  "item": "Kumite 1 to 12",
  "detail": "Show variations (Ohyo Kumite)"
 },
 {
  "grade": "1st Kyu",
  "track": "All",
  "section": "Jiyu Kumite",
  "item": "Free flow exchange",
  "detail": ""
 },
 {
  "grade": "1st Kyu",
  "track": "All",
  "section": "Hansha Kumite",
  "item": "Complete Mara reflex flow drill",
  "detail": ""
 },
 {
  "grade": "1st Kyu",
  "track": "Junior",
  "section": "Kakie (Child)",
  "item": "2nd Change",
  "detail": ""
 },
 {
  "grade": "1st Kyu",
  "track": "Adult",
  "section": "Rokushu",
  "item": "Complete kata",
  "detail": ""
 },
 {
  "grade": "1st Kyu",
  "track": "Adult",
  "section": "Kakie",
  "item": "Double hand push with footwork",
  "detail": ""
 },
 {
  "grade": "1st Kyu",
  "track": "Adult",
  "section": "Kakie",
  "item": "Sanchin grip releases",
  "detail": ""
 },
 {
  "grade": "1st Kyu",
  "track": "Adult",
  "section": "Kakie",
  "item": "Crane spreads its wings",
  "detail": ""
 },
 {
  "grade": "Shodan",
  "track": "Junior",
  "section": "Stretch",
  "item": "Complete",
  "detail": "Junior Shodan (Mon grades) leading to Nidan"
 },
 {
  "grade": "Shodan",
  "track": "Junior",
  "section": "Mara",
  "item": "Mara complete",
  "detail": ""
 },
 {
  "grade": "Shodan",
  "track": "Junior",
  "section": "Sanchin",
  "item": "Sanchin complete with 3 breath ratios",
  "detail": ""
 },
 {
  "grade": "Shodan",
  "track": "Junior",
  "section": "Kumite",
  "item": "Jiyu Kumite",
  "detail": ""
 },
 {
  "grade": "Shodan",
  "track": "Junior",
  "section": "Kumite",
  "item": "JJ rolling (free play)",
  "detail": ""
 },
 {
  "grade": "Shodan",
  "track": "Junior",
  "section": "Kihon Kumite",
  "item": "All 12 Kumite",
  "detail": "Showing variations of all the way in and all the way out"
 },
 {
  "grade": "Shodan",
  "track": "Junior",
  "section": "Hansha Kumite",
  "item": "Complete Mara reflex flow drill",
  "detail": ""
 },
 {
  "grade": "Shodan",
  "track": "Junior",
  "section": "Kakie (Child)",
  "item": "Walking drills, fixed push and 3 changes",
  "detail": ""
 },
 {
  "grade": "Shodan",
  "track": "Junior",
  "section": "Shodan A - Sanchin",
  "item": "Sanchin complete with 3 ratios of breathing",
  "detail": "Mon tag stage A - catching up to adult syllabus"
 },
 {
  "grade": "Shodan",
  "track": "Junior",
  "section": "Shodan A - Rokushu",
  "item": "Complete kata",
  "detail": ""
 },
 {
  "grade": "Shodan",
  "track": "Junior",
  "section": "Shodan A - Naifuanchin",
  "item": "Section 1",
  "detail": ""
 },
 {
  "grade": "Shodan",
  "track": "Junior",
  "section": "Shodan A - Kakie",
  "item": "Crane spreads its wings",
  "detail": ""
 },
 {
  "grade": "Shodan",
  "track": "Junior",
  "section": "Shodan A - Kakie",
  "item": "Snake vs Tiger",
  "detail": ""
 },
 {
  "grade": "Shodan",
  "track": "Junior",
  "section": "Shodan A - Kakie",
  "item": "Snake vs Standing Dragon",
  "detail": ""
 },
 {
  "grade": "Shodan",
  "track": "Adult",
  "section": "Mara",
  "item": "Improved movement and transitions",
  "detail": ""
 },
 {
  "grade": "Shodan",
  "track": "Adult",
  "section": "Sanchin",
  "item": "Improved movement and transitions",
  "detail": ""
 },
 {
  "grade": "Shodan",
  "track": "Adult",
  "section": "Rokushu",
  "item": "Complete kata",
  "detail": ""
 },
 {
  "grade": "Shodan",
  "track": "Adult",
  "section": "Hansha Kumite",
  "item": "mawashi-empi (reflex uke) > jun-zuki",
  "detail": ""
 },
 {
  "grade": "Shodan",
  "track": "Adult",
  "section": "Hansha Kumite",
  "item": "Complete Mara reflex flow drill",
  "detail": ""
 },
 {
  "grade": "Shodan",
  "track": "Adult",
  "section": "Kakie",
  "item": "Intrusion",
  "detail": ""
 },
 {
  "grade": "Shodan",
  "track": "Adult",
  "section": "Kakie",
  "item": "Circle step",
  "detail": ""
 },
 {
  "grade": "Shodan",
  "track": "Adult",
  "section": "Kakie",
  "item": "Double hand push",
  "detail": ""
 },
 {
  "grade": "Shodan",
  "track": "Adult",
  "section": "Kakie",
  "item": "Double hand push with footwork",
  "detail": ""
 },
 {
  "grade": "Shodan",
  "track": "Adult",
  "section": "Kakie",
  "item": "Sanchin grip releases",
  "detail": ""
 },
 {
  "grade": "Shodan",
  "track": "Adult",
  "section": "Kakie",
  "item": "Crane spreads its wings",
  "detail": ""
 },
 {
  "grade": "Shodan",
  "track": "Adult",
  "section": "Kakie",
  "item": "Crane circles its wings",
  "detail": ""
 },
 {
  "grade": "Shodan",
  "track": "Adult",
  "section": "Kakie",
  "item": "Snake vs Tiger",
  "detail": ""
 },
 {
  "grade": "Shodan",
  "track": "Adult",
  "section": "Kakie",
  "item": "Snake vs Standing Dragon",
  "detail": ""
 },
 {
  "grade": "Shodan",
  "track": "All",
  "section": "Theory",
  "item": "Submit a defined essay",
  "detail": ""
 },
 {
  "grade": "Nidan",
  "track": "All",
  "section": "Stretch",
  "item": "Complete",
  "detail": ""
 },
 {
  "grade": "Nidan",
  "track": "All",
  "section": "Kata",
  "item": "Sanchin, Mara, Rokushu, Naifuanchin",
  "detail": ""
 },
 {
  "grade": "Nidan",
  "track": "All",
  "section": "Kihon Kumite",
  "item": "Refined movements",
  "detail": "Subtle footwork and distance management. Variations, takedowns and JJ"
 },
 {
  "grade": "Nidan",
  "track": "All",
  "section": "JJ",
  "item": "Understanding the progression of the modules",
  "detail": ""
 },
 {
  "grade": "Nidan",
  "track": "All",
  "section": "Jiyu Kumite",
  "item": "Fluid, free play",
  "detail": ""
 },
 {
  "grade": "Nidan",
  "track": "All",
  "section": "Kakie",
  "item": "Crane circles and thrusts its wings",
  "detail": ""
 },
 {
  "grade": "Nidan",
  "track": "All",
  "section": "Kakie",
  "item": "Contra grips - laying dragon, leopard, crane",
  "detail": "Rokushu applications"
 },
 {
  "grade": "Nidan",
  "track": "All",
  "section": "Kakie",
  "item": "NFC 1, sword grip: single hand",
  "detail": ""
 },
 {
  "grade": "Nidan",
  "track": "All",
  "section": "Kakie",
  "item": "NFC 1, scabbard grip: single hand",
  "detail": ""
 },
 {
  "grade": "Nidan",
  "track": "All",
  "section": "Theory",
  "item": "Submit a defined essay",
  "detail": ""
 },
 {
  "grade": "Sandan",
  "track": "All",
  "section": "Stretch",
  "item": "Complete",
  "detail": ""
 },
 {
  "grade": "Sandan",
  "track": "All",
  "section": "Kata",
  "item": "Sanchin, Mara, Rokushu, Naifuanchin",
  "detail": ""
 },
 {
  "grade": "Sandan",
  "track": "All",
  "section": "Kihon Kumite",
  "item": "Refined movements",
  "detail": "Subtle footwork and distance management. Variations, takedowns and JJ"
 },
 {
  "grade": "Sandan",
  "track": "All",
  "section": "Jiyu Kumite",
  "item": "Fluid, free play",
  "detail": ""
 },
 {
  "grade": "Sandan",
  "track": "All",
  "section": "Kakie",
  "item": "Fluid spontaneous applications interplayed from all Kata",
  "detail": ""
 },
 {
  "grade": "Sandan",
  "track": "All",
  "section": "Theory",
  "item": "Submit a defined essay",
  "detail": ""
 }
];
