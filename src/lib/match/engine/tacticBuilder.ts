/**
 * active_tactics DB satırından ActiveTactic nesnesi oluşturur.
 * match-scheduler ve process-match-queue tarafından ortak kullanılır.
 */
export function buildActiveTactic(tacticsData: Record<string, unknown> | null): Record<string, unknown> {
  const tempo = Number(tacticsData?.tempo || 50);
  const defLine = tacticsData?.defense_line || 'standart';
  const playWidth = tacticsData?.play_width || 'normal';
  return {
    formation: tacticsData?.formation || '4-4-2',
    mentality: Number(tacticsData?.mentality || 3),
    pressing: tacticsData?.pressing || false,
    passingStyle: tacticsData?.passing_style || 'Karışık',
    intensity: tempo > 70 ? 'high' : tempo < 30 ? 'low' : 'normal',
    tactic_type: tacticsData?.formation || '4-4-2',
    lineHeight: defLine === 'onde' ? 70 : defLine === 'geride' ? 30 : 50,
    width: playWidth === 'genis' ? 70 : playWidth === 'dar' ? 30 : 50,
    aggression: tempo > 70 ? 70 : 50,
    passingIntensity: tempo,
    screenKeeper: false,
    wasteTime: false,
    parkTheBus: defLine === 'geride',
    crossGame: playWidth === 'genis',
    loneStrikerCounter: false,
    offsideTrap: tacticsData?.pressing || false,
    playStyle: defLine === 'onde' ? 'hucum' : defLine === 'geride' ? 'savunma' : 'dengeli',
    tempo: tempo > 70 ? 'hizli' : tempo < 30 ? 'yavas' : 'normal',
    defensiveLine: defLine === 'onde' ? 'onde' : defLine === 'geride' ? 'geride' : 'normal',
  };
}
