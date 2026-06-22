import { SpecificPosition, Player } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// 1. PlayerRole Interface
// ─────────────────────────────────────────────────────────────────────────────

export interface PlayerRole {
  id: string;
  name: string;               // Turkish display name
  nameEn: string;             // English display name
  description: string;        // Turkish description
  category: 'defensive' | 'midfield' | 'attacking' | 'goalkeeper';
  compatiblePositions: SpecificPosition[];
  primaryAttributes: string[];
  secondaryAttributes: string[];
  mentalWeight: number;       // 0-1, how much mental stats matter
  attackingContribution: number;  // 0-100
  defensiveContribution: number;  // 0-100
  playStyleAffinity: Record<string, number>;  // e.g. { 'Tiki-Taka': 0.8, 'Gegenpressing': -0.3 }
  icon: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. ROLES (20+ defined roles)
// ─────────────────────────────────────────────────────────────────────────────

export const ROLES: PlayerRole[] = [
  // ── GOALKEEPER ────────────────────────────────────────────────────────────
  {
    id: 'sweeper_keeper',
    name: 'Terzi Kaleci',
    nameEn: 'Sweeper Keeper',
    description:
      'Ceza sahası dışına çıkarak savunma arkasını kapatır. Pas oyununa katkı sağlar.',
    category: 'goalkeeper',
    compatiblePositions: ['GK'],
    primaryAttributes: ['goalkeeping', 'reflexes', 'positioning', 'composure'],
    secondaryAttributes: ['passing', 'acceleration', 'decisions', 'anticipation'],
    mentalWeight: 0.4,
    attackingContribution: 15,
    defensiveContribution: 70,
    playStyleAffinity: { 'Tiki-Taka': 0.7, 'Gegenpressing': 0.5, 'Catenaccio': -0.2 },
    icon: '🧤',
  },
  {
    id: 'shot_stopper',
    name: 'Refleks Kaleci',
    nameEn: 'Shot Stopper',
    description:
      'Müthiş refleksleri ve uzanışıyla şutları kurtarır. Ceza sahasında asandır.',
    category: 'goalkeeper',
    compatiblePositions: ['GK'],
    primaryAttributes: ['goalkeeping', 'reflexes', 'handling', 'concentration'],
    secondaryAttributes: ['command_of_area', 'positioning', 'bravery', 'composure'],
    mentalWeight: 0.3,
    attackingContribution: 5,
    defensiveContribution: 85,
    playStyleAffinity: { 'Catenaccio': 0.6, 'Gegenpressing': 0.2, 'Tiki-Taka': -0.2 },
    icon: '🛡️',
  },

  // ── DEFENDERS ─────────────────────────────────────────────────────────────
  {
    id: 'ball_playing_defender',
    name: 'Top Çıkan Stoper',
    nameEn: 'Ball Playing Defender',
    description:
      'Topu ayağına alıp oyun kurarak savunmadan öne pas verir. Modern stoper tipi.',
    category: 'defensive',
    compatiblePositions: ['CB'],
    primaryAttributes: ['passing', 'tackling', 'positioning', 'technique'],
    secondaryAttributes: ['vision', 'composure', 'decisions', 'heading'],
    mentalWeight: 0.5,
    attackingContribution: 20,
    defensiveContribution: 85,
    playStyleAffinity: { 'Tiki-Taka': 0.9, 'Gegenpressing': 0.4, 'Catenaccio': 0.1 },
    icon: '🎯',
  },
  {
    id: 'no_nonsense_cb',
    name: 'Kale Gibi Stoper',
    nameEn: 'No-Nonsense Centre-Back',
    description:
      'Basit ve etkili oynar. Topu tehlikeli olmayan yerlere clearance yapar, havada üstündür.',
    category: 'defensive',
    compatiblePositions: ['CB'],
    primaryAttributes: ['tackling', 'marking', 'heading', 'strength'],
    secondaryAttributes: ['positioning', 'concentration', 'aggression', 'bravery'],
    mentalWeight: 0.35,
    attackingContribution: 5,
    defensiveContribution: 95,
    playStyleAffinity: { 'Catenaccio': 0.8, 'Gegenpressing': 0.3, 'Tiki-Taka': -0.4 },
    icon: '🧱',
  },
  {
    id: 'offside_trap_cb',
    name: 'Ofsayt Tuzağı Stoperi',
    nameEn: 'Offside Trap Centre-Back',
    description:
      'Ofsayt çizgisini yöneterek rakip forvetleri tuzağa düşürür. İletişim ve zamanlama kritik.',
    category: 'defensive',
    compatiblePositions: ['CB'],
    primaryAttributes: ['anticipation', 'positioning', 'decisions', 'concentration'],
    secondaryAttributes: ['acceleration', 'teamwork', 'composure', 'marking'],
    mentalWeight: 0.65,
    attackingContribution: 5,
    defensiveContribution: 80,
    playStyleAffinity: { 'Catenaccio': 0.7, 'Gegenpressing': 0.5, 'Tiki-Taka': 0.0 },
    icon: '🪤',
  },
  {
    id: 'wing_back',
    name: 'Kanat Bek',
    nameEn: 'Wing Back',
    description:
      'Kanadın boyunca sürekli ileri-geri koşar. Hem savunma hem de hücum katkısı sağlar.',
    category: 'defensive',
    compatiblePositions: ['LB', 'RB', 'LWB', 'RWB'],
    primaryAttributes: ['stamina', 'crossing', 'speed', 'tackling'],
    secondaryAttributes: ['workRate', 'acceleration', 'dribbling', 'positioning'],
    mentalWeight: 0.35,
    attackingContribution: 45,
    defensiveContribution: 70,
    playStyleAffinity: { 'Gegenpressing': 0.6, 'Tiki-Taka': 0.3, 'Catenaccio': 0.2 },
    icon: '🏃',
  },
  {
    id: 'inverted_fullback',
    name: 'Ters Bek',
    nameEn: 'Inverted Fullback',
    description:
      'Topla ileride orta sahaya girer, kale arkası boşluğunu bir orta saha oyuncusu gibi kullanır.',
    category: 'defensive',
    compatiblePositions: ['LB', 'RB'],
    primaryAttributes: ['passing', 'vision', 'tackling', 'composure'],
    secondaryAttributes: ['technique', 'decisions', 'stamina', 'workRate'],
    mentalWeight: 0.55,
    attackingContribution: 35,
    defensiveContribution: 65,
    playStyleAffinity: { 'Tiki-Taka': 0.9, 'Gegenpressing': 0.4, 'Catenaccio': -0.3 },
    icon: '🔄',
  },
  {
    id: 'libero',
    name: 'Süpürücü',
    nameEn: 'Libero / Sweeper',
    description:
      'Stoperlerin arkasında boşta gezerek topu çalar ve oyun kurar. Nadir ama etkili rol.',
    category: 'defensive',
    compatiblePositions: ['CB'],
    primaryAttributes: ['positioning', 'passing', 'tackling', 'vision'],
    secondaryAttributes: ['composure', 'anticipation', 'technique', 'acceleration'],
    mentalWeight: 0.6,
    attackingContribution: 30,
    defensiveContribution: 80,
    playStyleAffinity: { 'Tiki-Taka': 0.6, 'Catenaccio': 0.5, 'Gegenpressing': 0.1 },
    icon: '🧹',
  },

  // ── MIDFIELDERS ───────────────────────────────────────────────────────────
  {
    id: 'deep_lying_playmaker',
    name: 'Regista',
    nameEn: 'Deep Lying Playmaker',
    description:
      'Savunma önünde derin paslarla oyun kurar. Takımın beyni ve tempo belirleyicisi.',
    category: 'midfield',
    compatiblePositions: ['CDM', 'CM'],
    primaryAttributes: ['passing', 'vision', 'composure', 'technique'],
    secondaryAttributes: ['decisions', 'anticipation', 'firstTouch', 'positioning'],
    mentalWeight: 0.7,
    attackingContribution: 40,
    defensiveContribution: 50,
    playStyleAffinity: { 'Tiki-Taka': 1.0, 'Catenaccio': 0.6, 'Gegenpressing': -0.1 },
    icon: '🧠',
  },
  {
    id: 'box_to_box',
    name: 'Koşan Orta Saha',
    nameEn: 'Box-to-Box Midfielder',
    description:
      'Ceza sahasından ceza sahasına koşar. Hem savunma hem hücumda her alanda etkilidir.',
    category: 'midfield',
    compatiblePositions: ['CM', 'CDM'],
    primaryAttributes: ['stamina', 'tackling', 'passing', 'shooting'],
    secondaryAttributes: ['workRate', 'acceleration', 'strength', 'positioning'],
    mentalWeight: 0.4,
    attackingContribution: 55,
    defensiveContribution: 65,
    playStyleAffinity: { 'Gegenpressing': 0.8, 'Tiki-Taka': 0.3, 'Catenaccio': 0.3 },
    icon: '🔋',
  },
  {
    id: 'mezzala',
    name: 'Mezzala',
    nameEn: 'Mezzala',
    description:
      'Orta saha ile kanat arasına drift ederek hücuma katılır. Merkezi boşlukları doldurur.',
    category: 'midfield',
    compatiblePositions: ['CM', 'CAM', 'LM', 'RM'],
    primaryAttributes: ['dribbling', 'passing', 'shooting', 'offTheBall'],
    secondaryAttributes: ['stamina', 'vision', 'workRate', 'technique'],
    mentalWeight: 0.45,
    attackingContribution: 65,
    defensiveContribution: 40,
    playStyleAffinity: { 'Gegenpressing': 0.6, 'Tiki-Taka': 0.5, 'Catenaccio': -0.2 },
    icon: '🌀',
  },
  {
    id: 'defensive_midfielder',
    name: 'Defansif Orta Saha',
    nameEn: 'Defensive Midfielder / Anchor',
    description:
      'Savunma önünde duvar örer, top çalar ve basit paslarla güvenli oyun sağlar.',
    category: 'midfield',
    compatiblePositions: ['CDM', 'CM'],
    primaryAttributes: ['tackling', 'marking', 'positioning', 'strength'],
    secondaryAttributes: ['anticipation', 'concentration', 'decisions', 'workRate'],
    mentalWeight: 0.5,
    attackingContribution: 15,
    defensiveContribution: 90,
    playStyleAffinity: { 'Catenaccio': 0.9, 'Gegenpressing': 0.6, 'Tiki-Taka': 0.1 },
    icon: '⚓',
  },
  {
    id: 'advanced_playmaker',
    name: 'Ofansif Oyun Kurucu',
    nameEn: 'Advanced Playmaker',
    description:
      'Hücum hattının arkasında yaratıcı paslar ve şutlarla skora doğrudan etki eder.',
    category: 'midfield',
    compatiblePositions: ['CAM', 'CM', 'CF'],
    primaryAttributes: ['passing', 'vision', 'technique', 'dribbling'],
    secondaryAttributes: ['creativity', 'composure', 'decisions', 'longShots'],
    mentalWeight: 0.65,
    attackingContribution: 75,
    defensiveContribution: 15,
    playStyleAffinity: { 'Tiki-Taka': 0.9, 'Gegenpressing': 0.2, 'Catenaccio': 0.0 },
    icon: '🎭',
  },
  {
    id: 'half_winger',
    name: 'Yarı Kanat',
    nameEn: 'Half-Winger',
    description:
      'Kanat ile orta saha arasına yerleşir, içeri keserek şut atar ve asist yapar.',
    category: 'midfield',
    compatiblePositions: ['LM', 'RM', 'LW', 'RW'],
    primaryAttributes: ['dribbling', 'crossing', 'passing', 'acceleration'],
    secondaryAttributes: ['offTheBall', 'workRate', 'technique', 'stamina'],
    mentalWeight: 0.35,
    attackingContribution: 65,
    defensiveContribution: 35,
    playStyleAffinity: { 'Gegenpressing': 0.7, 'Tiki-Taka': 0.4, 'Catenaccio': 0.0 },
    icon: '↗️',
  },
  {
    id: 'carrilero',
    name: 'Sığ Orta Saha',
    nameEn: 'Carrilero',
    description:
      'Yan kanat boşluklarını doldurur, genişlik sağlar ve kanat oyuncusunun pozisyon almasına olanak tanır.',
    category: 'midfield',
    compatiblePositions: ['CM', 'LM', 'RM', 'CDM'],
    primaryAttributes: ['stamina', 'passing', 'tackling', 'positioning'],
    secondaryAttributes: ['workRate', 'teamwork', 'decisions', 'acceleration'],
    mentalWeight: 0.4,
    attackingContribution: 35,
    defensiveContribution: 60,
    playStyleAffinity: { 'Tiki-Taka': 0.5, 'Gegenpressing': 0.5, 'Catenaccio': 0.3 },
    icon: ' ↔️',
  },

  // ── FORWARDS ──────────────────────────────────────────────────────────────
  {
    id: 'target_man',
    name: 'Hedef Forvet',
    nameEn: 'Target Man',
    description:
      'Fiziksel üstünlüğüyle topu tutar, takım arkadaşlarına dağıtır. Havadaki duruşlarıyla etkili.',
    category: 'attacking',
    compatiblePositions: ['ST', 'CF'],
    primaryAttributes: ['heading', 'strength', 'offTheBall', 'finishing'],
    secondaryAttributes: ['firstTouch', 'passing', 'balance', 'jumping'],
    mentalWeight: 0.35,
    attackingContribution: 85,
    defensiveContribution: 10,
    playStyleAffinity: { 'Catenaccio': 0.6, 'Gegenpressing': 0.3, 'Tiki-Taka': -0.2 },
    icon: '💪',
  },
  {
    id: 'poacher',
    name: 'Fırsatçı',
    nameEn: 'Poacher',
    description:
      'Ceza sahasında bekler, en ufak fırsatı gole çevirir. Pozisyon bilgisi mükemmeldir.',
    category: 'attacking',
    compatiblePositions: ['ST', 'CF'],
    primaryAttributes: ['finishing', 'offTheBall', 'composure', 'acceleration'],
    secondaryAttributes: ['positioning', 'decisions', 'dribbling', 'reflexes'],
    mentalWeight: 0.55,
    attackingContribution: 95,
    defensiveContribution: 5,
    playStyleAffinity: { 'Catenaccio': 0.8, 'Tiki-Taka': 0.2, 'Gegenpressing': 0.0 },
    icon: '🦅',
  },
  {
    id: 'complete_forward',
    name: 'Tam Forvet',
    nameEn: 'Complete Forward',
    description:
      'Şut, pas, dripling, kafa… Her şeye sahiptir. Her yönü tehdit oluşturan efsanevi rol.',
    category: 'attacking',
    compatiblePositions: ['ST', 'CF'],
    primaryAttributes: ['finishing', 'dribbling', 'passing', 'heading'],
    secondaryAttributes: ['strength', 'speed', 'offTheBall', 'technique'],
    mentalWeight: 0.45,
    attackingContribution: 90,
    defensiveContribution: 15,
    playStyleAffinity: { 'Tiki-Taka': 0.6, 'Gegenpressing': 0.5, 'Catenaccio': 0.3 },
    icon: '⭐',
  },
  {
    id: 'false_nine',
    name: 'Sahte 9',
    nameEn: 'False Nine',
    description:
      'Gol pozisyonuna girmez, orta sahaya çekilerek rakip stoperleri yanlış pozisyona iter.',
    category: 'attacking',
    compatiblePositions: ['ST', 'CF', 'CAM'],
    primaryAttributes: ['dribbling', 'passing', 'vision', 'offTheBall'],
    secondaryAttributes: ['technique', 'composure', 'creativity', 'firstTouch'],
    mentalWeight: 0.7,
    attackingContribution: 70,
    defensiveContribution: 10,
    playStyleAffinity: { 'Tiki-Taka': 1.0, 'Gegenpressing': 0.4, 'Catenaccio': -0.5 },
    icon: '👻',
  },
  {
    id: 'inside_forward',
    name: 'İç Kanat Forvet',
    nameEn: 'Inside Forward',
    description:
      'Kanattan içeri keserek şut atar. Forvet gibi bitirici, kanat gibi hızlıdır.',
    category: 'attacking',
    compatiblePositions: ['LW', 'RW', 'LM', 'RM'],
    primaryAttributes: ['dribbling', 'finishing', 'speed', 'acceleration'],
    secondaryAttributes: ['offTheBall', 'technique', 'composure', 'longShots'],
    mentalWeight: 0.4,
    attackingContribution: 85,
    defensiveContribution: 20,
    playStyleAffinity: { 'Gegenpressing': 0.7, 'Tiki-Taka': 0.3, 'Catenaccio': 0.1 },
    icon: '🔪',
  },
  {
    id: 'winger',
    name: 'Kanat',
    nameEn: 'Winger',
    description:
      'Kanadın boyunca koşarak defence arkasına sarkar ve orta açar. Hız ve çapraz pas ustası.',
    category: 'attacking',
    compatiblePositions: ['LW', 'RW', 'LM', 'RM', 'LWB', 'RWB'],
    primaryAttributes: ['speed', 'crossing', 'dribbling', 'acceleration'],
    secondaryAttributes: ['technique', 'stamina', 'offTheBall', 'workRate'],
    mentalWeight: 0.3,
    attackingContribution: 80,
    defensiveContribution: 25,
    playStyleAffinity: { 'Gegenpressing': 0.5, 'Tiki-Taka': 0.4, 'Catenaccio': 0.1 },
    icon: '🦅',
  },
  {
    id: 'advanced_playmaker_fwd',
    name: 'Forvet Oyun Kurucu',
    nameEn: 'Advanced Forward Playmaker',
    description:
      'Forvet pozisyonunda oynayan oyun kurucu. Hem gol atar hem asist yapar, takımın ana yaratıcı halkası.',
    category: 'attacking',
    compatiblePositions: ['CF', 'CAM', 'ST'],
    primaryAttributes: ['passing', 'vision', 'finishing', 'dribbling'],
    secondaryAttributes: ['technique', 'composure', 'decisions', 'offTheBall'],
    mentalWeight: 0.6,
    attackingContribution: 85,
    defensiveContribution: 10,
    playStyleAffinity: { 'Tiki-Taka': 0.8, 'Gegenpressing': 0.3, 'Catenaccio': 0.0 },
    icon: '🎯',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. getCompatibleRoles(position)
// ─────────────────────────────────────────────────────────────────────────────

export function getCompatibleRoles(position: SpecificPosition): PlayerRole[] {
  return ROLES.filter((r) => r.compatiblePositions.includes(position));
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. getRoleAttributeBonuses(roleId)
// ─────────────────────────────────────────────────────────────────────────────

type AttributeBonusMap = Record<string, number>;

const ATTRIBUTE_BONUSES: Record<string, AttributeBonusMap> = {
  sweeper_keeper: {
    passing: 4,
    goalkeeping: 3,
    positioning: 3,
    composure: 2,
    acceleration: 2,
    decisions: 2,
  },
  shot_stopper: {
    goalkeeping: 5,
    reflexes: 5,
    concentration: 3,
    positioning: 2,
    bravery: 2,
    composure: 2,
  },
  ball_playing_defender: {
    passing: 5,
    tackling: 3,
    positioning: 2,
    technique: 3,
    vision: 2,
    composure: 2,
  },
  no_nonsense_cb: {
    tackling: 5,
    marking: 5,
    heading: 4,
    strength: 4,
    positioning: 2,
    concentration: 2,
  },
  offside_trap_cb: {
    anticipation: 5,
    positioning: 5,
    decisions: 3,
    concentration: 3,
    acceleration: 2,
    teamwork: 2,
  },
  wing_back: {
    stamina: 5,
    crossing: 5,
    speed: 3,
    tackling: 3,
    acceleration: 2,
    workRate: 2,
  },
  inverted_fullback: {
    passing: 5,
    vision: 4,
    tackling: 3,
    composure: 3,
    technique: 2,
    stamina: 2,
  },
  libero: {
    positioning: 5,
    passing: 4,
    tackling: 3,
    vision: 3,
    composure: 2,
    anticipation: 2,
  },
  deep_lying_playmaker: {
    passing: 6,
    vision: 5,
    composure: 4,
    technique: 3,
    decisions: 2,
    anticipation: 2,
  },
  box_to_box: {
    stamina: 6,
    tackling: 3,
    passing: 3,
    shooting: 3,
    acceleration: 2,
    workRate: 2,
  },
  mezzala: {
    dribbling: 4,
    passing: 4,
    shooting: 4,
    offTheBall: 3,
    vision: 2,
    stamina: 2,
  },
  defensive_midfielder: {
    tackling: 5,
    marking: 5,
    positioning: 4,
    strength: 3,
    anticipation: 2,
    workRate: 2,
  },
  advanced_playmaker: {
    passing: 5,
    vision: 5,
    technique: 4,
    dribbling: 3,
    composure: 2,
    longShots: 2,
  },
  half_winger: {
    dribbling: 4,
    crossing: 5,
    passing: 3,
    acceleration: 3,
    offTheBall: 2,
    stamina: 2,
  },
  carrilero: {
    stamina: 5,
    passing: 4,
    tackling: 3,
    positioning: 3,
    workRate: 3,
    teamwork: 2,
  },
  target_man: {
    heading: 5,
    strength: 5,
    offTheBall: 3,
    finishing: 3,
    firstTouch: 2,
    balance: 2,
  },
  poacher: {
    finishing: 6,
    offTheBall: 5,
    composure: 4,
    acceleration: 3,
    positioning: 2,
    decisions: 2,
  },
  complete_forward: {
    finishing: 4,
    dribbling: 4,
    passing: 3,
    heading: 4,
    strength: 3,
    speed: 2,
  },
  false_nine: {
    dribbling: 5,
    passing: 5,
    vision: 4,
    offTheBall: 3,
    technique: 3,
    firstTouch: 2,
  },
  inside_forward: {
    dribbling: 5,
    finishing: 5,
    speed: 4,
    acceleration: 3,
    longShots: 3,
    composure: 2,
  },
  winger: {
    speed: 5,
    crossing: 6,
    dribbling: 4,
    acceleration: 3,
    technique: 2,
    stamina: 2,
  },
  advanced_playmaker_fwd: {
    passing: 5,
    vision: 5,
    finishing: 3,
    dribbling: 4,
    technique: 3,
    offTheBall: 2,
  },
};

export function getRoleAttributeBonuses(roleId: string): AttributeBonusMap {
  return { ...(ATTRIBUTE_BONUSES[roleId] ?? {}) };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. FormationTemplate Interface
// ─────────────────────────────────────────────────────────────────────────────

export interface FormationSlot {
  pos: SpecificPosition;
  x: number;             // 0-100 horizontal position on pitch (left to right)
  y: number;             // 0-100 vertical position on pitch (top/goal = 0, bottom/attacking = 100)
  defaultRole: string;   // role id
}

export interface FormationTemplate {
  name: string;
  description: string;
  positions: FormationSlot[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. FORMATION_TEMPLATES (14 formations — savunma sayısına göre gruplu)
// Sıra: 4'lü defans → 3'lü defans → 5'li defans
// ─────────────────────────────────────────────────────────────────────────────

export const FORMATION_TEMPLATES: FormationTemplate[] = [
  // ═══ 4'LÜ DEFANS (8 diziliş) ═══
  {
    name: '4-4-2',
    description: 'Klasik İngiliz dizilişi. İki forvet, dört orta saha, dört savunmacı. Dengeli ve güvenilir.',
    positions: [
      { pos: 'GK', x: 50, y: 5, defaultRole: 'shot_stopper' },
      { pos: 'LB', x: 15, y: 20, defaultRole: 'wing_back' },
      { pos: 'CB', x: 35, y: 18, defaultRole: 'no_nonsense_cb' },
      { pos: 'CB', x: 65, y: 18, defaultRole: 'ball_playing_defender' },
      { pos: 'RB', x: 85, y: 20, defaultRole: 'wing_back' },
      { pos: 'LM', x: 15, y: 45, defaultRole: 'winger' },
      { pos: 'CM', x: 38, y: 42, defaultRole: 'box_to_box' },
      { pos: 'CM', x: 62, y: 42, defaultRole: 'deep_lying_playmaker' },
      { pos: 'RM', x: 85, y: 45, defaultRole: 'winger' },
      { pos: 'ST', x: 38, y: 80, defaultRole: 'target_man' },
      { pos: 'ST', x: 62, y: 80, defaultRole: 'poacher' },
    ],
  },
  {
    name: '4-3-3',
    description: 'Hücum odaklı diziliş. Üç forvet, üç orta saha, dört savunmacı. Kanat hücumları güçlü.',
    positions: [
      { pos: 'GK', x: 50, y: 5, defaultRole: 'sweeper_keeper' },
      { pos: 'LB', x: 15, y: 20, defaultRole: 'wing_back' },
      { pos: 'CB', x: 35, y: 18, defaultRole: 'ball_playing_defender' },
      { pos: 'CB', x: 65, y: 18, defaultRole: 'no_nonsense_cb' },
      { pos: 'RB', x: 85, y: 20, defaultRole: 'wing_back' },
      { pos: 'CDM', x: 50, y: 38, defaultRole: 'defensive_midfielder' },
      { pos: 'CM', x: 30, y: 40, defaultRole: 'mezzala' },
      { pos: 'CM', x: 70, y: 40, defaultRole: 'mezzala' },
      { pos: 'LW', x: 18, y: 72, defaultRole: 'inside_forward' },
      { pos: 'ST', x: 50, y: 82, defaultRole: 'complete_forward' },
      { pos: 'RW', x: 82, y: 72, defaultRole: 'inside_forward' },
    ],
  },
  {
    name: '4-2-3-1',
    description: 'Modern diziliş. Çift ön libero, arkalarında üç ofansif oyuncu, tek forvet. Çok yönlü.',
    positions: [
      { pos: 'GK', x: 50, y: 5, defaultRole: 'shot_stopper' },
      { pos: 'LB', x: 15, y: 20, defaultRole: 'inverted_fullback' },
      { pos: 'CB', x: 37, y: 18, defaultRole: 'ball_playing_defender' },
      { pos: 'CB', x: 63, y: 18, defaultRole: 'no_nonsense_cb' },
      { pos: 'RB', x: 85, y: 20, defaultRole: 'wing_back' },
      { pos: 'CDM', x: 40, y: 35, defaultRole: 'defensive_midfielder' },
      { pos: 'CDM', x: 60, y: 35, defaultRole: 'deep_lying_playmaker' },
      { pos: 'LW', x: 18, y: 55, defaultRole: 'winger' },
      { pos: 'CAM', x: 50, y: 58, defaultRole: 'advanced_playmaker' },
      { pos: 'RW', x: 82, y: 55, defaultRole: 'inside_forward' },
      { pos: 'ST', x: 50, y: 82, defaultRole: 'complete_forward' },
    ],
  },
  {
    name: '4-1-4-1',
    description: 'Tek ön libero, dört orta saha ve tek forvet. Savunma güçlü, kontrollü oyun.',
    positions: [
      { pos: 'GK', x: 50, y: 5, defaultRole: 'shot_stopper' },
      { pos: 'LB', x: 15, y: 20, defaultRole: 'wing_back' },
      { pos: 'CB', x: 35, y: 18, defaultRole: 'no_nonsense_cb' },
      { pos: 'CB', x: 65, y: 18, defaultRole: 'ball_playing_defender' },
      { pos: 'RB', x: 85, y: 20, defaultRole: 'wing_back' },
      { pos: 'CDM', x: 50, y: 32, defaultRole: 'defensive_midfielder' },
      { pos: 'LM', x: 15, y: 50, defaultRole: 'half_winger' },
      { pos: 'CM', x: 38, y: 48, defaultRole: 'deep_lying_playmaker' },
      { pos: 'CM', x: 62, y: 48, defaultRole: 'mezzala' },
      { pos: 'RM', x: 85, y: 50, defaultRole: 'half_winger' },
      { pos: 'ST', x: 50, y: 82, defaultRole: 'complete_forward' },
    ],
  },
  {
    name: '4-5-1',
    description: 'Dört savunma, beş orta saha, tek forvet. Orta saha hakimiyeti sağlar.',
    positions: [
      { pos: 'GK', x: 50, y: 5, defaultRole: 'shot_stopper' },
      { pos: 'LB', x: 15, y: 20, defaultRole: 'wing_back' },
      { pos: 'CB', x: 35, y: 18, defaultRole: 'ball_playing_defender' },
      { pos: 'CB', x: 65, y: 18, defaultRole: 'no_nonsense_cb' },
      { pos: 'RB', x: 85, y: 20, defaultRole: 'wing_back' },
      { pos: 'LM', x: 12, y: 48, defaultRole: 'winger' },
      { pos: 'CM', x: 35, y: 42, defaultRole: 'box_to_box' },
      { pos: 'CDM', x: 50, y: 36, defaultRole: 'defensive_midfielder' },
      { pos: 'CM', x: 65, y: 42, defaultRole: 'advanced_playmaker' },
      { pos: 'RM', x: 88, y: 48, defaultRole: 'winger' },
      { pos: 'ST', x: 50, y: 82, defaultRole: 'target_man' },
    ],
  },
  {
    name: '4-3-2-1',
    description: 'Christmas tree dizilişi. Dar orta saha, üç forvet hattı arkasında iki oyuncu. Yaratıcı ve kompakt.',
    positions: [
      { pos: 'GK', x: 50, y: 5, defaultRole: 'sweeper_keeper' },
      { pos: 'LB', x: 18, y: 20, defaultRole: 'inverted_fullback' },
      { pos: 'CB', x: 37, y: 18, defaultRole: 'ball_playing_defender' },
      { pos: 'CB', x: 63, y: 18, defaultRole: 'no_nonsense_cb' },
      { pos: 'RB', x: 82, y: 20, defaultRole: 'inverted_fullback' },
      { pos: 'CDM', x: 50, y: 35, defaultRole: 'defensive_midfielder' },
      { pos: 'CM', x: 38, y: 40, defaultRole: 'mezzala' },
      { pos: 'CM', x: 62, y: 40, defaultRole: 'box_to_box' },
      { pos: 'CAM', x: 38, y: 58, defaultRole: 'advanced_playmaker' },
      { pos: 'CAM', x: 62, y: 58, defaultRole: 'advanced_playmaker_fwd' },
      { pos: 'ST', x: 50, y: 82, defaultRole: 'false_nine' },
    ],
  },
  {
    name: '4-4-1-1',
    description: 'Dört savunma, dört orta saha, arkasında tek forvet olan bir oyun kurucu. Dengeli ve organizeli.',
    positions: [
      { pos: 'GK', x: 50, y: 5, defaultRole: 'shot_stopper' },
      { pos: 'LB', x: 15, y: 20, defaultRole: 'wing_back' },
      { pos: 'CB', x: 35, y: 18, defaultRole: 'ball_playing_defender' },
      { pos: 'CB', x: 65, y: 18, defaultRole: 'no_nonsense_cb' },
      { pos: 'RB', x: 85, y: 20, defaultRole: 'wing_back' },
      { pos: 'LM', x: 15, y: 48, defaultRole: 'winger' },
      { pos: 'CM', x: 38, y: 42, defaultRole: 'box_to_box' },
      { pos: 'CM', x: 62, y: 42, defaultRole: 'deep_lying_playmaker' },
      { pos: 'RM', x: 85, y: 48, defaultRole: 'winger' },
      { pos: 'CAM', x: 50, y: 62, defaultRole: 'advanced_playmaker' },
      { pos: 'ST', x: 50, y: 82, defaultRole: 'complete_forward' },
    ],
  },
  {
    name: '4-3-1-2',
    description: 'Dört savunma, üç orta saha, bir oyun kurucu ve iki forvet. İtalyan tarzı dar ve kompakt.',
    positions: [
      { pos: 'GK', x: 50, y: 5, defaultRole: 'shot_stopper' },
      { pos: 'LB', x: 15, y: 20, defaultRole: 'wing_back' },
      { pos: 'CB', x: 35, y: 18, defaultRole: 'ball_playing_defender' },
      { pos: 'CB', x: 65, y: 18, defaultRole: 'no_nonsense_cb' },
      { pos: 'RB', x: 85, y: 20, defaultRole: 'wing_back' },
      { pos: 'CDM', x: 50, y: 35, defaultRole: 'defensive_midfielder' },
      { pos: 'CM', x: 30, y: 45, defaultRole: 'box_to_box' },
      { pos: 'CM', x: 70, y: 45, defaultRole: 'deep_lying_playmaker' },
      { pos: 'CAM', x: 50, y: 60, defaultRole: 'advanced_playmaker' },
      { pos: 'ST', x: 38, y: 82, defaultRole: 'target_man' },
      { pos: 'ST', x: 62, y: 82, defaultRole: 'poacher' },
    ],
  },
  // ═══ 3'LÜ DEFANS (4 diziliş) ═══
  {
    name: '3-5-2',
    description: 'Üç stoper ve beş orta saha. Kanat beklerle genişlik sağlanır, iki forvet hücumda güçlü.',
    positions: [
      { pos: 'GK', x: 50, y: 5, defaultRole: 'shot_stopper' },
      { pos: 'CB', x: 25, y: 17, defaultRole: 'ball_playing_defender' },
      { pos: 'CB', x: 50, y: 15, defaultRole: 'no_nonsense_cb' },
      { pos: 'CB', x: 75, y: 17, defaultRole: 'ball_playing_defender' },
      { pos: 'LWB', x: 10, y: 40, defaultRole: 'wing_back' },
      { pos: 'CM', x: 32, y: 38, defaultRole: 'box_to_box' },
      { pos: 'CDM', x: 50, y: 35, defaultRole: 'defensive_midfielder' },
      { pos: 'CM', x: 68, y: 38, defaultRole: 'deep_lying_playmaker' },
      { pos: 'RWB', x: 90, y: 40, defaultRole: 'wing_back' },
      { pos: 'ST', x: 38, y: 80, defaultRole: 'target_man' },
      { pos: 'ST', x: 62, y: 80, defaultRole: 'poacher' },
    ],
  },
  {
    name: '3-4-3',
    description: 'Üç stoper, dört orta saha ve üç forvet. Hücum ağırlıklı, kanat forvetleri önde.',
    positions: [
      { pos: 'GK', x: 50, y: 5, defaultRole: 'sweeper_keeper' },
      { pos: 'CB', x: 25, y: 17, defaultRole: 'no_nonsense_cb' },
      { pos: 'CB', x: 50, y: 15, defaultRole: 'ball_playing_defender' },
      { pos: 'CB', x: 75, y: 17, defaultRole: 'offside_trap_cb' },
      { pos: 'LM', x: 15, y: 42, defaultRole: 'carrilero' },
      { pos: 'CM', x: 38, y: 38, defaultRole: 'box_to_box' },
      { pos: 'CM', x: 62, y: 38, defaultRole: 'deep_lying_playmaker' },
      { pos: 'RM', x: 85, y: 42, defaultRole: 'carrilero' },
      { pos: 'LW', x: 18, y: 72, defaultRole: 'inside_forward' },
      { pos: 'ST', x: 50, y: 82, defaultRole: 'complete_forward' },
      { pos: 'RW', x: 82, y: 72, defaultRole: 'inside_forward' },
    ],
  },
  {
    name: '3-1-4-2',
    description: 'Üç stoper, bir ön libero, dört orta saha ve iki forvet. İsviçre tarzı, defansif omurga ile hücum.',
    positions: [
      { pos: 'GK', x: 50, y: 5, defaultRole: 'sweeper_keeper' },
      { pos: 'CB', x: 25, y: 17, defaultRole: 'no_nonsense_cb' },
      { pos: 'CB', x: 50, y: 15, defaultRole: 'ball_playing_defender' },
      { pos: 'CB', x: 75, y: 17, defaultRole: 'offside_trap_cb' },
      { pos: 'CDM', x: 50, y: 30, defaultRole: 'defensive_midfielder' },
      { pos: 'LM', x: 12, y: 48, defaultRole: 'carrilero' },
      { pos: 'CM', x: 35, y: 42, defaultRole: 'box_to_box' },
      { pos: 'CM', x: 65, y: 42, defaultRole: 'deep_lying_playmaker' },
      { pos: 'RM', x: 88, y: 48, defaultRole: 'carrilero' },
      { pos: 'ST', x: 38, y: 80, defaultRole: 'target_man' },
      { pos: 'ST', x: 62, y: 80, defaultRole: 'poacher' },
    ],
  },
  {
    name: '3-3-3-1',
    description: 'Üç stoper, üç orta saha, üç ofansif oyuncu ve tek forvet. Çok hücumcu, kanat ağırlıklı.',
    positions: [
      { pos: 'GK', x: 50, y: 5, defaultRole: 'sweeper_keeper' },
      { pos: 'CB', x: 25, y: 17, defaultRole: 'no_nonsense_cb' },
      { pos: 'CB', x: 50, y: 15, defaultRole: 'ball_playing_defender' },
      { pos: 'CB', x: 75, y: 17, defaultRole: 'offside_trap_cb' },
      { pos: 'CDM', x: 30, y: 38, defaultRole: 'defensive_midfielder' },
      { pos: 'CM', x: 50, y: 35, defaultRole: 'deep_lying_playmaker' },
      { pos: 'CDM', x: 70, y: 38, defaultRole: 'defensive_midfielder' },
      { pos: 'LW', x: 18, y: 60, defaultRole: 'inside_forward' },
      { pos: 'CAM', x: 50, y: 58, defaultRole: 'advanced_playmaker' },
      { pos: 'RW', x: 82, y: 60, defaultRole: 'inside_forward' },
      { pos: 'ST', x: 50, y: 82, defaultRole: 'complete_forward' },
    ],
  },
  // ═══ 5'Lİ DEFANS (2 diziliş) ═══
  {
    name: '5-4-1',
    description: 'Beş savunma, dört orta saha, tek forvet. En katı savunma dizilişi.',
    positions: [
      { pos: 'GK', x: 50, y: 5, defaultRole: 'shot_stopper' },
      { pos: 'LWB', x: 8, y: 28, defaultRole: 'wing_back' },
      { pos: 'CB', x: 28, y: 17, defaultRole: 'no_nonsense_cb' },
      { pos: 'CB', x: 50, y: 15, defaultRole: 'offside_trap_cb' },
      { pos: 'CB', x: 72, y: 17, defaultRole: 'no_nonsense_cb' },
      { pos: 'RWB', x: 92, y: 28, defaultRole: 'wing_back' },
      { pos: 'LM', x: 15, y: 48, defaultRole: 'carrilero' },
      { pos: 'CM', x: 38, y: 42, defaultRole: 'defensive_midfielder' },
      { pos: 'CM', x: 62, y: 42, defaultRole: 'deep_lying_playmaker' },
      { pos: 'RM', x: 85, y: 48, defaultRole: 'carrilero' },
      { pos: 'ST', x: 50, y: 82, defaultRole: 'poacher' },
    ],
  },
  {
    name: '5-3-2',
    description: 'Beş savunma hattı, üç orta saha, iki forvet. Savunma ağırlıklı, kontratak için ideal.',
    positions: [
      { pos: 'GK', x: 50, y: 5, defaultRole: 'shot_stopper' },
      { pos: 'LWB', x: 8, y: 30, defaultRole: 'wing_back' },
      { pos: 'CB', x: 28, y: 17, defaultRole: 'no_nonsense_cb' },
      { pos: 'CB', x: 50, y: 15, defaultRole: 'ball_playing_defender' },
      { pos: 'CB', x: 72, y: 17, defaultRole: 'no_nonsense_cb' },
      { pos: 'RWB', x: 92, y: 30, defaultRole: 'wing_back' },
      { pos: 'CM', x: 30, y: 42, defaultRole: 'box_to_box' },
      { pos: 'CDM', x: 50, y: 38, defaultRole: 'defensive_midfielder' },
      { pos: 'CM', x: 70, y: 42, defaultRole: 'deep_lying_playmaker' },
      { pos: 'ST', x: 38, y: 80, defaultRole: 'target_man' },
      { pos: 'ST', x: 62, y: 80, defaultRole: 'poacher' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 7. TacticalInstruction Interface
// ─────────────────────────────────────────────────────────────────────────────

export interface TacticalInstruction {
  name: string;            // Turkish
  nameEn: string;          // English
  category: 'team' | 'defensive' | 'attacking' | 'set_piece';
  options: string[];       // selectable options (Turkish labels)
  effects: Record<string, number>;  // stat / situation → modifier
  description: string;     // Turkish
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. TACTICAL_INSTRUCTIONS (20+ instructions)
// ─────────────────────────────────────────────────────────────────────────────

export const TACTICAL_INSTRUCTIONS: TacticalInstruction[] = [
  // ── TEAM ──────────────────────────────────────────────────────────────────
  {
    name: 'Tempo',
    nameEn: 'Tempo',
    category: 'team',
    options: ['Yüksek', 'Normal', 'Düşük'],
    effects: { tempo_modifier: 15, stamina_drain: 10, pass_completion: -5 },
    description: 'Oyun hızını belirler. Yüksek tempo daha hızlı hücumlar ama daha fazla yorgunluk.',
  },
  {
    name: 'Pas Doğruluğu',
    nameEn: 'Passing Directness',
    category: 'team',
    options: ['Direkt', 'Karışık', 'Kısa'],
    effects: { passing_risk: 10, pass_completion: 8, counter_attack: -5 },
    description: 'Pas uzunluğunu belirler. Direkt paslar riskli ama hızlı hücum sağlar.',
  },
  {
    name: 'Genişlik',
    nameEn: 'Width',
    category: 'team',
    options: ['Geniş', 'Normal', 'Dar'],
    effects: { width_spread: 20, central_density: -10, crossing_chance: 8 },
    description: 'Takımın sahayı ne kadar geniş kullandığını belirler.',
  },
  {
    name: 'Baskı Yoğunluğu',
    nameEn: 'Pressing Intensity',
    category: 'team',
    options: ['Yüksek', 'Normal', 'Düşük'],
    effects: { pressing_success: 15, stamina_drain: 15, defensive_shape: -10 },
    description: 'Rakibe top kazandırdığınızda ne kadar yoğun baskı yapılacağını belirler.',
  },
  {
    name: 'Savunma Hattı',
    nameEn: 'Defensive Line',
    category: 'team',
    options: ['Yüksek', 'Normal', 'Düşük'],
    effects: { offside_trap: 10, through_ball_vuln: 12, pressing_efficiency: 8 },
    description: 'Savunma hattının ne kadar yukarıda kalacağını belirler.',
  },
  {
    name: 'Ofsayt Tuzağı',
    nameEn: 'Offside Trap',
    category: 'team',
    options: ['Açık', 'Normal', 'Kapalı'],
    effects: { offside_success: 15, defensive_risk: 12, concentration_demand: 10 },
    description: 'Savunma hattının birlikte hareket ederek ofsayt tuzağı kurmasını sağlar.',
  },

  // ── ATTACKING ─────────────────────────────────────────────────────────────
  {
    name: 'Overlap Koşuları',
    nameEn: 'Overlap Runs',
    category: 'attacking',
    options: ['Evet', 'Hayır'],
    effects: { crossing_chance: 12, wide_attack: 10, wing_back_stamina: 8 },
    description: 'Kanat oyuncularının arkasından beklerin koşmasına izin verir.',
  },
  {
    name: 'Underlap Koşuları',
    nameEn: 'Underlap Runs',
    category: 'attacking',
    options: ['Evet', 'Hayır'],
    effects: { central_attack: 10, cutback_chance: 8, fullback_shooting: 6 },
    description: 'Kanat oyuncularının içinden beklerin koşmasına izin verir.',
  },
  {
    name: 'Yüzen Orta Açma',
    nameEn: 'Float Crosses',
    category: 'attacking',
    options: ['Evet', 'Hayır'],
    effects: { crossing_accuracy: 8, heading_opportunity: 12, ariel_duel: 6 },
    description: 'Ortaları yüksek ve yüzer şekilde açarak havada güçlü forvetleri hedefler.',
  },
  {
    name: 'Sert Orta Açma',
    nameEn: 'Drilled Crosses',
    category: 'attacking',
    options: ['Evet', 'Hayır'],
    effects: { crossing_speed: 12, first_time_shot: 8, interception_risk: 6 },
    description: 'Ortaları yere sert ve hızlı açarak ceza sahası içinde vuruş fırsatı yaratır.',
  },
  {
    name: 'Savunmaya Rağmen',
    nameEn: 'Run at Defense',
    category: 'attacking',
    options: ['Evet', 'Hayır'],
    effects: { dribbling_success: 10, foul_won: 8, turnover_risk: 6 },
    description: 'Oyuncuların topla karşılaşmaya girerek savunmayı zorlamasını sağlar.',
  },
  {
    name: 'Görünen Şut',
    nameEn: 'Shoot on Sight',
    category: 'attacking',
    options: ['Evet', 'Hayır'],
    effects: { long_shot_chance: 15, shot_volume: 12, shot_accuracy: -5 },
    description: 'Oyuncuların şut açısı bulduğunda tereddüt etmeden vurmasını sağlar.',
  },
  {
    name: 'Kutu İçine Sok',
    nameEn: 'Work Ball into Box',
    category: 'attacking',
    options: ['Evet', 'Hayır'],
    effects: { pass_completion: 10, clear_cut_chance: 8, patient_buildup: 6 },
    description: 'Uzaktan şut yerine topu ceza sahasına taşıyan pas hücumu tercih eder.',
  },
  {
    name: 'Erken Orta',
    nameEn: 'Early Crosses',
    category: 'attacking',
    options: ['Evet', 'Hayır'],
    effects: { early_cross_chance: 15, fast_break: 8, crossing_accuracy: -5 },
    description: 'Kanat oyuncularının kale çizgisine kadar gelmeden erken orta açmasını sağlar.',
  },

  // ── DEFENSIVE ─────────────────────────────────────────────────────────────
  {
    name: 'Geriye Çekil',
    nameEn: 'Sit Back',
    category: 'defensive',
    options: ['Evet', 'Hayır'],
    effects: { defensive_depth: 15, counter_vuln: -8, possession_regain: 8 },
    description: 'Takımın kendi yarı alanına çekilerek derin savunma yapmasını sağlar.',
  },
  {
    name: 'Mücadeleye Gir',
    nameEn: 'Get Stuck In',
    category: 'defensive',
    options: ['Evet', 'Hayır'],
    effects: { tackle_intensity: 15, foul_risk: 12, ball_recovery: 10 },
    description: 'Oyuncuların sert mücadele ederek topu geri kazanmasını sağlar.',
  },
  {
    name: 'Zaman Kaybet',
    nameEn: 'Time Wasting',
    category: 'defensive',
    options: ['Evet', 'Hayır'],
    effects: { time_control: 20, possession_retention: 10, crowd_frustration: 8 },
    description: 'Önde olduğunuzda topu tutarak zaman kaybetmeyi ve skoru korumayı sağlar.',
  },
  {
    name: 'Daha Derin İn',
    nameEn: 'Drop Deeper',
    category: 'defensive',
    options: ['Evet', 'Hayır'],
    effects: { space_behind_defense: -15, compact_defense: 12, pressing_range: -10 },
    description: 'Savunma hattının daha geriye inerek aradaki boşlukları kapatmasını sağlar.',
  },
  {
    name: 'Pozisyonu Koru',
    nameEn: 'Hold Position',
    category: 'defensive',
    options: ['Evet', 'Hayır'],
    effects: { defensive_shape: 15, creative_freedom: -10, formation_integrity: 12 },
    description: 'Oyuncuların kendi pozisyonlarını koruyarak dizilişin bozulmasını engeller.',
  },

  // ── SET PIECES ────────────────────────────────────────────────────────────
  {
    name: 'Kısa Serbest Vuruş',
    nameEn: 'Short Free Kicks',
    category: 'set_piece',
    options: ['Evet', 'Hayır'],
    effects: { short_freekick: 15, possession_retention: 8, goal_from_freekick: -8 },
    description: 'Serbest vuruşları kısa paslarla oynayarak topun elinde kalmasını sağlar.',
  },
  {
    name: 'Uzun Oyuncular Öne',
    nameEn: 'Tall Players Up',
    category: 'set_piece',
    options: ['Evet', 'Hayır'],
    effects: { ariel_duel: 15, goal_from_corner: 10, defensive_vuln: 8 },
    description: 'Korner ve serbest vuruşlarda uzun oyuncuları öne çıkarır.',
  },
  {
    name: 'Ön Direk Koşusu',
    nameEn: 'Near Post Runs',
    category: 'set_piece',
    options: ['Evet', 'Hayır'],
    effects: { near_post_goal: 12, quick_goal_chance: 8, defender_confusion: 5 },
    description: 'Kornerlerde ön direğe koşarak kalecinin görüşünü engeller.',
  },
  {
    name: 'Bölge Markajı',
    nameEn: 'Zonal Marking',
    category: 'set_piece',
    options: ['Evet', 'Hayır'],
    effects: { zonal_coverage: 15, set_piece_defense: 10, man_marking: -8 },
    description: 'Duran toplarda bölge savunması yaparak alanı korur.',
  },
  {
    name: 'Adam Markajı',
    nameEn: 'Man Marking',
    category: 'set_piece',
    options: ['Evet', 'Hayır'],
    effects: { man_marking_tightness: 15, set_piece_defense: 8, zonal_coverage: -10 },
    description: 'Duran toplarda her oyuncunun bir rakibi birebir takip etmesini sağlar.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 9. calculateTacticalScore
// ─────────────────────────────────────────────────────────────────────────────

interface SquadSlot {
  player: Player;
  position: SpecificPosition;
  roleId: string;
}

interface TacticConfig {
  formation: string;
  instructions: { instructionName: string; option: string }[];
  playStyle?: string;
}

interface TacticalScoreResult {
  overall: number;             // 0-100
  roleCompatibility: number;   // 0-100
  instructionSynergy: number;  // 0-100
  attributeFit: number;        // 0-100
  breakdown: {
    slotScores: { position: string; roleId: string; score: number }[];
    instructionEffects: Record<string, number>;
    weaknesses: string[];
    strengths: string[];
  };
}

/**
 * Get a player attribute value safely. Returns 0 if undefined.
 */
function getAttr(player: Player, attr: string): number {
  const key = attr as keyof Player;
  const val = player[key];
  return typeof val === 'number' ? val : 0;
}

/**
 * Calculate how well a player fits a role based on primary and secondary attributes.
 */
function calculatePlayerRoleFit(player: Player, roleId: string): number {
  const role = ROLES.find((r) => r.id === roleId);
  if (!role) return 50; // unknown role → neutral

  const bonuses = getRoleAttributeBonuses(roleId);

  // Primary attributes weight 60%
  let primaryScore = 0;
  let primaryCount = 0;
  for (const attr of role.primaryAttributes) {
    const val = getAttr(player, attr);
    const bonus = bonuses[attr] ?? 0;
    primaryScore += Math.min(100, val + bonus);
    primaryCount++;
  }
  const primaryAvg = primaryCount > 0 ? primaryScore / primaryCount : 70;

  // Secondary attributes weight 30%
  let secondaryScore = 0;
  let secondaryCount = 0;
  for (const attr of role.secondaryAttributes) {
    const val = getAttr(player, attr);
    const bonus = bonuses[attr] ?? 0;
    secondaryScore += Math.min(100, val + bonus);
    secondaryCount++;
  }
  const secondaryAvg = secondaryCount > 0 ? secondaryScore / secondaryCount : 60;

  // Mental weight for mental-style roles → remaining 10%
  let mentalScore = 70;
  if (role.mentalWeight > 0) {
    const mentalAttrs = [
      'decisions', 'composure', 'concentration', 'anticipation',
      'workRate', 'teamwork', 'leadership', 'determination',
    ];
    let mScore = 0;
    for (const attr of mentalAttrs) {
      mScore += getAttr(player, attr);
    }
    mentalScore = mScore / mentalAttrs.length;
  }

  const fit = primaryAvg * 0.6 + secondaryAvg * 0.3 + mentalScore * 0.1;
  return Math.round(Math.min(100, fit));
}

/**
 * Calculate instruction synergy — how well the selected instructions work together
 * and how well they complement the assigned roles.
 */
function calculateInstructionSynergy(
  squad: SquadSlot[],
  instructions: TacticConfig['instructions'],
  playStyle?: string,
): number {
  let synergy = 50; // base

  // Instruction consistency bonuses
  const instructionMap = new Map(instructions.map((i) => [i.instructionName, i.option]));

  // Tempo + Pressing should align
  const tempo = instructionMap.get('Tempo');
  const pressing = instructionMap.get('Baskı Yoğunluğu');
  if (tempo === 'Yüksek' && pressing === 'Yüksek') synergy += 8;
  if (tempo === 'Düşük' && pressing === 'Düşük') synergy += 6;

  // Width + Cross type alignment
  const width = instructionMap.get('Genişlik');
  if (width === 'Geniş' && instructionMap.get('Yüzen Orta Açma') === 'Evet') synergy += 5;
  if (width === 'Dar' && instructionMap.get('Savunmaya Rağmen') === 'Evet') synergy += 5;

  // Defensive line + offside trap
  const defLine = instructionMap.get('Savunma Hattı');
  const offsideTrap = instructionMap.get('Ofsayt Tuzağı');
  if (defLine === 'Yüksek' && offsideTrap === 'Açık') synergy += 8;
  if (defLine === 'Düşük' && offsideTrap === 'Kapalı') synergy += 6;

  // Attacking instructions consistency
  const shootOnSight = instructionMap.get('Görünen Şut');
  const workBall = instructionMap.get('Kutu İçine Sok');
  if (shootOnSight === 'Evet' && workBall === 'Hayır') synergy += 5;
  if (shootOnSight === 'Hayır' && workBall === 'Evet') synergy += 5;

  // Contradiction penalties
  if (instructionMap.get('Geriye Çekil') === 'Evet' && instructionMap.get('Baskı Yoğunluğu') === 'Yüksek') {
    synergy -= 10;
  }
  if (instructionMap.get('Bölge Markajı') === 'Evet' && instructionMap.get('Adam Markajı') === 'Evet') {
    synergy -= 8;
  }
  if (instructionMap.get('Zaman Kaybet') === 'Evet' && instructionMap.get('Tempo') === 'Yüksek') {
    synergy -= 8;
  }

  // Role-specific instruction bonuses
  for (const slot of squad) {
    const role = ROLES.find((r) => r.id === slot.roleId);
    if (!role) continue;

    // Play style affinity
    if (playStyle && role.playStyleAffinity[playStyle] !== undefined) {
      synergy += role.playStyleAffinity[playStyle] * 5;
    }

    // Instruction-role synergy
    if (role.attackingContribution > 70 && instructionMap.get('Görünen Şut') === 'Evet') synergy += 3;
    if (role.defensiveContribution > 70 && instructionMap.get('Mücadeleye Gir') === 'Evet') synergy += 3;
    if (role.id === 'false_nine' && instructionMap.get('Kutu İçine Sok') === 'Evet') synergy += 4;
    if (role.id === 'target_man' && instructionMap.get('Yüzen Orta Açma') === 'Evet') synergy += 4;
    if (role.id === 'poacher' && instructionMap.get('Genişlik') === 'Dar') synergy += 3;
    if (role.id === 'winger' && instructionMap.get('Overlap Koşuları') === 'Evet') synergy += 3;
    if (role.id === 'deep_lying_playmaker' && instructionMap.get('Pas Doğruluğu') === 'Kısa') synergy += 3;
    if (role.id === 'box_to_box' && instructionMap.get('Baskı Yoğunluğu') === 'Yüksek') synergy += 3;
  }

  return Math.round(Math.max(0, Math.min(100, synergy)));
}

/**
 * Calculate the overall tactical effectiveness score for a squad + tactic combo.
 */
export function calculateTacticalScore(
  squad: SquadSlot[],
  tactic: TacticConfig,
): TacticalScoreResult {
  if (squad.length === 0) {
    return {
      overall: 0,
      roleCompatibility: 0,
      instructionSynergy: 0,
      attributeFit: 0,
      breakdown: {
        slotScores: [],
        instructionEffects: {},
        weaknesses: ['Takım kadrosu boş'],
        strengths: [],
      },
    };
  }

  // ── 1. Role Compatibility (position ↔ role match) ──────────────────────
  let totalCompatibility = 0;
  const slotScores: { position: string; roleId: string; score: number }[] = [];

  for (const slot of squad) {
    const compatibleRoles = getCompatibleRoles(slot.position);
    const isCompatible = compatibleRoles.some((r) => r.id === slot.roleId);

    // Role compatibility: 70 base if compatible, 30 penalty if not
    let compatScore = isCompatible ? 70 : 30;

    // Player role fit bonus (attributes)
    const fit = calculatePlayerRoleFit(slot.player, slot.roleId);
    compatScore += fit * 0.3; // up to 30 bonus points from attribute fit

    compatScore = Math.round(Math.min(100, compatScore));
    totalCompatibility += compatScore;

    slotScores.push({
      position: slot.position,
      roleId: slot.roleId,
      score: compatScore,
    });
  }
  const roleCompatibility = Math.round(totalCompatibility / squad.length);

  // ── 2. Attribute Fit (overall player quality weighted by role) ──────────
  let totalAttributeFit = 0;
  for (const slot of squad) {
    totalAttributeFit += calculatePlayerRoleFit(slot.player, slot.roleId);
  }
  const attributeFit = Math.round(totalAttributeFit / squad.length);

  // ── 3. Instruction Synergy ─────────────────────────────────────────────
  const instructionSynergy = calculateInstructionSynergy(
    squad,
    tactic.instructions,
    tactic.playStyle,
  );

  // ── 4. Combined Effects Map ────────────────────────────────────────────
  const instructionEffects: Record<string, number> = {};
  for (const inst of tactic.instructions) {
    const instructionDef = TACTICAL_INSTRUCTIONS.find(
      (t) => t.name === inst.instructionName || t.nameEn === inst.instructionName,
    );
    if (instructionDef) {
      for (const [key, val] of Object.entries(instructionDef.effects)) {
        instructionEffects[key] = (instructionEffects[key] ?? 0) + val;
      }
    }
  }

  // ── 5. Identify Strengths & Weaknesses ─────────────────────────────────
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  // Find best and worst slots
  const sorted = [...slotScores].sort((a, b) => b.score - a.score);
  if (sorted.length > 0 && sorted[0].score >= 80) {
    const role = ROLES.find((r) => r.id === sorted[0].roleId);
    strengths.push(`${sorted[0].position} - ${role?.nameEn ?? sorted[0].roleId} mükemmel uyum`);
  }
  if (sorted.length > 0 && sorted[sorted.length - 1].score < 50) {
    const role = ROLES.find((r) => r.id === sorted[sorted.length - 1].roleId);
    weaknesses.push(`${sorted[sorted.length - 1].position} - ${role?.nameEn ?? sorted[sorted.length - 1].roleId} zayıf uyum`);
  }

  // Role coverage analysis
  const hasPlaymaker = squad.some((s) =>
    ['deep_lying_playmaker', 'advanced_playmaker', 'advanced_playmaker_fwd'].includes(s.roleId),
  );
  const hasDefender = squad.some((s) =>
    ['no_nonsense_cb', 'offside_trap_cb', 'ball_playing_defender', 'defensive_midfielder'].includes(s.roleId),
  );
  const hasAttacker = squad.some((s) =>
    ['poacher', 'complete_forward', 'target_man', 'false_nine', 'inside_forward'].includes(s.roleId),
  );

  if (hasPlaymaker) strengths.push('Oyun kurucu rolü mevcut');
  if (hasDefender) strengths.push('Savunma odaklı rol mevcut');
  if (hasAttacker) strengths.push('Hücum odaklı rol mevcut');
  if (!hasPlaymaker) weaknesses.push('Oyun kurucu rolü eksik');
  if (!hasDefender && squad.length > 3) weaknesses.push('Savunma odaklı rol eksik');

  // Instruction balance
  const attackingInsts = tactic.instructions.filter((i) =>
    TACTICAL_INSTRUCTIONS.find(
      (t) => (t.name === i.instructionName || t.nameEn === i.instructionName) && t.category === 'attacking',
    ),
  );
  const defensiveInsts = tactic.instructions.filter((i) =>
    TACTICAL_INSTRUCTIONS.find(
      (t) => (t.name === i.instructionName || t.nameEn === i.instructionName) && t.category === 'defensive',
    ),
  );

  if (attackingInsts.length > 4) weaknesses.push('Aşırı hücum talimatı, savunma riski artıyor');
  if (defensiveInsts.length > 4) weaknesses.push('Aşırı savunma talimatı, hücum etkinliği azalıyor');
  if (attackingInsts.length >= 1 && defensiveInsts.length >= 1) {
    strengths.push('Dengeli hücum-savunma talimatları');
  }

  // ── 6. Overall Score ───────────────────────────────────────────────────
  const overall = Math.round(
    roleCompatibility * 0.40 +
    attributeFit * 0.30 +
    instructionSynergy * 0.30,
  );

  return {
    overall: Math.max(0, Math.min(100, overall)),
    roleCompatibility: Math.max(0, Math.min(100, roleCompatibility)),
    instructionSynergy: Math.max(0, Math.min(100, instructionSynergy)),
    attributeFit: Math.max(0, Math.min(100, attributeFit)),
    breakdown: {
      slotScores,
      instructionEffects,
      weaknesses,
      strengths,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function getRoleById(id: string): PlayerRole | undefined {
  return ROLES.find((r) => r.id === id);
}

export function getRolesByCategory(category: PlayerRole['category']): PlayerRole[] {
  return ROLES.filter((r) => r.category === category);
}

export function getFormationByName(name: string): FormationTemplate | undefined {
  return FORMATION_TEMPLATES.find((f) => f.name === name);
}

export function getInstructionsByCategory(category: TacticalInstruction['category']): TacticalInstruction[] {
  return TACTICAL_INSTRUCTIONS.filter((t) => t.category === category);
}
